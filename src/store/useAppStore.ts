import { create } from 'zustand';

export interface AppState {
  gen: "M" | "F";
  setGen: (gen: "M" | "F") => void;
  teamCategory: "gyms" | "teams";
  setTeamCategory: (cat: "gyms" | "teams") => void;
  playingVideoUrl: string | null;
  setPlayingVideoUrl: (url: string | null) => void;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  isSubmitModalOpen: boolean;
  setIsSubmitModalOpen: (val: boolean) => void;
  activeCourseId: string | null;
  setActiveCourseId: (id: string | null) => void;

  // Global UI Toggles & States
  isNavCompact: boolean;
  setIsNavCompact: (val: boolean) => void;
  isKeyboardOpen: boolean;
  setIsKeyboardOpen: (val: boolean) => void;
  isMapLocating: boolean;
  setIsMapLocating: (val: boolean) => void;
  isMapReady: boolean;
  setIsMapReady: (val: boolean) => void;
  userLocation: [number, number] | null;
  setUserLocation: (loc: [number, number] | null) => void;
  mapViewport: { center: [number, number]; zoom: number } | null;
  setMapViewport: (vp: { center: [number, number]; zoom: number } | null) => void;
  mapLayerMode: "street" | "satellite";
  setMapLayerMode: (mode: "street" | "satellite") => void;
  courseSortMode: "runs" | "nearest";
  setCourseSortMode: (mode: "runs" | "nearest") => void;
  
  // HomeView Caching & State
  homeVisibleRuns: number;
  setHomeVisibleRuns: (val: number) => void;
  homeVisibleSets: number;
  setHomeVisibleSets: (val: number) => void;

  // Rivalry Drawer State
  isRivalryOpen: boolean;
  setIsRivalryOpen: (val: boolean) => void;
  rivalryOpponentKey: string | null;
  setRivalryOpponentKey: (key: string | null) => void;
}

const getInitialGen = () => {
    try { return JSON.parse(localStorage.getItem("gen") || "null") || "M"; } catch { return "M"; }
};
const getInitialTeamCategory = () => {
    try { 
      const val = JSON.parse(localStorage.getItem("teamCategory") || "null");
      if (val === "countries") return "teams";
      return val || "gyms"; 
    } catch { return "gyms"; }
};

export const useAppStore = create<AppState>((set) => ({
  gen: getInitialGen(),
  setGen: (gen) => {
    try {
      localStorage.setItem("gen", JSON.stringify(gen));
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
    set({ gen });
  },
  teamCategory: getInitialTeamCategory(),
  setTeamCategory: (teamCategory) => {
    try {
      localStorage.setItem("teamCategory", JSON.stringify(teamCategory));
    } catch (e) {
      console.warn("localStorage setItem failed:", e);
    }
    set({ teamCategory });
  },
  playingVideoUrl: null,
  setPlayingVideoUrl: (playingVideoUrl) => set({ playingVideoUrl }),
  showOnboarding: false,
  setShowOnboarding: (showOnboarding) => set({ showOnboarding }),
  isSubmitModalOpen: false,
  setIsSubmitModalOpen: (isSubmitModalOpen) => set({ isSubmitModalOpen }),
  activeCourseId: null,
  setActiveCourseId: (activeCourseId) => set({ activeCourseId }),

  isNavCompact: false,
  setIsNavCompact: (isNavCompact) => set({ isNavCompact }),
  isKeyboardOpen: false,
  setIsKeyboardOpen: (isKeyboardOpen) => set({ isKeyboardOpen }),
  isMapLocating: false,
  setIsMapLocating: (isMapLocating) => set({ isMapLocating }),
  isMapReady: false,
  setIsMapReady: (isMapReady) => set({ isMapReady }),
  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),
  mapViewport: null,
  setMapViewport: (mapViewport) => set({ mapViewport }),
  mapLayerMode: "street",
  setMapLayerMode: (mapLayerMode) => set({ mapLayerMode }),
  courseSortMode: "runs",
  setCourseSortMode: (courseSortMode) => set({ courseSortMode }),
  
  homeVisibleRuns: 10,
  setHomeVisibleRuns: (homeVisibleRuns) => set({ homeVisibleRuns }),
  homeVisibleSets: 10,
  setHomeVisibleSets: (homeVisibleSets) => set({ homeVisibleSets }),

  isRivalryOpen: false,
  setIsRivalryOpen: (isRivalryOpen) => set({ isRivalryOpen }),
  rivalryOpponentKey: null,
  setRivalryOpponentKey: (rivalryOpponentKey) => set({ rivalryOpponentKey }),
}));
