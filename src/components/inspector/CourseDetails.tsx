import React, { useMemo, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  Zap,
  Compass,
  Users,
  Ruler,
  Mountain,
  Dna,
  Calendar,
  MapPin,
  Play,
  Eye,
  ArrowDown,
  Check,
} from "lucide-react";
import {
  cn,
  formatLocation,
  THEME,
  getCombinedFlags,
  normalizeName,
  getSetterLevel,
} from "../../lib/asr-utils";
import { useAppStore } from "../../store/useAppStore";
import { ProfileHeader, ASRPatronPill, SectionTitle, InspectorTabContainer } from "./InspectorComponents";
import { FallbackAvatar } from "../common/FallbackAvatar";
import { ASRPromotionBanner } from "../common/ASRPromotionBanner";
import { ASRRankList } from "../list/ASRRankList";
import { ASRStandardButton } from "../common/ASRStandardButton";
import { CourseChampions } from "./CourseChampions";
import { ASRStatCard } from "../common/ASRStatCard";
import { ASRWeeklyActivityChart } from "./ASRWeeklyActivityChart";
import { ASRTimeSimulator } from "./ASRTimeSimulator";

import { motion } from "motion/react";

import { ASRNeonToggle } from "../common/ASRNeonToggle";
import { ModalScrollContext } from "../common/ASRBaseModal";

import { CourseData, ASRDataContext } from "../../types";
import { ASRBottomSheet } from "../common/ASRBottomSheet";

interface CourseDetailsProps {
  course: CourseData;
  dataContext: ASRDataContext;
  onEntityClick: (type: string, data: Record<string, unknown>) => void;
  theme: "light" | "dark";
}

