import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Facility, FacilityTier } from '../types';
import {
  getAllPanIndiaFacilities,
  INDIAN_STATES_AND_UTS,
  IndianStateOrUT,
  getStateCodeByName,
  PRIMARY_PAN_INDIA_FACILITIES,
  getPanIndiaFacilitiesForDistrict,
} from '../data/panIndiaFacilities';

export interface BreadcrumbSegment {
  level: 1 | 2 | 3 | 4;
  type: 'state' | 'district' | 'tier' | 'facility';
  label: string;
  shortLabel: string;
  code?: string;
}

export interface BreadcrumbInfo {
  stateCode: string;
  stateName: string;
  district: string;
  tier: FacilityTier;
  shortTier: string;
  tierFullName: string;
  facilityName: string;
  facilityId: string;
  formatted: string; // e.g. "OD > Sundargarh > PHC > Chandanpur PHC"
  fullHierarchyFormatted: string; // e.g. "Odisha > Sundargarh > Primary Health Centre > Chandanpur Primary Health Centre"
  segments: BreadcrumbSegment[];
}

export interface StateHierarchyItem {
  code: string;
  name: string;
  type: 'state' | 'ut';
  capital: string;
  districtCount: number;
  districts: Array<{
    name: string;
    pincode: string;
  }>;
  totalFacilities: number;
}

export interface DistrictHierarchyItem {
  name: string;
  pincode: string;
  facilityCount: number;
}

export interface TierHierarchyItem {
  tier: FacilityTier;
  label: string;
  shortLabel: string;
  count: number;
}

interface FacilityContextType {
  // Current active facility node
  currentFacility: Facility;
  facilities: Facility[];
  recentFacilities: Facility[];
  selectFacility: (facility: Facility) => void;
  selectFacilityById: (facilityId: string) => boolean;

  // Four-Tier Cascading Hierarchy: (Level 1: State, Level 2: District, Level 3: Tier, Level 4: Facility)
  hierarchyLevel: 1 | 2 | 3 | 4;
  setHierarchyLevel: (level: 1 | 2 | 3 | 4) => void;
  selectedState: string; // State Name
  selectedDistrict: string; // District Name
  selectedTier: FacilityTier | 'all'; // Tier
  setSelectedState: (stateName: string) => void;
  setSelectedDistrict: (districtName: string) => void;
  setSelectedTier: (tier: FacilityTier | 'all') => void;
  resetHierarchyToFacility: (facility?: Facility) => void;

  // Available options derived from 4-tier hierarchy
  availableStates: StateHierarchyItem[];
  availableDistricts: DistrictHierarchyItem[];
  availableTiers: TierHierarchyItem[];
  availableFacilitiesInHierarchy: Facility[];

  // Dynamic Breadcrumb computation
  breadcrumbs: BreadcrumbInfo;
  getBreadcrumbs: (facility?: Facility) => BreadcrumbInfo;

  // Debounced Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;
  searchResults: Facility[];
  isSearching: boolean;
  clearSearch: () => void;

  // Tier label utilities
  getTierShortLabel: (tier: FacilityTier) => string;
  getTierFullName: (tier: FacilityTier) => string;
  getTierColorClasses: (tier: FacilityTier) => { bg: string; text: string; border: string; dot: string };
}

