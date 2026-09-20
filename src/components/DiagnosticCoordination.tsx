import React, { useState } from 'react';
import {
  FlaskConical,
  Barcode,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  PlusCircle,
  Building2,
  Calendar,
  Share2,
  Camera,
  Layers,
  Truck,
  Eye,
  User,
  Activity,
  FileText,
  Search,
  Filter,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { DiagnosticOrder, Facility, LongitudinalPatient, DiagnosticResultItem } from '../types';

interface DiagnosticCoordinationProps {
  orders: DiagnosticOrder[];
  facilities: Facility[];
  patients: LongitudinalPatient[];
  currentFacility: Facility;
  onAddDiagnosticOrder: (newOrder: DiagnosticOrder) => void;
  onUpdateOrderStatus: (orderId: string, status: DiagnosticOrder['status'], results?: any) => void;
  onSelectPatient?: (patientId: string) => void;
}

export const DiagnosticCoordination: React.FC<DiagnosticCoordinationProps> = ({
  orders,
  facilities,
  patients,
  currentFacility,
  onAddDiagnosticOrder,
  onUpdateOrderStatus,
  onSelectPatient,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'lab' | 'imaging' | 'in_transit' | 'critical'>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderType, setOrderType] = useState<'lab' | 'imaging'>('lab');
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<DiagnosticOrder | null>(null);
  const [selectedOrderForReporting, setSelectedOrderForReporting] = useState<DiagnosticOrder | null>(null);

  // New order form state
  const [patientId, setPatientId] = useState(patients[0]?.id || '');
  const [processingFacilityId, setProcessingFacilityId] = useState(
    facilities.find((f) => f.hasLab && f.tier === 'district_hospital')?.id || facilities[1]?.id || facilities[0]?.id || ''
  );
  const [testCategory, setTestCategory] = useState<DiagnosticOrder['category']>('biochemistry');
  const [testName, setTestName] = useState('Glycated Hemoglobin (HbA1c)');
  const [testCode, setTestCode] = useState('LOINC-4548-4');
  const [priority, setPriority] = useState<DiagnosticOrder['priority']>('routine');
  const [specimenType, setSpecimenType] = useState('Whole Blood (EDTA)');
  const [clinicalIndication, setClinicalIndication] = useState('Routine quarterly diabetic monitoring');

  // Imaging specific form state
  const [modalityType, setModalityType] = useState<DiagnosticOrder['modalityType']>('Ultrasound');
  const [anatomicalSite, setAnatomicalSite] = useState('Obstetric Pelvis (ANC 2nd Trimester)');
  const [contrastNeeded, setContrastNeeded] = useState(false);

  // Reporting Form State - Lab
  const [reportParams, setReportParams] = useState<DiagnosticResultItem[]>([
    { parameter: 'HbA1c', value: '7.8', unit: '%', referenceRange: '< 5.7 (Normal), 5.7-6.4 (Prediabetes)', flag: 'high' },
    { parameter: 'Estimated Avg Glucose (eAG)', value: '177', unit: 'mg/dL', referenceRange: '70 - 126', flag: 'high' },
  ]);
  const [pathologistNotes, setPathologistNotes] = useState('Consistent with suboptimal glycemic control. Recommend lifestyle & therapy adjustment.');

  // Reporting Form State - Imaging
  const [imagingTechnique, setImagingTechnique] = useState('Real-time B-mode and Doppler transabdominal ultrasonography');
  const [imagingFindings, setImagingFindings] = useState('Single live intrauterine pregnancy in cephalic presentation. Adequate amniotic fluid volume (AFI 14.2 cm). Placenta posterior, high-lying.');
  const [imagingImpression, setImagingImpression] = useState('Viable singleton pregnancy at 24 weeks 2 days gestational age. Normal fetal anatomy and cardiac activity.');
  const [imagingRecommendations, setImagingRecommendations] = useState('Routine 3rd trimester growth ultrasound at 32 weeks. Maternal iron & calcium supplementation.');
  const [radiologistName, setRadiologistName] = useState('Dr. Sanjay Varma, MD Radiodiagnosis (REG-78902)');

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    // Tab filter
    if (activeTab === 'lab' && o.category === 'radiology') return false;
    if (activeTab === 'imaging' && o.category !== 'radiology') return false;
    if (activeTab === 'in_transit' && o.status !== 'in_transit' && o.status !== 'sample_collected') return false;
    if (activeTab === 'critical' && o.status !== 'critical') return false;

    // Priority filter
    if (filterPriority !== 'all' && o.priority !== filterPriority) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPatient = o.patientName.toLowerCase().includes(q);
      const matchTest = o.testName.toLowerCase().includes(q);
      const matchBarCode = o.sampleBarCode.toLowerCase().includes(q);
      if (!matchPatient && !matchTest && !matchBarCode) return false;
    }

    return true;
  });

  const getFacilityName = (id: string) => facilities.find((f) => f.id === id)?.name || id;

  // Handle Create Diagnostic Order (Lab or Imaging)
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patients.find((p) => p.id === patientId);
    if (!pat) return;

    const isImaging = orderType === 'imaging';
    const barcodePrefix = isImaging ? 'RAD' : 'LAB';
    const barcode = `${barcodePrefix}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newOrder: DiagnosticOrder = {
      id: `diag_${Date.now().toString(36)}`,
      patientId: pat.id,
      patientName: pat.name,
      orderingFacilityId: currentFacility.id,
      orderingFacilityName: currentFacility.name,
      processingFacilityId,
      processingFacilityName: getFacilityName(processingFacilityId),
      testCode: isImaging ? `RAD-${modalityType?.toUpperCase()}` : testCode,
      testName: isImaging ? `${modalityType}: ${anatomicalSite}` : testName,
      category: isImaging ? 'radiology' : testCategory,
      priority,
      status: 'ordered',
      orderedBy: 'Attending Frontline Clinician',
      orderedDate: new Date().toISOString(),
      specimenType: isImaging ? 'Digital Diagnostic Imaging' : specimenType,
      sampleBarCode: barcode,
      syncStatus: 'synced',
      modalityType: isImaging ? modalityType : undefined,
      anatomicalSite: isImaging ? anatomicalSite : undefined,
      clinicalIndication,
    };

    onAddDiagnosticOrder(newOrder);
    setShowOrderModal(false);
  };

  // Submit Final Results (Lab or Imaging)
  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReporting) return;

    const isImaging = selectedOrderForReporting.category === 'radiology';

    if (isImaging) {
      onUpdateOrderStatus(selectedOrderForReporting.id, 'completed', {
        imagingFindings: {
          technique: imagingTechnique,
          findings: imagingFindings,
          impression: imagingImpression,
          recommendations: imagingRecommendations,
          radiologistName,
          pacsViewerUrl: `https://pacs.regional-health.gov.in/studies/${selectedOrderForReporting.sampleBarCode}`,
        },
      });
    } else {
      const hasCritical = reportParams.some((p) => p.flag === 'critical');
      onUpdateOrderStatus(
        selectedOrderForReporting.id,
        hasCritical ? 'critical' : 'completed',
        {
          results: reportParams,
          pathologistNotes,
        }
      );
    }

    setSelectedOrderForReporting(null);
  };

  // Pre-fill reporting modal with appropriate templates
  const handleOpenReportingModal = (order: DiagnosticOrder) => {
    setSelectedOrderForReporting(order);
    if (order.category === 'radiology') {
      setImagingTechnique(`Digital ${order.modalityType || 'Radiographic'} acquisition with standard projection`);
      setImagingFindings('Anatomical structures demonstrated within expected physiological limits. No acute focal destructive or obstructive lesion detected.');
      setImagingImpression('Normal diagnostic evaluation. No emergent acute pathological abnormality.');
      setImagingRecommendations('Clinical correlation with ongoing treatment plan.');
      setRadiologistName('Dr. Sanjay Varma, MD Radiodiagnosis');
    } else {
      if (order.testName.includes('CBC') || order.category === 'hematology') {
        setReportParams([
          { parameter: 'Hemoglobin', value: '11.4', unit: 'g/dL', referenceRange: '12.0 - 15.5', flag: 'low' },
          { parameter: 'Total Leukocyte Count (TLC)', value: '7,400', unit: '/uL', referenceRange: '4,000 - 11,000', flag: 'normal' },
          { parameter: 'Platelet Count', value: '190,000', unit: '/uL', referenceRange: '150,000 - 450,000', flag: 'normal' },
        ]);
        setPathologistNotes('Mild microcytic hypochromic anemia noted. Iron studies suggested.');
      } else {
        setReportParams([
          { parameter: order.testName, value: '88', unit: 'mg/dL', referenceRange: '70 - 100', flag: 'normal' },
        ]);
        setPathologistNotes('Investigation values verified against calibrated automated clinical analyzer.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <FlaskConical className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Diagnostic Coordination & Imaging Hub
                </h2>
                <p className="text-xs text-slate-500">
                  Request, track specimen transit, and report on clinical laboratory tests & medical imaging linked to patient records
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOrderType('lab');
                setShowOrderModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Order Lab Test</span>
            </button>
            <button
              onClick={() => {
                setOrderType('imaging');
                setShowOrderModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Order Medical Imaging</span>
            </button>
          </div>
        </div>

        {/* Network Metrics Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Requisitions</span>
            <strong className="text-lg font-bold text-slate-900">{orders.length}</strong>
          </div>
          <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
            <span className="text-rose-600 block text-[10px] uppercase font-bold">Critical Lab Flags</span>
            <strong className="text-lg font-bold text-rose-800">
              {orders.filter((o) => o.status === 'critical').length}
            </strong>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="text-amber-600 block text-[10px] uppercase font-bold">Specimens In Transit</span>
            <strong className="text-lg font-bold text-amber-800">
              {orders.filter((o) => o.status === 'in_transit' || o.status === 'sample_collected').length}
            </strong>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <span className="text-emerald-600 block text-[10px] uppercase font-bold">Reported & Linked</span>
            <strong className="text-lg font-bold text-emerald-800">
              {orders.filter((o) => o.status === 'completed' || o.status === 'critical').length}
            </strong>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Worklist Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {/* Navigation Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Investigations ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'lab' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lab Tests</span>
            </button>
            <button
              onClick={() => setActiveTab('imaging')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'imaging' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-purple-600" />
              <span>Medical Imaging (X-Ray / USG)</span>
            </button>
            <button
              onClick={() => setActiveTab('in_transit')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'in_transit' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>In Transit</span>
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'critical' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Critical Flagged</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search barcode, test, or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 w-56 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              aria-label="Filter by priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 bg-slate-50"
            >
              <option value="all">All Priorities</option>
              <option value="stat">STAT (Emergency 1h)</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Barcode & Test Name</th>
                <th className="py-2.5 px-3">Patient Record</th>
                <th className="py-2.5 px-3">Routing (Origin → Lab)</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Chain of Custody Status</th>
                <th className="py-2.5 px-3">Verified Results / Findings</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No diagnostic orders match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isImaging = order.category === 'radiology';
                  const isCompleted = order.status === 'completed' || order.status === 'critical';

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Barcode & Test */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isImaging ? (
                            <Camera className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : (
                            <FlaskConical className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                          <strong className="text-slate-900 font-bold">{order.testName}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                            {order.sampleBarCode}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isImaging ? order.modalityType : order.specimenType}
                          </span>
                        </div>
                      </td>

                      {/* Patient Record */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{order.patientName}</div>
                        {onSelectPatient && (
                          <button
                            onClick={() => onSelectPatient(order.patientId)}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-0.5 mt-0.5"
                          >
                            <span>Open Longitudinal Record</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </td>

                      {/* Routing */}
                      <td className="py-3 px-3 text-slate-600">
                        <div className="text-[11px] font-medium text-slate-800">
                          {getFacilityName(order.orderingFacilityId)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>→</span>
                          <span>{getFacilityName(order.processingFacilityId)}</span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            order.priority === 'stat'
                              ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                              : order.priority === 'urgent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {order.priority === 'stat' ? '⚡ STAT' : order.priority}
                        </span>
                      </td>

                      {/* Chain of Custody Status */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => setSelectedOrderForTracking(order)}
                          className="cursor-pointer group flex items-center gap-1.5"
                        >
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                              order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'critical'
                                ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-500 font-extrabold'
                                : order.status === 'in_transit'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : order.status === 'processing'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-indigo-600 group-hover:underline">
                            Track
                          </span>
                        </button>
                      </td>

                      {/* Verified Results / Findings */}
                      <td className="py-3 px-3">
                        {isCompleted ? (
                          isImaging && order.imagingFindings ? (
                            <div className="text-[11px] text-slate-700 max-w-xs">
                              <span className="font-semibold text-purple-900 block truncate">
                                {order.imagingFindings.impression || 'Imaging report finalized'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Radiologist: {order.imagingFindings.radiologistName?.split(',')[0]}
                              </span>
                            </div>
                          ) : order.results && order.results.length > 0 ? (
                            <div className="text-[11px] space-y-0.5 max-w-xs">
                              {order.results.slice(0, 2).map((res, i) => (
                                <div key={i} className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-600">{res.parameter}:</span>
                                  <strong className="text-slate-900">{res.value} {res.unit}</strong>
                                  {res.flag === 'critical' && (
                                    <span className="px-1 py-0.2 bg-rose-500 text-white rounded text-[9px] font-bold">
                                      CRITICAL
                                    </span>
                                  )}
                                  {res.flag === 'high' && (
                                    <span className="px-1 py-0.2 bg-amber-200 text-amber-900 rounded text-[9px]">
                                      HIGH
                                    </span>
                                  )}
                                  {res.flag === 'low' && (
                                    <span className="px-1 py-0.2 bg-sky-200 text-sky-900 rounded text-[9px]">
                                      LOW
                                    </span>
                                  )}
                                </div>
                              ))}
                              {order.results.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{order.results.length - 2} more parameters
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Results pending review</span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Awaiting laboratory / imaging analysis
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isCompleted && (
                            <>
                              {order.status === 'ordered' && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'sample_collected')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-[11px] font-semibold cursor-pointer"
                                  title="Mark sample collected / appointment checked in"
                                >
                                  Collect
                                </button>
                              )}
                              {order.status === 'sample_collected' && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'in_transit')}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-semibold cursor-pointer"
                                  title="Dispatch to Central Hub"
                                >
                                  Dispatch
                                </button>
                              )}
                              {order.status === 'in_transit' && (
                                <button
                                  onClick={() => onUpdateOrderStatus(order.id, 'processing')}
                                  className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded text-[11px] font-semibold cursor-pointer"
                                  title="Received at Hub Lab"
                                >
                                  Receive
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenReportingModal(order)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Report</span>
                              </button>
                            </>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => handleOpenReportingModal(order)}
                              className="px-2 py-1 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[11px] font-medium cursor-pointer"
                            >
                              Review Report
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

      {/* MODAL 1: ORDER DIAGNOSTIC REQUISITION (LAB OR IMAGING) */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {orderType === 'imaging' ? (
                    <Camera className="w-5 h-5 text-purple-600" />
                  ) : (
                    <FlaskConical className="w-5 h-5 text-indigo-600" />
                  )}
                  <span>
                    {orderType === 'imaging' ? 'Order Medical Imaging & Radiology' : 'Order Clinical Laboratory Test'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Requisitions are barcoded, linked to the patient EHR, and routed across facilities.
                </p>
              </div>

              {/* Toggle Order Type */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setOrderType('lab')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    orderType === 'lab' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Lab Test
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('imaging')}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    orderType === 'imaging' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Medical Imaging
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Patient Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Select Patient *
                  </label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.age}y {p.gender}) - {p.nationalHealthId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Processing Facility / Diagnostic Hub *
                  </label>
                  <select
                    value={processingFacilityId}
                    onChange={(e) => setProcessingFacilityId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.tier.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lab Test Specific Fields */}
              {orderType === 'lab' && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Category
                      </label>
                      <select
                        value={testCategory}
                        onChange={(e) => setTestCategory(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs"
                      >
                        <option value="biochemistry">Biochemistry</option>
                        <option value="hematology">Hematology</option>
                        <option value="microbiology">Microbiology & Serology</option>
                        <option value="point_of_care">Point-of-Care (POCT)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Test Name / Investigation Panel *
                      </label>
                      <input
                        type="text"
                        required
                        value={testName}
                        onChange={(e) => setTestName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Specimen Type
                      </label>
                      <input
                        type="text"
                        value={specimenType}
                        onChange={(e) => setSpecimenType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-indigo-900 block mb-1">
                        Standard LOINC / Test Code
                      </label>
                      <input
                        type="text"
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Imaging Specific Fields */}
              {orderType === 'imaging' && (
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Imaging Modality *
                      </label>
                      <select
                        value={modalityType}
                        onChange={(e) => setModalityType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                      >
                        <option value="Ultrasound">Ultrasonography (USG / Obstetric ANC)</option>
                        <option value="X-Ray">Digital Radiography (X-Ray)</option>
                        <option value="CT Scan">Computed Tomography (CT Scan)</option>
                        <option value="ECG">12-Lead Electrocardiogram (ECG)</option>
                        <option value="MRI">Magnetic Resonance Imaging (MRI)</option>
                        <option value="Echocardiogram">2D Echocardiogram (Echo)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-purple-900 block mb-1">
                        Anatomical Site & Projection *
                      </label>
                      <input
                        type="text"
                        required
                        value={anatomicalSite}
                        onChange={(e) => setAnatomicalSite(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-purple-200 bg-white text-xs"
                        placeholder="e.g. Chest PA Erect, Obstetric Pelvis ANC, Brain Non-contrast"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="contrastCheck"
                      checked={contrastNeeded}
                      onChange={(e) => setContrastNeeded(e.target.checked)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="contrastCheck" className="text-xs text-purple-950 font-medium cursor-pointer">
                      Requires Intravenous (IV) Contrast Media (check kidney function prior to injection)
                    </label>
                  </div>
                </div>
              )}

              {/* Priority & Clinical Indication */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Priority / TAT Target *
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="routine">Routine (Standard Turnaround)</option>
                    <option value="urgent">Urgent (Within 6 hours)</option>
                    <option value="stat">⚡ STAT (Emergency 1-Hour TAT)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Clinical Indication / Suspicion *
                  </label>
                  <input
                    type="text"
                    required
                    value={clinicalIndication}
                    onChange={(e) => setClinicalIndication(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Confirm Diagnostic Requisition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHAIN OF CUSTODY & TRANSIT TRACKING STEPPER */}
      {selectedOrderForTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Barcode className="w-5 h-5 text-indigo-600" />
                  <span>Chain of Custody Tracking</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedOrderForTracking.sampleBarCode} • {selectedOrderForTracking.testName}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Stepper */}
            <div className="space-y-4 text-xs py-2">
              {/* Step 1: Requisition Placed */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  ✓
                </div>
                <div className="flex-1">
                  <strong className="text-slate-900 block font-bold">1. Order Requisition Placed</strong>
                  <span className="text-slate-500 block">
                    {new Date(selectedOrderForTracking.orderedDate).toLocaleString()} at {getFacilityName(selectedOrderForTracking.orderingFacilityId)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Clinician: {selectedOrderForTracking.orderedBy}
                  </span>
                </div>
              </div>

              {/* Step 2: Specimen Collected / Checked in */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedOrderForTracking.status !== 'ordered'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedOrderForTracking.status !== 'ordered' ? '✓' : '2'}
                </div>
                <div className="flex-1">
                  <strong className="text-slate-900 block font-bold">
                    2. Specimen Collected & Barcoded
                  </strong>
                  <span className="text-slate-500 block">
                    {selectedOrderForTracking.specimenType} (Barcode: {selectedOrderForTracking.sampleBarCode})
                  </span>
                </div>
              </div>

              {/* Step 3: Courier Transit */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    ['in_transit', 'processing', 'completed', 'critical'].includes(selectedOrderForTracking.status)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {['in_transit', 'processing', 'completed', 'critical'].includes(selectedOrderForTracking.status) ? '✓' : '3'}
                </div>
                <div className="flex-1">
                  <strong className="text-slate-900 block font-bold">
                    3. Inter-Facility Courier Cold-Chain Transit
                  </strong>
                  <span className="text-slate-500 block">
                    Monitored Carrier Shuttle • Regulated 2°C - 8°C Storage
                  </span>
                </div>
              </div>

              {/* Step 4: Analysis at Hub */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    ['processing', 'completed', 'critical'].includes(selectedOrderForTracking.status)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {['processing', 'completed', 'critical'].includes(selectedOrderForTracking.status) ? '✓' : '4'}
                </div>
                <div className="flex-1">
                  <strong className="text-slate-900 block font-bold">
                    4. Arrival & Laboratory/Imaging Processing
                  </strong>
                  <span className="text-slate-500 block">
                    Accessioned at {getFacilityName(selectedOrderForTracking.processingFacilityId)}
                  </span>
                </div>
              </div>

              {/* Step 5: Verification & Patient EHR Link */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    ['completed', 'critical'].includes(selectedOrderForTracking.status)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {['completed', 'critical'].includes(selectedOrderForTracking.status) ? '✓' : '5'}
                </div>
                <div className="flex-1">
                  <strong className="text-slate-900 block font-bold">
                    5. Verified Report Linked to Patient Longitudinal EHR
                  </strong>
                  <span className="text-slate-500 block">
                    Immediate multi-facility synchronization via ABHA ID
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORTING FORM (LAB RESULTS OR IMAGING REPORT) */}
      {selectedOrderForReporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  <span>
                    {selectedOrderForReporting.category === 'radiology'
                      ? 'Radiology & Imaging Diagnostic Report'
                      : 'Clinical Laboratory Findings Report'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Patient: <strong>{selectedOrderForReporting.patientName}</strong> • {selectedOrderForReporting.testName} (Barcode: {selectedOrderForReporting.sampleBarCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForReporting(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveResults} className="space-y-4">
              {/* LAB REPORTING SECTION */}
              {selectedOrderForReporting.category !== 'radiology' && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Quantitative Parameters & Reference Intervals
                  </span>

                  <div className="space-y-2">
                    {reportParams.map((param, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="col-span-4">
                          <label className="text-[10px] font-bold text-slate-500 block">Parameter</label>
                          <input
                            type="text"
                            value={param.parameter}
                            onChange={(e) => {
                              const updated = [...reportParams];
                              updated[idx].parameter = e.target.value;
                              setReportParams(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block">Observed Value</label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={param.value}
                              onChange={(e) => {
                                const updated = [...reportParams];
                                updated[idx].value = e.target.value;
                                setReportParams(updated);
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs bg-white font-bold"
                            />
                            <span className="text-[10px] text-slate-500">{param.unit}</span>
                          </div>
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block">Ref Interval</label>
                          <input
                            type="text"
                            value={param.referenceRange}
                            onChange={(e) => {
                              const updated = [...reportParams];
                              updated[idx].referenceRange = e.target.value;
                              setReportParams(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-[11px] bg-white text-slate-600"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block">Flag</label>
                          <select
                            value={param.flag}
                            onChange={(e) => {
                              const updated = [...reportParams];
                              updated[idx].flag = e.target.value as any;
                              setReportParams(updated);
                            }}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-[11px] bg-white font-bold"
                          >
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                            <option value="low">Low</option>
                            <option value="critical">🚨 Critical</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Pathologist / Microbiologist Clinical Impression & Comments
                    </label>
                    <textarea
                      rows={2}
                      value={pathologistNotes}
                      onChange={(e) => setPathologistNotes(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      placeholder="Enter clinical interpretation, smear morphology, or antibiogram summary..."
                    />
                  </div>
                </div>
              )}

              {/* IMAGING REPORTING SECTION */}
              {selectedOrderForReporting.category === 'radiology' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Technique & Projections
                    </label>
                    <input
                      type="text"
                      value={imagingTechnique}
                      onChange={(e) => setImagingTechnique(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Anatomical Findings & Description *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={imagingFindings}
                      onChange={(e) => setImagingFindings(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Radiologist Impression / Diagnostic Conclusion *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={imagingImpression}
                      onChange={(e) => setImagingImpression(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 bg-purple-50/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Follow-Up Recommendations
                      </label>
                      <input
                        type="text"
                        value={imagingRecommendations}
                        onChange={(e) => setImagingRecommendations(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Signing Radiologist
                      </label>
                      <input
                        type="text"
                        value={radiologistName}
                        onChange={(e) => setRadiologistName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Finalizing this report links it directly to {selectedOrderForReporting.patientName}'s longitudinal health record across all regional clinics.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForReporting(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Verify & Link Report to Patient EHR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
