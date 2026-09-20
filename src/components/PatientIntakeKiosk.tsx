import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  HeartPulse,
  User,
  Activity,
  ArrowRight,
  RotateCcw,
  Languages,
  Shield,
  Send,
  Sliders,
  Check,
  Building2,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { SupportedLanguage, t } from '../i18n/translations';
import { Facility, QueueItem, ESITier } from '../types';
import { FrontlineLanguageToggle } from './FrontlineLanguageToggle';

interface ExtractedEntities {
  patientAge: number | null;
  gender: 'male' | 'female' | 'other' | 'unspecified';
  primarySymptoms: string[];
  duration: string;
  painLevel: number; // 0-10
  chiefComplaint: string;
  detectedLanguage?: string;
  triageUrgency?: string;
  suggestedDepartment?: string;
  transcribedSummaryRegional?: string;
  source?: string;
}

interface PatientIntakeKioskProps {
  currentFacility: Facility;
  currentLang: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onRegisterPatientQueue?: (queueItem: QueueItem) => void;
  onClose?: () => void;
}

// Voice recognition regional Indian language configurations
interface SpeechLanguageOption {
  code: string;
  label: string;
  native: string;
  flag: string;
}

const SPEECH_LANGUAGES: SpeechLanguageOption[] = [
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी', flag: '🚩' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { code: 'en-IN', label: 'English (India)', native: 'English', flag: '🌐' },
];

// Presets for instant clinical demonstration and testing in field clinics
const SAMPLE_REGIONAL_TRANSCRIPTS = [
  {
    id: 'sample_mr_1',
    lang: 'Marathi',
    langCode: 'mr-IN',
    title: 'पोटदुखी व उलट्या (वय ४२, पुरुष)',
    text: 'मला दोन दिवसांपासून तीव्र पोटदुखी आणि उलट्या होत आहेत. वय 42, पुरुष. वेदना खूप जास्त आहेत, 8/10.',
  },
  {
    id: 'sample_hi_1',
    lang: 'Hindi',
    langCode: 'hi-IN',
    title: 'सिरदर्द व चक्कर (उम्र ३५, महिला)',
    text: 'मेरी उम्र 35 साल है, महिला। मुझे 3 दिन से बहुत तेज सिरदर्द और चक्कर आ रहे हैं। दर्द का स्तर 7 है।',
  },
  {
    id: 'sample_ta_1',
    lang: 'Tamil',
    langCode: 'ta-IN',
    title: 'காய்ச்சல் மற்றும் இருமல் (வயது 28, ஆண்)',
    text: 'எனக்கு 4 நாட்களாக கடுமையான காய்ச்சல் மற்றும் இருமல் உள்ளது. வயது 28, ஆண். வலி நிலை 6.',
  },
  {
    id: 'sample_en_1',
    lang: 'English',
    langCode: 'en-IN',
    title: 'Chest tightness & Dyspnea (Age 56, Male)',
    text: 'Patient is a 56 year old male experiencing severe chest tightness radiating to the left arm and shortness of breath for the past 2 hours. Pain level is 9 out of 10.',
  },
];

