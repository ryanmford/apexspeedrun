import React, { useMemo, startTransition, useRef } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { ASRDataTable, type ASRDataTableRef } from "../list/ASRDataTable";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { ASRBottomSheet } from "../common/ASRBottomSheet";
import { CourseData } from "../../types";
import type { ASRMapHandle } from "../ASRMap";
import { useDataStore } from "../../store/useDataStore";
import { useAppNavigation, useCourseList, useURLState } from "../../hooks/useDerivedData";
import { useDebounce } from "../../hooks/useDataHooks";
import { useAppStore } from "../../store/useAppStore";
import { cn } from "../../lib/asr-utils";
import { computeDistanceKm } from "../../lib/geo-utils";
import { normalizeForSearch } from "../../lib/utils";
import { ChevronLeft, ChevronRight, Navigation, Compass } from "lucide-react";
import { ASRSearchInput } from "../common/ASRSearchInput";

const ASRMap = React.lazy(() => import("../ASRMap").then((m) => ({ default: m.ASRMap })));

type MapCourseItem = CourseData & {
  isDivider?: boolean;
  parsedCoords?: [number, number];
  distanceKm?: number;
  searchKey?: string;
  subtitle?: string;
};

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export const MapCoursesView = React.memo(({ theme }: { theme: "light" | "dark" }) => {
  const isLoading = useDataStore(s => s.isLoading);
  const { navigateToEntity } = useAppNavigation();
  const { isAllTimeContext, eventType } = useURLState();
  const courseList = useCourseList() as MapCourseItem[];

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const searchKey = `q_COURSES`;
  const search = searchParams.get("q") || searchParams.get(searchKey) || "";
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const listRefDesktop = useRef<ASRDataTableRef>(null);
  const listRefMobile = useRef<ASRDataTableRef>(null);
  const scrollContainerRefDesktop = React.useRef<HTMLDivElement>(null);
  const scrollContainerRefMobile = React.useRef<HTMLDivElement>(null);
  const mapRef = useRef<ASRMapHandle>(null);
  const [visibleBounds, setVisibleBounds] = React.useState<MapBounds | null>(null);
  const [snap, setSnap] = React.useState<number>(0.2);
  const containerRef = useRef<HTMLDivElement>(null);
  const setActiveCourseId = useAppStore(s => s.setActiveCourseId);
  const userLocation = useAppStore(s => s.userLocation);
  const courseSortMode = useAppStore(s => s.courseSortMode);
  const setCourseSortMode = useAppStore(s => s.setCourseSortMode);
  
  const runKey = isAllTimeContext ? "totalAllTimeRuns" : (eventType === "2026" ? "season26Runs" : "totalAllTimeRuns");
  const columns = React.useMemo(() => [{ label: "RUNS", key: runKey }], [runKey]);
  
  const setSearch = (val: string) => {
    startTransition(() => {
      setSearchParams(prev => {
        if (val) {
          prev.set(searchKey, val);
          prev.delete("q");
        } else {
          prev.delete(searchKey);
          prev.delete("q");
        }
        return prev;
      }, { replace: true, state: location.state });
    });
  };

  const refreshTrigger = useDataStore(s => s.refreshTrigger);
  const prevRefreshTrigger = useRef(refreshTrigger);

  React.useEffect(() => {
    if (refreshTrigger > prevRefreshTrigger.current) {
      prevRefreshTrigger.current = refreshTrigger;
      // Reset view to default when nav dock button is clicked while active
      setSearch("");
      setActiveCourseId(null);
      setSnap(0.2);
      if (mapRef.current?.resetView) {
        mapRef.current.resetView();
      }
      if (scrollContainerRefDesktop.current) {
        scrollContainerRefDesktop.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      if (scrollContainerRefMobile.current) {
        scrollContainerRefMobile.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [refreshTrigger, setActiveCourseId, setSnap]);

  const debouncedSearch = useDebounce(search, 300);

  const coursesWithDistance = useMemo(() => {
    if (!userLocation) return courseList;
    return courseList.map((item) => {
      if (item?.isDivider || !item?.parsedCoords) return item;
      const distKm = computeDistanceKm(userLocation, item.parsedCoords);
      return {
        ...item,
        distanceKm: distKm,
        subtitle: `${distKm.toFixed(2)} KM AWAY`,
      };
    });
  }, [courseList, userLocation]);

  const searchedData = useMemo(() => {
    const term = normalizeForSearch(String(debouncedSearch || ""));
    if (!term) return coursesWithDistance;
    const searchTerms = term.split(/[\s,]+/).filter(Boolean);
    return coursesWithDistance.filter((item) => {
      if (item?.isDivider) return true;
      const key = item?.searchKey || "";
      return searchTerms.every((t: string) => key.includes(t));
    });
  }, [debouncedSearch, coursesWithDistance]);

  const nearestOverallCourse = useMemo(() => {
    if (!userLocation) return null;
    const isWithDist = (c: MapCourseItem): c is MapCourseItem & { distanceKm: number } =>
      Boolean(c && !c.isDivider && c.parsedCoords && typeof c.distanceKm === "number");
    const source = searchedData.filter(isWithDist);
    const pool = source.length > 0
      ? source
      : coursesWithDistance.filter(isWithDist);
    if (pool.length === 0) return null;
    let best = pool[0];
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].distanceKm < best.distanceKm) {
        best = pool[i];
      }
    }
    return best;
  }, [userLocation, searchedData, coursesWithDistance]);

  const lastAutoOpenedQueryRef = useRef("");

  React.useEffect(() => {
    if (debouncedSearch && debouncedSearch !== lastAutoOpenedQueryRef.current) {
      const activeCourses = searchedData.filter((c) => c && !c.isDivider);
      if (activeCourses.length === 1) {
        lastAutoOpenedQueryRef.current = debouncedSearch;
        setSnap(0.5);
        setActiveCourseId(activeCourses[0].name || null);
      }
    } else if (!debouncedSearch) {
      lastAutoOpenedQueryRef.current = "";
    }
  }, [debouncedSearch, searchedData, setActiveCourseId, setSnap]);

  const visibleData = useMemo(() => {
    const filtered = !visibleBounds
      ? searchedData
      : searchedData.filter((item) => {
          if (item?.isDivider) return true;
          if (!item?.parsedCoords) return true;
          const [lat, lng] = item.parsedCoords;
          const latOk = lat >= visibleBounds.south && lat <= visibleBounds.north;
          let lngOk: boolean;
          if (visibleBounds.west <= visibleBounds.east) {
            lngOk = lng >= visibleBounds.west && lng <= visibleBounds.east;
          } else {
            lngOk = lng >= visibleBounds.west || lng <= visibleBounds.east;
          }
          return latOk && lngOk;
        });

    if (userLocation && courseSortMode === "nearest") {
      const realItems = filtered.filter((item) => !item?.isDivider);
      return [...realItems].sort((a, b) => {
        const da = typeof a.distanceKm === "number" ? a.distanceKm : Infinity;
        const db = typeof b.distanceKm === "number" ? b.distanceKm : Infinity;
        return da - db;
      });
    }

    return filtered;
  }, [searchedData, visibleBounds, userLocation, courseSortMode]);

  const handleJumpToNearest = React.useCallback(() => {
    if (!nearestOverallCourse) return;
    if (debouncedSearch) {
      setSearch("");
    }
    setActiveCourseId(nearestOverallCourse.name || null);
    setSnap(0.5);
    if (nearestOverallCourse.parsedCoords && mapRef.current?.frameCourseAndUser) {
      mapRef.current.frameCourseAndUser(nearestOverallCourse.parsedCoords);
    }
  }, [nearestOverallCourse, debouncedSearch, setActiveCourseId]);

  const handleItemClick = React.useCallback((c: CourseData) => {
    navigateToEntity("course", c);
  }, [navigateToEntity]);

  const handlePinClick = React.useCallback((c: CourseData) => {
     setActiveCourseId(c.name || null);
     navigateToEntity("course", c);
  }, [navigateToEntity, setActiveCourseId]);

  const handleMapBackgroundClick = React.useCallback(() => {
     setSnap(0.2);
     setActiveCourseId(null);
  }, [setActiveCourseId]);

  const renderListContent = (
    currentSnap: number,
    scrollRef: React.RefObject<HTMLDivElement | null>,
    dRef: React.RefObject<ASRDataTableRef | null>,
  ) => {
    const courseCount = courseList ? courseList.filter((i) => !i.isDivider).length : 0;
    const visibleRealCoursesCount = visibleData.filter((i) => i && !i.isDivider).length;
    
    return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-4 pb-2 pt-2 shrink-0 pointer-events-auto flex flex-col gap-2">
        <ASRSearchInput
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          theme={theme}
          placeholder={`search ${courseCount} courses...`}
          enableFocusShortcut="slash"
        />
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-50 tabular-nums">
            {visibleRealCoursesCount} IN VIEW
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (!userLocation) {
                  mapRef.current?.locateUser?.();
                } else {
                  setCourseSortMode(courseSortMode === "nearest" ? "runs" : "nearest");
                }
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 outline-none",
                userLocation && courseSortMode === "nearest"
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  : theme === "dark"
                    ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white"
                    : "bg-white/90 border-black/10 text-zinc-600 hover:text-black"
              )}
            >
              <Navigation size={10} strokeWidth={2.5} className={cn(userLocation && courseSortMode === "nearest" ? "fill-current" : "")} />
              <span>{userLocation && courseSortMode === "nearest" ? "SORT: NEAREST" : "NEAREST"}</span>
            </button>
            {userLocation && courseSortMode === "nearest" && (
              <button
                type="button"
                onClick={() => setCourseSortMode("runs")}
                className={cn(
                  "px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 outline-none",
                  theme === "dark"
                    ? "bg-zinc-900/80 border-white/10 text-zinc-400 hover:text-white"
                    : "bg-white/90 border-black/10 text-zinc-600 hover:text-black"
                )}
              >
                RUNS
              </button>
            )}
          </div>
        </div>
      </div>
      <div 
        ref={scrollRef}
        onScroll={(e) => {
          if (window.innerWidth < 768) {
            const target = e.target as HTMLDivElement;
            window.dispatchEvent(new CustomEvent("asr-scroll", { detail: { scrollTop: target.scrollTop } }));
          }
        }}
        className="flex-1 px-4 pb-4 pt-0 overflow-y-auto overscroll-none"
        style={{ touchAction: currentSnap >= 0.8 ? 'pan-y' : 'none' }}
      >
        <ErrorBoundary fallbackMessage="Failed to render the data list.">
          {!isLoading && visibleRealCoursesCount === 0 && nearestOverallCourse ? (
            <div
              className={cn(
                "flex flex-col items-center justify-center p-6 mt-2 text-center rounded-[2rem] border animate-in fade-in duration-300",
                theme === "dark"
                  ? "bg-zinc-900/50 border-zinc-800"
                  : "bg-white/80 border-slate-200 shadow-sm"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                  theme === "dark"
                    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                    : "bg-blue-50 text-blue-600 border border-blue-200"
                )}
              >
                <Compass size={22} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-1">
                NO COURSES IN IMMEDIATE VIEWPORT
              </span>
              <h4
                className={cn(
                  "text-sm sm:text-base font-black uppercase tracking-tight mb-1",
                  theme === "dark" ? "text-white" : "text-zinc-900"
                )}
              >
                {nearestOverallCourse.flag ? `${nearestOverallCourse.flag} ` : ""}
                {nearestOverallCourse.name}
              </h4>
              <p
                className={cn(
                  "text-xs font-mono font-bold uppercase tracking-widest tabular-nums mb-4",
                  theme === "dark" ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                {nearestOverallCourse.distanceKm.toFixed(2)} KM FROM YOUR LOCATION
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleJumpToNearest}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_4px_14px_rgba(37,99,235,0.4)] cursor-pointer"
                >
                  FRAME NEAREST COURSE
                </button>
                <button
                  type="button"
                  onClick={() => handleItemClick(nearestOverallCourse)}
                  className={cn(
                    "w-full sm:w-auto py-2.5 px-4 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shrink-0",
                    theme === "dark"
                      ? "bg-zinc-900 border-white/10 text-zinc-200 hover:bg-zinc-800"
                      : "bg-white border-black/10 text-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  INSPECT
                </button>
              </div>
            </div>
          ) : (
            <ASRDataTable
              ref={dRef}
              scrollElementRef={scrollRef}
              data={visibleData as unknown as Record<string, unknown>[]}
              isLoading={isLoading}
              viewType="card"
              isCompact={true}
              onItemClick={handleItemClick as unknown as (item: Record<string, unknown>) => void}
              middleLabel={userLocation && courseSortMode === "nearest" ? "COURSE • DISTANCE" : "COURSE"}
              columns={columns}
              showVideoColumn={true}
              enableMapHighlight={true}
            />
          )}
        </ErrorBoundary>
      </div>
    </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 w-full overflow-hidden bg-slate-100 dark:bg-zinc-900">
      {/* Map Layer */}
      <div className="absolute inset-0 z-0">
        <React.Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center text-sm font-bold tracking-widest text-zinc-500 animate-pulse">
              LOADING ASR MAP...
            </div>
          }
        >
          <ASRMap
            ref={mapRef}
            courses={searchedData}
            totalCourses={courseList.filter((c) => c && !c.isDivider).length}
            searchQuery={debouncedSearch}
            theme={theme}
            onCourseClick={handleItemClick}
            onPinClick={handlePinClick}
            onMapClick={handleMapBackgroundClick}
            onBoundsChange={setVisibleBounds}
            className="w-full h-full rounded-none border-none"
          />
        </React.Suspense>
      </div>

      {/* Desktop Panel (Collapsible Glass Sidebar) */}
      <div 
        className={cn(
          "hidden md:flex flex-col absolute top-4 bottom-4 left-4 z-10 shadow-2xl rounded-3xl overflow-hidden border transition-all duration-500 ease-in-out",
          isSidebarOpen ? "w-[400px] lg:w-[450px]" : "w-[0px] opacity-0 -translate-x-full pointer-events-none",
          theme === "dark" 
            ? "bg-zinc-950/70 border-white/10 backdrop-blur-xl" 
            : "bg-white/70 border-black/10 backdrop-blur-xl"
        )}
      >
        <div className="flex-1 overflow-hidden h-full rounded-3xl">
          {renderListContent(1, scrollContainerRefDesktop, listRefDesktop)}
        </div>
      </div>

      {/* Desktop Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={cn(
          "hidden md:flex absolute top-6 z-20 items-center justify-center w-8 h-12 rounded-r-xl border border-l-0 shadow-lg transition-all duration-500 ease-in-out backdrop-blur-xl hover:bg-opacity-100",
          isSidebarOpen ? "left-[416px] lg:left-[466px]" : "left-0",
          theme === "dark"
            ? "bg-zinc-900/80 border-white/10 text-white hover:bg-zinc-800"
            : "bg-white/80 border-black/10 text-zinc-900 hover:bg-zinc-100"
        )}
      >
        {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Mobile Bottom Sheet */}
      <div className="md:hidden pointer-events-none absolute inset-0 z-50">
        <ASRBottomSheet
          snapPoints={[0.2, 0.5, 0.85]}
          activeSnap={snap as number}
          onSnapChange={setSnap}
        >
          <div className="flex-1 overflow-hidden h-full pt-2">
            {renderListContent(snap as number, scrollContainerRefMobile, listRefMobile)}
          </div>
        </ASRBottomSheet>
      </div>
    </div>
  );
});
