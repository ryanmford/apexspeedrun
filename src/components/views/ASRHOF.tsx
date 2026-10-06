/* eslint-disable @typescript-eslint/no-explicit-any */
 
import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useDataStore } from "../../store/useDataStore";
import { useSettersDerived } from "../../hooks/useDerivedData";
import { calculateWofStats } from "../../lib/asr-data";
import {
 cn,
 trackEvent,
 formatFlagsWithSpace,
  getCombinedFlags,
 THEME,
} from "../../lib/asr-utils";
import { ASRSectionHeading } from "../common/ASRSectionHeading";
import { ASRRankBadge } from "../ASRListItems";
import { ASRPromotionBanner } from "../common/ASRPromotionBanner";

interface ASRHOFProps {
 onEntityClick: (type: string, data: any, options?: any) => void;
 medalSort: { key: string; direction: "ascending" | "descending" };
 onMedalSort: (key: string) => void;
 theme: "light" | "dark";
}

const MedalHeader = React.memo(
 ({
 l,
 k,
 a = "left",
 sortable = true,
 className,
 medalSort,
 onMedalSort,
 theme,
 }: any) => {
 const isActive = medalSort.key === k;
 return (
 <th
 className={cn(
 "py-3 sm:py-5 px-3 sm:px-5 uppercase text-[10px] sm:text-[13px] font-black tracking-widest transition-all select-none group h-full",
 sortable ? "cursor-pointer hover:bg-black/5" : "cursor-default",
 isActive
 ? "text-blue-500 opacity-100"
 : theme === "dark"
 ? "text-white opacity-30"
 : "text-black opacity-40",
 className,
 )}
 onClick={() => sortable && onMedalSort(k)}
 >
 <div
 className={cn(
 "flex items-center gap-2",
 a === "right" ? "justify-end" : "justify-start",
 )}
 >
 <span>{l}</span>
 {sortable && (
 <div
 className={cn(
 "transition-all duration-300 shrink-0",
 isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60",
 )}
 >
 <ChevronDown
 size={14}
 strokeWidth={3}
 className={cn(
 "transition-transform",
 isActive && medalSort.direction === "ascending"
 ? "rotate-180"
 : "",
 )}
 />
 </div>
 )}
 </div>
 </th>
 );
 },
);