export const PatientIntakeKiosk: React.FC<PatientIntakeKioskProps> = ({
  currentFacility,
  currentLang,
  onChangeLanguage,
  onRegisterPatientQueue,
  onClose,
}) => {
  // Input mode: 'voice' | 'text'
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [speechLang, setSpeechLang] = useState<string>('mr-IN');
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechApiSupported, setSpeechApiSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Manual patient metadata
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');

  // AI Extraction state
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedEntities | null>(null);
  const [newSymptomInput, setNewSymptomInput] = useState<string>('');

  // Submission / Queue status
  const [registeredItem, setRegisteredItem] = useState<QueueItem | null>(null);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState<boolean>(false);

  // Speech Recognition instance ref
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechApiSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalStr += result[0].transcript + ' ';
          } else {
            interimStr += result[0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalStr.trim()}` : finalStr.trim()));
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError(
            'Microphone access denied. Please allow microphone permissions in your browser bar, or switch to Text Input.'
          );
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Speech recognition notice: ${event.error}. You may type text directly.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition initialization error:', e);
      setSpeechApiSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, [speechLang]);

  // Sync speech language when app language changes
  useEffect(() => {
    if (currentLang === 'mr') {
      setSpeechLang('mr-IN');
    } else if (currentLang === 'hi') {
      setSpeechLang('hi-IN');
    } else if (currentLang === 'en') {
      setSpeechLang('en-IN');
    }
  }, [currentLang]);

  // Handle Speech Toggle
  const toggleListening = () => {
    if (!speechApiSupported) {
      setSpeechError('Web Speech API is not supported in this browser. Please use text input.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error(e);
      }
      setIsListening(false);
    } else {
      setSpeechError(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = speechLang;
          recognitionRef.current.start();
        }
      } catch (e: any) {
        console.error('Error starting speech recognition:', e);
        setSpeechError('Could not access microphone. Please ensure microphone permissions are granted.');
        setIsListening(false);
      }
    }
  };

  // Call Gemini 3.8 Flash API to extract medical entities
  const handleExtractEntities = async (overrideTranscript?: string) => {
    const textToProcess = (overrideTranscript ?? transcript).trim();
    if (!textToProcess) {
      setExtractionError('Please provide a voice transcript or type patient symptoms first.');
      return;
    }

    setIsExtracting(true);
    setExtractionError(null);

    // Stop microphone if currently recording
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (_) {}
    }

    try {
      const response = await fetch('/api/kiosk/extract-entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToProcess,
          languageCode: speechLang,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setExtractedData({
          patientAge: data.patientAge,
          gender: data.gender || 'unspecified',
          primarySymptoms: data.primarySymptoms || [],
          duration: data.duration || 'Unspecified',
          painLevel: typeof data.painLevel === 'number' ? data.painLevel : 0,
          chiefComplaint: data.chiefComplaint || textToProcess.slice(0, 80),
          detectedLanguage: data.detectedLanguage || 'Regional',
          triageUrgency: data.triageUrgency || 'Semi-Urgent (Green)',
          suggestedDepartment: data.suggestedDepartment || 'General Outpatient Clinic',
          transcribedSummaryRegional: data.transcribedSummaryRegional || textToProcess,
          source: data.source || 'gemini-3.8-flash',
        });
      } else {
        throw new Error(data.error || 'Failed to extract medical entities');
      }
    } catch (err: any) {
      console.error('Entity extraction error:', err);
      setExtractionError(err.message || 'Error communicating with Gemini 3.8 Flash API.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Preset sample transcript selector
  const handleSelectSample = (sampleText: string, sampleLangCode: string) => {
    setTranscript(sampleText);
    setSpeechLang(sampleLangCode);
    handleExtractEntities(sampleText);
  };

  // Read out confirmation summary via Web Speech Synthesis (TTS)
  const handleSpeakSummary = () => {
    if (!extractedData || !('speechSynthesis' in window)) return;

    if (isSpeakingSummary) {
      window.speechSynthesis.cancel();
      setIsSpeakingSummary(false);
      return;
    }

    const textToSpeak =
      extractedData.transcribedSummaryRegional ||
      `${extractedData.chiefComplaint}. Pain level ${extractedData.painLevel} out of 10.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Pick speech voice
    if (speechLang === 'mr-IN') utterance.lang = 'mr-IN';
    else if (speechLang === 'hi-IN') utterance.lang = 'hi-IN';
    else if (speechLang === 'ta-IN') utterance.lang = 'ta-IN';
    else utterance.lang = 'en-IN';

    utterance.onend = () => setIsSpeakingSummary(false);
    utterance.onerror = () => setIsSpeakingSummary(false);

    setIsSpeakingSummary(true);
    window.speechSynthesis.speak(utterance);
  };

  // Register patient into Clinic Queue
  const handleRegisterPatient = () => {
    if (!extractedData) return;

    const tokenNum = `KIO-${Math.floor(100 + Math.random() * 900)}`;
    const randomWait = Math.max(10, 30 - extractedData.painLevel * 2);

    let esi: ESITier = 4;
    if (extractedData.triageUrgency?.includes('Immediate')) esi = 1;
    else if (extractedData.triageUrgency?.includes('Emergent')) esi = 2;
    else if (extractedData.triageUrgency?.includes('Urgent')) esi = 3;
    else if (extractedData.triageUrgency?.includes('Semi-Urgent')) esi = 4;
    else esi = 5;

    const newQueueItem: QueueItem = {
      id: `queue_${Date.now()}`,
      tokenNumber: tokenNum,
      patientId: `pat_${Date.now().toString().slice(-6)}`,
      patientName: patientName.trim() || `Patient (${extractedData.gender === 'female' ? 'F' : 'M'}, ${extractedData.patientAge ?? 'Age ?'})`,
      patientAge: extractedData.patientAge ?? 35,
      patientGender:
        extractedData.gender === 'female'
          ? 'Female'
          : extractedData.gender === 'male'
          ? 'Male'
          : 'Other',
      facilityId: currentFacility.id,
      department: extractedData.suggestedDepartment || 'General Outpatient Clinic',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isWalkIn: true,
      status: 'waiting',
      estimatedWaitMinutes: randomWait,
      priorityWeight: 50 + extractedData.painLevel * 4,
      notes: `Kiosk Intake (${extractedData.detectedLanguage || 'Regional'} Voice/Text): ${extractedData.chiefComplaint}`,
      triageAssessment: {
        id: `triage_${Date.now()}`,
        patientId: `pat_${Date.now().toString().slice(-6)}`,
        patientName: patientName.trim() || 'Kiosk Patient',
        evaluatedAt: new Date().toISOString(),
        esiTier: esi,
        urgencyScore: 40 + extractedData.painLevel * 5,
        priorityCategory:
          (extractedData.triageUrgency as any) || 'Semi-Urgent (Green)',
        targetWaitMinutes: randomWait,
        chiefComplaint: extractedData.chiefComplaint,
        symptomsDuration: extractedData.duration,
        painScore: extractedData.painLevel,
        vitalsSnapshot: {
          heartRate: 76 + Math.round(extractedData.painLevel * 2.5),
          temperature: extractedData.primarySymptoms.some((s) => s.toLowerCase().includes('fever')) ? 101.4 : 98.6,
          spo2: 98,
        },
        criticalRedFlags: extractedData.painLevel >= 8 ? ['Severe pain intensity', 'Immediate observation required'] : [],
        immediateBedsideActions: ['Assign to primary consultation room', 'Collect baseline vitals'],
        departmentAllocation: extractedData.suggestedDepartment || 'General Outpatient Clinic',
        clinicalReasoning: `Structured entity extraction from ${extractedData.detectedLanguage} speech via Gemini 3.8 Flash.`,
        source: 'gemini-3.8-flash',
      },
    };

    setRegisteredItem(newQueueItem);
    if (onRegisterPatientQueue) {
      onRegisterPatientQueue(newQueueItem);
    }
  };

  // Reset form
  const handleReset = () => {
    setTranscript('');
    setInterimTranscript('');
    setExtractedData(null);
    setRegisteredItem(null);
    setSpeechError(null);
    setExtractionError(null);
    setPatientName('');
    setPatientPhone('');
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }
  };

  // Add custom symptom tag
  const handleAddSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymptomInput.trim() || !extractedData) return;
    setExtractedData({
      ...extractedData,
      primarySymptoms: [...extractedData.primarySymptoms, newSymptomInput.trim()],
    });
    setNewSymptomInput('');
  };

  // Remove symptom tag
  const handleRemoveSymptom = (index: number) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      primarySymptoms: extractedData.primarySymptoms.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-8rem)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card with Instant Frontline Language Toggle */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Frontline Kiosk • ABHA / ESI Ready
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {currentFacility.name} ({currentFacility.tier.toUpperCase()})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {t('patientIntakeKiosk', currentLang)}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              {t('kioskSubtitle', currentLang)}
            </p>
          </div>

          {/* Instant Language Toggle between English, Hindi, and Marathi */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <FrontlineLanguageToggle
              currentLang={currentLang}
              onChangeLang={onChangeLanguage}
              size="md"
              showLabel={true}
            />
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Success Registration Confirmation Modal/Banner */}
        {registeredItem && (
          <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-emerald-950">
                      {t('intakeSuccessMessage', currentLang) || 'Patient Successfully Registered!'}
                    </h3>
                    <span className="px-3 py-1 rounded-md bg-emerald-700 text-white font-mono font-extrabold text-sm tracking-wider">
                      TOKEN: {registeredItem.tokenNumber}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-800 mt-1">
                    Assigned to: <strong className="font-semibold">{registeredItem.department}</strong> • Est. Wait:{' '}
                    <strong className="font-semibold">{registeredItem.estimatedWaitMinutes} mins</strong> • Priority:{' '}
                    <strong className="font-semibold">
                      {registeredItem.triageAssessment?.priorityCategory || 'Semi-Urgent (Green)'}
                    </strong>
                  </p>
                  {extractedData?.transcribedSummaryRegional && (
                    <p className="text-xs text-emerald-900/80 mt-2 italic bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-300/60">
                      "{extractedData.transcribedSummaryRegional}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={handleSpeakSummary}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 cursor-pointer shadow-2xs"
                >
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>{isSpeakingSummary ? 'Stop Audio' : 'Play Regional Audio'}</span>
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Next Patient Intake</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Input Stage (Voice/Text) vs. Gemini Structured Medical Entities */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Panel (Multilingual Voice & Text) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
              {/* Mode Selector Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setInputMode('voice')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      inputMode === 'voice'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>{t('voiceInput', currentLang) || 'Voice (Web Speech API)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      inputMode === 'text'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>{t('textInput', currentLang) || 'Manual Text'}</span>
                  </button>
                </div>

                {/* Speech Language Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Audio Dialect:</span>
                  <select
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value)}
                    className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SPEECH_LANGUAGES.map((sl) => (
                      <option key={sl.code} value={sl.code}>
                        {sl.flag} {sl.native} ({sl.label})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patient Basic Info (Optional Name / Contact) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Patient Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g., रमेश जाधव / Sunita Patil"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Phone / ABHA Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g., +91 98201 54321"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Voice Input Interface */}
              {inputMode === 'voice' && (
                <div className="space-y-4">
                  {/* Microphone Status Card */}
                  <div
                    className={`rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all border ${
                      isListening
                        ? 'bg-rose-50/70 border-rose-300 shadow-inner'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      id="kiosk-mic-button"
                      onClick={toggleListening}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-transform transform active:scale-95 shadow-md ${
                        isListening
                          ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-100'
                      }`}
                      title={isListening ? 'Click to Stop Recording' : 'Click to Speak'}
                    >
                      {isListening ? (
                        <Mic className="w-9 h-9 animate-bounce" />
                      ) : (
                        <Mic className="w-9 h-9" />
                      )}
                    </button>

                    <div className="mt-4">
                      <p className="text-sm font-bold text-slate-800">
                        {isListening
                          ? t('listening', currentLang) || 'Listening... Speak symptoms in Marathi, Hindi, Tamil, or English'
                          : t('startSpeaking', currentLang) || 'Tap Microphone to Speak'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Web Speech API captures patient dialect ({speechLang}) in real time
                      </p>
                    </div>

                    {/* Listening Audio Waveform Simulation */}
                    {isListening && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-pulse" />
                        <span className="w-1.5 h-10 bg-rose-600 rounded-full animate-pulse delay-75" />
                        <span className="w-1.5 h-4 bg-rose-400 rounded-full animate-pulse delay-150" />
                        <span className="w-1.5 h-8 bg-rose-500 rounded-full animate-pulse delay-100" />
                        <span className="w-1.5 h-5 bg-rose-600 rounded-full animate-pulse delay-200" />
                      </div>
                    )}
                  </div>

                  {speechError && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Speech Recognition Notice:</span> {speechError}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Text Box (Editable and live streaming) */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Captured Transcript / Patient Description</span>
                  </label>
                  {transcript && (
                    <button
                      type="button"
                      onClick={() => setTranscript('')}
                      className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
                    >
                      Clear Text
                    </button>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    value={transcript + (interimTranscript ? ` ${interimTranscript}` : '')}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="E.g., मला दोन दिवसांपासून तीव्र पोटदुखी आणि उलट्या होत आहेत. वय 42, पुरुष. वेदना खूप जास्त आहेत, 8/10."
                    className="w-full text-xs sm:text-sm p-3.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-sans shadow-inner resize-y leading-relaxed"
                  />
                  {interimTranscript && (
                    <span className="absolute bottom-2.5 right-3 text-[10px] font-semibold text-rose-500 animate-pulse bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Live speech stream...
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Run Gemini 3.8 Flash Extraction */}
              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  id="extract-entities-btn"
                  onClick={() => handleExtractEntities()}
                  disabled={isExtracting || !transcript.trim()}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-xs cursor-pointer ${
                    isExtracting || !transcript.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:opacity-95 shadow-indigo-200'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 text-amber-300 ${isExtracting ? 'animate-spin' : ''}`} />
                  <span>
                    {isExtracting
                      ? t('extractingEntities', currentLang) || 'Extracting via Gemini 3.8 Flash...'
                      : 'Extract Medical Entities (Gemini 3.8 Flash)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t('resetKiosk', currentLang) || 'Reset'}</span>
                </button>
              </div>

              {extractionError && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Extraction Notice:</span> {extractionError}
                  </div>
                </div>
              )}
            </div>

            {/* Field Testing Audio / Dialect Presets Card */}
            <div className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                  {t('sampleTranscript', currentLang) || 'One-Click Regional Voice Samples (Marathi / Hindi / Tamil / English)'}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                  Field Test Presets
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Click any preset to load authentic regional clinical transcripts and run instant medical entity extraction:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SAMPLE_REGIONAL_TRANSCRIPTS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample.text, sample.langCode)}
                    className="text-left p-2.5 rounded-xl bg-white hover:bg-indigo-50/70 border border-slate-200/90 hover:border-indigo-300 text-xs transition-all cursor-pointer shadow-2xs group"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800 group-hover:text-indigo-900">
                      <span className="truncate">{sample.title}</span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {sample.lang}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 italic">
                      "{sample.text}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Structured Extracted Entities via Gemini 3.8 Flash Strict JSON Schema */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        {t('extractedEntities', currentLang) || 'Extracted Clinical Entities'}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Strict JSON Schema validated by Gemini 3.8 Flash API
                      </p>
                    </div>
                  </div>

                  {extractedData?.source && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                      {extractedData.source}
                    </span>
                  )}
                </div>

                {!extractedData && !isExtracting && (
                  <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                    <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">Awaiting Patient Audio or Text</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                      Capture patient voice or select a regional preset on the left. The Gemini 3.8 Flash engine
                      will extract Age, Gender, Primary Symptoms, Duration, and Pain Level in strict JSON format.
                    </p>
                  </div>
                )}

                {isExtracting && (
                  <div className="py-16 text-center border border-indigo-200 rounded-2xl p-6 bg-indigo-50/30">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-indigo-950">
                      Processing Regional Indian Dialect...
                    </h4>
                    <p className="text-xs text-indigo-700/80 mt-1 max-w-sm mx-auto">
                      Gemini 3.8 Flash is parsing clinical terminology and normalizing symptoms into strict healthcare JSON schema.
                    </p>
                  </div>
                )}

                {extractedData && (
                  <div className="space-y-4">
                    {/* Primary Medical Entity Fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* Patient Age */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {t('patientAge', currentLang) || 'Patient Age'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={extractedData.patientAge ?? ''}
                            onChange={(e) =>
                              setExtractedData({
                                ...extractedData,
                                patientAge: e.target.value ? parseInt(e.target.value, 10) : null,
                              })
                            }
                            placeholder="Unknown"
                            className="w-20 text-base font-extrabold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-xs font-semibold text-slate-600">years</span>
                        </div>
                      </div>

                      {/* Gender */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {t('gender', currentLang) || 'Gender'}
                        </span>
                        <select
                          value={extractedData.gender}
                          onChange={(e) =>
                            setExtractedData({
                              ...extractedData,
                              gender: e.target.value as any,
                            })
                          }
                          className="w-full text-xs font-bold text-slate-900 bg-white px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                        >
                          <option value="male">Male (पुरुष / ஆண்)</option>
                          <option value="female">Female (महिला / பெண்)</option>
                          <option value="other">Other</option>
                          <option value="unspecified">Unspecified</option>
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          {t('duration', currentLang) || 'Duration'}
                        </span>
                        <input
                          type="text"
                          value={extractedData.duration}
                          onChange={(e) =>
                            setExtractedData({
                              ...extractedData,
                              duration: e.target.value,
                            })
                          }
                          className="w-full text-xs font-bold text-slate-900 bg-white px-2 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Pain Level (0 to 10) with Numeric Meter */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-600" />
                          {t('painLevel', currentLang) || 'Pain Level (0 - 10 Scale)'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                              extractedData.painLevel >= 8
                                ? 'bg-rose-100 text-rose-800'
                                : extractedData.painLevel >= 5
                                ? 'bg-amber-100 text-amber-800'
                                : extractedData.painLevel >= 2
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {extractedData.painLevel} / 10 •{' '}
                            {extractedData.painLevel >= 8
                              ? 'Severe / Acute'
                              : extractedData.painLevel >= 5
                              ? 'Moderate'
                              : extractedData.painLevel >= 2
                              ? 'Mild'
                              : 'No Pain'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">0</span>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={extractedData.painLevel}
                          onChange={(e) =>
                            setExtractedData({
                              ...extractedData,
                              painLevel: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-rose-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                        />
                        <span className="text-xs font-bold text-slate-400">10</span>
                      </div>
                    </div>

                    {/* Primary Symptoms Tags */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        {t('primarySymptoms', currentLang) || 'Primary Symptoms (Standardized Medical Terms)'}
                      </span>

                      <div className="flex flex-wrap gap-2 mb-2.5">
                        {extractedData.primarySymptoms.map((symptom, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-200"
                          >
                            <span>{symptom}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSymptom(idx)}
                              className="text-indigo-400 hover:text-indigo-700 ml-0.5 cursor-pointer"
                              title="Remove symptom"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add extra symptom */}
                      <form onSubmit={handleAddSymptom} className="flex gap-2">
                        <input
                          type="text"
                          value={newSymptomInput}
                          onChange={(e) => setNewSymptomInput(e.target.value)}
                          placeholder="Add other symptom (e.g. Diarrhea, Vertigo)..."
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                        >
                          + Add
                        </button>
                      </form>
                    </div>

                    {/* Chief Complaint & Triage Summary */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-600">Chief Complaint (Clinical):</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          Lang: {extractedData.detectedLanguage}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{extractedData.chiefComplaint}</p>

                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 font-medium">Triage Priority: </span>
                          <span
                            className={`font-bold ml-1 ${
                              extractedData.triageUrgency?.includes('Immediate') ||
                              extractedData.triageUrgency?.includes('Emergent')
                                ? 'text-rose-700'
                                : extractedData.triageUrgency?.includes('Urgent')
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {extractedData.triageUrgency}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Bay: </span>
                          <span className="font-bold text-slate-800 ml-1">
                            {extractedData.suggestedDepartment}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Regional Speech Confirmation Text */}
                    {extractedData.transcribedSummaryRegional && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold block text-[11px] text-amber-700 uppercase tracking-wider mb-0.5">
                            Patient-Facing Confirmation ({extractedData.detectedLanguage})
                          </span>
                          <p className="italic">"{extractedData.transcribedSummaryRegional}"</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleSpeakSummary}
                          className="shrink-0 p-2 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100/50 cursor-pointer"
                          title="Speak confirmation in regional language"
                        >
                          <Volume2 className="w-4 h-4 text-amber-700" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Action: Register into Queue */}
              {extractedData && !registeredItem && (
                <div className="pt-4 mt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Next Step:</span> Generate queue token and assign to consultation bay.
                  </div>
                  <button
                    type="button"
                    id="register-queue-btn"
                    onClick={handleRegisterPatient}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('registerAndAddToQueue', currentLang) || 'Register & Add to Clinic Queue'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