const SetterDisplay = ({
  text,
  dataContext,
  onSetterClick,
  theme,
  isLead,
}: {
  text: string;
  dataContext: ASRDataContext;
  onSetterClick?: (type: string, data: Record<string, unknown>) => void;
  theme: "light" | "dark";
  isLead?: boolean;
}) => {
  if (!text) return null;
  const rawNames = text.split(",").map((s: string) => s.trim());
  
  const names = [...rawNames].sort((a, b) => {
    const aKey = normalizeName(a);
    const bKey = normalizeName(b);
    
    const aImpact = dataContext?.setterMet?.[aKey]?.impact || 0;
    const bImpact = dataContext?.setterMet?.[bKey]?.impact || 0;
    
    const aSets = dataContext?.setterMet?.[aKey]?.sets || 0;
    const bSets = dataContext?.setterMet?.[bKey]?.sets || 0;
    
    const aLevel = Number(getSetterLevel(aImpact, aSets) || 0);
    const bLevel = Number(getSetterLevel(bImpact, bSets) || 0);
    
    if (aLevel !== bLevel) return bLevel - aLevel;
    return bImpact - aImpact;
  });

  return (
    <div className="flex flex-col gap-3 mt-1 relative w-full">
      {/* timeline line */}
      <div
        className={cn(
          "absolute left-[25px] top-4 bottom-4 w-[2px]",
          "bg-black/10 dark:bg-white/10",
        )}
      />
      {names.map((name: string, i: number) => {
        const pKey = normalizeName(name);
        const pImpact = dataContext?.setterMet?.[pKey]?.impact || 0;
        const pSets = dataContext?.setterMet?.[pKey]?.sets || 0;
        const certLevel = getSetterLevel(pImpact, pSets);
        const hasBadge = !!certLevel;

        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSetterClick?.("setter", { name });
            }}
            className={cn(
              "group flex flex-col relative pl-[52px] pr-5 py-3.5 rounded-[1.25rem] border transition-all text-left w-full outline-none hover:scale-[1.02] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              "theme-focus",
              theme === "dark"
                ? "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800"
                : "bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm",
            )}
          >
            <div
              className={cn(
                "absolute left-[8px] top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full border-[3px] flex items-center justify-center transition-colors",
                theme === "dark"
                  ? "bg-[#050505] border-[#050505] group-hover:bg-zinc-800 group-hover:border-zinc-800"
                  : "bg-white border-white group-hover:bg-zinc-50 group-hover:border-zinc-50",
                theme === "dark" ? "text-zinc-200" : "text-zinc-800",
              )}
            >
              <Eye size={14} className={cn(isLead ? "opacity-90" : "opacity-60")} />
            </div>
            <div className="flex justify-between items-center w-full min-w-0 gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-black text-sm uppercase tracking-tight truncate",
                    theme === "dark"
                      ? "text-zinc-200 group-hover:text-white"
                      : "text-zinc-800 group-hover:text-black",
                  )}
                >
                  {name}
                </span>
                {hasBadge && (
                  <span className="inline-flex items-center justify-center bg-red-600 text-white rounded-[4px] px-1.5 py-[1px] min-w-[20px] shadow-[0_0_8px_rgba(220,38,38,0.3)] leading-none border border-red-500/50 font-black text-[10px]">
                    {certLevel}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export const CourseDetails = React.memo(
  ({ course, dataContext, onEntityClick, theme }: CourseDetailsProps) => {
    const {
      cMet = {},
      atMet = {},
      pRaw = {},
      courseRunsHistory = {},
    } = dataContext || {};
    const setPlayingVideoUrl = useAppStore(s => s.setPlayingVideoUrl);
    const userLocation = useAppStore(s => s.userLocation);
    const cName = (course?.name || "").toUpperCase();
    const meta: Partial<CourseData> = cMet[cName] || course || {};

    const scrollRef = React.useContext(ModalScrollContext);

    const scrollToTop = () => {
      if (scrollRef?.current) {
        if (scrollRef.current.scrollTop > 150) {
          scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    };

    const allCourseRuns = useMemo(() => {
      let runList: Record<string, unknown>[] = [];
      if (courseRunsHistory[cName]) {
        runList = courseRunsHistory[cName].map((r) => {
          const pMeta = atMet[r.pKey];
          return {
            ...r,
            athlete: pMeta?.name || r.athlete || r.pKey,
            gender: pMeta?.gender || r.gender || "M",
            country: pMeta?.countryName || "",
            flag: pMeta?.region || pMeta?.flag || "",
            _sortDate: new Date(r.date || 0).getTime(),
            _sortName: String(pMeta?.name || r.athlete || r.pKey || "").toUpperCase(),
            _sortTime: Number(r.num ?? r.time ?? Infinity),
            _sortPts: 0,
          };
        });
      } else {
        const allTimePlayers = pRaw["all-time"] || {};
        Object.entries(allTimePlayers).forEach(
          ([pKey, playerRuns]: [string, unknown]) => {
            if (Array.isArray(playerRuns)) {
              const filtered = (playerRuns as Record<string, unknown>[]).filter(
                (r) => String(r.course || r.label || "").toUpperCase() === cName,
              );
              filtered.forEach((r) => {
                const pMeta = atMet[pKey];
                runList.push({
                  ...r,
                  pKey,
                  athlete: pMeta?.name || pKey,
                  gender: pMeta?.gender || "M",
                  country: pMeta?.countryName || "",
                  flag: pMeta?.region || pMeta?.flag || "",
                  _sortDate: new Date(String(r.date || 0)).getTime(),
                  _sortName: String(pMeta?.name || pKey || "").toUpperCase(),
                  _sortTime: Number(r.num ?? r.time ?? Infinity),
                  _sortPts: Number(r.pts ?? r.points ?? 0),
                });
              });
            }
          },
        );
      }

      const mInterims = (dataContext.courseRecords_M_AT?.[cName] || []).filter((r) => r.isInterim);
      mInterims.forEach((r) => {
        runList.push({
          ...r,
          athlete: "INTERIM TOP TIME",
          date: "2026-03-01T00:00:00Z",
          gender: "M",
          num: r.time,
          isInterim: true,
          _sortDate: new Date("2026-03-01T00:00:00Z").getTime(),
          _sortName: "INTERIM TOP TIME",
          _sortTime: Number(r.time ?? Infinity),
          _sortPts: 0,
        });
      });
      const fInterims = (dataContext.courseRecords_F_AT?.[cName] || []).filter((r) => r.isInterim);
      fInterims.forEach((r) => {
        runList.push({
          ...r,
          athlete: "INTERIM TOP TIME",
          date: "2026-03-01T00:00:00Z",
          gender: "F",
          num: r.time,
          isInterim: true,
          _sortDate: new Date("2026-03-01T00:00:00Z").getTime(),
          _sortName: "INTERIM TOP TIME",
          _sortTime: Number(r.time ?? Infinity),
          _sortPts: 0,
        });
      });

      return runList;
    }, [pRaw, cName, atMet, courseRunsHistory, dataContext.courseRecords_M_AT, dataContext.courseRecords_F_AT]);

    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const urlTab = searchParams.get("tab");
    const validTabs = ["stats", "men", "women"];
    
    const initialTabSafe = validTabs.includes(urlTab as string)
        ? (urlTab as "stats" | "men" | "women")
        : "stats";
    const [uiTab, setUiTab] = useState<string>(initialTabSafe);
    const [contentTab, setContentTab] = useState<string>(initialTabSafe);

    const urlMode = searchParams.get("mode");
    const eventTypeMode = searchParams.get("eventType");
    const validModes = ["all-time", "2026"];
    
    let initialModeSafe: "all-time" | "2026" = "all-time";
    if (validModes.includes(urlMode as string)) {
      initialModeSafe = urlMode as "all-time" | "2026";
    } else if (validModes.includes(eventTypeMode as string)) {
      initialModeSafe = eventTypeMode as "all-time" | "2026";
    }
    const [uiMode, setUiMode] = useState<"all-time" | "2026">(initialModeSafe);
    const [contentMode, setContentMode] = useState<"all-time" | "2026">(initialModeSafe);

    const urlSort = searchParams.get("sort");
    const urlDir = searchParams.get("dir");
    const validSorts = ["points", "date", "time", "player"];
    const validDirs = ["desc", "asc"];
    const sortCategory = validSorts.includes(urlSort as string) ? (urlSort as "points" | "date" | "time" | "player") : "points";
    const sortDirection = validDirs.includes(urlDir as string) ? (urlDir as "desc" | "asc") : "desc";

    const setSortState = (cat: string, dir: string) => {
      setSearchParams(prev => {
        prev.set("sort", cat);
        prev.set("dir", dir);
        return prev;
      }, { replace: true, state: location.state, preventScrollReset: true });
    };

    const [isSortOpen, setIsSortOpen] = useState(false);

    const recordsM = contentMode === "all-time" 
      ? (dataContext.courseRecords_M_AT?.[cName] || [])
      : (dataContext.courseRecords_M_2026?.[cName] || []);

    const recordsF = contentMode === "all-time" 
      ? (dataContext.courseRecords_F_AT?.[cName] || [])
      : (dataContext.courseRecords_F_2026?.[cName] || []);

    const sortRecords = (records: typeof recordsM) => {
      const sorted = [...records];
      sorted.sort((a, b) => {
        if (a.isInterim && !b.isInterim) return -1;
        if (!a.isInterim && b.isInterim) return 1;

        const aDate = new Date(a.date || 0).getTime();
        const bDate = new Date(b.date || 0).getTime();
        const aName = String(a.pKey || a.name || "").toUpperCase();
        const bName = String(b.pKey || b.name || "").toUpperCase();
        const aTime = Number(a.time ?? Infinity);
        const bTime = Number(b.time ?? Infinity);
        const aPts = Number(a.pts ?? 0);
        const bPts = Number(b.pts ?? 0);

        if (sortCategory === "date") {
          const primary = aDate - bDate;
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aTime - bTime;
        } else if (sortCategory === "player") {
          const primary = aName.localeCompare(bName);
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aTime - bTime;
        } else if (sortCategory === "time") {
          const primary = aTime - bTime;
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aDate - bDate;
        } else {
          const primary = aPts - bPts;
          if (primary !== 0) return sortDirection === "desc" ? -primary : primary;
          return aTime - bTime;
        }
      });
      return sorted;
    };

    const sortedRecordsM = useMemo(() => sortRecords(recordsM), [recordsM, sortCategory, sortDirection]);
    const sortedRecordsF = useMemo(() => sortRecords(recordsF), [recordsF, sortCategory, sortDirection]);

    const atRecordsM = dataContext.courseRecords_M_AT?.[cName] || [];
    const atRecordsF = dataContext.courseRecords_F_AT?.[cName] || [];

    const stats = [
      {
        label: "CR (M)",
        value: (() => {
          const times = atRecordsM.map(r => r.time).filter(t => t > 0);
          return times.length > 0 ? Math.min(...times).toFixed(2) : "-";
        })(),
        icon: <Zap className="w-3.5 h-3.5" />,
      },
      {
        label: "CR (W)",
        value: (() => {
          const times = atRecordsF.map(r => r.time).filter(t => t > 0);
          return times.length > 0 ? Math.min(...times).toFixed(2) : "-";
        })(),
        icon: <Zap className="w-3.5 h-3.5" />,
      },
      {
        label: "Difficulty",
        value: meta.difficulty || "-",
        icon: <Compass className="w-3.5 h-3.5" />,
      },
      {
        label: "Players",
        value: String(
          atRecordsM.filter(r => !r.isInterim).length +
          atRecordsF.filter(r => !r.isInterim).length
        ),
        icon: <Users className="w-3.5 h-3.5" />,
      },
      {
        label: "Length",
        value: meta.length
          ? `${Math.round(parseFloat(meta.length) || 0)}m`
          : "-",
        icon: <Ruler className="w-3.5 h-3.5" />,
      },
      {
        label: "Elevation",
        value: meta.elevation
          ? `${(parseFloat(meta.elevation) || 0).toFixed(2)}m`
          : "-",
        icon: <Mountain className="w-3.5 h-3.5" />,
      },
      {
        label: "Type",
        value: meta.type || "Standard",
        icon: <Dna className="w-3.5 h-3.5" />,
      },
      {
        label: "Date",
        value: meta.dateSet || "-",
        icon: <Calendar className="w-3.5 h-3.5" />,
      },
    ];

    const resolvedCoords: [number, number] | null = useMemo(() => {
      if (Array.isArray(meta.parsedCoords) && meta.parsedCoords.length === 2) {
        return [Number(meta.parsedCoords[0]), Number(meta.parsedCoords[1])];
      }
      if (Array.isArray(course?.parsedCoords) && course.parsedCoords.length === 2) {
        return [Number(course.parsedCoords[0]), Number(course.parsedCoords[1])];
      }
      const match = String(meta.coordinates || "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
      return match ? [parseFloat(match[1]), parseFloat(match[2])] : null;
    }, [meta.parsedCoords, meta.coordinates, course?.parsedCoords]);

    const distanceFromUserKm = useMemo(() => {
      if (!userLocation || !resolvedCoords) return null;
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(resolvedCoords[0] - userLocation[0]);
      const dLon = toRad(resolvedCoords[1] - userLocation[1]);
      const lat1 = toRad(userLocation[0]);
      const lat2 = toRad(resolvedCoords[0]);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }, [userLocation, resolvedCoords]);

    const destinationParam = resolvedCoords
      ? `${resolvedCoords[0]},${resolvedCoords[1]}`
      : meta.coordinates
        ? String(meta.coordinates).trim()
        : null;

    const directionsUrl = destinationParam
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationParam)}`
      : null;
    const rulesUrl = meta.demoVideo;

    return (
      <div
        className={cn(
          "flex flex-col relative pb-20 transition-colors",
          theme === "dark" ? "bg-[#030303]" : "bg-white",
        )}
      >
        <ProfileHeader
          theme={theme}
          avatar={<FallbackAvatar name={cName} sizeCls="text-3xl" />}
          title={
            <span className="flex items-center gap-2">
              <span className="shrink-0 leading-none">{getCombinedFlags(meta)}</span>
              <span className="truncate">{cName}</span>
            </span>
          }
          subtitle={
            <div className="flex items-center gap-1.5 opacity-60 font-black text-[11px] uppercase tracking-widest mt-1 w-full min-w-0">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{formatLocation(meta)}</span>
              {distanceFromUserKm !== null && (
                <span className="shrink-0 ml-1 px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono text-[10px] tabular-nums">
                  {distanceFromUserKm.toFixed(2)} KM
                </span>
              )}
            </div>
          }
        />

        <div className="flex w-full gap-2 px-4 py-3 pt-4 border-b border-white/[0.05]">
          <ASRStandardButton
            href={directionsUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="premium"
            color="blue"
            theme={theme}
            disabled={!directionsUrl}
            className="flex-1 py-2.5 px-0 justify-center rounded-xl text-[12px]"
            onClick={(e: React.MouseEvent) =>
              !directionsUrl && e.preventDefault()
            }
          >
            <MapPin size={16} strokeWidth={2.5} />
            <span>MAP</span>
          </ASRStandardButton>
          <ASRStandardButton
            href={rulesUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            variant="premium"
            color="red"
            theme={theme}
            disabled={!rulesUrl}
            className="flex-1 py-2.5 px-0 justify-center rounded-xl text-[12px]"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (rulesUrl) {
                setPlayingVideoUrl(rulesUrl);
              }
            }}
          >
            <Play size={16} strokeWidth={2.5} />
            <span>RULES</span>
          </ASRStandardButton>
        </div>

        <div className="w-full px-4 py-3 border-b border-white/[0.05]">
          <ASRPatronPill course={meta} theme={theme} isBanner={false} />
        </div>

        <div
          className={cn(
            "flex items-center justify-center border-b sticky top-0 z-40 transition-colors py-2",
            theme === "dark"
              ? "border-white/5 bg-zinc-950/95 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
              : "border-black/5 bg-white/95 shadow-[0_4px_30px_rgba(0,0,0,0.03)]",
          )}
        >
          <div className="flex w-full max-w-2xl px-4">
            <ASRNeonToggle
              options={[
                { label: "MEN", value: "men" },
                { label: "WOMEN", value: "women" },
                { label: "BIO", value: "stats" },
              ]}
              activeOption={uiTab}
              onChange={(t) => {
                setUiTab(t);
                React.startTransition(() => {
                  setContentTab(t);
                });
                scrollToTop();
              }}
              layoutId="course-tabs"
              theme={theme}
              className="w-full"
            />
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col flex-1 transition-colors",
            theme === "dark" ? "bg-[#030303]" : "bg-white",
          )}
        >
          {contentTab === "men" && (
            <div className="animate-in fade-in duration-300 flex flex-col h-full overflow-visible">
              <div
                className={cn(
                  "flex justify-center border-b transition-colors overflow-visible sticky top-[46px] z-30 py-3",
                  theme === "dark"
                    ? "border-white/[0.05] bg-zinc-950/95"
                    : "border-black/[0.05] bg-white/95",
                )}
              >
                <ASRNeonToggle
                  options={[
                    { label: "ALL-TIME", value: "all-time" },
                    { label: "2026", value: "2026" },
                  ]}
                  activeOption={uiMode}
                  onChange={(m) => {
                    const nextMode = m as "all-time" | "2026";
                    setUiMode(nextMode);
                    React.startTransition(() => {
                      setContentMode(nextMode);
                    });
                    scrollToTop();
                  }}
                  layoutId="course-mode-pill-m"
                  theme={theme}
                  className="w-full max-w-[200px]"
                />
              </div>
              <div className="px-4 py-6 overflow-visible min-h-[500px]">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <SectionTitle noPadding>VERIFIED RUNS</SectionTitle>
                      <div 
                        className={cn(
                          "flex items-center rounded-full border text-[10px] font-black uppercase tracking-widest",
                          theme === "dark" ? "border-white/10 bg-zinc-900/50" : "border-black/10 bg-zinc-100/50"
                        )}
                      >
                        <button
                          onClick={() => setIsSortOpen(true)}
                          className="px-3 py-1.5 hover:opacity-70 transition-opacity uppercase"
                        >
                          {sortCategory}
                        </button>
                        <div className={cn("w-px h-3", theme === "dark" ? "bg-white/20" : "bg-black/20")} />
                        <button
                          onClick={() => setSortState(sortCategory, sortDirection === "desc" ? "asc" : "desc")}
                          className="px-2 py-1.5 hover:opacity-70 transition-opacity flex items-center justify-center"
                        >
                          <ArrowDown size={14} className={cn("transition-transform duration-200", sortDirection === "asc" ? "rotate-180" : "")} />
                        </button>
                      </div>
                    </div>
                    <ASRRankList
                      athletes={sortedRecordsM}
                      dataContext={dataContext}
                      onEntityClick={onEntityClick}
                      entityType="player"
                      showDateSubtitle={true}
                      padTo={3}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 px-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  course={course}
                />
              </div>
            </div>
          )}

          {contentTab === "women" && (
            <div className="animate-in fade-in duration-300 flex flex-col h-full overflow-visible">
              <div
                className={cn(
                  "flex justify-center border-b transition-colors overflow-visible sticky top-[46px] z-30 py-3",
                  theme === "dark"
                    ? "border-white/[0.05] bg-zinc-950/95"
                    : "border-black/[0.05] bg-white/95",
                )}
              >
                <ASRNeonToggle
                  options={[
                    { label: "ALL-TIME", value: "all-time" },
                    { label: "2026", value: "2026" },
                  ]}
                  activeOption={uiMode}
                  onChange={(m) => {
                    const nextMode = m as "all-time" | "2026";
                    setUiMode(nextMode);
                    React.startTransition(() => {
                      setContentMode(nextMode);
                    });
                    scrollToTop();
                  }}
                  layoutId="course-mode-pill-f"
                  theme={theme}
                  className="w-full max-w-[200px]"
                />
              </div>
              <div className="px-4 py-6 overflow-visible min-h-[500px]">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <SectionTitle noPadding>VERIFIED RUNS</SectionTitle>
                      <div 
                        className={cn(
                          "flex items-center rounded-full border text-[10px] font-black uppercase tracking-widest",
                          theme === "dark" ? "border-white/10 bg-zinc-900/50" : "border-black/10 bg-zinc-100/50"
                        )}
                      >
                        <button
                          onClick={() => setIsSortOpen(true)}
                          className="px-3 py-1.5 hover:opacity-70 transition-opacity uppercase"
                        >
                          {sortCategory}
                        </button>
                        <div className={cn("w-px h-3", theme === "dark" ? "bg-white/20" : "bg-black/20")} />
                        <button
                          onClick={() => setSortState(sortCategory, sortDirection === "desc" ? "asc" : "desc")}
                          className="px-2 py-1.5 hover:opacity-70 transition-opacity flex items-center justify-center"
                        >
                          <ArrowDown size={14} className={cn("transition-transform duration-200", sortDirection === "asc" ? "rotate-180" : "")} />
                        </button>
                      </div>
                    </div>
                    <ASRRankList
                      athletes={sortedRecordsF}
                      dataContext={dataContext}
                      onEntityClick={onEntityClick}
                      entityType="player"
                      showDateSubtitle={true}
                      padTo={3}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-4 px-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  course={course}
                />
              </div>
            </div>
          )}

          {contentTab === "stats" && (
            <InspectorTabContainer tight>
              <div className="flex flex-col gap-4">
                <SectionTitle>STATS</SectionTitle>

                <div className="grid grid-cols-2 gap-2.5 overflow-visible">
                  {stats.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: i * 0.05,
                        duration: 0.3
                      }}
                      className="flex"
                    >
                      <ASRStatCard label={s.label} value={s.value} />
                    </motion.div>
                  ))}
                </div>

                <ASRTimeSimulator 
                  theme={theme}
                  courseRecordM={atRecordsM.length > 0 ? Math.min(...atRecordsM.filter(r => r.time > 0).map(r => r.time)) : 0}
                  courseRecordF={atRecordsF.length > 0 ? Math.min(...atRecordsF.filter(r => r.time > 0).map(r => r.time)) : 0}
                  recordsM={atRecordsM.filter(r => !r.isInterim)}
                  recordsF={atRecordsF.filter(r => !r.isInterim)}
                  dataContext={dataContext}
                  cName={cName}
                />
              </div>

              <div className="flex flex-col gap-4">
                <SectionTitle>WEEKLY ACTIVITY</SectionTitle>
                <div className="px-2 pb-2">
                  <ASRWeeklyActivityChart runs={allCourseRuns} type="run" themeColor="pink" />
                </div>
              </div>

              {(meta.leadSetters || meta.assistantsetters || meta.setter) && (
                <div className="flex flex-col gap-4 text-left overflow-visible w-full">
                  <SectionTitle>SETTERS</SectionTitle>
                  <div
                    className={cn(
                      "flex flex-col gap-6 p-5 rounded-[2rem]",
                      THEME.BENTO_CARD(theme),
                    )}
                  >
                    {(meta.leadSetters || meta.setter) && (
                      <div className="flex flex-col gap-1">
                        <SectionTitle noPadding className="opacity-40">
                          LEADS
                        </SectionTitle>
                        <div
                          className={cn(
                            "text-[15px] font-black tabular-nums tracking-tighter",
                            "theme-text-base",
                          )}
                        >
                          <SetterDisplay
                            text={
                              Array.isArray(meta.leadSetters)
                                ? meta.leadSetters.join(", ")
                                : meta.leadSetters || meta.setter || ""
                            }
                            dataContext={dataContext}
                            onSetterClick={onEntityClick}
                            theme={theme}
                            isLead={true}
                          />
                        </div>
                      </div>
                    )}
                    {meta.assistantsetters && (
                      <div className="flex flex-col gap-1 mt-2">
                        <SectionTitle noPadding className="opacity-40">
                          ASSISTS
                        </SectionTitle>
                        <div
                          className={cn(
                            "text-[15px] font-black tabular-nums tracking-tighter",
                            "theme-text-base",
                          )}
                        >
                          <SetterDisplay
                            text={
                              Array.isArray(meta.assistantsetters)
                                ? meta.assistantsetters.join(", ")
                                : meta.assistantsetters
                            }
                            dataContext={dataContext}
                            onSetterClick={onEntityClick}
                            theme={theme}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 text-left overflow-visible w-full">
                <SectionTitle>CHAMPIONS</SectionTitle>
                <CourseChampions runs={allCourseRuns} theme={theme} />
              </div>

              <div className="pt-4 pb-8">
                <ASRPromotionBanner
                  type="sponsor"
                  theme={theme}
                  course={course}
                />
              </div>
            </InspectorTabContainer>
          )}
        </div>

        {isSortOpen && (
          <ASRBottomSheet
            snapPoints={[0, 0.55]}
            activeSnap={isSortOpen ? 0.55 : 0}
            onSnapChange={(snap) => {
              if (snap === 0) setIsSortOpen(false);
            }}
          >
            <div className="flex flex-col px-6 py-4 pb-12 gap-1.5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3 pl-1">
                SORT RUNS
              </h3>
              {[
                { id: "points", label: "POINTS" },
                { id: "date", label: "DATE" },
                { id: "time", label: "TIME" },
                { id: "player", label: "PLAYER" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const nextDir = (opt.id === "time" || opt.id === "player") ? "asc" : "desc";
                    setSortState(opt.id, nextDir);
                    setIsSortOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-4 rounded-xl transition-all outline-none focus-visible:ring-2",
                    sortCategory === opt.id
                      ? (theme === "dark" ? "bg-white/10" : "bg-black/5")
                      : "hover:bg-zinc-500/10"
                  )}
                >
                  <span className={cn(
                    "text-sm font-black uppercase tracking-widest",
                    sortCategory === opt.id
                      ? (theme === "dark" ? "text-white" : "text-black")
                      : "text-zinc-500"
                  )}>
                    {opt.label}
                  </span>
                  {sortCategory === opt.id && (
                    <Check size={18} className={theme === "dark" ? "text-white" : "text-black"} />
                  )}
                </button>
              ))}
            </div>
          </ASRBottomSheet>
        )}
      </div>
    );
  },
);
