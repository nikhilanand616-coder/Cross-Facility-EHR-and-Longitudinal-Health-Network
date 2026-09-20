import React, { useState } from 'react';
import {
  User,
  Calendar,
  CreditCard,
  FileText,
  Bell,
  CheckCircle,
  Download,
  AlertCircle,
  Clock,
  Building2,
  ShieldCheck,
  Send,
  Pill,
  Sparkles,
} from 'lucide-react';
import {
  LongitudinalPatient,
  ClinicalEncounter,
  Appointment,
  BillingInvoice,
  Facility,
} from '../types';

interface PatientPortalProps {
  patient: LongitudinalPatient;
  encounters: ClinicalEncounter[];
  appointments: Appointment[];
  invoices: BillingInvoice[];
  facilities: Facility[];
  onBookAppointment: (newAppt: Appointment) => void;
  onPayInvoice: (invoiceId: string) => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  patient,
  encounters,
  appointments,
  invoices,
  facilities,
  onBookAppointment,
  onPayInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'appointments' | 'billing'>('history');
  const [showBookModal, setShowBookModal] = useState(false);
  const [reminderStatusMsg, setReminderStatusMsg] = useState<string | null>(null);

  // New appointment form state
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id || '');
  const [doctorName, setDoctorName] = useState('Dr. Priya Desai (Medical Officer)');
  const [department, setDepartment] = useState('General Medicine / Chronic Care');
  const [apptDate, setApptDate] = useState('2026-09-18T10:00');
  const [reason, setReason] = useState('Quarterly routine follow-up & prescription replenishment');
  const [channels, setChannels] = useState<{ sms: boolean; email: boolean; push: boolean }>({
    sms: true,
    email: true,
    push: true,
  });

  const patientEncounters = encounters
    .filter((e) => e.patientId === patient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const patientAppointments = appointments.filter((a) => a.patientId === patient.id);
  const patientInvoices = invoices.filter((i) => i.patientId === patient.id);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const fac = facilities.find((f) => f.id === selectedFacilityId);

    const newAppt: Appointment = {
      id: `apt_${Date.now().toString(36)}`,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientEmail: 'patient@health.org',
      facilityId: selectedFacilityId,
      facilityName: fac?.name || 'Local Facility',
      doctorName,
      department,
      scheduledTime: apptDate,
      status: 'scheduled',
      reminderPreferences: {
        sms: channels.sms,
        email: channels.email,
        push: channels.push,
        reminderSent: true,
      },
      reason,
      syncStatus: 'synced',
    };

    onBookAppointment(newAppt);
    setShowBookModal(false);

    // Call server to trigger simulated notifications
    try {
      await fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: newAppt.id,
          patientName: patient.name,
          phone: patient.phone,
          channels: Object.entries(channels).filter(([_, v]) => v).map(([k]) => k),
          scheduledTime: apptDate,
          facilityName: fac?.name,
        }),
      });
      setReminderStatusMsg(
        `Appointment confirmed! Automated reminders dispatched via ${Object.entries(channels)
          .filter(([_, v]) => v)
          .map(([k]) => k.toUpperCase())
          .join(', ')}.`
      );
      setTimeout(() => setReminderStatusMsg(null), 5000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Greeting & Universal ID Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {patient.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold">
                  {patient.nationalHealthId}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unified Longitudinal Health Portal • {patient.gender}, {patient.age} years • {patient.villageOrCity}, {patient.district}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Doctor Appointment</span>
            </button>
          </div>
        </div>

        {reminderStatusMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{reminderStatusMsg}</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 mt-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Longitudinal Medical History</span>
          </button>

          <button
            onClick={() => setActiveTab('appointments')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'appointments'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduled Appointments ({patientAppointments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'billing'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Billing & Insurance Claims ({patientInvoices.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Longitudinal Medical History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Longitudinal Visits Across Network
            </h3>

            <div className="space-y-4">
              {patientEncounters.map((enc) => (
                <div
                  key={enc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <strong className="text-slate-900">{enc.facilityName}</strong>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase">
                        {enc.facilityTier.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-slate-500 font-medium">
                      {new Date(enc.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Chief Concern</span>
                      <p className="text-slate-800 font-medium">{enc.chiefComplaint}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Recorded Vitals</span>
                      <p className="text-slate-800">
                        BP: {enc.vitals.systolic}/{enc.vitals.diastolic} mmHg • SpO2: {enc.vitals.spo2}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Doctor's Assessment</span>
                      <p className="text-slate-800">{enc.soap.assessment}</p>
                    </div>
                  </div>

                  {enc.prescriptions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-bold block mb-1 flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-emerald-600" /> Prescribed Medications:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {enc.prescriptions.map((rx) => (
                          <span
                            key={rx.id}
                            className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800"
                          >
                            <strong>{rx.drugName}</strong> ({rx.dosage}) — {rx.frequency}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Scheduled Appointments */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Automated Appointment Schedule & Reminders
              </h3>
              <button
                onClick={() => setShowBookModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
              >
                + Book New Appointment
              </button>
            </div>

            <div className="space-y-3">
              {patientAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 text-sm">{apt.doctorName}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                        {apt.department}
                      </span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{apt.facilityName}</span>
                    </div>
                    <p className="text-slate-500 italic">{apt.reason}</p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>{new Date(apt.scheduledTime).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Bell className="w-3 h-3 text-emerald-600" />
                      <span>Reminders: SMS, Email, App Push (Enabled)</span>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Integrated Billing Services */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3">
              Integrated Billing & Universal Healthcare Claims
            </h3>

            <div className="space-y-4">
              {patientInvoices.map((inv) => {
                const isPaid = inv.paymentStatus === 'paid';

                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-mono text-xs text-slate-500 font-bold block">{inv.id}</span>
                        <strong className="text-slate-900">{inv.facilityName}</strong>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? 'Settled (Paid)' : 'Pending Payment'}
                        </span>
                        {inv.insuranceClaim && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                            {inv.insuranceClaim.schemeName} ({inv.insuranceClaim.status})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Line items table */}
                    <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-1">
                      {inv.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700">
                          <span>
                            {it.description} <span className="text-slate-400">x{it.quantity}</span>
                          </span>
                          <span className="font-mono">₹{it.amount}</span>
                        </div>
                      ))}
                      <div className="border-t border-slate-100 pt-1.5 flex justify-between font-bold text-slate-900">
                        <span>Total Due</span>
                        <span className="font-mono text-sm">₹{inv.totalAmount}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-mono">
                        HIPAA Secure Transaction Gateway
                      </span>

                      {!isPaid ? (
                        <button
                          onClick={() => onPayInvoice(inv.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Process Instant Payment (UPI / Card)</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Paid via {inv.paymentMethod}
                          </span>
                          <button
                            onClick={() => alert(`Receipt downloaded for Invoice ${inv.id}`)}
                            className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Book Appointment Modal */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Book Clinical Appointment</h3>
                <p className="text-xs text-slate-500">
                  Automated notifications will be sent to {patient.phone}
                </p>
              </div>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBook} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Health Facility</label>
                <select
                  aria-label="Select Health Facility"
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.tier.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Attending Clinician</label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Specialty / Unit</label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Preferred Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for Visit</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                />
              </div>

              {/* Reminder Channels */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-700 block text-xs">
                  Automated Reminder Channels:
                </span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={channels.sms}
                      onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>SMS Alert</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={channels.push}
                      onChange={(e) => setChannels({ ...channels, push: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>App Push Notification</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={channels.email}
                      onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Email</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send Reminders</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