const STORAGE_KEY_ACTIVE = 'pan_india_ehr_facility_node';
const STORAGE_KEY_RECENTS = 'pan_india_ehr_recent_facilities';

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export const FacilityProvider: React.FC<{
  children: React.ReactNode;
  initialFacilityId?: string;
}> = ({ children, initialFacilityId }) => {
  // Memoize all facilities across India
  const allFacilities = useMemo(() => getAllPanIndiaFacilities(), []);

  // Helper to find initial facility
  const getInitialFacility = (): Facility => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = allFacilities.find((f) => f.id === parsed.id);
        if (match) return match;
      }
    } catch {
      // ignore localStorage errors
    }

    if (initialFacilityId) {
      const match = allFacilities.find((f) => f.id === initialFacilityId);
      if (match) return match;
    }

    // Default to Chandanpur PHC (Odisha)
    return (
      allFacilities.find((f) => f.id === 'fac_phc_chandanpur') ||
      PRIMARY_PAN_INDIA_FACILITIES[1] ||
      allFacilities[0]
    );
  };

  const [currentFacility, setCurrentFacility] = useState<Facility>(getInitialFacility);

  // Four-Tier Hierarchy State
  const [hierarchyLevel, setHierarchyLevel] = useState<1 | 2 | 3 | 4>(4);
  const [selectedState, setSelectedStateInternal] = useState<string>(() => currentFacility.state);
  const [selectedDistrict, setSelectedDistrictInternal] = useState<string>(() => currentFacility.district);
  const [selectedTier, setSelectedTierInternal] = useState<FacilityTier | 'all'>('all');

  // Debounced Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setIsSearching(false);
  }, []);

  // Recent facilities history
  const [recentFacilities, setRecentFacilities] = useState<Facility[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENTS);
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        return ids
          .map((id) => allFacilities.find((f) => f.id === id))
          .filter((f): f is Facility => Boolean(f));
      }
    } catch {
      // ignore
    }
    return [
      PRIMARY_PAN_INDIA_FACILITIES[1], // Chandanpur PHC
      PRIMARY_PAN_INDIA_FACILITIES[3], // Sundargarh DH
      PRIMARY_PAN_INDIA_FACILITIES[6], // Baramati RH
    ].filter(Boolean);
  });

  const getTierShortLabel = useCallback((tier: FacilityTier): string => {
    switch (tier) {
      case 'sub_centre':
        return 'SC';
      case 'phc':
        return 'PHC';
      case 'rural_hospital':
        return 'RH';
      case 'district_hospital':
        return 'DH';
      default:
        return 'HOSP';
    }
  }, []);

  const getTierFullName = useCallback((tier: FacilityTier): string => {
    switch (tier) {
      case 'sub_centre':
        return 'Sub-Centre (SC)';
      case 'phc':
        return 'Primary Health Centre (PHC)';
      case 'rural_hospital':
        return 'Rural Hospital (RH / CHC)';
      case 'district_hospital':
        return 'District Hospital (DH)';
      default:
        return tier;
    }
  }, []);

  const getTierColorClasses = useCallback((tier: FacilityTier) => {
    switch (tier) {
      case 'district_hospital':
        return {
          bg: 'bg-purple-50',
          text: 'text-purple-700',
          border: 'border-purple-200',
          dot: 'bg-purple-500',
        };
      case 'rural_hospital':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'phc':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'sub_centre':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
        };
      default:
        return {
          bg: 'bg-slate-50',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  }, []);

  // Compute Breadcrumb helper
  const getBreadcrumbs = useCallback(
    (facility?: Facility): BreadcrumbInfo => {
      const fac = facility || currentFacility;
      const stateCode = fac.stateCode || getStateCodeByName(fac.state);
      const shortTier = getTierShortLabel(fac.tier);
      const tierFullName = getTierFullName(fac.tier);

      // Clean short facility name
      let shortName = fac.name;
      if (shortName.toLowerCase().includes('primary health centre')) {
        shortName = shortName.replace(/primary health centre/i, 'PHC').trim();
      } else if (shortName.toLowerCase().includes('rural community hospital')) {
        shortName = shortName.replace(/rural community hospital \(chc\)/i, 'RH').trim();
      } else if (shortName.toLowerCase().includes('rural hospital')) {
        shortName = shortName.replace(/rural hospital/i, 'RH').trim();
      } else if (shortName.toLowerCase().includes('district headquarters hospital')) {
        shortName = shortName.replace(/district headquarters hospital/i, 'DH').trim();
      } else if (shortName.toLowerCase().includes('district hospital')) {
        shortName = shortName.replace(/district hospital/i, 'DH').trim();
      } else if (shortName.toLowerCase().includes('health sub-centre')) {
        shortName = shortName.replace(/health sub-centre( \(hwc\))?/i, 'SC').trim();
      }

      const formatted = `${stateCode} > ${fac.district} > ${shortTier} > ${shortName}`;
      const fullHierarchyFormatted = `${fac.state} > ${fac.district} > ${tierFullName} > ${fac.name}`;

      const segments: BreadcrumbSegment[] = [
        {
          level: 1,
          type: 'state',
          label: fac.state,
          shortLabel: stateCode,
          code: stateCode,
        },
        {
          level: 2,
          type: 'district',
          label: fac.district,
          shortLabel: fac.district,
        },
        {
          level: 3,
          type: 'tier',
          label: tierFullName,
          shortLabel: shortTier,
        },
        {
          level: 4,
          type: 'facility',
          label: fac.name,
          shortLabel: shortName,
        },
      ];

      return {
        stateCode,
        stateName: fac.state,
        district: fac.district,
        tier: fac.tier,
        shortTier,
        tierFullName,
        facilityName: shortName,
        facilityId: fac.id,
        formatted,
        fullHierarchyFormatted,
        segments,
      };
    },
    [currentFacility, getTierShortLabel, getTierFullName]
  );

  const breadcrumbs = useMemo(() => getBreadcrumbs(currentFacility), [getBreadcrumbs, currentFacility]);

  // Reset hierarchy state to match a given facility or currentFacility
  const resetHierarchyToFacility = useCallback(
    (facility?: Facility) => {
      const fac = facility || currentFacility;
      setSelectedStateInternal(fac.state);
      setSelectedDistrictInternal(fac.district);
      setSelectedTierInternal(fac.tier);
      setHierarchyLevel(4);
      clearSearch();
    },
    [currentFacility, clearSearch]
  );

  // Set selected state with cascading update to district & level
  const setSelectedState = useCallback(
    (stateName: string) => {
      setSelectedStateInternal(stateName);
      const stateObj = INDIAN_STATES_AND_UTS.find(
        (s) => s.name.toLowerCase() === stateName.toLowerCase()
      );
      if (stateObj && stateObj.districts.length > 0) {
        setSelectedDistrictInternal(stateObj.districts[0].name);
      }
      setSelectedTierInternal('all');
      setHierarchyLevel(2); // advance to district selection
    },
    []
  );

  // Set selected district with cascading advance
  const setSelectedDistrict = useCallback((districtName: string) => {
    setSelectedDistrictInternal(districtName);
    setSelectedTierInternal('all');
    setHierarchyLevel(3); // advance to tier selection
  }, []);

  // Set selected tier with cascading advance
  const setSelectedTier = useCallback((tier: FacilityTier | 'all') => {
    setSelectedTierInternal(tier);
    setHierarchyLevel(4); // advance to facility selection
  }, []);

  // Select Facility
  const selectFacility = useCallback((fac: Facility) => {
    setCurrentFacility(fac);
    setSelectedStateInternal(fac.state);
    setSelectedDistrictInternal(fac.district);
    setSelectedTierInternal(fac.tier);
    setHierarchyLevel(4);

    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify({ id: fac.id, name: fac.name }));
    } catch {
      // ignore
    }

    setRecentFacilities((prev) => {
      const filtered = prev.filter((p) => p.id !== fac.id);
      const updated = [fac, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(
          STORAGE_KEY_RECENTS,
          JSON.stringify(updated.map((f) => f.id))
        );
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const selectFacilityById = useCallback(
    (facilityId: string): boolean => {
      const fac = allFacilities.find((f) => f.id === facilityId);
      if (fac) {
        selectFacility(fac);
        return true;
      }
      return false;
    },
    [allFacilities, selectFacility]
  );

  // 1. Available States for Hierarchy Level 1
  const availableStates = useMemo<StateHierarchyItem[]>(() => {
    return INDIAN_STATES_AND_UTS.map((st) => {
      const totalFacs = allFacilities.filter(
        (f) => f.state.toLowerCase() === st.name.toLowerCase()
      ).length;
      return {
        code: st.code,
        name: st.name,
        type: st.type,
        capital: st.capital,
        districtCount: st.districts.length,
        districts: st.districts,
        totalFacilities: totalFacs,
      };
    });
  }, [allFacilities]);

  // 2. Available Districts for Hierarchy Level 2 (based on selectedState)
  const availableDistricts = useMemo<DistrictHierarchyItem[]>(() => {
    const stateObj = INDIAN_STATES_AND_UTS.find(
      (s) => s.name.toLowerCase() === selectedState.toLowerCase()
    );
    if (!stateObj) return [];

    return stateObj.districts.map((dist) => {
      const count = allFacilities.filter(
        (f) =>
          f.state.toLowerCase() === selectedState.toLowerCase() &&
          f.district.toLowerCase() === dist.name.toLowerCase()
      ).length;
      return {
        name: dist.name,
        pincode: dist.pincode,
        facilityCount: count,
      };
    });
  }, [selectedState, allFacilities]);

  // 3. Available Tiers for Hierarchy Level 3 (based on selectedState & selectedDistrict)
  const availableTiers = useMemo<TierHierarchyItem[]>(() => {
    const districtFacilities = allFacilities.filter(
      (f) =>
        f.state.toLowerCase() === selectedState.toLowerCase() &&
        f.district.toLowerCase() === selectedDistrict.toLowerCase()
    );

    const tierKeys: FacilityTier[] = [
      'district_hospital',
      'rural_hospital',
      'phc',
      'sub_centre',
    ];

    return tierKeys.map((tk) => {
      const count = districtFacilities.filter((f) => f.tier === tk).length;
      return {
        tier: tk,
        label: getTierFullName(tk),
        shortLabel: getTierShortLabel(tk),
        count,
      };
    });
  }, [selectedState, selectedDistrict, allFacilities, getTierFullName, getTierShortLabel]);

  // 4. Available Facilities for Hierarchy Level 4
  const availableFacilitiesInHierarchy = useMemo<Facility[]>(() => {
    let list = allFacilities.filter(
      (f) =>
        f.state.toLowerCase() === selectedState.toLowerCase() &&
        f.district.toLowerCase() === selectedDistrict.toLowerCase()
    );

    // If none found in pool, generate dynamically using getPanIndiaFacilitiesForDistrict
    if (list.length === 0) {
      list = getPanIndiaFacilitiesForDistrict(selectedState, selectedDistrict);
    }

    if (selectedTier !== 'all') {
      list = list.filter((f) => f.tier === selectedTier);
    }

    return list;
  }, [selectedState, selectedDistrict, selectedTier, allFacilities]);

  // Search Results across all facilities using debounced query
  const searchResults = useMemo<Facility[]>(() => {
    const q = debouncedSearchQuery.toLowerCase();
    if (!q) return [];

    return allFacilities
      .filter((fac) => {
        const matchName = fac.name.toLowerCase().includes(q);
        const matchDistrict = fac.district.toLowerCase().includes(q);
        const matchState = fac.state.toLowerCase().includes(q);
        const matchStateCode = fac.stateCode?.toLowerCase() === q;
        const matchPincode = fac.pincode?.includes(q);
        const matchTier = fac.tier.toLowerCase().includes(q);
        const matchShortTier = getTierShortLabel(fac.tier).toLowerCase() === q;

        return (
          matchName ||
          matchDistrict ||
          matchState ||
          matchStateCode ||
          matchPincode ||
          matchTier ||
          matchShortTier
        );
      })
      .slice(0, 40);
  }, [debouncedSearchQuery, allFacilities, getTierShortLabel]);

  return (
    <FacilityContext.Provider
      value={{
        currentFacility,
        facilities: allFacilities,
        recentFacilities,
        selectFacility,
        selectFacilityById,

        // 4-tier hierarchy
        hierarchyLevel,
        setHierarchyLevel,
        selectedState,
        selectedDistrict,
        selectedTier,
        setSelectedState,
        setSelectedDistrict,
        setSelectedTier,
        resetHierarchyToFacility,

        availableStates,
        availableDistricts,
        availableTiers,
        availableFacilitiesInHierarchy,

        // Breadcrumbs
        breadcrumbs,
        getBreadcrumbs,

        // Debounced search
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery,
        searchResults,
        isSearching,
        clearSearch,

        // Tier utilities
        getTierShortLabel,
        getTierFullName,
        getTierColorClasses,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};

export const useFacility = (): FacilityContextType => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};
