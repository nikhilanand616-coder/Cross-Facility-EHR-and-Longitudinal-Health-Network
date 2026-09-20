import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  PhoneCall,
  Video,
  UserCheck,
  Building2,
  Bell,
  Check,
  Send,
  ArrowRight,
  TrendingDown,
  Timer,
  Zap,
  ShieldAlert,
  ChevronRight,
  Activity,
  Play,
} from 'lucide-react';
import {
  QueueItem,
  QueueStatus,
  Appointment,
  Facility,
  LongitudinalPatient,
  DigitalTriageAssessment,
  ESITier,
  UserRole,
} from '../types';
import { DigitalTriageModal } from './DigitalTriageModal';

interface QueueAppointmentManagerProps {
  queueItems: QueueItem[];
  appointments: Appointment[];
  patients: LongitudinalPatient[];
  facilities: Facility[];
  currentFacility: Facility;
  currentRole: UserRole;
  onUpdateQueueItem: (updated: QueueItem) => void;
  onAddQueueItem: (item: QueueItem) => void;
  onBookAppointment: (appointment: Partial<Appointment>) => void;
  onSendReminder: (appointmentId: string, channel: 'sms' | 'email' | 'push') => void;
  onOpenTeleconsultation?: (patientId: string) => void;
}

export const QueueAppointmentManager: React.FC<QueueAppointmentManagerProps> = ({
  queueItems,
  appointments,
  patients,
  facilities,
  currentFacility,
  currentRole,
  onUpdateQueueItem,
  onAddQueueItem,
  onBookAppointment,
  onSendReminder,
  onOpenTeleconsultation,
}) => {
  const [viewMode, setViewMode] = useState<'queue' | 'appointments'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('all_active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Triage Modal state
  const [selectedQueueItemForTriage, setSelectedQueueItemForTriage] = useState<QueueItem | null>(null);
  const [showNewWalkInModal, setShowNewWalkInModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Call chime notification banner
  const [calledAlert, setCalledAlert] = useState<{ token: string; patient: string; room: string } | null>(null);

  // Reminder feedback state
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Walk-in form state
  const [walkInName, setWalkInName] = useState('');
  const [walkInAge, setWalkInAge] = useState(35);
  const [walkInGender, setWalkInGender] = useState('Female');
  const [walkInDept, setWalkInDept] = useState('General Outpatient');
  const [walkInComplaint, setWalkInComplaint] = useState('');

  // Appointment booking form state
  const [bookPatientId, setBookPatientId] = useState(patients[0]?.id || '');
  const [bookDept, setBookDept] = useState('General Medicine');
  const [bookProvider, setBookProvider] = useState('Dr. Aditi Sharma, MD');
  const [bookDate, setBookDate] = useState('2026-03-16');
  const [bookTimeSlot, setBookTimeSlot] = useState('10:00 AM - 10:30 AM');
  const [bookType, setBookType] = useState<'in_person' | 'teleconsult'>('in_person');
  const [bookNotes, setBookNotes] = useState('');

  // Queue Analytics & Wait Time Reduction metrics
  const activeQueue = useMemo(() => {
    return queueItems.filter((q) => q.facilityId === currentFacility.id || currentFacility.tier === 'district_hospital');
  }, [queueItems, currentFacility]);

  const waitingQueue = useMemo(() => {
    return activeQueue.filter((q) => q.status === 'waiting' || q.status === 'triage_pending');
  }, [activeQueue]);

  const avgWaitTimeMinutes = useMemo(() => {
    if (waitingQueue.length === 0) return 12;
    const sum = waitingQueue.reduce((acc, q) => acc + (q.estimatedWaitMinutes || 15), 0);
    return Math.round(sum / waitingQueue.length);
  }, [waitingQueue]);

  // Filtered Queue Items
  const filteredQueue = useMemo(() => {
    return activeQueue.filter((item) => {
      // Status filter
      if (statusFilter === 'all_active') {
        if (item.status === 'completed' || item.status === 'no_show') return false;
      } else if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      // Dept filter
      if (departmentFilter !== 'all' && !item.department.toLowerCase().includes(departmentFilter.toLowerCase())) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.patientName.toLowerCase().includes(q);
        const matchToken = item.tokenNumber.toLowerCase().includes(q);
        const matchDept = item.department.toLowerCase().includes(q);
        if (!matchName && !matchToken && !matchDept) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize Emergency/ESI 1 & 2 first, then by priority weight descending
      const aEsi = a.triageAssessment?.esiTier ?? 4;
      const bEsi = b.triageAssessment?.esiTier ?? 4;
      if (aEsi !== bEsi) return aEsi - bEsi; // lower ESI number = higher urgency
      return (b.priorityWeight || 0) - (a.priorityWeight || 0);
    });
  }, [activeQueue, statusFilter, departmentFilter, searchQuery]);

  // Actions
  const handleCallPatient = (item: QueueItem) => {
    const room = item.assignedRoom || (currentFacility.tier === 'sub_centre' ? 'HWC Clinical Desk' : 'OPD Room 1');
    const updated: QueueItem = {
      ...item,
      status: 'called',
      assignedRoom: room,
      calledAt: new Date().toISOString(),
    };
    onUpdateQueueItem(updated);
    setCalledAlert({
      token: item.tokenNumber,
      patient: item.patientName,
      room,
    });
    setTimeout(() => setCalledAlert(null), 6000);
  };

  const handleStartConsultation = (item: QueueItem) => {
    const updated: QueueItem = {
      ...item,
      status: 'in_consultation',
    };
    onUpdateQueueItem(updated);
    if (item.department.toLowerCase().includes('teleconsult') && onOpenTeleconsultation) {
      onOpenTeleconsultation(item.patientId);
    }
  };

  const handleCompleteVisit = (item: QueueItem) => {
    const updated: QueueItem = {
      ...item,
      status: 'completed',
    };
    onUpdateQueueItem(updated);
  };

  const handleCheckInAppointment = (apt: Appointment) => {
    const token = `APT-${Math.floor(10 + Math.random() * 89)}`;
    const newQueue: QueueItem = {
      id: `q_${Date.now()}`,
      tokenNumber: token,
      patientId: apt.patientId,
      patientName: apt.patientName,
      patientAge: 40,
      patientGender: 'Female',
      facilityId: apt.facilityId || currentFacility.id,
      department: apt.department,
      checkInTime: new Date().toISOString(),
      appointmentId: apt.id,
      isWalkIn: false,
      status: 'triage_pending',
      estimatedWaitMinutes: 10,
      priorityWeight: 50,
      notes: `Scheduled appointment checked in: ${apt.notes || 'Routine follow-up'}`,
    };
    onAddQueueItem(newQueue);
    setViewMode('queue');
    setCalledAlert({
      token,
      patient: apt.patientName,
      room: 'Check-in Desk -> Triage',
    });
  };

  const handleCreateWalkIn = () => {
    if (!walkInName.trim()) return;
    const token = `WALK-${Math.floor(10 + Math.random() * 89)}`;
    const newQueue: QueueItem = {
      id: `q_walk_${Date.now()}`,
      tokenNumber: token,
      patientId: `pat_walk_${Date.now()}`,
      patientName: walkInName,
      patientAge: walkInAge,
      patientGender: walkInGender,
      facilityId: currentFacility.id,
      department: walkInDept,
      checkInTime: new Date().toISOString(),
      isWalkIn: true,
      status: 'triage_pending',
      estimatedWaitMinutes: 15,
      priorityWeight: 40,
      notes: walkInComplaint || 'Walk-in arrival awaiting initial digital triage.',
    };

    onAddQueueItem(newQueue);
    setShowNewWalkInModal(false);
    setWalkInName('');
    setWalkInComplaint('');
    setSelectedQueueItemForTriage(newQueue);
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === bookPatientId);
    const newApt: Partial<Appointment> = {
      patientId: bookPatientId,
      patientName: pat?.name || 'Registered Patient',
      facilityId: currentFacility.id,
      facilityName: currentFacility.name,
      department: bookDept,
      providerName: bookProvider,
      date: bookDate,
      timeSlot: bookTimeSlot,
      type: bookType,
      status: 'scheduled',
      notes: bookNotes,
    };
    onBookAppointment(newApt);
    setShowBookingModal(false);
    setReminderToast(`Appointment scheduled for ${pat?.name}. Confirmation SMS queued.`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  const handleTriggerReminder = (aptId: string, channel: 'sms' | 'email' | 'push') => {
    onSendReminder(aptId, channel);
    setReminderToast(`Automated ${channel.toUpperCase()} reminder dispatched to patient phone.`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  const getEsiBadgeStyles = (tier?: ESITier) => {
    switch (tier) {
      case 1:
        return 'bg-rose-600 text-white font-black animate-pulse';
      case 2:
        return 'bg-amber-500 text-white font-bold';
      case 3:
        return 'bg-yellow-400 text-yellow-950 font-bold';
      case 4:
        return 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300';
      case 5:
        return 'bg-blue-100 text-blue-800 font-semibold border border-blue-300';
      default:
        return 'bg-slate-100 text-slate-600 font-medium border border-slate-300';
    }
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'triage_pending':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Triage Pending</span>;
      case 'waiting':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Waiting in Queue</span>;
      case 'called':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white animate-bounce">Called to Room</span>;
      case 'in_consultation':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">In Consultation</span>;
      case 'diagnostic_pending':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800">In Diagnostics</span>;
      case 'pharmacy_pending':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">At Pharmacy</span>;
      case 'completed':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">Completed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Called Patient Audio/Visual Announcer Bar */}
      {calledAlert && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-300 border-2 border-indigo-400">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-400 text-slate-900 rounded-xl font-black text-xl animate-pulse">
              🔔
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold">
                Next Patient Called • Public Display Broadcast
              </span>
              <div className="text-base font-extrabold flex items-center gap-2">
                <span className="text-amber-300 font-mono text-lg">{calledAlert.token}</span>
                <span>—</span>
                <span>{calledAlert.patient}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-normal">
                  Proceed to: <strong className="text-white">{calledAlert.room}</strong>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setCalledAlert(null)}
            className="text-xs text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Reminder notification toast */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Header & KPI Summary Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Appointment & Queue Management</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                Waiting Time Reduction System
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live token calling, AI digital triage prioritization, slot scheduling, and automated patient reminders at{' '}
              <strong className="text-slate-700">{currentFacility.name}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('queue')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'queue' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Live Queue ({waitingQueue.length})</span>
              </button>
              <button
                onClick={() => setViewMode('appointments')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'appointments' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Appointments ({appointments.length})</span>
              </button>
            </div>

            {/* Quick Actions */}
            {viewMode === 'queue' ? (
              <button
                onClick={() => setShowNewWalkInModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Issue Walk-in Token</span>
              </button>
            ) : (
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Book Appointment</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Wait Time Reduction Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Avg Estimated Wait</span>
              <Timer className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{avgWaitTimeMinutes}</span>
              <span className="text-xs text-slate-500">mins</span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">SLA &lt;25m</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Waiting Patients</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{waitingQueue.length}</span>
              <span className="text-xs text-slate-500">in queue</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Emergency / ESI 1-2</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-700">
                {activeQueue.filter((q) => (q.triageAssessment?.esiTier || 4) <= 2 && q.status !== 'completed').length}
              </span>
              <span className="text-xs text-rose-600 font-semibold">Priority 0-10m SLA</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Throughput Status</span>
              <TrendingDown className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xs font-bold text-emerald-700">Optimal (Zero Starvation)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'queue' ? (
        <div className="space-y-4">
          {/* Queue Filter Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search token, patient name, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-56 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs">
                {[
                  { id: 'all_active', label: 'Active Queue' },
                  { id: 'waiting', label: 'Waiting' },
                  { id: 'triage_pending', label: 'Triage Pending' },
                  { id: 'in_consultation', label: 'In Consult' },
                  { id: 'all', label: 'All (Incl. Done)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors ${
                      statusFilter === st.id
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-700 cursor-pointer"
              >
                <option value="all">All Departments</option>
                <option value="Cardiology">Cardiology / Emergency</option>
                <option value="Maternal">Maternal & Obstetrics</option>
                <option value="Diabetology">Diabetology & NCD</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Teleconsultation">Assisted Teleconsultation</option>
                <option value="General">General Outpatient</option>
              </select>
            </div>
          </div>

          {/* Queue Items Table / Cards */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Token & Priority</th>
                    <th className="py-3 px-4">Patient Demographics</th>
                    <th className="py-3 px-4">ESI Triage & Urgency</th>
                    <th className="py-3 px-4">Wait Time & SLA</th>
                    <th className="py-3 px-4">Department / Room</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No patients in this queue view</p>
                        <p className="text-[11px]">Use "Issue Walk-in Token" or check in a scheduled appointment.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => {
                      const triage = item.triageAssessment;
                      const isEmergency = triage && triage.esiTier <= 2;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isEmergency ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          {/* Token */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                {item.tokenNumber}
                              </span>
                              {item.isWalkIn ? (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Walk-in
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                                  Booked
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Check-in: {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Patient */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{item.patientName}</div>
                            <div className="text-slate-500 text-[11px]">
                              {item.patientAge}y • {item.patientGender}
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs" title={item.notes}>
                                {item.notes}
                              </div>
                            )}
                          </td>

                          {/* ESI Triage & Urgency */}
                          <td className="py-3.5 px-4">
                            {triage ? (
                              <div className="space-y-1">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${getEsiBadgeStyles(triage.esiTier)}`}>
                                  ESI {triage.esiTier} • {triage.priorityCategory}
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  Score: <strong className="text-slate-700">{triage.urgencyScore}/100</strong>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedQueueItemForTriage(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span>Run AI Triage</span>
                              </button>
                            )}
                          </td>

                          {/* Wait Time & SLA */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-800">
                                ~{item.estimatedWaitMinutes} mins
                              </span>
                            </div>
                            {triage && (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                SLA Target: &lt;{triage.targetWaitMinutes}m
                              </span>
                            )}
                          </td>

                          {/* Department & Room */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{item.department}</div>
                            <div className="text-[11px] text-indigo-600 font-medium">
                              {item.assignedRoom || 'Queue Allocation'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(item.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === 'triage_pending' && (
                                <button
                                  onClick={() => setSelectedQueueItemForTriage(item)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                                  title="Evaluate ESI Urgency"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Triage</span>
                                </button>
                              )}

                              {item.status === 'waiting' && (
                                <button
                                  onClick={() => handleCallPatient(item)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="Broadcast token to room"
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>Call Next</span>
                                </button>
                              )}

                              {item.status === 'called' && (
                                <button
                                  onClick={() => handleStartConsultation(item)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Start Consult</span>
                                </button>
                              )}

                              {item.status === 'in_consultation' && (
                                <button
                                  onClick={() => handleCompleteVisit(item)}
                                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Complete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Appointments & Slot Management View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {appointments.map((apt) => {
              const patientObj = patients.find((p) => p.id === apt.patientId);

              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {apt.type === 'teleconsult' ? 'Assisted Teleconsult' : 'In-Person Visit'}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        apt.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apt.status === 'completed'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {apt.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2.5">{apt.patientName}</h3>
                    <p className="text-xs text-indigo-600 font-medium">{apt.department}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Provider: {apt.providerName}</p>

                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.date || 'Today'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{apt.timeSlot || 'Scheduled time'}</span>
                      </div>
                      {apt.notes && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
                          {apt.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTriggerReminder(apt.id, 'sms')}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                        title="Send SMS Reminder"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTriggerReminder(apt.id, 'push')}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                        title="Send App Push Alert"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleCheckInAppointment(apt)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Check In to Queue</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Digital Triage Modal */}
      {selectedQueueItemForTriage && (
        <DigitalTriageModal
          patient={patients.find((p) => p.id === selectedQueueItemForTriage.patientId)}
          facility={currentFacility}
          initialComplaint={selectedQueueItemForTriage.notes}
          onClose={() => setSelectedQueueItemForTriage(null)}
          onTriageCompleted={(assessment, token) => {
            const updated: QueueItem = {
              ...selectedQueueItemForTriage,
              tokenNumber: token || selectedQueueItemForTriage.tokenNumber,
              triageAssessment: assessment,
              status: 'waiting',
              estimatedWaitMinutes: assessment.targetWaitMinutes || 15,
              priorityWeight: assessment.urgencyScore || 60,
              assignedRoom: assessment.departmentAllocation,
            };
            onUpdateQueueItem(updated);
            setSelectedQueueItemForTriage(null);
          }}
        />
      )}

      {/* Issue Walk-in Token Modal */}
      {showNewWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-slate-900">Issue Walk-in Patient Token</h2>
            <p className="text-xs text-slate-500">
              Registers immediate arrival at {currentFacility.name} front desk and triggers digital triage.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Patient Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra, Bina Kumari"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Age</label>
                  <input
                    type="number"
                    value={walkInAge}
                    onChange={(e) => setWalkInAge(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Gender</label>
                  <select
                    value={walkInGender}
                    onChange={(e) => setWalkInGender(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Department</label>
                <select
                  value={walkInDept}
                  onChange={(e) => setWalkInDept(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                >
                  <option value="General Outpatient">General Outpatient (OPD)</option>
                  <option value="Emergency & Trauma">Emergency & Acute Trauma</option>
                  <option value="Maternal & Child Health">Maternal & Child Health</option>
                  <option value="NCD & Chronic Care">NCD & Chronic Care</option>
                  <option value="Assisted Teleconsultation">Assisted Teleconsultation Pod</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Chief Presenting Complaint</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Acute abdominal cramping, severe fever..."
                  value={walkInComplaint}
                  onChange={(e) => setWalkInComplaint(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNewWalkInModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWalkIn}
                disabled={!walkInName.trim()}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                Generate Token & Triage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book New Appointment Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-bold text-slate-900">Schedule Clinical Appointment</h2>
            <p className="text-xs text-slate-500">
              Reserve slot to optimize provider loading and minimize waiting times across network tiers.
            </p>

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Patient *</label>
                <select
                  value={bookPatientId}
                  onChange={(e) => setBookPatientId(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.nationalHealthId}) - {p.age}y
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={bookDept}
                    onChange={(e) => setBookDept(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Obstetrics & Maternal Care">Obstetrics & Maternal Care</option>
                    <option value="Diabetology & Endocrinology">Diabetology & Endocrinology</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Appointment Type</label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="in_person">In-Person Consultation</option>
                    <option value="teleconsult">Assisted Teleconsultation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time Slot</label>
                  <select
                    value={bookTimeSlot}
                    onChange={(e) => setBookTimeSlot(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                    <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Clinical Notes & Reason</label>
                <textarea
                  rows={2}
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  placeholder="Reason for consultation, prior lab review, referral linkage..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
                >
                  Confirm & Dispatch Reminders
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