export const ASRHOF = React.memo(
 ({ onEntityClick, medalSort, onMedalSort, theme }: ASRHOFProps) => {
 const data = useDataStore((s) => s.data);
 const atPerfs = useDataStore((s) => s.atPerfs);
 const lbAT = useDataStore((s) => s.lbAT);
 const atMet = useDataStore((s) => s.atMet);
 const cMet = useDataStore((s) => s.cMet);
 const courseRunsHistory = useDataStore((s) => s.courseRunsHistory);
 const { settersWithImpact } = useSettersDerived();

 const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

 const stats = useMemo(() => {
 if (!data || data.length === 0) return null;
 return calculateWofStats(
 data,
 atPerfs as any,
 lbAT,
 atMet as any,
 medalSort,
 settersWithImpact,
 cMet as any,
 courseRunsHistory,
 );
 }, [data, lbAT, atMet, atPerfs, medalSort, settersWithImpact, cMet, courseRunsHistory]);

 const hasError = useDataStore((s) => s.hasError);

 if (!stats) {
  if (hasError) {
   return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center animate-in fade-in duration-700 min-h-[50vh]">
     <div className={cn("p-8 sm:p-12 w-full max-w-sm rounded-[2rem] border border-dashed flex flex-col items-center justify-center text-center gap-4 transition-colors", "theme-panel")}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-1 bg-red-500/10">
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="m2 2 20 20"/><path d="M17.5 17.5 22 22"/><path d="M22 22 17.5 17.5"/><path d="m2 22 4.5-4.5"/><path d="M6.5 17.5 2 22"/><path d="M10 17h4v4h-4z"/><path d="M12 2v4"/><path d="M12 10v4"/><path d="M2 12h4"/><path d="M10 12h4"/><path d="M18 12h4"/></svg>
      </div>
      <h3 className={cn("text-lg sm:text-xl font-black uppercase tracking-widest", theme === "dark" ? "text-red-400" : "text-red-600")}>NETWORK ERROR</h3>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-50 px-2 line-clamp-2", theme === "dark" ? "text-red-400" : "text-red-600")}>WE COULDN'T CONNECT TO THE ASSETS SERVER.</p>
     </div>
    </div>
   );
  }
  return null;
 }

 const sections = [
 { l: "TOP LQ", subtitle: "LOCOMOTIVE QUOTIENT = POINTS / RUNS", k: "rating" },
 { l: "MOST COURSES", subtitle: "TOTAL COURSES COMPLETED", k: "courses" },
 { l: "MOST RUNS", subtitle: "TOTAL VERIFIED RUNS", k: "runs" },
 { l: "MOST RERUNS", subtitle: "TOTAL VERIFIED RERUNS", k: "reruns" },
 { l: "MOST CITIES", subtitle: "TOTAL CITIES RUN IN", k: "cities" },
 { l: "MOST COUNTRIES", subtitle: "TOTAL COUNTRIES RUN IN", k: "countries" },
 { l: "MOST WR", subtitle: "TOTAL WORLD RECORDS", k: "wins" },
 { l: "HIGHEST WR %", subtitle: "TOTAL WORLD RECORDS / TOTAL COURSES COMPLETED", k: "winPercentage" },
 { l: "MOST 🪙", subtitle: "COINS EARNED FROM RUNS, WORLD RECORDS, & SETS", k: "contributionScore" },
 { l: "MOST 🔥", subtitle: <><span className="block whitespace-nowrap">M: &lt;9 🔥, &lt;8 🔥🔥, &lt;7 🔥🔥🔥</span><span className="block mt-0.5 whitespace-nowrap">W: &lt;11 🔥, &lt;10 🔥🔥, &lt;9 🔥🔥🔥</span></>, k: "totalFireCount" },
 { l: "MOST IMPACT", subtitle: "TOTAL RUNS ON ALL COURSES SET", k: "impact" },
 { l: "MOST SETS", subtitle: "TOTAL SETS", k: "sets" },
 ];

 const tocItems = [
   ...sections.map((sec) => ({ l: sec.l, id: `hof-${sec.k}` })),
   { l: "WORLDWIDE MEDAL COUNT", id: "hof-medals" },
 ];

 const scrollToSection = (id: string) => {
   const el = document.getElementById(id);
   if (!el) return;

   // Dynamically query header height to account for mobile safe areas and PWA notch
   const header = document.querySelector("header");
   const headerHeight = header ? header.getBoundingClientRect().height : 105;
   const extraPadding = 16;

   const elementTop =
     el.getBoundingClientRect().top +
     (window.pageYOffset ||
       window.scrollY ||
       document.documentElement.scrollTop ||
       0);
   const targetScrollY = Math.max(0, elementTop - headerHeight - extraPadding);

   try {
     window.scrollTo({
       top: targetScrollY,
       behavior: "smooth",
     });
   } catch {
     window.scrollTo(0, targetScrollY);
   }
 };

 return (
 <div id="hof-top" className="flex flex-col gap-10 sm:gap-12 pb-32 animate-in fade-in duration-700 w-full max-w-6xl mx-auto">
 <div className="px-4 sm:px-6 w-full flex flex-col justify-between sm:justify-start min-h-[calc(100svh-3.25rem)] min-h-[calc(100dvh-3.25rem)] sm:min-h-0 pb-[calc(7.25rem+env(safe-area-inset-bottom,0px))] sm:pb-0 gap-2 xs:gap-2.5 sm:gap-3.5">
  <div className="flex items-center pt-1">
   <p className="text-[10px] sm:text-[11px] font-bold text-zinc-500/80 dark:text-zinc-500/80 tracking-widest uppercase select-none">
    * RUN 10+ COURSES TO JOIN THE HOF
   </p>
  </div>

  {/* Mobile Compact TOC Bubbles */}
  <div className="grid sm:hidden grid-cols-2 gap-1.5 xs:gap-2 my-auto w-full max-w-md mx-auto py-1">
   {tocItems.map((item, index) => {
    const isLast = index === tocItems.length - 1;
    return (
     <button
      key={item.id}
      type="button"
      onClick={() => scrollToSection(item.id)}
      className={cn(
       "rounded-2xl px-2.5 py-1.5 xs:px-3 xs:py-2 flex items-center justify-center text-center transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.97] border min-h-[38px] xs:min-h-[42px] max-h-[46px]",
       isLast ? "col-span-2 min-h-[40px] xs:min-h-[44px] max-h-[48px] py-2" : "",
       theme === "dark"
         ? "bg-zinc-900/60 hover:bg-zinc-800/80 active:bg-blue-500/20 text-zinc-100 hover:text-white border-white/10 hover:border-blue-500/40 shadow-sm"
         : "bg-white hover:bg-zinc-50 active:bg-blue-500/10 text-zinc-800 hover:text-black border-zinc-200/90 hover:border-blue-500/40 shadow-xs"
      )}
     >
      <span className={cn(
       "font-black uppercase tracking-wider",
       isLast ? "text-[11.5px] xs:text-[12.5px] flex items-center justify-center gap-1.5" : "text-[10.5px] xs:text-[11.5px] leading-tight"
      )}>
       {item.l}
       {isLast && <span className="text-[13px] ml-1">🥇🥈🥉</span>}
      </span>
     </button>
    );
   })}
  </div>

  {/* Mobile scroll hint prompt - scooted up safely above the nav dock */}
  <div className="sm:hidden flex items-center justify-center pt-1 pb-2 select-none">
   <button
    type="button"
    onClick={() => scrollToSection(tocItems[0]?.id || "hof-rating")}
    aria-label="Jump to first top 20 rankings"
    className="flex items-center justify-center w-10 h-10 text-zinc-400 hover:text-zinc-200 dark:text-zinc-500 dark:hover:text-zinc-200 active:scale-90 transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
   >
    <ChevronDown size={22} strokeWidth={2.25} className="animate-bounce" />
   </button>
  </div>

  {/* Desktop Table of Contents */}
  <nav aria-label="Hall of Fame Table of Contents" className={cn(
    "hidden sm:block p-2.5 sm:p-3.5 rounded-[1.6rem] border transition-all duration-300",
    theme === "dark"
      ? "bg-zinc-900/40 border-white/5"
      : "bg-zinc-50/90 border-zinc-200/80 shadow-sm"
  )}>
   <div className="flex flex-wrap gap-1.5 sm:gap-2">
    {tocItems.map((item) => (
     <button
      key={item.id}
      type="button"
      onClick={() => scrollToSection(item.id)}
      className={cn(
       "px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-150 select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
       theme === "dark"
         ? "bg-white/[0.04] hover:bg-white/[0.08] active:bg-blue-500/20 text-zinc-300 hover:text-white border border-white/5 hover:border-blue-500/40 active:scale-95"
         : "bg-white hover:bg-zinc-100 active:bg-blue-500/10 text-zinc-700 hover:text-black border border-zinc-200/90 hover:border-blue-500/40 shadow-xs active:scale-95"
      )}
     >
      {item.l}
     </button>
    ))}
   </div>
  </nav>
 </div>
 {/* Leaderboard Grids */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6">
 {sections.map((sec) => (
 <div key={sec.k} id={`hof-${sec.k}`} className="scroll-mt-[calc(env(safe-area-inset-top,0px)+5.5rem)] sm:scroll-mt-28 flex flex-col gap-1.5 sm:gap-5">
 <ASRSectionHeading title={sec.l} subtitle={sec.subtitle} theme={theme} className="pt-2 sm:pt-6 pb-0.5 sm:pb-2" />
 <div
 className={cn(
 "rounded-2xl sm:rounded-[2.5rem] overflow-hidden transition-all duration-300 shadow-xl",
 THEME.BENTO_CARD(theme),
 )}
 >
 <div className="flex flex-col divide-y divide-zinc-800/10">
 {(() => {
   const limit = visibleCounts[sec.k] || 10;
   const items = stats.topStats[sec.k] || [];
   return (
     <>
       {items.slice(0, limit).map((a: any, i: number) => {
         const isSetterBoard = ["impact", "sets"].includes(sec.k);
 let displayVal: any;
 if (sec.k === "rating")
 displayVal = (a.rating || 0).toFixed(2);
 else if (sec.k === "winPercentage")
 displayVal = (a.winPercentage || 0).toFixed(2);
 else if (sec.k === "contributionScore")
 displayVal = (a.contributionScore || 0).toFixed(2);
 else if (sec.k === "totalFireCount")
 displayVal = a.allTimeFireCount || 0;
 else if (sec.k === "impact") displayVal = a.impact || 0;
 else if (sec.k === "sets") displayVal = a.sets || 0;
 else if (sec.k === "reruns") displayVal = a.reruns || 0;
 else if (sec.k === "cities") displayVal = a.cities || 0;
 else if (sec.k === "countries") displayVal = a.countries || 0;
 else displayVal = a[sec.k] || 0;

 const isTop3 = i < 3;
 const flags = getCombinedFlags(a);
 const hoverClass =
 theme === "dark"
 ? "hover:bg-blue-500/10"
 : "hover:bg-blue-500/5";

 return (
 <button
 key={a.id || a.pKey || i}
 onClick={() =>
 onEntityClick(
 isSetterBoard ? "setter" : "player",
 a,
 { initialMode: "all-time" },
 )
 }
 className={cn(
 "flex items-center justify-between py-1.5 xs:py-2 sm:py-5 px-3.5 sm:px-6 transition-colors duration-150 group relative overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset select-none",
 hoverClass,
 i === 0 && (theme === "dark" ? "bg-white/[0.02]" : "bg-black/[0.02]")
 )}
 >
 <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 z-10 relative flex-1 pr-2 sm:pr-4">
 <ASRRankBadge rank={i + 1} />
 <div className="flex flex-col text-left min-w-0">
 <span
 className={cn(
 "text-[12.5px] xs:text-[13.5px] sm:text-[18px] lg:text-[22px] font-black uppercase truncate pr-1 sm:pr-2 leading-none transition-colors",
 theme === "dark"
 ? "text-zinc-100"
 : "text-zinc-900",
 i === 0 ? "text-zinc-900 dark:text-white group-hover:text-blue-500" : "group-hover:text-blue-500"
 )}
 >
 {flags} {a.name}
 </span>
 </div>
 </div>
 <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 text-right z-10 relative">
 <span
 className={cn(
 "text-[13px] xs:text-[14px] sm:text-[24px] lg:text-[28px] font-mono font-black tracking-tight whitespace-nowrap transition-all tabular-nums text-right group-hover:text-blue-500",
 theme === "dark" ? "text-white" : "text-zinc-900",
 isTop3 ? "scale-105 sm:scale-110" : "opacity-100",
 i === 0 && ""
 )}
 >
 {displayVal}
 </span>
 </div>
 {isTop3 && i === 0 && (
 <>
   <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/10 rotate-45 translate-x-16 -translate-y-16 pointer-events-none blur-xl" />
   <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
 </>
 )}
 </button>
 );
 })}
 {items.length > limit && (
  <div className="flex justify-center p-2.5 sm:p-4">
    <button
      className="group flex flex-col items-center gap-0.5 px-6 py-1.5 sm:py-3 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 active:scale-[0.98] text-[9.5px] sm:text-[10px] font-black tracking-widest uppercase text-zinc-400 hover:text-blue-500 active:text-blue-500 transition-all duration-300 rounded-2xl cursor-pointer"
      onClick={() =>
        setVisibleCounts((prev) => ({
          ...prev,
          [sec.k]: limit + 10,
        }))
      }
      onTouchStart={() => {}}
    >
      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-y-0.5 transition-transform" />
      Load More
    </button>
  </div>
 )}
 </>
 );
 })()}
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* Medal Table */}
 <div id="hof-medals" className="scroll-mt-[calc(env(safe-area-inset-top,0px)+5.5rem)] sm:scroll-mt-28 px-4 sm:px-6">
 <ASRSectionHeading title="WORLDWIDE MEDAL COUNT" theme={theme} />
 <div
 className={cn(
 "rounded-[2.8rem] overflow-hidden mt-6 transition-all duration-300 shadow-xl",
 theme === "dark"
 ? "bg-zinc-900/40 border-zinc-800/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.4)]"
 : "bg-white border-slate-200 shadow-lg shadow-black/5",
 )}
 >
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left border-collapse min-w-[340px] table-fixed">
 <thead
 className={cn(
 "border-b backdrop-blur-xl",
 theme === "dark"
 ? "bg-black/90 border-zinc-800/50"
 : "bg-white border-zinc-200"
 )}
 >
 <tr>
 <th
 className={cn(
 "py-3 sm:py-5 pl-4 sm:pl-10 w-14 sm:w-28 text-left uppercase text-[10px] sm:text-[13px] font-black tracking-widest",
 theme === "dark"
 ? "text-white opacity-30"
 : "text-black opacity-40",
 )}
 >
 RANK
 </th>
 <MedalHeader
 l="COUNTRY"
 k="name"
 a="left"
 sortable={false}
 className="w-auto min-w-[90px] px-2 sm:px-5"
 theme={theme}
 medalSort={medalSort}
 onMedalSort={onMedalSort}
 />
 <MedalHeader
 l="🥇"
 k="gold"
 a="right"
 className="w-12 sm:w-28 px-1 sm:px-5"
 theme={theme}
 medalSort={medalSort}
 onMedalSort={onMedalSort}
 />
 <MedalHeader
 l="🥈"
 k="silver"
 a="right"
 className="w-12 sm:w-28 px-1 sm:px-5"
 theme={theme}
 medalSort={medalSort}
 onMedalSort={onMedalSort}
 />
 <MedalHeader
 l="🥉"
 k="bronze"
 a="right"
 className="w-12 sm:w-28 px-1 sm:px-5"
 theme={theme}
 medalSort={medalSort}
 onMedalSort={onMedalSort}
 />
 <MedalHeader
 l="TOTAL"
 k="total"
 a="right"
 className="w-16 sm:w-36 pr-4 sm:pr-10 pl-1 sm:pl-5"
 theme={theme}
 medalSort={medalSort}
 onMedalSort={onMedalSort}
 style={{ pointerEvents: "auto" }}
 />
 </tr>
 </thead>
 <tbody className="divide-y divide-zinc-800/10">
 {stats.medalCount.map((c: any) => (
 <tr
 key={c.name}
 onClick={() => {
 trackEvent("select_content", {
 content_type: "hof_country",
 item_id: c.name,
 });
 onEntityClick("region", { ...c, type: "country" });
 }}
 className={cn(
 "transition-colors duration-150 group cursor-pointer relative",
 theme === "dark"
 ? "hover:bg-blue-500/10"
 : "hover:bg-blue-500/5",
 )}
 >
  <td className="py-4 sm:py-6 pl-4 sm:pl-10 text-left">
  <div className="flex items-center justify-start">
  <ASRRankBadge rank={c.displayRank} />
  </div>
  </td>
  <td className="py-4 sm:py-6 px-2 sm:px-5 text-left max-w-[100px] sm:max-w-xs">
  <div className="flex items-center gap-1.5 sm:gap-3 text-left min-w-0 h-full">
  <span className="emoji-slot text-[16px] sm:text-[24px] lg:text-[32px] shrink-0">
  {formatFlagsWithSpace(c.flag)}
  </span>
  <span
  className={cn(
  "text-[14px] sm:text-[18px] lg:text-[22px] font-black uppercase truncate leading-tight group-hover:text-blue-500 transition-colors",
  theme === "dark"
  ? "text-zinc-100"
  : "text-zinc-800",
  )}
  >
  {c.name}
  </span>
  </div>
  </td>
  <td className="py-4 sm:py-6 px-1 sm:px-5 text-right">
  <span className="text-[16px] sm:text-[24px] lg:text-[32px] font-mono font-black tabular-nums tracking-tighter text-amber-500 group-hover:text-amber-400 transition-colors">
  {String(c.gold)}
  </span>
  </td>
  <td className="py-4 sm:py-6 px-1 sm:px-5 text-right">
  <span className="text-[14px] sm:text-[20px] lg:text-[24px] font-mono font-black tabular-nums tracking-tighter text-zinc-400">
  {String(c.silver)}
  </span>
  </td>
  <td className="py-4 sm:py-6 px-1 sm:px-5 text-right">
  <span className="text-[14px] sm:text-[20px] lg:text-[24px] font-mono font-black tabular-nums tracking-tighter text-[#CE8946]">
  {String(c.bronze)}
  </span>
  </td>
  <td className="py-4 sm:py-6 pr-4 sm:pr-10 pl-1 sm:pl-5 text-right">
  <span
  className={cn(
  "text-[14px] sm:text-[20px] lg:text-[24px] font-mono font-black tabular-nums tracking-tighter",
  theme === "dark" ? "text-white" : "text-zinc-900",
  )}
  >
  {String(c.total)}
  </span>
  </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>

 <div className="px-4 sm:px-6 mt-8">
 <ASRPromotionBanner
 type={
 ["skool", "setter"][
 Math.floor(Math.random() * 2)
 ] as any
 }
 theme={theme}
 />
 </div>
 </div>
 );
 },
);
