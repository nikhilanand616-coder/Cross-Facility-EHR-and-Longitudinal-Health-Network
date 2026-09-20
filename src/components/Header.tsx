import React from 'react';
import {
  Activity,
  Shield,
  Wifi,
  WifiOff,
  Radio,
  RefreshCw,
  UserCheck,
  Building2,
  Volume2,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import { Facility, UserRole, NetworkMode } from '../types';
import { SupportedLanguage, TRANSLATIONS } from '../i18n/translations';
import { PanIndiaFacilitySwitcher } from './PanIndiaFacilitySwitcher';
import { FrontlineLanguageToggle } from './FrontlineLanguageToggle';
import { useFacility } from '../context/FacilityContext';
import { useOfflineSync } from '../context/OfflineSyncContext';

interface HeaderProps {
  currentFacility: Facility;
  facilities: Facility[];
  onSelectFacility?: (facility: Facility) => void;
  onChangeFacility?: (facility: Facility) => void;
  userRole?: UserRole;
  currentRole?: UserRole;
  onChangeRole: (role: UserRole) => void;
  language?: SupportedLanguage;
  currentLang?: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  networkMode: NetworkMode;
  onChangeNetworkMode: (mode: NetworkMode) => void;
  pendingSyncCount?: number;
  syncQueueCount?: number;
  onTriggerSync: () => void;
  isSyncing: boolean;
  e2eeEnabled?: boolean;
  onToggleE2EE?: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenEmergencyEscalation?: () => void;
  activeEmergencyCount?: number;
  rbacControlNode?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  currentFacility,
  facilities,
  onSelectFacility,
  onChangeFacility,
  userRole,
  currentRole,
  onChangeRole,
  language,
  currentLang,
  onChangeLanguage,
  networkMode,
  onChangeNetworkMode,
  pendingSyncCount,
  syncQueueCount,
  onTriggerSync,
  isSyncing,
  e2eeEnabled = true,
  onToggleE2EE,
  onOpenVoiceAssistant,
  onOpenEmergencyEscalation,
  activeEmergencyCount = 0,
  rbacControlNode,
}) => {
  const [isStaffConsoleOpen, setIsStaffConsoleOpen] = React.useState<boolean>(false);
  const activeLang = language || currentLang || 'en';
  const t = (key: string) => TRANSLATIONS[activeLang]?.[key] || TRANSLATIONS.en[key] || key;
  const activeRole: UserRole = userRole || currentRole || 'doctor';
  const handleFacilitySelect = onSelectFacility || onChangeFacility || (() => {});
  const pendingCount = pendingSyncCount ?? syncQueueCount ?? 0;

  const { breadcrumbs } = useFacility();
  const { setShowSubCentreDeskModal, queuedCount: contextQueuedCount } = useOfflineSync();

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badgeColor: string }> = {
    doctor: { title: 'Dr. Aditi Sharma, MD', subtitle: 'Chief Physician', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    nurse_asha: { title: 'Sister Priya Nair', subtitle: 'ASHA Worker', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    nurse_cho: { title: 'Kavita Singh, BSc', subtitle: 'Community Health Officer', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    pharmacist: { title: 'Rajesh Patel', subtitle: 'Pharmacist', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    lab_tech: { title: 'Sunita Soren', subtitle: 'Lab Technologist', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    billing_specialist: { title: 'Amitabh Sen', subtitle: 'Ayushman Claims', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    admin: { title: 'Elena Rostova', subtitle: 'HIPAA Compliance', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    patient: { title: 'Sunita Devi', subtitle: 'Citizen Patient', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' },
  };

  const currentRoleInfo = roleLabels[activeRole] || roleLabels.doctor;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Minimalist Primary Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                AarogyaConnect
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                National Health Network
              </span>
            </div>
          </div>
        </div>

        {/* Public & Healthcare Action Controls */}
        <div className="flex items-center gap-2">
          {/* Frontline Language Toggle */}
          <FrontlineLanguageToggle
            currentLang={activeLang}
            onChangeLang={onChangeLanguage}
            size="sm"
            showLabel={false}
          />

          {/* Vernacular Voice Assistant */}
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Open Multilingual Voice Assistant & Audio Prescriptions"
            >
              <Volume2 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Voice Audio</span>
            </button>
          )}

          {/* Emergency SOS Button */}
          {onOpenEmergencyEscalation && (
            <button
              onClick={onOpenEmergencyEscalation}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeEmergencyCount > 0
                  ? 'bg-rose-600 text-white animate-pulse shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
              title="Emergency Escalation & Golden Hour Transport"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>SOS</span>
              {activeEmergencyCount > 0 && (
                <span className="bg-white text-rose-700 text-[10px] px-1.5 rounded-full font-bold">
                  {activeEmergencyCount}
                </span>
              )}
            </button>
          )}

          {/* Clinical & Staff Tools Toggle */}
          <button
            onClick={() => setIsStaffConsoleOpen(!isStaffConsoleOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              isStaffConsoleOpen
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Toggle Healthcare Staff & Facility Console"
          >
            <Building2 className={`w-3.5 h-3.5 ${isStaffConsoleOpen ? 'text-blue-300' : 'text-blue-600'}`} />
            <span className="hidden sm:inline">
              {isStaffConsoleOpen ? 'Close Console' : 'Staff Console'}
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              isStaffConsoleOpen ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {breadcrumbs.shortTier}
            </span>
            {isStaffConsoleOpen ? (
              <span className="text-xs">&times;</span>
            ) : (
              <span className="text-[10px] text-slate-400">▾</span>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Clinical & Staff Console Shelf */}
      {isStaffConsoleOpen && (
        <div className="bg-slate-50/95 border-t border-slate-200 px-4 sm:px-8 py-3 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            {/* Controls Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Pan-India Facility Switcher */}
                <div className="flex items-center gap-1">
                  <PanIndiaFacilitySwitcher
                    onFacilityChange={handleFacilitySelect}
                  />
                </div>

                {/* Role Persona Switcher */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Persona</span>
                    <select
                      aria-label="Select Clinical Persona"
                      value={activeRole}
                      onChange={(e) => onChangeRole(e.target.value as UserRole)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="doctor">Doctor (District / PHC)</option>
                      <option value="nurse_asha">Nurse / ASHA (Sub-Centre)</option>
                      <option value="nurse_cho">Community Health Officer (CHO)</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="lab_tech">Lab Technologist</option>
                      <option value="billing_specialist">Billing Specialist</option>
                      <option value="admin">HIPAA Security Officer</option>
                      <option value="patient">Patient Portal</option>
                    </select>
                  </div>
                </div>

                {/* Network Mode Simulator */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
                  {networkMode === 'online' && <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  {networkMode === 'intermittent' && <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />}
                  {networkMode === 'offline' && <WifiOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                  <select
                    aria-label="Select Connectivity Mode"
                    value={networkMode}
                    onChange={(e) => onChangeNetworkMode(e.target.value as NetworkMode)}
                    className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="online">Online (Cloud Sync)</option>
                    <option value="intermittent">Intermittent (2G Edge)</option>
                    <option value="offline">Offline (Field Mode)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Sub-Centre Desk */}
                <button
                  onClick={() => setShowSubCentreDeskModal(true)}
                  className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Open Sub-Centre Offline Desk"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sub-Centre Desk</span>
                  {contextQueuedCount > 0 && (
                    <span className="bg-amber-900 text-white text-[10px] font-bold px-1.5 rounded-full">
                      {contextQueuedCount}
                    </span>
                  )}
                </button>

                {/* Offline Sync */}
                <button
                  onClick={onTriggerSync}
                  disabled={isSyncing || networkMode === 'offline'}
                  className={`flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    networkMode === 'offline' ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={networkMode === 'offline' ? 'Cannot sync in Offline mode' : 'Trigger centralized cloud synchronization'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
                  {pendingCount > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>

                {/* E2EE Toggle */}
                <button
                  onClick={onToggleE2EE}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    e2eeEnabled ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                  title="End-to-End Field-Level Encryption"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>E2EE {e2eeEnabled ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Informational Sub-Row */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/70">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700">Active User:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${currentRoleInfo.badgeColor}`}>
                  {currentRoleInfo.title} — {currentRoleInfo.subtitle}
                </span>
                <span className="text-slate-300">|</span>
                <div className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] font-mono">
                  <span className="text-slate-700">{breadcrumbs.stateName}</span>
                  <span className="text-slate-400">&gt;</span>
                  <span className="text-slate-700">{breadcrumbs.district}</span>
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-blue-700">{breadcrumbs.tierFullName}</span>
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-bold text-slate-900">{breadcrumbs.facilityName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {pendingSyncCount && pendingSyncCount > 0 ? (
                  <span className="text-amber-700 font-semibold flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {pendingSyncCount} records pending sync
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Synced (Online)
                  </span>
                )}
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 text-[11px]">Firestore: Active</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 text-[11px]">HIPAA: Certified</span>
              </div>
            </div>

            {/* Embedded RBAC Multi-Role & Auth Controls */}
            {rbacControlNode && (
              <div className="pt-2 border-t border-slate-200/70">
                {rbacControlNode}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
