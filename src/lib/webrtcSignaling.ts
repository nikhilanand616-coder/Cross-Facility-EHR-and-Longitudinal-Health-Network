import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export interface TeleconsultMessage {
  id?: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface NetworkHealthMetrics {
  bandwidthKbps: number;
  latencyMs: number;
  packetLossPercent: number;
  jitterMs: number;
  quality: 'Excellent' | 'Good' | 'Degraded' | 'Critical';
}

export type FallbackMode = 'video' | 'voice_only' | 'text_only';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.services.mozilla.com',
      ],
    },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Creates a synthetic media stream using HTML5 canvas & Web Audio API
 * when physical camera/mic is unavailable, blocked by permissions, or running in an iframe.
 */
export function createSyntheticMediaStream(label: string = 'Teleconsult Stream'): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let frame = 0;
  const draw = () => {
    if (!ctx) return;
    frame++;
    // Dark medical background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < 640; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }
    for (let y = 0; y < 480; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(640, y);
      ctx.stroke();
    }

    // Concentric pulse circle
    const radius = 50 + Math.sin(frame * 0.05) * 10;
    ctx.beginPath();
    ctx.arc(320, 210, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(79, 70, 229, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Heart pulse wave in center
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const offsetY = 210;
    const waveProgress = (frame * 3) % 200;
    ctx.moveTo(220, offsetY);
    ctx.lineTo(260, offsetY);
    ctx.lineTo(275, offsetY - 35);
    ctx.lineTo(290, offsetY + 35);
    ctx.lineTo(305, offsetY - 15);
    ctx.lineTo(320, offsetY);
    ctx.lineTo(420, offsetY);
    ctx.stroke();

    // Text labels
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 320, 310);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('Encrypted WebRTC Stream • 1080p Telemedicine Feed', 320, 335);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`Frame ${frame} | Latency: 42ms | Bitrate: 1.8 Mbps`, 320, 360);
  };

  const animInterval = setInterval(draw, 1000 / 30);
  draw();

  const canvasStream = canvas.captureStream(30);

  // Synthetic Audio Track via Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001; // extremely low amplitude / near silent pulse
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.connect(gain);
      const dest = audioCtx.createMediaStreamDestination();
      gain.connect(dest);
      osc.start();

      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    }
  } catch (e) {
    console.warn('Synthetic audio track initialization bypassed:', e);
  }

  // Cleanup helper
  (canvasStream as any)._cleanup = () => {
    clearInterval(animInterval);
  };

  return canvasStream;
}

/**
 * Acquire local user media (camera + mic) with fallback to synthetic stream
 */
export async function getLocalMediaStream(
  videoEnabled: boolean = true,
  audioEnabled: boolean = true,
  label: string = 'Local Clinician Feed'
): Promise<{ stream: MediaStream; isSynthetic: boolean }> {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            }
          : false,
        audio: audioEnabled
          ? {
              echoCancellation: true,
              noiseSuppression: true,
            }
          : false,
      });
      return { stream, isSynthetic: false };
    } catch (err) {
      console.warn('Hardware media access denied or not available; using synthetic stream:', err);
    }
  }
  return { stream: createSyntheticMediaStream(label), isSynthetic: true };
}

/**
 * Initialize WebRTC Peer Connection and handle ICE candidate gathering via Firestore
 */
export function createPeerConnection(
  onRemoteStream: (stream: MediaStream) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onRemoteStream(event.streams[0]);
    }
  };

  pc.onconnectionstatechange = () => {
    if (onConnectionStateChange) {
      onConnectionStateChange(pc.connectionState);
    }
  };

  return pc;
}

/**
 * Caller flow: create room document with SDP offer and push caller ICE candidates to Firestore
 */
export async function createCallRoom(
  roomId: string,
  localStream: MediaStream,
  pc: RTCPeerConnection,
  metadata: {
    patientId: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    facilityId: string;
  }
): Promise<void> {
  const roomRef = doc(db, 'teleconsult_rooms', roomId);
  const callerCandidatesCollection = collection(roomRef, 'callerCandidates');

  // Add all local tracks to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // ICE Candidate handling: save to Firestore
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(callerCandidatesCollection, event.candidate.toJSON());
      } catch (err) {
        console.warn('Failed to post caller ICE candidate:', err);
      }
    }
  };

  // Create offer
  const offerDescription = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offerDescription);

  const roomData = {
    roomId,
    patientId: metadata.patientId,
    patientName: metadata.patientName,
    doctorId: metadata.doctorId,
    doctorName: metadata.doctorName,
    facilityId: metadata.facilityId,
    status: 'calling',
    bandwidthMode: 'video',
    offer: {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(roomRef, roomData);

  // Listen for Callee Answer
  onSnapshot(roomRef, async (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      await pc.setRemoteDescription(answerDescription);
    }
  });

  // Listen for Callee ICE Candidates
  const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');
  onSnapshot(calleeCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (e) {
          console.warn('Error adding callee ICE candidate:', e);
        }
      }
    });
  });
}

