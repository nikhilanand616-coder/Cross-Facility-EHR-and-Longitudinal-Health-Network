import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  MapPin,
  CheckCircle2,
  BedDouble,
  Activity,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Facility, FacilityTier } from '../types';
import { useFacility } from '../context/FacilityContext';
import { useOfflineSync } from '../context/OfflineSyncContext';
import {
  INDIAN_STATES_AND_UTS,
  IndianStateOrUT,
  getPanIndiaFacilitiesForDistrict,
} from '../data/panIndiaFacilities';

interface PanIndiaFacilitySwitcherProps {
  onFacilityChange?: (facility: Facility) => void;
  className?: string;
}

type CascadingLevel = 1 | 2 | 3 | 4;

export const PanIndiaFacilitySwitcher: React.FC<PanIndiaFacilitySwitcherProps> = ({
  onFacilityChange,
  className = '',
}) => {
  const {
    currentFacility,
    selectFacility,
    breadcrumbs,
    getBreadcrumbs,
    recentFacilities,
    getTierShortLabel,
    getTierFullName,
    getTierColorClasses,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    searchResults,
    isSearching,
    clearSearch,
  } = useFacility();

  // Frontline connectivity & optimistic queue status
  const { isOnline, queuedCount } = useOfflineSync();

  const [isOpen, setIsOpen] = useState(false);

  // Cascading Navigation State
  const [currentLevel, setCurrentLevel] = useState<CascadingLevel>(1);
  const [selectedState, setSelectedState] = useState<IndianStateOrUT | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<{ name: string; pincode: string } | null>(null);
  const [selectedTier, setSelectedTier] = useState<FacilityTier | 'all'>('all');

  // Filter for State List (All, States, UTs)
  const [stateTypeFilter, setStateTypeFilter] = useState<'all' | 'state' | 'ut'>('all');
  const [stateSearchText, setStateSearchText] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Initialize or reset cascading hierarchy to current facility location on open
  const initializeToCurrentFacility = () => {
    const stateObj = INDIAN_STATES_AND_UTS.find(
      (s) => s.name.toLowerCase() === currentFacility.state.toLowerCase()
    );
    if (stateObj) {
      setSelectedState(stateObj);
      const districtObj = stateObj.districts.find(
        (d) => d.name.toLowerCase() === currentFacility.district.toLowerCase()
      ) || stateObj.districts[0];
      setSelectedDistrict(districtObj);
      setSelectedTier(currentFacility.tier);
      setCurrentLevel(4);
    } else {
      setCurrentLevel(1);
    }
    setSearchQuery('');
  };

  const handleOpenDropdown = () => {
    if (!isOpen) {
      initializeToCurrentFacility();
    }
    setIsOpen(!isOpen);
  };

  // Perform facility selection
  const handleSelectFacility = (fac: Facility) => {
    selectFacility(fac);
    if (onFacilityChange) {
      onFacilityChange(fac);
    }
    setIsOpen(false);
    clearSearch();
  };

  // Filtered States list
  const filteredStates = useMemo(() => {
    return INDIAN_STATES_AND_UTS.filter((s) => {
      if (stateTypeFilter !== 'all' && s.type !== stateTypeFilter) return false;
      if (stateSearchText.trim()) {
        const text = stateSearchText.toLowerCase();
        return (
          s.name.toLowerCase().includes(text) ||
          s.code.toLowerCase().includes(text) ||
          s.capital.toLowerCase().includes(text)
        );
      }
      return true;
    });
  }, [stateTypeFilter, stateSearchText]);

  // Facilities list for Level 4 (District + Tier)
  const level4Facilities = useMemo(() => {
    if (!selectedState || !selectedDistrict) return [];
    const districtFacilities = getPanIndiaFacilitiesForDistrict(
      selectedState.name,
      selectedDistrict.name
    );
    if (selectedTier === 'all') {
      return districtFacilities;
    }
    return districtFacilities.filter((f) => f.tier === selectedTier);
  }, [selectedState, selectedDistrict, selectedTier]);

  const getTierColor = (tier: FacilityTier) => {
    switch (tier) {
      case 'sub_centre':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'phc':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'rural_hospital':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'district_hospital':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Minimalist Trigger Button */}
      <button
        type="button"
        onClick={handleOpenDropdown}
        aria-label="Switch Pan-India Facility Node"
        aria-expanded={isOpen}
        className={`flex items-center gap-2 bg-white hover:bg-slate-50 border rounded-lg px-2.5 py-1.5 transition-all cursor-pointer shadow-xs text-left ${
          isOpen ? 'border-blue-600 ring-2 ring-blue-600/15' : 'border-slate-200'
        }`}
        title={breadcrumbs.fullHierarchyFormatted}
      >
        <Building2 className="w-4 h-4 text-blue-600 shrink-0" />

        <div className="flex items-center gap-1.5 overflow-hidden pr-1">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[140px] sm:max-w-[180px]">
            {breadcrumbs.facilityName}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${getTierColor(currentFacility.tier)}`}>
            {breadcrumbs.shortTier}
          </span>
          <span className="text-[10px] font-mono text-slate-400 font-semibold hidden md:inline">
            {breadcrumbs.stateCode}
          </span>
        </div>

        {/* Connectivity indicator dot */}
        {isOnline && queuedCount === 0 ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Synced (Online)" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" title={`Offline (${queuedCount} queued)`} />
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Flyout Modal / Cascading Switcher Dropdown */}
      {isOpen && (
        <div
          id="pan-india-facility-dropdown"
          className="absolute left-0 mt-2 w-[92vw] sm:w-[580px] md:w-[680px] max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold tracking-tight">Pan-India Facility Switcher</h3>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ABDM Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  National Health Mission • 28 States & 8 Union Territories
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Switcher"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Header with Debounce 250ms */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Direct search by facility name, PIN code (e.g. 770001, 411001), district or state..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick search suggestion pills */}
            {!searchQuery && (
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto text-[11px] text-slate-500 py-0.5">
                <span className="shrink-0 font-medium text-slate-400">Quick Jump:</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Pune')}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                >
                  Pune (MH)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('Sundargarh')}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                >
                  Sundargarh (OD)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('New Delhi')}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                >
                  New Delhi (DL)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('411001')}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                >
                  PIN 411001
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('District Hospital')}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0 transition-colors"
                >
                  District Hospitals
                </button>
              </div>
            )}
          </div>

          {/* Content Area: Search Mode vs Cascading Hierarchy Mode */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-[340px] max-h-[460px]">
            {debouncedSearchQuery ? (
              /* Search Results View */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                  <span>
                    Found <strong className="text-slate-800">{searchResults.length}</strong> facilities matching &ldquo;{debouncedSearchQuery}&rdquo;
                  </span>
                  <button
                    onClick={() => clearSearch()}
                    className="text-indigo-600 hover:underline cursor-pointer text-[11px]"
                  >
                    Clear & Browse Cascading Levels
                  </button>
                </div>

                {searchResults.length === 0 ? (
                  <div className="py-12 text-center">
                    <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No facilities found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Try searching by state (e.g. &apos;Maharashtra&apos;), district (e.g. &apos;Pune&apos;), or 6-digit postal code.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {searchResults.map((fac) => {
                      const isSelected = fac.id === currentFacility.id;
                      return (
                        <div
                          key={fac.id}
                          onClick={() => handleSelectFacility(fac)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-500 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-900 truncate">{fac.name}</h4>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getTierColor(
                                    fac.tier
                                  )}`}
                                >
                                  {getTierShortLabel(fac.tier)}
                                </span>
                                {fac.pincode && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                    PIN {fac.pincode}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>
                                  {fac.district}, {fac.state} ({fac.stateCode || 'IN'})
                                </span>
                                <span>•</span>
                                <span>{fac.beds} Beds</span>
                                {fac.hasEmergency && (
                                  <>
                                    <span>•</span>
                                    <span className="text-rose-600 font-semibold">24x7 Emergency</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isSelected ? (
                              <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-200">
                                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                <span>Active Node</span>
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5">
                                <span>Switch</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Cascading Hierarchy Mode: Level 1 -> Level 2 -> Level 3 -> Level 4 */
              <div className="space-y-4">
                {/* Level Navigation Breadcrumb Strip */}
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentLevel(1)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      currentLevel === 1
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>1. State/UT</span>
                    {selectedState && <span className="text-[10px] opacity-80">({selectedState.code})</span>}
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <button
                    type="button"
                    disabled={!selectedState}
                    onClick={() => setCurrentLevel(2)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      currentLevel === 2
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : selectedState
                        ? 'hover:bg-slate-200 text-slate-700'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span>2. District</span>
                    {selectedDistrict && <span className="text-[10px] opacity-80">({selectedDistrict.name})</span>}
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <button
                    type="button"
                    disabled={!selectedDistrict}
                    onClick={() => setCurrentLevel(3)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      currentLevel === 3
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : selectedDistrict
                        ? 'hover:bg-slate-200 text-slate-700'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span>3. Facility Tier</span>
                    {selectedTier !== 'all' && (
                      <span className="text-[10px] opacity-80">({getTierShortLabel(selectedTier)})</span>
                    )}
                  </button>

                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  <button
                    type="button"
                    disabled={!selectedDistrict}
                    onClick={() => setCurrentLevel(4)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      currentLevel === 4
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : selectedDistrict
                        ? 'hover:bg-slate-200 text-slate-700'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span>4. Facility Node</span>
                  </button>
                </div>

                {/* LEVEL 1: State / UT Selection (All 28 States & 8 Union Territories) */}
                {currentLevel === 1 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setStateTypeFilter('all')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            stateTypeFilter === 'all'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All (36)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStateTypeFilter('state')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            stateTypeFilter === 'state'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          States (28)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStateTypeFilter('ut')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            stateTypeFilter === 'ut'
                              ? 'bg-white text-indigo-600 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Union Territories (8)
                        </button>
                      </div>

                      <input
                        type="text"
                        value={stateSearchText}
                        onChange={(e) => setStateSearchText(e.target.value)}
                        placeholder="Filter State / UT..."
                        className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg w-full sm:w-44 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredStates.map((st) => {
                        const isChosen = selectedState?.code === st.code;
                        return (
                          <button
                            key={st.code}
                            type="button"
                            onClick={() => {
                              setSelectedState(st);
                              setSelectedDistrict(st.districts[0] || null);
                              setCurrentLevel(2);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                              isChosen
                                ? 'bg-indigo-50 border-indigo-500 shadow-2xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="min-w-0 pr-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
                                  {st.code}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                                  {st.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {st.districts.length} Districts • {st.type === 'state' ? 'State' : 'UT'}
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LEVEL 2: District Selection */}
                {currentLevel === 2 && selectedState && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Step 2: Choose District in</span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {selectedState.name} ({selectedState.code}) • {selectedState.type === 'state' ? 'State' : 'Union Territory'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentLevel(1)}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Change State</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedState.districts.map((dist) => {
                        const isChosen = selectedDistrict?.name === dist.name;
                        return (
                          <button
                            key={dist.name}
                            type="button"
                            onClick={() => {
                              setSelectedDistrict(dist);
                              setCurrentLevel(3);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                              isChosen
                                ? 'bg-indigo-50 border-indigo-500 shadow-2xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 truncate">
                                  {dist.name} District
                                </h4>
                                <p className="text-[11px] text-slate-400 font-mono">Postal Head: PIN {dist.pincode}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LEVEL 3: Facility Tier Selection */}
                {currentLevel === 3 && selectedState && selectedDistrict && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Step 3: Healthcare Tier for</span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {selectedDistrict.name}, {selectedState.name}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentLevel(2)}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Change District</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* All Tiers */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTier('all');
                          setCurrentLevel(4);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          selectedTier === 'all'
                            ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 font-bold text-xs">
                          ALL
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">All 4 Healthcare Tiers</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Show all Sub-Centres, PHCs, Rural Hospitals, and District Hospitals.
                          </p>
                        </div>
                      </button>

                      {/* Tier 1: Sub-Centre */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTier('sub_centre');
                          setCurrentLevel(4);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          selectedTier === 'sub_centre'
                            ? 'bg-amber-50 border-amber-500 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold text-xs">
                          SC
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900">Sub-Centre (HWC)</h4>
                            <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800 font-semibold">Tier 1</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Ayushman Arogya Mandir • ASHA/CHO outreach, ANC checkups, immunizations (2-4 beds).
                          </p>
                        </div>
                      </button>

                      {/* Tier 2: Primary Health Centre */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTier('phc');
                          setCurrentLevel(4);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          selectedTier === 'phc'
                            ? 'bg-blue-50 border-blue-500 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 font-bold text-xs">
                          PHC
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900">Primary Health Centre</h4>
                            <span className="text-[10px] px-1 rounded bg-blue-100 text-blue-800 font-semibold">Tier 2</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            24x7 Outpatient, institutional delivery, basic lab & pharmacy, CDSS referral node (6-12 beds).
                          </p>
                        </div>
                      </button>

                      {/* Tier 3: Rural Hospital */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTier('rural_hospital');
                          setCurrentLevel(4);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          selectedTier === 'rural_hospital'
                            ? 'bg-teal-50 border-teal-500 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 font-bold text-xs">
                          RH
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900">Rural Hospital (CHC)</h4>
                            <span className="text-[10px] px-1 rounded bg-teal-100 text-teal-800 font-semibold">Tier 3</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Sub-district referral hub, surgical OT, OBGYN, diagnostic ultrasound (30-60 beds).
                          </p>
                        </div>
                      </button>

                      {/* Tier 4: District Hospital */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTier('district_hospital');
                          setCurrentLevel(4);
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          selectedTier === 'district_hospital'
                            ? 'bg-indigo-50 border-indigo-500 shadow-2xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 font-bold text-xs">
                          DH
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900">District Hospital</h4>
                            <span className="text-[10px] px-1 rounded bg-indigo-100 text-indigo-800 font-semibold">Tier 4</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Apex tertiary referral centre, multi-specialty ICU, blood bank, tele-EHR hub (300-800 beds).
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* LEVEL 4: Specific Facility Name Selection */}
                {currentLevel === 4 && selectedState && selectedDistrict && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Step 4: Select Facility in</span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {selectedDistrict.name}, {selectedState.name} ({selectedTier === 'all' ? 'All Tiers' : getTierFullName(selectedTier)})
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentLevel(3)}
                          className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Change Tier</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {level4Facilities.map((fac) => {
                        const isSelected = fac.id === currentFacility.id;
                        return (
                          <div
                            key={fac.id}
                            onClick={() => handleSelectFacility(fac)}
                            className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs border ${getTierColor(
                                  fac.tier
                                )}`}
                              >
                                {getTierShortLabel(fac.tier)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-slate-900">{fac.name}</h4>
                                  {fac.pincode && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                      PIN {fac.pincode}
                                    </span>
                                  )}
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>EHR Online</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <BedDouble className="w-3 h-3 text-slate-400" />
                                    <span>{fac.beds} Inpatient Beds</span>
                                  </span>
                                  {fac.hasEmergency && (
                                    <span className="flex items-center gap-1 text-rose-700 font-semibold">
                                      <Activity className="w-3 h-3 text-rose-500" />
                                      <span>24x7 Emergency</span>
                                    </span>
                                  )}
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-600">Head: {fac.headOfFacility}</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {isSelected ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-white px-3 py-1.5 rounded-lg border border-indigo-300 shadow-2xs">
                                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                  <span>Current Node</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                >
                                  Select Node
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar: Recent Visited Nodes & Session Sync Indicator */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Recent Nodes:</span>
              {recentFacilities.map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => handleSelectFacility(rf)}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors cursor-pointer shrink-0 truncate max-w-[140px] ${
                    rf.id === currentFacility.id
                      ? 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={`${rf.name} (${rf.district}, ${rf.state})`}
                >
                  {rf.name.split(' ')[0]} ({rf.stateCode || getStateCode(rf.state)})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Synced with localStorage session</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStateCode(stateName: string): string {
  const s = INDIAN_STATES_AND_UTS.find((x) => x.name.toLowerCase() === stateName.toLowerCase());
  return s?.code || stateName.slice(0, 2).toUpperCase();
}
