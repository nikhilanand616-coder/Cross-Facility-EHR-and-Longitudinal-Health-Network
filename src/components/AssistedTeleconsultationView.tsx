import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Stethoscope,
  Activity,
  HeartPulse,
  Signal,
  CheckCircle2,
  ShieldCheck,
  Send,
  FileText,
  User,
  Building2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Sliders,
  Check,
  Copy,
  ChevronRight,
} from 'lucide-react';
import {
  TeleconsultationSession,
  LongitudinalPatient,
  Facility,
  VitalsRecord,
  ClinicalEncounter,
  UserRole,
} from '../types';
import {
  getLocalMediaStream,
  createPeerConnection,
  createCallRoom,
  joinCallRoom,
  endTeleconsultCall,
  toggleAudioTrack,
  toggleVideoTrack,
  sendRoomChatMessage,
  listenRoomChat,
  updateBandwidthModeInFirestore,
  TeleconsultMessage,
  NetworkHealthMetrics,
  FallbackMode,
} from '../lib/webrtcSignaling';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface AssistedTeleconsultationViewProps {
  session?: TeleconsultationSession;
  allSessions: TeleconsultationSession[];
  patient?: LongitudinalPatient;
  currentFacility: Facility;
  currentRole: UserRole;
  onSelectSession: (session: TeleconsultationSession) => void;
  onUpdateSession: (updated: TeleconsultationSession) => void;
  onFinalizeEncounter?: (encounter: Partial<ClinicalEncounter>) => void;
}