/**
 * Callee flow: Join call, accept offer, generate SDP answer, and push callee ICE candidates
 */
export async function joinCallRoom(
  roomId: string,
  localStream: MediaStream,
  pc: RTCPeerConnection
): Promise<void> {
  const roomRef = doc(db, 'teleconsult_rooms', roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    throw new Error(`Teleconsultation room ${roomId} does not exist.`);
  }

  const roomData = roomSnapshot.data();
  const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

  // Add local tracks to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Callee ICE candidates
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      try {
        await addDoc(calleeCandidatesCollection, event.candidate.toJSON());
      } catch (err) {
        console.warn('Failed to post callee ICE candidate:', err);
      }
    }
  };

  // Set remote description from caller offer
  const offer = roomData.offer;
  if (offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
  }

  // Create answer
  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  await updateDoc(roomRef, {
    answer: {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    },
    status: 'connected',
    updatedAt: new Date().toISOString(),
  });

  // Listen for Caller ICE Candidates
  const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
  onSnapshot(callerCandidatesCollection, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const candidateData = change.doc.data();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidateData));
        } catch (e) {
          console.warn('Error adding caller ICE candidate:', e);
        }
      }
    });
  });
}

/**
 * End call & cleanup media tracks + update room status
 */
export async function endTeleconsultCall(
  roomId: string,
  pc?: RTCPeerConnection | null,
  localStream?: MediaStream | null
): Promise<void> {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    if ((localStream as any)._cleanup) {
      (localStream as any)._cleanup();
    }
  }

  if (pc) {
    pc.close();
  }

  try {
    const roomRef = doc(db, 'teleconsult_rooms', roomId);
    await updateDoc(roomRef, {
      status: 'ended',
      endedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error marking room as ended:', err);
  }
}

/**
 * Toggle audio mute on local stream
 */
export function toggleAudioTrack(stream: MediaStream | null, isMuted: boolean): boolean {
  if (!stream) return isMuted;
  const audioTracks = stream.getAudioTracks();
  audioTracks.forEach((track) => {
    track.enabled = !isMuted;
  });
  return isMuted;
}

/**
 * Toggle video track on local stream
 */
export function toggleVideoTrack(stream: MediaStream | null, isVideoOff: boolean): boolean {
  if (!stream) return isVideoOff;
  const videoTracks = stream.getVideoTracks();
  videoTracks.forEach((track) => {
    track.enabled = !isVideoOff;
  });
  return isVideoOff;
}

/**
 * Post chat message to room subcollection (for text-only fallback mode and in-call messaging)
 */
export async function sendRoomChatMessage(
  roomId: string,
  sender: string,
  senderRole: string,
  text: string
): Promise<void> {
  const roomRef = doc(db, 'teleconsult_rooms', roomId);
  const messagesCol = collection(roomRef, 'messages');
  await addDoc(messagesCol, {
    sender,
    senderRole,
    text,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Listen to live chat messages
 */
export function listenRoomChat(
  roomId: string,
  onMessages: (msgs: TeleconsultMessage[]) => void
): () => void {
  const roomRef = doc(db, 'teleconsult_rooms', roomId);
  const messagesCol = collection(roomRef, 'messages');
  const q = query(messagesCol, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: TeleconsultMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as any) });
      });
      onMessages(msgs);
    },
    (err) => {
      console.warn('Error listening to teleconsult chat:', err);
    }
  );
}

/**
 * Update room bandwidth mode (video | voice_only | text_only) in Firestore
 */
export async function updateBandwidthModeInFirestore(
  roomId: string,
  mode: FallbackMode,
  metrics?: NetworkHealthMetrics
): Promise<void> {
  try {
    const roomRef = doc(db, 'teleconsult_rooms', roomId);
    await updateDoc(roomRef, {
      bandwidthMode: mode,
      connectionMetrics: metrics || null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to update bandwidth mode in Firestore:', err);
  }
}
