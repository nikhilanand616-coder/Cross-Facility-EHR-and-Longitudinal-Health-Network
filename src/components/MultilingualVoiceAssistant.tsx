import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Languages,
  Mic,
  MicOff,
  Sparkles,
  Check,
  Play,
  Square,
  FileText,
  Heart,
  Baby,
  Activity,
  X,
} from 'lucide-react';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../i18n/translations';

interface MultilingualVoiceAssistantProps {
  currentLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface AudioPrescriptionPreset {
  id: string;
  category: 'maternal' | 'child' | 'chronic' | 'emergency';
  titleEn: string;
  titleRegional: Partial<Record<SupportedLanguage, string>> & { en: string; hi: string };
  instructionsEn: string;
  instructionsRegional: Partial<Record<SupportedLanguage, string>> & { en: string; hi: string };
}

const CLINICAL_PRESETS: AudioPrescriptionPreset[] = [
  {
    id: 'preset_maternal_ifa',
    category: 'maternal',
    titleEn: 'Iron & Folic Acid (IFA) Tablet Directions',
    titleRegional: {
      en: 'Iron & Folic Acid (IFA) Tablet Directions',
      hi: 'आयरन और फोलिक एसिड (IFA) गोली लेने के निर्देश',
      or: 'ଆଇରନ ଏବଂ ଫୋଲିକ ଏସିଡ (IFA) ବଟିକା ଖାଇବା ନିୟମ',
      bn: 'আয়রন ও ফলিক অ্যাসিড (IFA) বড়ি খাওয়ার নিয়ম',
      te: 'ఐరన్ మరియు ఫోలిక్ యాసిడ్ (IFA) మాత్రలు వేసుకునే విధానం',
      es: 'Instrucciones para tabletas de Hierro y Ácido Fólico',
      fr: 'Instructions pour les comprimés de fer et acide folique',
    },
    instructionsEn:
      'Take 1 red IFA tablet every night after dinner with fresh water or lemon water. Do not drink tea or milk within two hours of taking this tablet. Continue taking this throughout your pregnancy to prevent maternal weakness and protect your baby.',
    instructionsRegional: {
      en: 'Take 1 red IFA tablet every night after dinner with fresh water or lemon water. Do not drink tea or milk within two hours of taking this tablet. Continue taking this throughout your pregnancy to prevent maternal weakness and protect your baby.',
      hi: 'हर रात खाने के बाद 1 लाल IFA गोली ताजे पानी या नींबू पानी के साथ लें। गोली लेने के दो घंटे पहले या बाद में चाय या दूध बिल्कुल न पिएं। गर्भावस्था के दौरान इसे नियमित लें ताकि खून की कमी न हो और शिशु स्वस्थ रहे।',
      or: 'ପ୍ରତିଦିନ ରାତ୍ରିଭୋଜନ ପରେ ୧ଟି ଲାଲ IFA ବଟିକା ପାଣି କିମ୍ବା ଲେମ୍ବୁ ପାଣି ସହିତ ଖାଆନ୍ତୁ। ଏହି ବଟିକା ଖାଇବାର ୨ ଘଣ୍ଟା ମଧ୍ୟରେ ଚା କିମ୍ବା କ୍ଷୀର ପିଅନ୍ତୁ ନାହିଁ। ନିଜର ଓ ଶିଶୁର ସୁରକ୍ଷା ପାଇଁ ଏହା ନିୟମିତ ଖାଆନ୍ତୁ।',
      bn: 'প্রতিদিন রাতে খাবারের পর ১টি লাল IFA বড়ি পরিষ্কার জল বা লেবুর জল দিয়ে খান। এই ওষুধ খাওয়ার ২ ঘণ্টার মধ্যে চা বা দুধ খাবেন না। গর্ভাবস্থায় রক্তস্বল্পতা প্রতিরোধ করতে নিয়মিত এটি খান।',
      te: 'ప్రతిరోజూ రాత్రి భోజనం తర్వాత 1 ఎరుపు రంగు IFA మాత్రను మంచి నీటితో లేదా నిమ్మరసంతో తీసుకోండి. మాత్ర వేసుకున్న 2 గంటల వరకు టీ లేదా పాలు తాగవద్దు. గర్భధారణ సమయంలో రక్తహీనత రాకుండా క్రమం తప్పకుండా వాడండి.',
      es: 'Tome 1 tableta roja de IFA todas las noches después de cenar con agua fresca. No tome té ni leche dos horas antes o después de la pastilla. Continúe durante todo su embarazo.',
      fr: 'Prenez 1 comprimé rouge d\'IFA chaque soir après le dîner avec un grand verre d\'eau. Évitez le thé et le lait pendant les 2 heures entourant la prise.',
    },
  },
  {
    id: 'preset_child_ors',
    category: 'child',
    titleEn: 'Oral Rehydration Salts (ORS) & Zinc for Diarrhea',
    titleRegional: {
      en: 'Oral Rehydration Salts (ORS) & Zinc for Diarrhea',
      hi: 'बाल दस्त में ओआरएस (ORS) और जिंक का घोल',
      or: 'ଶିଶୁ ଝାଡ଼ା ପାଇଁ ଓଆରଏସ (ORS) ଓ ଜିଙ୍କ୍ ଔଷଧ',
      bn: 'শিশুর ডায়রিয়ায় ওআরএস (ORS) ও জিংক ব্যবহারের নিয়ম',
      te: 'పిల్లల విరేచనాలకు ORS మరియు జింక్ ద్రావణం',
      es: 'Sales de Rehidratación Oral (SRO) y Zinc para Diarrea Infantil',
      fr: 'SRO et Zinc pour la diarrhée infantile',
    },
    instructionsEn:
      'Mix 1 full packet of ORS in 1 liter of clean drinking water. Feed the child small sips frequently after every loose stool. Give 1 Zinc tablet dissolved in breast milk or water daily for 14 continuous days, even if diarrhea stops.',
    instructionsRegional: {
      en: 'Mix 1 full packet of ORS in 1 liter of clean drinking water. Feed the child small sips frequently after every loose stool. Give 1 Zinc tablet dissolved in breast milk or water daily for 14 continuous days, even if diarrhea stops.',
      hi: '1 लीटर साफ उबले पानी में 1 पूरा ओआरएस का पैकेट घोलें। बच्चे को हर दस्त के बाद थोड़ा-थोड़ा पिलाएं। जिंक की 1 गोली मां के दूध या पानी में घोलकर लगातार 14 दिनों तक दें, भले ही दस्त रुक जाए।',
      or: '୧ ଲିଟର ଫୁଟା ଥଣ୍ଡା ପାଣିରେ ୧ ପ୍ୟାକେଟ ଓଆରଏସ ମିଶାନ୍ତୁ। ପ୍ରତିଥର ଝାଡ଼ା ପରେ ଶିଶୁକୁ ଚାମଚରେ ପିଆନ୍ତୁ। ଝାଡ଼ା ବନ୍ଦ ହେଲେ ମଧ୍ୟ ପୂରା ୧୪ ଦିନ ଯାଏଁ ଦୈନିକ ୧ଟି ଜିଙ୍କ୍ ବଟିକା ମା’ କ୍ଷୀରରେ ମିଶାଇ ଦିଅନ୍ତୁ।',
      bn: '১ লিটার ফোটানো ঠাণ্ডা জলে ১ প্যাকেট ওআরএস ভালো করে মেশান। প্রতিবার পাতলা পায়খানার পর শিশুকে অল্প অল্প করে খাওয়ান। ডায়রিয়া বন্ধ হলেও একটানা ১৪ দিন প্রতিদিন ১টি জিংক ট্যাবলেট খাওয়ান।',
      te: '1 లీటర్ కాచి చల్లార్చిన నీటిలో 1 ప్యాకెట్ ORS పూర్తిగా కలపండి. ప్రతి విరేచనం తర్వాత చిన్న చిన్న మోతాదుల్లో తాగించండి. విరేచనాలు తగ్గినా కూడా వరుసగా 14 రోజులు జింక్ మాత్రను ఇవ్వండి.',
      es: 'Disuelva 1 sobre completo de SRO en 1 litro de agua limpia. Ofrezca a sorbos frecuentes tras cada evacuación líquida. Administre 1 tableta de Zinc durante 14 días consecutivos.',
      fr: 'Mélangez 1 sachet de SRO dans 1 litre d\'eau potable. Donnez à boire à petites gorgées après chaque selle liquide. Donnez 1 comprimé de Zinc par jour pendant 14 jours.',
    },
  },
  {
    id: 'preset_chronic_htn',
    category: 'chronic',
    titleEn: 'Amlodipine & Blood Pressure Care Advice',
    titleRegional: {
      en: 'Amlodipine & Blood Pressure Care Advice',
      hi: 'उच्च रक्तचाप (बीपी) और अम्लोडिपिन दवा के निर्देश',
      or: 'ଉଚ୍ଚ ରକ୍ତଚାପ (BP) ଓ ଔଷଧ ନିୟମାବଳୀ',
      bn: 'উচ্চ রক্তচাপ ও ওষুধ সেবনের পরামর্শ',
      te: 'రక్తపోటు (BP) మరియు మందుల సలహాలు',
      es: 'Consejos para Hipertensión y toma de Amlodipino',
      fr: 'Conseils pour l\'hypertension et prise d\'Amlodipine',
    },
    instructionsEn:
      'Take 1 tablet of Amlodipine 5mg every morning at the same time. Reduce raw salt and fried pickles in food. Do not stop taking your blood pressure medication even if you feel completely healthy. Visit the Sub-Centre weekly for BP monitoring.',
    instructionsRegional: {
      en: 'Take 1 tablet of Amlodipine 5mg every morning at the same time. Reduce raw salt and fried pickles in food. Do not stop taking your blood pressure medication even if you feel completely healthy. Visit the Sub-Centre weekly for BP monitoring.',
      hi: 'रोज सुबह निश्चित समय पर एम्लोडिपाइन 5mg की 1 गोली लें। खाने में कच्चा नमक और अचार कम करें। यदि आप ठीक महसूस कर रहे हों तब भी दवा कभी बंद न करें। हर हफ्ते उप-स्वास्थ्य केंद्र जाकर बीपी की जांच कराएं।',
      or: 'ପ୍ରତିଦିନ ସକାଳେ ନିର୍ଦ୍ଦିଷ୍ଟ ସମୟରେ ଏମଲୋଡିପିନ ୫mg ବଟିକା ଖାଆନ୍ତୁ। ଖାଦ୍ୟରେ କଞ୍ଚା ଲୁଣ ଓ ଆଚାର କମାନ୍ତୁ। ଭଲ ଲାଗିଲେ ମଧ୍ୟ ଔଷଧ କେବେ ବନ୍ଦ କରନ୍ତୁ ନାହିଁ। ପ୍ରତି ସପ୍ତାହରେ ଉପ-ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ଯାଇ BP ମାପନ୍ତୁ।',
      bn: 'প্রতিদিন সকালে নির্দিষ্ট সময়ে আমলোডিপাইন ৫mg বড়ি খান। কাঁচা লবণ ও আচার এড়িয়ে চলুন। সুস্থ বোধ করলেও ওষুধ বন্ধ করবেন না। প্রতি সপ্তাহে উপ-কেন্দ্রে গিয়ে রক্তচাপ মাপান।',
      te: 'రోజూ ఉదయం నిర్ణీత సమయానికి ఆమ్లోడిపైన్ 5mg మాత్ర వేసుకోండి. ఆహారంలో ఉప్పు తగ్గించండి. ఆరోగ్యం బాగున్నట్లు అనిపించినా మందు ఆపవద్దు. ప్రతి వారం ఉపకేంద్రంలో BP పరీక్షించుకోండి.',
      es: 'Tome 1 tableta de Amlodipino 5mg cada mañana a la misma hora. Reduzca la sal en sus comidas. No suspenda el tratamiento aunque se sienta bien.',
      fr: 'Prenez 1 comprimé d\'Amlodipine 5mg chaque matin à la même heure. Réduisez le sel dans votre alimentation. N\'arrêtez jamais votre traitement sans avis médical.',
    },
  },
  {
    id: 'preset_emergency_red_flag',
    category: 'emergency',
    titleEn: 'Emergency Maternal Red Flags (Call 108 Immediately)',
    titleRegional: {
      en: 'Emergency Maternal Red Flags (Call 108 Immediately)',
      hi: 'मातृ आपातकालीन खतरे के संकेत (तुरंत 108 पर कॉल करें)',
      or: 'ଗର୍ଭାବସ୍ଥାରେ ଜରୁରୀକାଳୀନ ବିପଦ ସଙ୍କେତ (ତୁରନ୍ତ ୧୦୮ କୁ ଫୋନ୍ କରନ୍ତୁ)',
      bn: 'জরুরী প্রসূতি বিপদের লক্ষণ (অবিলম্বে ১০৮ নম্বরে ফোন করুন)',
      te: 'గర్భిణీ స్త్రీలకు అత్యవసర ప్రమాద సంకేతాలు (వెంటనే 108 కు కాల్ చేయండి)',
      es: 'Signos de Alarma Materna (Llame de inmediato al 108)',
      fr: 'Signes d\'urgence obstétricale (Appelez immédiatement le 108)',
    },
    instructionsEn:
      'If the pregnant mother experiences vaginal bleeding, severe headache with blurred vision, sudden facial swelling, high fever with chills, or seizures, call the 108 Ambulance immediately. Do not wait for family meetings or transport arrangement; rush directly to the District Hospital.',
    instructionsRegional: {
      en: 'If the pregnant mother experiences vaginal bleeding, severe headache with blurred vision, sudden facial swelling, high fever with chills, or seizures, call the 108 Ambulance immediately. Do not wait for family meetings or transport arrangement; rush directly to the District Hospital.',
      hi: 'यदि गर्भवती महिला को योनि से रक्तस्राव, तेज सिरदर्द, धुंधला दिखाई देना, चेहरे पर अचानक सूजन, तेज बुखार या दौरे पड़ें, तो तुरंत 108 एम्बुलेंस बुलाएं। घरेलू उपचार में समय न गंवाएं, सीधे जिला अस्पताल जाएं।',
      or: 'ଯଦି ଗର୍ଭବତୀ ମହିଳାଙ୍କର ରକ୍ତସ୍ରାବ ହୁଏ, ପ୍ରବଳ ମୁଣ୍ଡବିନ୍ଧା ସହ ଆଖିକୁ ଝାପସା ଦିଶେ, ମୁହଁ ଫୁଲିଯାଏ କିମ୍ବା ବାତ ମାରେ, ତୁରନ୍ତ ୧୦୮ ଆମ୍ବୁଲାନ୍ସ ଡାକନ୍ତୁ। ସମୟ ନଷ୍ଟ ନକରି ସିଧାସଳଖ ଜିଲ୍ଲା ମୁଖ୍ୟ ଚିକିତ୍ସାଳୟକୁ ଯାଆନ୍ତୁ।',
      bn: 'গর্ভবতী মহিলার রক্তপাত, তীব্র মাথাব্যথা, চোখে ঝাপসা দেখা, মুখে হঠাৎ ফোলাভাব, খিঁচুনি হলে কালবিলম্ব না করে অবিলম্বে ১০৮ অ্যাম্বুলেন্স ডাকুন এবং সরাসরি জেলা হাসপাতালে যান।',
      te: 'గర్భిణీ స్త్రీకి రక్తస్రావం, తీవ్రమైన తలనొప్పి, కంటి చూపు మందగించడం, ముఖంలో వాపు లేదా మూర్ఛ వస్తే వెంటనే 108 అంబులెన్స్‌కు కాల్ చేసి నేరుగా జిల్లా ఆసుపత్రికి వెళ్ళండి.',
      es: 'Si la gestante presenta sangrado vaginal, dolor de cabeza intenso con visión borrosa o convulsiones, llame inmediatamente a la ambulancia 108 y traslade al Hospital de Distrito.',
      fr: 'En cas de saignement vaginal, violents maux de tête avec troubles visuels ou convulsions chez la femme enceinte, appelez immédiatement l\'ambulance 108.',
    },
  },
];

export const MultilingualVoiceAssistant: React.FC<MultilingualVoiceAssistantProps> = ({
  currentLanguage,
  onChangeLanguage,
  isOpen,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<AudioPrescriptionPreset>(CLINICAL_PRESETS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedNotes, setRecordedNotes] = useState<string[]>([]);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [simulatedVoicePulse, setSimulatedVoicePulse] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  // Visual voice equalizer animation
  useEffect(() => {
    if (!isPlaying && !isRecording) {
      setSimulatedVoicePulse(0);
      return;
    }
    const timer = setInterval(() => {
      setSimulatedVoicePulse(Math.floor(Math.random() * 80) + 20);
    }, 120);
    return () => clearInterval(timer);
  }, [isPlaying, isRecording]);

  const getVoiceLangCode = (lang: SupportedLanguage): string => {
    switch (lang) {
      case 'hi':
        return 'hi-IN';
      case 'or':
        return 'hi-IN'; // Fallback to Hindi phonetic acoustic model for Odia if native Odia synth unavailable
      case 'bn':
        return 'bn-IN';
      case 'te':
        return 'te-IN';
      case 'es':
        return 'es-ES';
      case 'fr':
        return 'fr-FR';
      default:
        return 'en-US';
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser environment.');
      return;
    }

    window.speechSynthesis.cancel();

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getVoiceLangCode(currentLanguage);
    utterance.rate = 0.92; // slightly slower cadence for rural patient comprehension
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSimulateVoiceDictation = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    setTimeout(() => {
      const sampleDictations = [
        `[ASHA Voice Log - ${new Date().toLocaleTimeString()}]: Visited Meera Soren at Kalyanpur block. Patient reports mild headache and edema. Blood pressure recorded 146/94 mmHg. Advised emergency referral if headache worsens.`,
        `[CHO Field Intake - ${new Date().toLocaleTimeString()}]: Baby Aarav MUAC measured 11.1 cm (Red Band). Mother given 2 sachets RUTF. Scheduled emergency admission to District Nutrition Rehabilitation Centre (NRC).`,
        `[ASHA DOTS Pill Count - ${new Date().toLocaleTimeString()}]: Bikram Roy TB blister pack reviewed. 4 doses missed. Patient re-counseled on treatment completion and Nikshay bank transfer verified.`,
      ];
      const newEntry = sampleDictations[Math.floor(Math.random() * sampleDictations.length)];
      setRecordedNotes((prev) => [newEntry, ...prev]);
      setIsRecording(false);
    }, 2800);
  };

  if (!isOpen) return null;

  const currentRegionalInstruction =
    selectedPreset.instructionsRegional[currentLanguage] || selectedPreset.instructionsEn;
  const currentRegionalTitle = selectedPreset.titleRegional[currentLanguage] || selectedPreset.titleEn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-amber-300">
              <Languages className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Vernacular Audio Assistant & Medical Speech Engine</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Rural Voice Readout
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Bridging regional language barriers for low-literacy patients, ASHA workers, and district clinicians
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Language Selector Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Target Dialect:</span>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChangeLanguage(lang.code);
                      handleStopAudio();
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentLanguage === lang.code
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                    <span className="text-[10px] opacity-75">({lang.name})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical Presets Tabs */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Select Patient Counseling / Medication Prescription Guidance
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {CLINICAL_PRESETS.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset);
                      handleStopAudio();
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium ring-1 ring-indigo-600 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {preset.category === 'maternal' && <Heart className="w-4 h-4 text-rose-500" />}
                      {preset.category === 'child' && <Baby className="w-4 h-4 text-amber-500" />}
                      {preset.category === 'chronic' && <Activity className="w-4 h-4 text-teal-500" />}
                      {preset.category === 'emergency' && <Sparkles className="w-4 h-4 text-red-600" />}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {preset.category}
                      </span>
                    </div>
                    <span className="text-xs font-semibold line-clamp-2">{preset.titleEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Audio Playback Card */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 border-2 border-indigo-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-indigo-100 text-indigo-800">
                    Active Vernacular Audio Script
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Language: <strong className="text-indigo-900">{currentLanguage.toUpperCase()}</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{currentRegionalTitle}</h3>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => (isPlaying ? handleStopAudio() : speakText(currentRegionalInstruction))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    isPlaying
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-4 h-4" />
                      <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Listen in Vernacular Speech</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Soundwave Visualizer Bar when playing */}
            {isPlaying && (
              <div className="mt-4 p-2 bg-indigo-950 rounded-xl flex items-center justify-center gap-1.5 h-10">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(6, (simulatedVoicePulse * ((i % 5) + 1)) % 32)}px`,
                    }}
                  />
                ))}
                <span className="ml-3 text-[11px] text-indigo-200 font-mono">Synthesizing {currentLanguage} audio speech...</span>
              </div>
            )}

            {/* Vernacular Transcript Box */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Regional Text Display */}
              <div className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-indigo-700">Vernacular Audio Text</span>
                  <span className="text-[10px] text-slate-400">Regional Script</span>
                </div>
                <p className="text-sm font-medium text-slate-900 leading-relaxed">
                  {currentRegionalInstruction}
                </p>
              </div>

              {/* English Clinical Translation Reference */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500">English Clinical Reference</span>
                  <span className="text-[10px] text-slate-400">Original Medical Formulation</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {selectedPreset.instructionsEn}
                </p>
              </div>
            </div>
          </div>

          {/* Frontline Voice Dictation Simulator for Field ASHA / CHOs */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-emerald-600" />
                  <span>Rural Field Worker Voice-to-Text Intake (ASHA / ANM Mode)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Record verbal observations in regional dialects for automatic transcription into patient chart
                </p>
              </div>

              <button
                onClick={handleSimulateVoiceDictation}
                disabled={isRecording}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isRecording
                    ? 'bg-rose-50 border-rose-400 text-rose-700 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Listening to Vernacular Audio...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Simulate Voice Intake</span>
                  </>
                )}
              </button>
            </div>

            {recordedNotes.length > 0 && (
              <div className="space-y-2 mt-2">
                <span className="text-[10px] font-bold uppercase text-slate-400">Recent Voice Transcripts:</span>
                {recordedNotes.map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono">
                    {note}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {speechSupported
              ? 'Web Speech API regional synthesizer active (W3C standard)'
              : 'Speech synthesis fallback enabled for text readout'}
          </span>
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Close Assistant
          </button>
        </div>
      </div>
    </div>
  );
};