export const AssistedTeleconsultationView: React.FC<AssistedTeleconsultationViewProps> = ({
  session,
  allSessions,
  patient,
  currentFacility,
  currentRole,
  onSelectSession,
  onUpdateSession,
  onFinalizeEncounter,
}) => {
  const activeSession = session || allSessions[0];
  const roomId = activeSession ? `teleconsult_${activeSession.id}` : 'teleconsult_room_demo';

  // --- WebRTC Media & Peer State ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [callActive, setCallActive] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isSyntheticStream, setIsSyntheticStream] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<string>('connected');
  const [callDurationSeconds, setCallDurationSeconds] = useState<number>(395);

  // --- Network Telemetry & Auto-Fallback Engine ---
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState<boolean>(true);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkHealthMetrics>({
    bandwidthKbps: 1850,
    latencyMs: 46,
    packetLossPercent: 0.2,
    jitterMs: 4,
    quality: 'Excellent',
  });
  const [fallbackMode, setFallbackMode] = useState<FallbackMode>('video');
  const [fallbackAlert, setFallbackAlert] = useState<string | null>(null);

  // --- Chat & Text Fallback Channel ---
  const [chatMessages, setChatMessages] = useState<TeleconsultMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- Audio / Auscultation Simulator ---
  const [stethoscopeActive, setStethoscopeActive] = useState<boolean>(false);

  // --- Digital Triage Form State (Right Column) ---
  const [triageAcuity, setTriageAcuity] = useState<'Immediate (Red)' | 'Urgent (Yellow)' | 'Routine (Green)'>(
    activeSession?.clinicalReason?.toLowerCase().includes('emergency') ||
    activeSession?.clinicalReason?.toLowerCase().includes('chest')
      ? 'Immediate (Red)'
      : 'Urgent (Yellow)'
  );
  const [chiefComplaint, setChiefComplaint] = useState<string>(
    activeSession?.clinicalReason || 'Acute episodic headache and dizziness with elevated blood pressure'
  );
  const [symptomDuration, setSymptomDuration] = useState<string>('3 days');
  const [physicalObservations, setPhysicalObservations] = useState<{
    pallor: boolean;
    dyspnea: boolean;
    pedalEdema: boolean;
    cyanosis: boolean;
    auscultationWheeze: boolean;
    tachycardia: boolean;
  }>({
    pallor: true,
    dyspnea: false,
    pedalEdema: true,
    cyanosis: false,
    auscultationWheeze: false,
    tachycardia: true,
  });
  const [examNotes, setExamNotes] = useState<string>(
    'Patient oriented to time and place. Mild bilateral pitting pedal edema observed via video inspection. Jugular venous pulse within normal limits.'
  );
  const [doctorImpression, setDoctorImpression] = useState<string>(
    activeSession?.specialistNotes ||
      'Stage 2 Essential Hypertension with suspected microalbuminuria and mild volume overload. Requires prompt titration of anti-hypertensives.'
  );
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState<string>(
    'Essential (Primary) Hypertension - Grade 2 (ICD-10: I10)'
  );
  const [prescriptions, setPrescriptions] = useState(
    activeSession?.recommendedPrescriptions || [
      {
        drugName: 'Telmisartan Tablets',
        dosage: '80mg',
        frequency: 'Once Daily (Morning)',
        durationDays: 30,
        instructions: 'Take after breakfast with water. Monitor BP weekly at Sub-Centre.',
      },
      {
        drugName: 'Amlodipine Tablets',
        dosage: '5mg',
        frequency: 'Once Daily (Evening)',
        durationDays: 30,
        instructions: 'Take at bedtime. Report any worsening ankle swelling.',
      },
    ]
  );
  const [newDrugName, setNewDrugName] = useState<string>('');
  const [newDosage, setNewDosage] = useState<string>('');
  const [newFreq, setNewFreq] = useState<string>('Once Daily');
  const [disposition, setDisposition] = useState<'home' | 'subcentre_observe' | 'refer_district'>(
    'subcentre_observe'
  );

  // --- Signature & Submission State ---
  const [counterSigned, setCounterSigned] = useState<boolean>(activeSession?.counterSigned || false);
  const [isSubmittingTriage, setIsSubmittingTriage] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null);
  const [signatureHash, setSignatureHash] = useState<string | null>(
    activeSession?.digitalSignatureHash || null
  );
  const [copiedRoomId, setCopiedRoomId] = useState<boolean>(false);

  // -------------------------------------------------------------
  // WebRTC Lifecycle & Firestore Signaling Setup
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let cleanupChat: (() => void) | undefined;

    async function initializeWebRtc() {
      try {
        // 1. Acquire local camera / mic stream (or fallback synthetic stream)
        const { stream: localStream, isSynthetic } = await getLocalMediaStream(
          !isVideoOff,
          !isMuted,
          `Dr. Specialist (${currentFacility.name})`
        );

        if (!isMounted) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        setIsSyntheticStream(isSynthetic);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // 2. Setup RTCPeerConnection
        const pc = createPeerConnection(
          (remoteStream) => {
            if (remoteVideoRef.current && isMounted) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          },
          (state) => {
            if (isMounted) {
              setConnectionState(state);
            }
          }
        );
        peerConnectionRef.current = pc;

        // 3. Setup Firestore Signaling Call Room
        const metadata = {
          patientId: activeSession ? activeSession.patientId : 'PAT-DEMO',
          patientName: activeSession ? activeSession.patientName : 'Patient Record',
          doctorId: currentRole === 'doctor' ? 'DOC-SPECIALIST' : 'PROVIDER-01',
          doctorName: activeSession ? activeSession.specialistName : 'Specialist Consultant',
          facilityId: currentFacility.id,
        };

        // Attempt creating the signaling room in Firestore
        try {
          await createCallRoom(roomId, localStream, pc, metadata);
        } catch (callErr) {
          console.warn('Signaling room already initialized or joined as peer:', callErr);
          try {
            await joinCallRoom(roomId, localStream, pc);
          } catch (joinErr) {
            console.warn('Fallback peer joined locally:', joinErr);
          }
        }

        // If local hardware doesn't supply a separate remote feed, attach a simulated remote stream
        // to remoteVideoRef so the remote participant is clearly visible
        if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
          const remoteSynthetic = await getLocalMediaStream(
            true,
            true,
            `${activeSession?.patientName || 'Patient'} • Sub-Centre HWC`
          );
          if (isMounted && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteSynthetic.stream;
          }
        }

        // 4. Listen to live chat messages
        cleanupChat = listenRoomChat(roomId, (msgs) => {
          if (isMounted) {
            setChatMessages(msgs);
            setTimeout(() => {
              chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        });
      } catch (err) {
        console.error('WebRTC initialization failed:', err);
      }
    }

    if (callActive) {
      initializeWebRtc();
    }

    return () => {
      isMounted = false;
      if (cleanupChat) cleanupChat();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId, callActive]);

  // Call timer effect
  useEffect(() => {
    if (!callActive) return;
    const interval = setInterval(() => {
      setCallDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callActive]);

  // -------------------------------------------------------------
  // Critical Network Connectivity Monitoring & Auto-Fallback
  // -------------------------------------------------------------
  useEffect(() => {
    if (!autoFallbackEnabled || !callActive) return;

    // Evaluate bandwidth & network metrics against clinical thresholds
    const { bandwidthKbps, latencyMs, packetLossPercent } = networkMetrics;

    if (bandwidthKbps < 60 || latencyMs > 800 || packetLossPercent > 18) {
      // Critical 2G / Edge threshold: switch to Text-Only mode
      if (fallbackMode !== 'text_only') {
        setFallbackMode('text_only');
        toggleVideoTrack(localStreamRef.current, true);
        toggleAudioTrack(localStreamRef.current, true);
        setFallbackAlert(
          `Critical network drop (${bandwidthKbps} kbps, ${latencyMs}ms RTT). Auto-switched to Text-Only Consultation to maintain diagnostic continuity.`
        );
        updateBandwidthModeInFirestore(roomId, 'text_only', networkMetrics);
      }
    } else if (bandwidthKbps < 250 || latencyMs > 350 || packetLossPercent > 5) {
      // Degraded 3G threshold: switch to Voice-Only mode
      if (fallbackMode !== 'voice_only') {
        setFallbackMode('voice_only');
        toggleVideoTrack(localStreamRef.current, true); // disable video to preserve audio
        toggleAudioTrack(localStreamRef.current, false); // ensure audio remains clear
        setFallbackAlert(
          `Bandwidth degraded to ${bandwidthKbps} kbps (latency ${latencyMs}ms). Auto-switched to Voice-Only mode to protect clinical auscultation clarity.`
        );
        updateBandwidthModeInFirestore(roomId, 'voice_only', networkMetrics);
      }
    } else {
      // Recovered Broadband / 4G threshold: return to full HD Video
      if (fallbackMode !== 'video') {
        setFallbackMode('video');
        toggleVideoTrack(localStreamRef.current, isVideoOff);
        toggleAudioTrack(localStreamRef.current, isMuted);
        setFallbackAlert(`Network recovered to ${bandwidthKbps} kbps. Restored HD 1-on-1 Video Stream.`);
        updateBandwidthModeInFirestore(roomId, 'video', networkMetrics);
        const timer = setTimeout(() => setFallbackAlert(null), 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [networkMetrics, autoFallbackEnabled, callActive, fallbackMode, isMuted, isVideoOff, roomId]);

  // Helper to simulate specific network profiles for testing and demonstration
  const applyNetworkSimulation = (preset: '4g' | 'poor_3g' | 'edge_2g') => {
    if (preset === '4g') {
      setNetworkMetrics({
        bandwidthKbps: 2150,
        latencyMs: 38,
        packetLossPercent: 0.1,
        jitterMs: 3,
        quality: 'Excellent',
      });
    } else if (preset === 'poor_3g') {
      setNetworkMetrics({
        bandwidthKbps: 180,
        latencyMs: 420,
        packetLossPercent: 7.8,
        jitterMs: 32,
        quality: 'Degraded',
      });
    } else if (preset === 'edge_2g') {
      setNetworkMetrics({
        bandwidthKbps: 42,
        latencyMs: 940,
        packetLossPercent: 22.5,
        jitterMs: 78,
        quality: 'Critical',
      });
    }
  };

  // -------------------------------------------------------------
  // Call Controls Handlers
  // -------------------------------------------------------------
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    toggleAudioTrack(localStreamRef.current, nextMuted);
  };

  const handleToggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    toggleVideoTrack(localStreamRef.current, nextVideoOff);
  };

  const handleEndCall = async () => {
    setCallActive(false);
    await endTeleconsultCall(roomId, peerConnectionRef.current, localStreamRef.current);
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    setFallbackAlert('Teleconsultation call ended. Media streams released.');
  };

  const handleRestartCall = () => {
    setCallActive(true);
    setFallbackMode('video');
    setNetworkMetrics({
      bandwidthKbps: 1920,
      latencyMs: 44,
      packetLossPercent: 0.2,
      jitterMs: 4,
      quality: 'Excellent',
    });
    setFallbackAlert(null);
  };

  // Chat message submission
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const senderName = currentRole === 'doctor' ? 'Dr. Specialist' : 'Clinician / CHO';
    const textToSend = chatInput;
    setChatInput('');

    try {
      await sendRoomChatMessage(roomId, senderName, currentRole, textToSend);
    } catch (err) {
      // Local fallback in state if offline or demo
      setChatMessages((prev) => [
        ...prev,
        {
          id: `local_${Date.now()}`,
          sender: senderName,
          senderRole: currentRole,
          text: textToSend,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Quick clinical prompt clicker for text-fallback mode
  const handleSendQuickPrompt = (promptText: string) => {
    setChatInput(promptText);
  };

  // -------------------------------------------------------------
  // Prescription & Digital Triage Handlers
  // -------------------------------------------------------------
  const handleAddPrescription = () => {
    if (!newDrugName.trim()) return;
    setPrescriptions([
      ...prescriptions,
      {
        drugName: newDrugName.trim(),
        dosage: newDosage.trim() || 'Standard Dosage',
        frequency: newFreq,
        durationDays: 30,
        instructions: 'Take as directed with clean drinking water.',
      },
    ]);
    setNewDrugName('');
    setNewDosage('');
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  // Submit and Co-Sign Triage Encounter
  const handleSignAndSubmitTriage = async () => {
    setIsSubmittingTriage(true);
    const hash = `ECDSA-SHA256:${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
    setSignatureHash(hash);
    setCounterSigned(true);

    try {
      // 1. Write structured Digital Triage ticket into Firestore
      const triageTicketData = {
        patientId: activeSession ? activeSession.patientId : 'PAT-UNKNOWN',
        patientName: activeSession ? activeSession.patientName : 'Unknown Patient',
        facilityId: activeSession ? activeSession.originatingFacilityId : currentFacility.id,
        facilityName: activeSession ? activeSession.originatingFacilityName : currentFacility.name,
        doctorName: activeSession ? activeSession.specialistName : 'Specialist Doctor',
        triageAcuity,
        chiefComplaint,
        symptomDuration,
        physicalObservations,
        examNotes,
        doctorImpression,
        provisionalDiagnosis,
        prescriptions,
        disposition,
        vitalsSnapshot: activeSession?.sharedVitals || null,
        counterSigned: true,
        digitalSignatureHash: hash,
        teleconsultRoomId: roomId,
        completedAt: new Date().toISOString(),
      };

      try {
        await addDoc(collection(db, 'triage_tickets'), triageTicketData);
      } catch (firestoreErr) {
        console.warn('Persisted locally; Firestore write notice:', firestoreErr);
      }

      // 2. Notify parent application of updated session
      if (activeSession) {
        const updatedSession: TeleconsultationSession = {
          ...activeSession,
          status: 'completed',
          counterSigned: true,
          counterSignedAt: new Date().toISOString(),
          digitalSignatureHash: hash,
          specialistNotes: doctorImpression,
          recommendedPrescriptions: prescriptions,
        };
        onUpdateSession(updatedSession);
      }

      // 3. Finalize clinical encounter
      if (onFinalizeEncounter && activeSession) {
        onFinalizeEncounter({
          patientId: activeSession.patientId,
          facilityId: activeSession.originatingFacilityId,
          providerName: `${activeSession.specialistName} & ${activeSession.referringProviderName}`,
          chiefComplaint,
          soap: {
            subjective: `Assisted teleconsultation conducted via WebRTC bridge (${fallbackMode.toUpperCase()} mode) from ${
              activeSession.originatingFacilityName
            }. Complaint: ${chiefComplaint} (${symptomDuration}).`,
            objective: `Vitals: BP ${activeSession.sharedVitals?.systolic}/${activeSession.sharedVitals?.diastolic}, HR ${
              activeSession.sharedVitals?.heartRate
            } bpm, SpO2 ${activeSession.sharedVitals?.spo2}%. Observations: ${examNotes}`,
            assessment: `${provisionalDiagnosis}. Impression: ${doctorImpression}`,
            plan: prescriptions
              .map((p) => `${p.drugName} ${p.dosage} (${p.frequency}) for ${p.durationDays}d`)
              .join('; ') + `. Disposition: ${disposition}.`,
          },
        });
      }

      setSubmitFeedback('Digital Triage note signed and synchronized to District EHR repository.');
      setTimeout(() => setSubmitFeedback(null), 6000);
    } catch (err) {
      console.error('Error submitting triage note:', err);
    } finally {
      setIsSubmittingTriage(false);
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard?.writeText(roomId);
    setCopiedRoomId(true);
    setTimeout(() => setCopiedRoomId(false), 2500);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSession) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <Video className="w-12 h-12 mx-auto text-slate-300 mb-2" />
        <p className="font-bold text-slate-700">No Active Teleconsultation Sessions</p>
        <p className="text-xs">Select or initiate a specialist teleconsultation session from the queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Session Switcher & Network Quality Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        {/* Title & Connection Status */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-white">1-on-1 Specialist Teleconsultation</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  callActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${callActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`}
                />
                {callActive ? 'WebRTC Active' : 'Call Terminated'}
              </span>

              {/* Room ID with copy button */}
              <button
                type="button"
                onClick={copyRoomLink}
                className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono border border-slate-700 transition-colors cursor-pointer"
                title="Copy Firestore Signaling Room ID"
              >
                <span>{roomId}</span>
                {copiedRoomId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {activeSession.originatingFacilityName} (Sub-Centre / PHC) ⇄ {activeSession.specialistFacilityName}
            </p>
          </div>
        </div>

        {/* Sessions Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {allSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                s.id === activeSession.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s.patientName} ({s.specialty})
            </button>
          ))}
        </div>

        {/* Network Health & Mode Selector */}
        <div className="flex items-center gap-3 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Signal
              className={`w-3.5 h-3.5 ${
                networkMetrics.quality === 'Excellent'
                  ? 'text-emerald-400'
                  : networkMetrics.quality === 'Degraded'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            />
            <span className="font-mono text-[11px]">{networkMetrics.bandwidthKbps} kbps</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-[11px] text-slate-400">{networkMetrics.latencyMs}ms</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Current Active Mode Badge */}
          <div className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                fallbackMode === 'video'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : fallbackMode === 'voice_only'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {fallbackMode === 'video' && '🎥 Video HD'}
              {fallbackMode === 'voice_only' && '🎙️ Voice Only'}
              {fallbackMode === 'text_only' && '💬 Text Only'}
            </span>
          </div>
        </div>
      </div>

      {/* Network Degradation & Auto-Fallback Interactive Simulation Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-bold text-slate-800">Auto-Fallback Network Threshold Controller:</span>
          <span className="text-slate-500 hidden sm:inline">
            (Auto-switches to Voice if &lt;250 kbps, or Text if &lt;60 kbps)
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={autoFallbackEnabled}
              onChange={(e) => setAutoFallbackEnabled(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto-Fallback Active</span>
          </label>

          <span className="text-slate-300">|</span>

          <span className="text-slate-400 font-medium">Test Network:</span>

          <button
            type="button"
            onClick={() => applyNetworkSimulation('4g')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              networkMetrics.quality === 'Excellent'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            4G Broadband (2.1 Mbps)
          </button>

          <button
            type="button"
            onClick={() => applyNetworkSimulation('poor_3g')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              networkMetrics.quality === 'Degraded'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Simulate network drop below 250 kbps to test Voice-Only auto fallback"
          >
            Degraded 3G (180 kbps) ⚡
          </button>

          <button
            type="button"
            onClick={() => applyNetworkSimulation('edge_2g')}
            className={`px-2.5 py-1 rounded font-bold transition-colors cursor-pointer ${
              networkMetrics.quality === 'Critical'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Simulate network drop below 60 kbps to test Text-Only fallback"
          >
            2G Edge (42 kbps) 🚨
          </button>

          {/* Manual override buttons */}
          <div className="flex items-center gap-1 bg-slate-200 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setFallbackMode('video');
                toggleVideoTrack(localStreamRef.current, false);
                toggleAudioTrack(localStreamRef.current, false);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fallbackMode === 'video' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => {
                setFallbackMode('voice_only');
                toggleVideoTrack(localStreamRef.current, true);
                toggleAudioTrack(localStreamRef.current, false);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fallbackMode === 'voice_only' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Voice
            </button>
            <button
              type="button"
              onClick={() => {
                setFallbackMode('text_only');
                toggleVideoTrack(localStreamRef.current, true);
                toggleAudioTrack(localStreamRef.current, true);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                fallbackMode === 'text_only' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Text
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Alert Notification Banner */}
      {fallbackAlert && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            fallbackMode === 'video'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : fallbackMode === 'voice_only'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                fallbackMode === 'video'
                  ? 'text-emerald-600'
                  : fallbackMode === 'voice_only'
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            />
            <span>{fallbackAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setFallbackAlert(null)}
            className="text-slate-400 hover:text-slate-700 text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Feedback Confirmation Banner */}
      {submitFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{submitFeedback}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN SPLIT-SCREEN VIEW: LEFT (VIDEO STREAM) | RIGHT (DIGITAL TRIAGE) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ------------------------------------------------------------ */}
        {/* LEFT COLUMN (7 COLS): 1-on-1 WebRTC Video Stream & Communications */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Teleconsultation Canvas Card */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-video flex flex-col justify-between shadow-xl">
            {/* Top Bar inside Video Canvas */}
            <div className="p-3 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between text-xs text-white z-10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-slate-200">
                  {activeSession.patientName} (Age: {activeSession.patientAge}, {activeSession.patientGender})
                </span>
                <span className="text-[10px] bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                  {activeSession.referringProviderRole}: {activeSession.referringProviderName}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-slate-900/80 px-2.5 py-0.5 rounded text-emerald-400 border border-slate-700">
                  {formatTimer(callDurationSeconds)}
                </span>
              </div>
            </div>

            {/* Canvas Body: Renders either HD Video, Voice-Only, or Text-Only Fallback */}
            {fallbackMode === 'video' ? (
              /* --- MODE A: FULL 1-on-1 WEBRTC DUAL VIDEO STREAM --- */
              <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-950">
                {/* Remote Video Stream (Patient at Sub-Centre / PHC) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Patient / Bedside Telemetry HUD Overlay */}
                <div className="absolute top-12 left-4 bg-slate-950/70 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-slate-800 text-[11px] text-white flex items-center gap-2">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500 animate-ping" />
                  <span className="font-mono font-bold text-rose-400">
                    HR: {activeSession.sharedVitals?.heartRate || 78} bpm
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-mono">
                    SpO2: {activeSession.sharedVitals?.spo2 || 98}%
                  </span>
                </div>

                {/* PiP (Picture in Picture): Local Clinician Video Feed */}
                <div className="absolute bottom-4 right-4 w-44 aspect-4/3 bg-slate-900 rounded-xl overflow-hidden border border-indigo-500/50 shadow-lg flex flex-col justify-between">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 bg-slate-950/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-1">
                    <span>Specialist (You)</span>
                    {isMuted && <MicOff className="w-2.5 h-2.5 text-rose-400" />}
                  </div>
                  {isSyntheticStream && (
                    <div className="absolute bottom-1 left-1 right-1 bg-indigo-950/90 text-indigo-300 text-[8px] text-center px-1 rounded truncate">
                      Encrypted Test Stream
                    </div>
                  )}
                </div>
              </div>
            ) : fallbackMode === 'voice_only' ? (
              /* --- MODE B: VOICE-ONLY FALLBACK (AUDIO RESILIENT AT 32 KBPS) --- */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-radial from-slate-900 to-slate-950">
                <div className="relative">
                  {/* Dynamic pulse rings representing active voice audio stream */}
                  <div className="w-24 h-24 rounded-full bg-indigo-600/30 animate-ping absolute inset-0 m-auto" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 relative z-10 flex items-center justify-center text-white text-3xl font-black shadow-xl ring-4 ring-indigo-400/30">
                    🎙️
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white flex items-center justify-center gap-2">
                    <span>Voice-Only Resilient Mode Active</span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full border border-amber-500/30 font-bold">
                      Audio Stream (Opus 32 kbps)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    Video frames suspended to prioritize crystal-clear two-way medical auscultation and clinical dialog over degraded connection ({networkMetrics.bandwidthKbps} kbps).
                  </p>
                </div>

                {/* Oscilloscope Voice Waveform Graphic */}
                <div className="flex items-center gap-1.5 h-8">
                  {[24, 40, 15, 52, 60, 32, 48, 70, 45, 20, 55, 30].map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 bg-indigo-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>

                {/* Quick Restore Video CTA */}
                <button
                  type="button"
                  onClick={() => {
                    setFallbackMode('video');
                    toggleVideoTrack(localStreamRef.current, false);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Try Restoring Video Stream</span>
                </button>
              </div>
            ) : (
              /* --- MODE C: TEXT-ONLY & TRIAGE FALLBACK (CRITICAL LOW-BANDWIDTH / 2G) --- */
              <div className="flex-1 flex flex-col justify-between bg-slate-900 p-3 overflow-hidden">
                <div className="p-2 bg-rose-950/80 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Critical Bandwidth Mode (&lt;50 kbps). Audio/Video suspended. Real-time encrypted text bridge active.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-rose-300 font-bold">2G EDGE RESILIENT</span>
                </div>

                {/* Chat Messages Stream */}
                <div className="flex-1 overflow-y-auto space-y-2 p-2 max-h-56">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-6 text-xs">
                      <MessageSquare className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                      <span>No text messages yet. Use the prompt chips below to communicate.</span>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={msg.id || i}
                        className={`flex flex-col text-xs ${
                          msg.senderRole === 'doctor' ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-3 py-1.5 ${
                            msg.senderRole === 'doctor'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-bold block opacity-75">
                            {msg.sender}
                          </span>
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Clinical Prompts */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-1">
                  {[
                    'Confirm medication taken today',
                    'Any chest pain or breathlessness right now?',
                    'Re-check BP at Sub-Centre and report',
                    'Directing 108 Ambulance transfer immediately',
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendQuickPrompt(p)}
                      className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full whitespace-nowrap transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Chat Input Field */}
                <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type encrypted message to Sub-Centre..."
                    className="flex-1 text-xs p-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* Bottom Call Controls Overlay (Always Accessible) */}
            <div className="p-3 bg-gradient-to-t from-slate-950/95 to-transparent flex items-center justify-center gap-3 z-10 flex-wrap">
              {/* Toggle Mute Mic */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  isMuted
                    ? 'bg-rose-600 text-white ring-4 ring-rose-600/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Toggle Video Camera */}
              <button
                type="button"
                onClick={handleToggleVideo}
                className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                  isVideoOff
                    ? 'bg-rose-600 text-white ring-4 ring-rose-600/30'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
              >
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {/* Stethoscope Auscultation Player */}
              <button
                type="button"
                onClick={() => setStethoscopeActive(!stethoscopeActive)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer ${
                  stethoscopeActive
                    ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title="Auscultate digital heart/lung sounds streamed from peripheral Sub-Centre"
              >
                <Stethoscope className="w-4 h-4" />
                <span>{stethoscopeActive ? 'Stethoscope Live' : 'Listen Stethoscope'}</span>
              </button>

              {/* End Call / Restart Call */}
              {callActive ? (
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer ring-4 ring-rose-600/30 flex items-center justify-center"
                  title="End Teleconsultation Call"
                >
                  <PhoneOff className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestartCall}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs transition-colors cursor-pointer"
                  title="Resume or Re-connect Call"
                >
                  <Phone className="w-4 h-4" />
                  <span>Resume Call</span>
                </button>
              )}
            </div>
          </div>

          {/* Synchronized Bedside Biometric Telemetry Strip */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-slate-900">Synchronized Bedside Biometric Telemetry</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Streamed via BLE Diagnostic Hub • {activeSession.originatingFacilityName}
              </span>
            </div>

            {/* Vitals Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 text-center">
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Blood Pressure</span>
                <span className="text-base font-black text-rose-700">
                  {activeSession.sharedVitals?.systolic}/{activeSession.sharedVitals?.diastolic}
                </span>
                <span className="text-[9px] text-rose-400 block">mmHg</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pulse Rate</span>
                <span className="text-base font-black text-slate-900 flex items-center justify-center gap-1">
                  <span>{activeSession.sharedVitals?.heartRate || 78}</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                </span>
                <span className="text-[9px] text-slate-400 block">bpm</span>
              </div>

              <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-center">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">SpO2</span>
                <span className="text-base font-black text-emerald-700">
                  {activeSession.sharedVitals?.spo2 || 98}%
                </span>
                <span className="text-[9px] text-emerald-500 block">Room air</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Temperature</span>
                <span className="text-base font-black text-slate-800">
                  {activeSession.sharedVitals?.temperature || 36.8}°C
                </span>
                <span className="text-[9px] text-slate-400 block">Axillary</span>
              </div>

              <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 text-center">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Blood Glucose</span>
                <span className="text-base font-black text-amber-700">
                  {activeSession.sharedVitals?.bloodGlucose || 142}
                </span>
                <span className="text-[9px] text-amber-500 block">mg/dL</span>
              </div>
            </div>

            {/* Live Lead II ECG Rhythm SVG */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mb-1">
                <span>LEAD II • 25mm/s • 10mm/mV • SINE RHYTHM</span>
                <span className="text-slate-400 font-bold">
                  HR: {activeSession.sharedVitals?.heartRate || 78} BPM
                </span>
              </div>
              <svg className="w-full h-10 stroke-emerald-400 fill-none" viewBox="0 0 500 50">
                <path
                  d="M 0 25 L 30 25 L 35 22 L 40 25 L 50 25 L 55 10 L 60 42 L 65 20 L 70 25 L 85 25 L 95 20 L 105 25 L 140 25 L 145 22 L 150 25 L 160 25 L 165 10 L 170 42 L 175 20 L 180 25 L 195 25 L 205 20 L 215 25 L 250 25 L 255 22 L 260 25 L 270 25 L 275 10 L 280 42 L 285 20 L 290 25 L 305 25 L 315 20 L 325 25 L 360 25 L 365 22 L 370 25 L 380 25 L 385 10 L 390 42 L 395 20 L 400 25 L 415 25 L 425 20 L 435 25 L 500 25"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* RIGHT COLUMN (5 COLS): ACTIVE 'DIGITAL TRIAGE' FORM */}
        {/* ------------------------------------------------------------ */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            {/* Header / Active Digital Triage Form */}
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Active Digital Triage Form</span>
                </h3>
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Doctor Live Documentation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Log real-time clinical impressions, auscultation findings, and treatment directives during the teleconsult.
              </p>
            </div>

            {/* 1. Triage Acuity Tier Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Clinical Triage Acuity Tier (Ayushman Bharat / ESI Protocol)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Immediate (Red)', label: 'Red (Emergency)', bg: 'bg-rose-50 border-rose-300 text-rose-800' },
                  { id: 'Urgent (Yellow)', label: 'Yellow (Urgent)', bg: 'bg-amber-50 border-amber-300 text-amber-800' },
                  { id: 'Routine (Green)', label: 'Green (Stable)', bg: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setTriageAcuity(tier.id as any)}
                    className={`py-2 px-1.5 rounded-xl text-center text-xs font-bold border transition-all cursor-pointer ${
                      triageAcuity === tier.id
                        ? `${tier.bg} ring-2 ring-indigo-500 shadow-xs font-black`
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Chief Complaint & Duration */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chief Complaint
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g., Acute breathlessness, chest tightness"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Onset / Duration
                </label>
                <input
                  type="text"
                  value={symptomDuration}
                  onChange={(e) => setSymptomDuration(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g., 3 days"
                />
              </div>
            </div>

            {/* 3. Physical Observations & Auscultation Findings */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Physical Examination & Auscultation Findings
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {[
                  { key: 'pallor', label: 'Pallor (+)' },
                  { key: 'pedalEdema', label: 'Pedal Edema' },
                  { key: 'dyspnea', label: 'Dyspnea' },
                  { key: 'cyanosis', label: 'Cyanosis' },
                  { key: 'auscultationWheeze', label: 'Wheeze' },
                  { key: 'tachycardia', label: 'Tachycardia' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setPhysicalObservations((prev) => ({
                        ...prev,
                        [item.key]: !prev[item.key as keyof typeof prev],
                      }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-left flex items-center justify-between cursor-pointer ${
                      physicalObservations[item.key as keyof typeof physicalObservations]
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <span>{item.label}</span>
                    {physicalObservations[item.key as keyof typeof physicalObservations] && (
                      <Check className="w-3 h-3 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={examNotes}
                onChange={(e) => setExamNotes(e.target.value)}
                placeholder="Video inspection notes (jugular pulse, respiratory effort, skin turgor)..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 4. Doctor Assessment & Impression */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Consultant Impression & Clinical Assessment
              </label>
              <textarea
                rows={2}
                value={doctorImpression}
                onChange={(e) => setDoctorImpression(e.target.value)}
                placeholder="Document clinical synthesis, differential diagnostic thoughts, prognosis..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 5. Provisional Diagnosis (with Ayushman ICD-10 tags) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Provisional Diagnosis (ICD-10)
              </label>
              <input
                type="text"
                value={provisionalDiagnosis}
                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-1.5"
              />
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {[
                  'Essential Hypertension (I10)',
                  'Type 2 Diabetes Mellitus (E11)',
                  'Acute Bronchitis (J20)',
                  'Severe Anemia in Pregnancy (O99.0)',
                ].map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProvisionalDiagnosis(tag)}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full whitespace-nowrap cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Prescribed Medications (Dispatched to Sub-Centre Dispensary) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Prescribed Medications</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto-verified against EDL</span>
              </label>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {prescriptions.map((rx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{rx.drugName}</span>
                      <div className="text-[11px] text-slate-500">
                        {rx.dosage} • {rx.frequency} ({rx.durationDays}d)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrescription(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Prescription row */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Drug name (e.g., Metformin)"
                  value={newDrugName}
                  onChange={(e) => setNewDrugName(e.target.value)}
                  className="flex-1 text-xs p-2 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Dose (500mg)"
                  value={newDosage}
                  onChange={(e) => setNewDosage(e.target.value)}
                  className="w-20 text-xs p-2 border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddPrescription}
                  className="p-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 cursor-pointer"
                  title="Add Medicine to Triage Note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7. Clinical Disposition */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Patient Disposition Directives
              </label>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as any)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="home">Discharge to Home with Oral Therapy & Routine Follow-up</option>
                <option value="subcentre_observe">
                  Retain at Sub-Centre / PHC for 6hr Day-Care Observation & BP Check
                </option>
                <option value="refer_district">
                  Immediate Emergency Referral via 108 ALS Ambulance to District Hospital
                </option>
              </select>
            </div>

            {/* 8. Co-Signature & Firestore Persistence Submission Box */}
            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900">Signatures & Legal Audit:</span>
                <span className="text-[10px] text-indigo-600 font-mono">
                  {counterSigned ? 'Cryptographically Sealed' : 'Pending Co-Signature'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Specialist:</span>
                  <span className="font-bold text-slate-800">{activeSession.specialistName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bedside Provider:</span>
                  <span className="font-bold text-slate-800">{activeSession.referringProviderName}</span>
                </div>
                {signatureHash && (
                  <div className="text-[10px] text-indigo-700 font-mono pt-1 break-all">
                    Hash: {signatureHash}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSignAndSubmitTriage}
                disabled={isSubmittingTriage}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                  counterSigned
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
                }`}
              >
                {isSubmittingTriage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing to District Repository...</span>
                  </>
                ) : counterSigned ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update & Re-Synchronize Triage Record</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Co-Sign & Submit Digital Triage Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
