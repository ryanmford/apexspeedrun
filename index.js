import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';

// --- CUSTOM STYLES ---
const CustomStyles = () => (
  <style>{`
    @keyframes subtlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
    .animate-subtle-pulse { animation: subtlePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .glow-gold { filter: drop-shadow(0 0 8px rgba(234, 179, 8, 0.6)); }
    .glow-silver { filter: drop-shadow(0 0 8px rgba(161, 161, 170, 0.5)); }
    .glow-bronze { filter: drop-shadow(0 0 8px rgba(206, 137, 70, 0.6)); }
    .glow-fire { filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.7)); }
    
    ::-webkit-scrollbar { display: none; }
    * { -ms-overflow-style: none; scrollbar-width: none; -webkit-tap-highlight-color: transparent; }
    
    html, body { 
      text-rendering: optimizeLegibility; 
      -webkit-font-smoothing: antialiased; 
      width: 100%; 
      overflow-x: hidden; 
      margin: 0; 
      padding: 0; 
    }

    .data-table td, .data-table th, .hof-table td, .hof-table th {
      word-break: keep-all; 
      overflow-wrap: break-word;
      white-space: normal;
      vertical-align: middle;
    }

    .table-fixed-layout { table-layout: fixed; width: 100%; }
    .no-scrollbar { overflow-x: hidden !important; }
    
    .hof-table th, .hof-table td, .data-table th, .data-table td { 
      padding: 1rem 0.5rem; 
    }
    @media (min-width: 640px) {
      .hof-table th, .hof-table td, .data-table th, .data-table td { padding: 1.5rem 1rem; }
    }
  `}</style>
);

// --- ICONS ---
const IconSpeed = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'skewX(-18deg)' }} className="overflow-visible">
    <path d="M3 19l6-7-6-7" opacity="0.2" /><path d="M9 19l6-7-6-7" opacity="0.5" /><path d="M15 19l6-7-6-7" />
  </svg>
);
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-current"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconX = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconArrow = ({ direction }) => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconSun = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v20M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/><path d="M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const IconMoon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconCourse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const RankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = rank === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-9 sm:h-9';
  const textClass = size === 'lg' ? 'text-[11px] sm:text-[13px]' : 'text-[9px] sm:text-[11px]';
  const isPodium = rank === 1 || rank === 2 || rank === 3;
  const styles = {
    1: { border: theme === 'dark' ? 'border-yellow-500' : 'border-yellow-600', text: theme === 'dark' ? 'text-yellow-500' : 'text-yellow-700', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]' },
    2: { border: theme === 'dark' ? 'border-zinc-400' : 'border-zinc-500', text: theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600', glow: 'shadow-[0_0_15px_rgba(161,161,170,0.25)]' },
    3: { border: 'border-[#CE8946]', text: 'text-[#CE8946]', glow: 'shadow-[0_0_15px_rgba(206,137,70,0.3)]' },
    unranked: { border: 'border-dashed border-slate-500/30', text: 'text-slate-500', glow: 'shadow-none' },
    default: { border: 'border-transparent', text: theme === 'dark' ? 'text-white' : 'text-black', glow: 'shadow-none' }
  };
  const current = isUnranked ? styles.unranked : (styles[rank] || styles.default);
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-500 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[2px] sm:border-[3px] animate-subtle-pulse' : isUnranked ? 'border' : 'border-0'}`}>
      {rankNum}
    </span>
  );
};

const parseLine = (line = '') => {
  const result = []; 
  let cur = '', inQuotes = false;
  for (let char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(cur.trim().replace(/^"|"$/g, '')); cur = ''; }
    else cur += char;
  }
  result.push(cur.trim().replace(/^"|"$/g, '')); 
  return result;
};

const getInitials = (n) => {
  if (!n) return '??'; 
  const w = n.trim().split(/\s+/);
  return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : n.slice(0, 2)).toUpperCase();
};

const normalizeName = (n) => n ? String(n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '').trim() : "";

const cleanNumeric = (v) => {
  if (v === undefined || v === null || v === "" || String(v).includes("#")) return null;
  const clean = String(v).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (clean === "") return null;
  const num = parseFloat(clean);
  return (isNaN(num) || num < 0) ? null : num;
};

const processRankingData = (csv, gender) => {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const hIdx = lines.findIndex(l => l.toLowerCase().includes('name') || l.toLowerCase().includes('athlete')); 
  if (hIdx === -1) return [];
  const rHeaders = parseLine(lines[hIdx]); 
  const findIdx = (keys) => rHeaders.findIndex(h => keys.some(k => h.toLowerCase().trim() === k || h.toLowerCase().includes(k)));

  const nameIdx = Math.max(0, findIdx(['athlete', 'name', 'player']));
  const countryNameIdx = findIdx(['country']); 
  const flagEmojiIdx = findIdx(['flag']); 
  const ratingIdx = findIdx(['ovr', 'overall', 'rating']);
  const ptsIdx = findIdx(['pts', 'points', 'asr']);
  const runIdx = findIdx(['runs', 'totalruns', 'total', '#']);
  const winIdx = findIdx(['wins', 'victories']);
  const setIdx = findIdx(['sets', 'total sets']);
  const cIdx = findIdx(['🪙', 'contribution']);
  const fireIdx = findIdx(['🔥', 'fire']);

  return lines.slice(hIdx + 1).map((line, i) => {
    const vals = parseLine(line); 
    const pName = (vals[nameIdx] || "").trim();
    if (pName.length < 2) return null;

    return { 
      id: `${gender}-${normalizeName(pName)}-${i}`, 
      name: pName, pKey: normalizeName(pName), gender, 
      countryName: countryNameIdx !== -1 ? vals[countryNameIdx]?.trim() : "", 
      region: flagEmojiIdx !== -1 ? (vals[flagEmojiIdx]?.trim() || "🏳️") : "🏳️", 
      rating: cleanNumeric(vals[ratingIdx]) || 0, runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
      wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), pts: cleanNumeric(vals[ptsIdx]) || 0, 
      sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
      contributionScore: cleanNumeric(vals[cIdx]) || 0, totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0
    };
  }).filter(p => p !== null);
};

const processSetListData = (csv) => {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return {};
    const headers = parseLine(lines[0]);
    const courseIdx = headers.findIndex(h => /course|track/i.test(h)) !== -1 ? headers.findIndex(h => /course|track/i.test(h)) : 1;
    const ratingIdx = 5; const cityIdx = 10; const countryIdx = 12; const flagIdx = 13; const dateIdx = 15;
    const map = {};
    lines.slice(1).forEach(l => {
        const vals = parseLine(l);
        const course = (vals[courseIdx] || "").trim().toUpperCase();
        const difficulty = (vals[ratingIdx] || "").trim();
        const rawCity = (vals[cityIdx] || "").trim().toUpperCase();
        const country = (vals[countryIdx] || "").trim();
        const flagEmoji = (vals[flagIdx] || "").trim();
        const dateVal = vals[dateIdx] || "";
        if (course) map[course] = { 
            is2026: dateVal.includes('2026'), flag: flagEmoji || '🏳️',
            city: rawCity || "UNKNOWN", country: country.toUpperCase(), difficulty: difficulty
        };
    });
    return map;
};

const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return { allTimePerformances: {}, openPerformances: {}, openRankings: [] };
  const OPEN_THRESHOLD = new Date('2026-01-01');
  let headers = []; let hIdx = -1;
  for(let i=0; i<Math.min(10, lines.length); i++) {
    const tempHeaders = parseLine(lines[i]);
    if (tempHeaders.some(h => /athlete|name|course|track|pb|result/i.test(h))) { headers = tempHeaders; hIdx = i; break; }
  }
  const findIdx = (keys) => headers.findIndex(h => keys.some(k => h.toLowerCase().includes(k)));
  const athleteIdx = Math.max(0, findIdx(['athlete', 'name', 'player']));
  const courseIdx = Math.max(0, findIdx(['course', 'track', 'level']));
  const resultIdx = Math.max(0, findIdx(['result', 'time', 'pb']));
  const genderIdx = findIdx(['div', 'gender', 'sex']);
  const dateIdx = findIdx(['date', 'day', 'timestamp']);
  const tagIdx = findIdx(['tag', 'event', 'category']) !== -1 ? findIdx(['tag', 'event', 'category']) : 6;
  const allTimeAthleteBestTimes = {}; const allTimeCourseLeaderboards = { M: {}, F: {} };
  const openAthleteBestTimes = {}; const openCourseLeaderboards = { M: {}, F: {} }; 
  const openAthleteSetCount = {}; const athleteDisplayNameMap = {};

  lines.slice(hIdx + 1).forEach(line => {
    const vals = parseLine(line);
    const pName = (vals[athleteIdx] || "").trim();
    const rawCourse = (vals[courseIdx] || "").trim();
    const numericValue = cleanNumeric(vals[resultIdx]);
    const runDate = dateIdx !== -1 ? new Date(vals[dateIdx]) : null;
    const rawTag = tagIdx !== -1 ? (vals[tagIdx] || "") : (vals[6] || "");
    if (!pName || !rawCourse || numericValue === null) return;
    const pKey = normalizeName(pName);
    const normalizedCourseName = rawCourse.toUpperCase();
    if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;
    const pGender = athleteMetadata[pKey]?.gender || (vals[genderIdx]?.toUpperCase().startsWith('F') ? 'F' : 'M');
    if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
    if (!allTimeAthleteBestTimes[pKey][normalizedCourseName] || numericValue < allTimeAthleteBestTimes[pKey][normalizedCourseName].num) {
      allTimeAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue };
    }
    if (!allTimeCourseLeaderboards[pGender][normalizedCourseName]) allTimeCourseLeaderboards[pGender][normalizedCourseName] = {};
    if (!allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] || numericValue < allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey]) {
        allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] = numericValue;
    }
    if (rawTag.toUpperCase().includes("ASR OPEN") && (!runDate || runDate >= OPEN_THRESHOLD)) {
      if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
      if (!openAthleteBestTimes[pKey][normalizedCourseName] || numericValue < openAthleteBestTimes[pKey][normalizedCourseName].num) {
        openAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue };
      }
      if (!openCourseLeaderboards[pGender][normalizedCourseName]) openCourseLeaderboards[pGender][normalizedCourseName] = {};
      if (!openCourseLeaderboards[pGender][normalizedCourseName][pKey] || numericValue < openCourseLeaderboards[pGender][normalizedCourseName][pKey]) {
          openCourseLeaderboards[pGender][normalizedCourseName][pKey] = numericValue;
      }
      if (courseSetMap[normalizedCourseName]?.is2026) openAthleteSetCount[pKey] = (openAthleteSetCount[pKey] || 0) + 1;
    }
  });
  const buildPerfs = (source) => {
    const res = {};
    Object.keys(source).forEach(pKey => {
      const pGender = athleteMetadata[pKey]?.gender || 'M';
      res[pKey] = Object.entries(source[pKey]).map(([normL, data]) => {
        const record = (pGender === 'F' ? Math.min(...Object.values(allTimeCourseLeaderboards['F'][normL] || {})) : Math.min(...Object.values(allTimeCourseLeaderboards['M'][normL] || {}))) || data.num;
        const board = (allTimeCourseLeaderboards[pGender] || {})[normL] || {};
        const sorted = Object.entries(board).sort((a, b) => a[1] - b[1]);
        const rank = sorted.findIndex(e => e[0] === pKey) + 1;
        return { label: data.label, value: data.value, num: data.num, rank, points: (record / data.num) * 100 };
      }).sort((a, b) => a.label.localeCompare(b.label));
    });
    return res;
  };
  const openRankingArray = Object.keys(openAthleteBestTimes).map(pKey => {
    const pGender = athleteMetadata[pKey]?.gender || 'M';
    const perfs = buildPerfs(openAthleteBestTimes)[pKey] || [];
    const totalPts = perfs.reduce((sum, p) => sum + p.points, 0);
    return {
      id: `open-${pKey}`, name: athleteDisplayNameMap[pKey] || pKey, pKey, gender: pGender,
      rating: perfs.length > 0 ? (totalPts / perfs.length) : 0, runs: perfs.length,
      wins: perfs.filter(p => p.rank === 1).length, pts: totalPts, 
      sets: openAthleteSetCount[pKey] || 0,
      region: athleteMetadata[pKey]?.region || '🏳️',
      allTimeRank: athleteMetadata[pKey]?.allTimeRank || 9999,
      countryName: athleteMetadata[pKey]?.countryName || ""
    };
  });
  return { 
    allTimePerformances: buildPerfs(allTimeAthleteBestTimes), 
    openPerformances: buildPerfs(openAthleteBestTimes), 
    openRankings: openRankingArray,
    allTimeLeaderboards: allTimeCourseLeaderboards,
    openLeaderboards: openCourseLeaderboards,
    athleteMetadata: athleteMetadata, athleteDisplayNameMap: athleteDisplayNameMap,
    courseMetadata: courseSetMap
  };
};

const PerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-fire" };
    return <span className={`inline-flex items-center gap-1 text-[11px] select-none ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const Modal = ({ isOpen, onClose, player: p, theme, performanceData, onCourseClick }) => {
  if (!isOpen || !p) return null;
  const pKey = p.pKey || normalizeName(p.name);
  const courseData = useMemo(() => {
    const base = (performanceData?.[pKey] || []);
    return [...base].sort((a, b) => {
      const aIsRecord = a.rank === 1; const bIsRecord = b.rank === 1;
      if (aIsRecord && !bIsRecord) return -1;
      if (!aIsRecord && bIsRecord) return 1;
      if (aIsRecord && bIsRecord) return a.num - b.num;
      return b.points - a.points;
    });
  }, [performanceData, pKey]);
  const getFires = (t, g) => g === 'M' ? (t < 7 ? 3 : t < 8 ? 2 : t < 9 ? 1 : 0) : (t < 9 ? 3 : t < 10 ? 2 : t < 11 ? 1 : 0);
  const totalFires = courseData.reduce((acc, c) => acc + getFires(c.num, p.gender), 0);
  const stats = [
    { l: 'OVR', v: (p.rating || 0).toFixed(2), c: 'text-blue-500' }, { l: 'RUNS', v: p.runs || 0 }, 
    { l: 'POINTS', v: (p.pts || 0).toFixed(2) }, { l: '🪙', v: p.contributionScore || 0, g: 'glow-gold' }, 
    { l: 'WIN %', v: ((p.wins / (p.runs || 1)) * 100).toFixed(2) }, { l: 'WINS', v: p.wins || 0 }, 
    { l: 'SETS', v: p.sets || 0 }, { l: '🔥', v: totalFires, g: 'glow-fire' }
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 relative h-28 sm:h-40 p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"><IconX /></button>
          <div className="flex items-center gap-4 sm:gap-8 min-w-0 w-full pr-12">
            <div className={`w-14 h-14 sm:w-24 sm:h-24 rounded-3xl border flex items-center justify-center text-lg sm:text-3xl font-black shadow-xl shrink-0 uppercase ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>{getInitials(p.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-4xl leading-tight flex items-center gap-2">
                <span className="shrink-0">{p.region || '🏳️'}</span><h2 className="font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</h2>
              </div>
              {p.countryName && <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-50 ml-1">{p.countryName}</div>}
            </div>
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{s.l}</span>
                <span className={`text-base sm:text-xl font-mono font-black ${s.c || ''} ${s.g || ''}`}>{s.v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {courseData.map((c, i) => (
              <div key={i} onClick={() => onCourseClick?.(c.label)} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                <div className="flex flex-col">
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {c.rank > 0 && c.rank <= 3 && <PerformanceBadge type={c.rank} />}
                    {c.rank >= 4 && <span className="text-[10px] font-mono font-black italic opacity-40">{c.rank}</span>}
                    {getFires(c.num, p.gender) > 0 && <PerformanceBadge type="fire" count={getFires(c.num, p.gender)} />}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs sm:text-lg font-mono font-black text-blue-500">{c.points.toFixed(2)}</span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold -mt-1 opacity-70">{c.num.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CourseModal = ({ isOpen, onClose, course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick }) => {
    if (!isOpen || !course) return null;
    const displayDifficulty = course.difficulty ? Array.from(course.difficulty).join(' ') : '-';
    const stats = [
        { l: 'CR (M)', v: course.mRecord?.toFixed(2) || '-', c: 'text-blue-500' },
        { l: 'CR (W)', v: course.fRecord?.toFixed(2) || '-', c: 'text-blue-500' },
        { l: 'DIFFICULTY', v: displayDifficulty }, { l: 'RUNS', v: course.totalRuns }
    ];
    const RankList = ({ title, athletes, genderRecord }) => (
        <div className="space-y-3">
            <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{title}</h3>
            <div className="grid grid-cols-1 gap-2">
                {athletes.slice(0, 10).map(([pKey, time], i) => {
                    const meta = athleteMetadata[pKey] || {};
                    const points = genderRecord ? (genderRecord / time) * 100 : 0;
                    return (
                        <div key={pKey} onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-3">
                                <RankBadge rank={i + 1} theme={theme} /><div className="flex flex-col"><span className={`text-[12px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{athleteDisplayNameMap[pKey]}</span><span className="text-[10px] uppercase font-black">{meta.region || '🏳️'}</span></div>
                            </div>
                            <div className="flex flex-col items-end"><span className="text-sm font-mono font-black text-blue-500">{time.toFixed(2)}</span><span className={`text-[10px] font-mono font-black ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{points.toFixed(2)}</span></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
            <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className={`shrink-0 relative h-28 sm:h-36 p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"><IconX /></button>
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center text-blue-500 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}><IconCourse /></div>
                        <div className="flex flex-col min-w-0"><h2 className="text-xl sm:text-3xl font-black tracking-tight uppercase truncate">{course.name} SPEED RUN</h2><div className="text-[10px] sm:text-[12px] font-bold uppercase tracking-widest ml-1 truncate flex items-center gap-2"><span className="opacity-60">{course.city || 'UNKNOWN'}, {course.country || 'UNKNOWN'}</span><span className="opacity-100">{course.flag}</span></div></div>
                    </div>
                </div>
                <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map((s, i) => (<div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}><span className="text-[8px] font-black uppercase tracking-wider mb-2 opacity-50">{s.l}</span><span className={`text-sm sm:text-base font-mono font-black ${s.c || ''}`}>{s.v}</span></div>))}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><RankList title="MEN'S TOP 10" athletes={course.athletesM} genderRecord={course.mRecord} /><RankList title="WOMEN'S TOP 10" athletes={course.athletesF} genderRecord={course.fRecord} /></div>
                </div>
            </div>
        </div>
    );
};

const HeaderComp = ({ l, k, a = 'left', w = "", isCourse = false, activeSort, handler }) => {
  return (
    <th className={`${w} px-1 py-4 sm:py-5 cursor-pointer group select-none transition-colors ${activeSort.key === k ? 'bg-blue-600/10' : ''} hover:bg-blue-600/5`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-0.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase tracking-tighter text-[7.5px] sm:text-[10px] font-black whitespace-nowrap leading-none">{l}</span>
        <div className={`transition-opacity ${activeSort.key === k ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
          <IconArrow direction={activeSort.key === k ? activeSort.direction : 'descending'} />
        </div>
      </div>
    </th>
  );
};

const HallOfFame = ({ stats, theme, onPlayerClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const tColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const tMuted = theme === 'dark' ? 'text-white/40' : 'text-slate-400';

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {[{ l: 'TOP RATED', k: 'rating' },{ l: 'MOST COURSE RECORDS', k: 'wins' },{ l: 'MOST RUNS', k: 'runs' },{ l: 'MOST SETS', k: 'sets' },{ l: 'MOST 🪙', k: 'contributionScore' },{ l: 'MOST 🔥', k: 'totalFireCount' },{ l: 'MOST COURSES (CITY)', k: 'cityStats' },{ l: 'MOST COURSES (COUNTRY)', k: 'countryStats' }].map((sec) => (
          <div key={sec.k} className={`rounded-3xl border overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
            <div className="p-4 border-b border-inherit bg-inherit flex items-center justify-between"><h4 className="text-[9px] font-black uppercase tracking-wider">{sec.l.split(' ').map((word, wi) => (<span key={wi} className={word === '🔥' || word === '🪙' ? 'opacity-100 brightness-150 glow-fire' : 'opacity-60'}>{word}{' '}</span>))}</h4></div>
            <div className={`divide-y ${theme === 'dark' ? 'divide-white/[0.03]' : 'divide-slate-100'}`}>
              {stats.topStats[sec.k].map((p, i) => (
                <div key={`${sec.k}-${i}-${p.name}`} className={`flex items-center justify-between p-3 sm:p-4 hover:bg-white/[0.03] transition-colors gap-3 ${['cityStats', 'countryStats'].includes(sec.k) ? '' : 'cursor-pointer group/item'}`} onClick={() => !['cityStats', 'countryStats'].includes(sec.k) && onPlayerClick(p)}>
                  <div className="flex items-center gap-2.5"><span className={`text-[9px] font-black opacity-20 w-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{i + 1}</span><span className={`text-[10px] font-black uppercase whitespace-normal leading-tight ${!['cityStats', 'countryStats'].includes(sec.k) ? 'group-hover/item:text-blue-500' : ''} transition-colors`}>{p.name} <span className="ml-1 opacity-100">{p.region || ''}</span></span></div>
                  <span className={`font-mono font-black text-blue-500 text-[10px] shrink-0 tabular-nums ${sec.k === 'totalFireCount' ? 'glow-fire' : ''} ${sec.k === 'contributionScore' ? 'glow-gold' : ''}`}>{sec.k === 'rating' ? p[sec.k].toFixed(2) : (p[sec.k] ?? p.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`rounded-3xl border overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="p-4 sm:p-6 border-b border-inherit bg-inherit"><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">WORLDWIDE MEDAL COUNT</h3></div>
        <div className="overflow-hidden">
          <table className="w-full text-left border-collapse hof-table table-fixed-layout no-scrollbar">
            <thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <HeaderComp l="RANK" k="rank" a="center" w="w-[8%]" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="" k="flag" a="center" w="w-[10%]" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="COUNTRY" k="name" a="left" w="w-auto" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥇" k="gold" a="center" w="w-[11%]" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥈" k="silver" a="center" w="w-[11%]" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥉" k="bronze" a="center" w="w-[11%]" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="TOTAL" k="total" a="right" w="w-[16%]" activeSort={medalSort} handler={setMedalSort} />
            </tr></thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={`medal-row-${c.name}-${c.flag}`} className="group hover:bg-black/[0.02] transition-colors">
                  <td className={`text-center font-mono font-black text-[8px] sm:text-xs tabular-nums ${tMuted}`}>{c.displayRank}</td>
                  <td className="text-center"><div className="flex items-center justify-center"><span className="text-lg sm:text-4xl leading-none select-none drop-shadow-sm">{c.flag}</span></div></td>
                  <td className={`text-[7.5px] sm:text-[14px] font-black uppercase tracking-tight leading-tight pr-1 ${tColor}`}>{c.name}</td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-base glow-gold tabular-nums ${tColor}`}>{c.gold}</td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-base glow-silver tabular-nums ${tColor}`}>{c.silver}</td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-base glow-bronze tabular-nums ${tColor}`}>{c.bronze}</td>
                  <td className="pr-2 sm:pr-8 text-right font-mono font-black text-blue-500 text-[10px] sm:text-xl tabular-nums">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('all-time');
  const [view, setView] = useState('players'); 
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [selCourse, setSelCourse] = useState(null);
  const [sort, setSort] = useState({ key: 'rating', direction: 'descending' });
  const [courseSort, setCourseSort] = useState({ key: 'name', direction: 'ascending' });
  const [medalSort, setMedalSort] = useState({ key: 'gold', direction: 'descending' });
  const [data, setData] = useState([]);
  const [openData, setOpenData] = useState([]);
  const [atPerfs, setAtPerfs] = useState({});
  const [opPerfs, setOpPerfs] = useState({});
  const [lbAT, setLbAT] = useState({ M: {}, F: {} });
  const [lbOpen, setLbOpen] = useState({ M: {}, F: {} });
  const [atMet, setAtMet] = useState({});
  const [dnMap, setDnMap] = useState({});
  const [cMet, setCMet] = useState({});

  const fetchFromSheet = useCallback(async () => {
    const getCsv = (q) => `https://docs.google.com/spreadsheets/d/1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4/gviz/tq?tqx=out:csv&${q}&t=${Date.now()}`;
    try {
      const [rM, rF, rLive, rSet] = await Promise.all([
        fetch(getCsv('sheet=RANKINGS (M)')).then(r => r.text()),
        fetch(getCsv('sheet=RANKINGS (F)')).then(r => r.text()),
        fetch(getCsv('gid=623600169')).then(r => r.text()),
        fetch(getCsv('gid=1961325686')).then(r => r.text())
      ]);
      const pM = processRankingData(rM, 'M'); 
      const pF = processRankingData(rF, 'F');
      const initialMetadata = {};
      pM.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'M', allTimeRank: i + 1 });
      pF.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'F', allTimeRank: i + 1 });
      const processed = processLiveFeedData(rLive, initialMetadata, processSetListData(rSet));
      setData([...pM, ...pF]); 
      setOpenData(processed.openRankings); 
      setAtPerfs(processed.allTimePerformances); 
      setOpPerfs(processed.openPerformances); 
      setLbAT(processed.allTimeLeaderboards); 
      setLbOpen(processed.openLeaderboards); 
      setAtMet(processed.athleteMetadata); 
      setDnMap(processed.athleteDisplayNameMap); 
      setCMet(processed.courseMetadata);
    } catch(e) { console.error("Data fetch failed:", e); }
  }, []);

  useEffect(() => { fetchFromSheet(); }, [fetchFromSheet]);

  const list = useMemo(() => {
    const src = eventType === 'all-time' ? data : openData;
    const filtered = src.filter(p => p.gender === gen && (p.name.toLowerCase().includes(search.toLowerCase()) || (p.countryName || "").toLowerCase().includes(search.toLowerCase())));
    const isQual = (p) => eventType === 'open' ? p.runs >= 3 : (p.gender === 'M' ? p.runs >= 4 : p.gender === 'F' ? p.runs >= 2 : false);
    let qual = filtered.filter(isQual), unranked = filtered.filter(p => !isQual(p));
    const dir = sort.direction === 'ascending' ? 1 : -1;
    
    qual.sort((a, b) => { 
      let aVal = a[sort.key];
      let bVal = b[sort.key];

      if (sort.key === 'name') {
        const getLastName = (n) => {
          const parts = String(n).trim().split(/\s+/);
          return parts[parts.length - 1].toLowerCase();
        };
        const lnA = getLastName(aVal);
        const lnB = getLastName(bVal);
        return lnA.localeCompare(lnB) * dir;
      }

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * dir;
      }

      const aNum = aVal || 0;
      const bNum = bVal || 0;
      if (aNum !== bNum) return (aNum - bNum) * dir;
      return (b.rating - a.rating);
    });

    unranked.sort((a, b) => b.runs - a.runs || b.rating - a.rating);
    return [...qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true })), ...unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }))];
  }, [search, sort, gen, eventType, data, openData]);

  const courseList = useMemo(() => {
    const contextM = eventType === 'all-time' ? lbAT.M : lbOpen.M; const contextF = eventType === 'all-time' ? lbAT.F : lbOpen.F;
    const courseNames = Array.from(new Set([...Object.keys(contextM || {}), ...Object.keys(contextF || {})])).filter(Boolean);
    const baseList = courseNames.map(name => {
      const athletesMAll = Object.entries((lbAT?.M || {})[name] || {}).sort((a, b) => a[1] - b[1]); const athletesFAll = Object.entries((lbAT?.F || {})[name] || {}).sort((a, b) => a[1] - b[1]);
      const ctxM = Object.entries((contextM || {})[name] || {}); const ctxF = Object.entries((contextF || {})[name] || {}); const meta = cMet[name] || {};
      return {
        name, flag: meta.flag || '🏳️', city: meta.city || '', country: meta.country || '', difficulty: meta.difficulty || '-',
        mRecord: athletesMAll[0]?.[1] || null, fRecord: athletesFAll[0]?.[1] || null, totalRuns: ctxM.length + ctxF.length,
        totalAthletes: new Set([...ctxM.map(a => a[0]), ...ctxF.map(a => a[0])]).size,
        athletesM: athletesMAll, athletesF: athletesFAll
      };
    }).filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase()));
    const dir = courseSort.direction === 'ascending' ? 1 : -1;
    baseList.sort((a, b) => { const aVal = a[courseSort.key] || ""; const bVal = b[courseSort.key] || ""; if (['name', 'city', 'country', 'flag'].includes(courseSort.key)) return String(aVal).localeCompare(String(bVal)) * dir; if (courseSort.key === 'mRecord' || courseSort.key === 'fRecord') { const aValFixed = aVal === null ? (courseSort.direction === 'ascending' ? 999999 : -1) : aVal; const bValFixed = bVal === null ? (courseSort.direction === 'ascending' ? 999999 : -1) : bVal; return (aValFixed - bValFixed) * dir; } return (aVal - bVal) * dir; });
    return baseList;
  }, [lbAT, lbOpen, eventType, search, courseSort, cMet]);

  const hofStats = useMemo(() => {
    if (!data.length) return null;
    const getFires = (t, g) => g === 'M' ? (t < 7 ? 3 : t < 8 ? 2 : t < 9 ? 1 : 0) : (t < 9 ? 3 : t < 10 ? 2 : t < 11 ? 1 : 0);
    const qualifiedAthletes = data.filter(p => (p.gender === 'M' && p.runs >= 4) || (p.gender === 'F' && p.runs >= 2)).map(p => { const performances = atPerfs[p.pKey] || []; const totalFires = performances.reduce((sum, perf) => sum + getFires(perf.num, p.gender), 0); return { ...p, totalFireCount: totalFires }; });
    const countriesMap = {}; const citiesMap = {};
    Object.values(cMet).forEach(c => {
      let countryName = c.country?.toUpperCase(); if (c.city?.toUpperCase().includes("SAN JUAN") || c.flag?.includes("🇵🇷")) countryName = "PUERTO RICO";
      if (countryName) countriesMap[countryName] = (countriesMap[countryName] || 0) + 1;
      if (c.city) citiesMap[c.city] = (citiesMap[c.city] || 0) + 1;
    });
    const cityStatsList = Object.entries(citiesMap).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([name, count]) => { const match = Object.values(cMet).find(m => m.city === name); return { name, cityStats: count, region: match?.flag || '🏳️' }; });
    const countryStatsList = Object.entries(countriesMap).sort((a,b) => b[1]-a[1]).slice(0, 10).map(([name, count]) => { const match = Object.values(cMet).find(m => m.country?.toUpperCase() === name || (name === "PUERTO RICO" && m.flag?.includes("🇵🇷"))); return { name, countryStats: count, region: match?.flag || (name === "PUERTO RICO" ? "🇵🇷" : "🏳️") }; });
    const medalsBase = {};
    const processMedals = (lb) => {
      const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
      Object.entries(lb).forEach(([courseName, athletes]) => {
        const sorted = Object.entries(athletes).sort((a,b) => a[1]-b[1]);
        sorted.slice(0, 3).forEach(([pKey, time], rankIdx) => {
          const athlete = atMet[pKey] || {};
          const names = athlete.countryName ? athlete.countryName.split(/[,\/]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
          const flags = athlete.region ? (athlete.region.match(flagRegex) || athlete.region.split(/[,\/]/).map(s => s.trim())) : [];
          names.forEach((name, i) => {
            const cleanFlag = (flags[i] || flags[0] || '🏳️').trim();
            if (!medalsBase[name]) { medalsBase[name] = { name: name, flag: cleanFlag, gold: 0, silver: 0, bronze: 0, total: 0 }; }
            if (rankIdx === 0) medalsBase[name].gold++; 
            else if (rankIdx === 1) medalsBase[name].silver++; 
            else if (rankIdx === 2) medalsBase[name].bronze++;
            medalsBase[name].total++;
          });
        });
      });
    };
    processMedals(lbAT.M); processMedals(lbAT.F);
    const medalStandings = Object.values(medalsBase).sort((a,b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze);
    const medalWithRanks = medalStandings.map((c, i) => ({ ...c, rank: i + 1 }));
    const dir = medalSort.direction === 'ascending' ? 1 : -1;
    const sortedMedalCount = [...medalWithRanks].sort((a, b) => { const aVal = a[medalSort.key]; const bVal = b[medalSort.key]; if (typeof aVal === 'string') return aVal.localeCompare(bVal) * dir; return (aVal - bVal) * dir; }).map(c => ({ ...c, displayRank: c.rank }));
    return { medalCount: sortedMedalCount, topStats: { rating: [...qualifiedAthletes].sort((a,b) => b.rating - a.rating).slice(0, 10), wins: [...qualifiedAthletes].sort((a,b) => b.wins - a.wins).slice(0, 10), runs: [...qualifiedAthletes].sort((a,b) => b.runs - a.runs).slice(0, 10), sets: [...qualifiedAthletes].sort((a,b) => b.sets - a.sets).slice(0, 10), contributionScore: [...qualifiedAthletes].sort((a,b) => b.contributionScore - a.contributionScore).slice(0, 10), totalFireCount: [...qualifiedAthletes].sort((a,b) => b.totalFireCount - a.totalFireCount).slice(0, 10), cityStats: cityStatsList, countryStats: countryStatsList }};
  }, [data, lbAT, cMet, atMet, atPerfs, medalSort]);

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-16 flex items-center justify-between px-3 sm:px-8 gap-3 sm:gap-6 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-2 shrink-0"><div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}><IconSpeed /></div><span className="font-black tracking-tighter text-lg sm:text-2xl uppercase italic leading-none transition-all"><span className="sm:hidden">ASR</span><span className="hidden sm:inline">APEX SPEED RUN</span></span></div>
        <div className={`flex items-center p-1 rounded-2xl border ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}><div className="flex">{[{id:'players',l:'PLAYERS',s:'PLAYERS'},{id:'courses',l:'COURSES',s:'COURSES'},{id:'hof',l:'HOF',s:'HOF'}].map(v => (<button key={v.id} onClick={() => setView(v.id)} className={`px-2.5 sm:px-5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}><span className="sm:hidden">{v.s}</span><span className="hidden sm:inline">{v.l}</span></button>))}</div></div>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-10 h-10 flex items-center justify-center border rounded-2xl transition-all shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600'}`}>{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
      </nav>
      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} performanceData={eventType === 'all-time' ? atPerfs : opPerfs} onCourseClick={(name) => { setSel(null); setSelCourse(courseList.find(c => c.name === name)); }} />
      <CourseModal isOpen={!!selCourse} onClose={() => setSelCourse(null)} course={selCourse} theme={theme} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => { setSelCourse(null); setSel(p); }} />
      <header className={`pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-10 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><h1 className={`font-black tracking-tighter uppercase leading-none transition-all ${theme === 'dark' ? 'text-white' : 'text-black'} text-[8vw] sm:text-[5vw] lg:text-[6vw] xl:text-[76px]`}>{view === 'hof' ? 'HALL OF FAME' : (eventType === 'all-time' ? 'ASR ALL-TIME' : '2026 ASR OPEN')}</h1>{view !== 'hof' && (<div className={`flex items-center p-1 rounded-2xl border w-fit h-fit ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}><div className="flex">{[{id:'all-time',l:'ALL-TIME'},{id:'open',l:'OPEN'}].map(ev => (<button key={ev.id} onClick={() => setEventType(ev.id)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${eventType === ev.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{ev.l}</button>))}</div>{view === 'players' && (<><div className={`w-[1px] h-4 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-400/30'} mx-2`} /><div className="flex">{[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (<button key={g.id} onClick={() => setGen(g.id)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${gen === g.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{g.l}</button>))}</div></>)}</div>)}</div>{view !== 'hof' && (<div className="w-full relative group"><div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-500`}><IconSearch size={14} /></div><input type="text" placeholder="" value={search} onChange={e => setSearch(e.target.value)} className={`rounded-2xl pl-11 pr-11 py-4 w-full text-[14px] font-medium outline-none transition-all border ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-white focus:bg-white/[0.07] focus:border-white/10 shadow-2xl' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500/30 shadow-lg'}`} />{search && (<button onClick={() => setSearch('')} className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}><IconX size={16} /></button>)}</div>)}</header>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 flex-grow w-full overflow-hidden">
        {view === 'hof' ? (<HallOfFame stats={hofStats} theme={theme} onPlayerClick={setSel} medalSort={medalSort} setMedalSort={setMedalSort} />) : (
          <div className={`border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}><div className="overflow-hidden">
              {view === 'players' ? (
                <table className="table-fixed-layout text-left border-collapse data-table"><thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <th className="pl-4 sm:pl-10 py-5 text-left w-[10%] whitespace-nowrap">RANK</th>
                  <th className="px-1 py-5 text-center w-[10%] cursor-pointer group transition-colors hover:bg-white/5 whitespace-nowrap" onClick={() => setSort(p => ({ key: 'region', direction: p.key === 'region' && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
                    <div className="flex justify-center items-center gap-0.5">
                      <div className={`transition-opacity ${sort.key === 'region' ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
                        <IconArrow direction={sort.key === 'region' ? sort.direction : 'descending'} />
                      </div>
                    </div>
                  </th>
                  <HeaderComp l="NAME" k="name" w="w-auto" activeSort={sort} handler={setSort} />
                  <HeaderComp l="OVR" k="rating" a="right" w="w-[14%]" activeSort={sort} handler={setSort} />
                  <HeaderComp l="RUNS" k="runs" a="right" w="w-[11%]" activeSort={sort} handler={setSort} />
                  <HeaderComp l="WINS" k="wins" a="right" w="w-[11%]" activeSort={sort} handler={setSort} />
                  <HeaderComp l="SETS" k="sets" a="right" w="w-[11%] pr-4 sm:pr-10" activeSort={sort} handler={setSort} /></tr></thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {list.map((p, idx) => (<React.Fragment key={`p-wrap-${p.id}`}>
                        {((idx === 0 && !p.isQualified) || (idx > 0 && !p.isQualified && list[idx-1].isQualified)) && (<tr key={`ur-divider-${eventType}`} className={`${theme === 'dark' ? 'bg-white/[0.02]' : 'bg-slate-200/50'} border-y-2 border-dashed ${theme === 'dark' ? 'border-white/10' : 'border-slate-400/30'}`}><td colSpan="7" className="py-5 sm:py-8 text-center"><span className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] italic opacity-40 whitespace-nowrap">RUN {eventType === 'open' ? '3+' : (gen === 'M' ? '4+' : '2+')} COURSES TO GET RANKED</span></td></tr>)}
                        <tr onClick={() => setSel(p)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${!p.isQualified ? 'opacity-40' : ''}`}><td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={p.currentRank} theme={theme} /></td><td className="px-1 py-4 sm:py-8 text-center leading-none"><span className="text-xl sm:text-2xl">{p.region || '🏳️'}</span></td><td className="px-1 py-4 sm:py-8 text-left"><span className="text-[10px] sm:text-[15px] font-bold block leading-tight">{p.name}</span></td><td className="px-1 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[15px] tabular-nums text-blue-500">{(p.rating || 0).toFixed(2)}</td><td className="px-1 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[15px] tabular-nums">{p.runs}</td><td className="px-1 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[15px] tabular-nums">{p.wins}</td><td className="px-1 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[15px] tabular-nums">{p.sets}</td></tr>
                      </React.Fragment>))}
                  </tbody>
                </table>
              ) : (
                <table className="table-fixed-layout text-left border-collapse data-table"><thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <HeaderComp l="NAME" k="name" w="w-[28%] pl-4 sm:pl-10" isCourse={true} activeSort={courseSort} handler={setCourseSort} />
                  <th className="w-[8%] px-1 py-5 text-center cursor-pointer group transition-colors hover:bg-white/5 border-inherit whitespace-nowrap" onClick={() => setCourseSort(p => ({ key: 'flag', direction: p.key === 'flag' && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
                    <div className="flex justify-center items-center gap-0.5">
                      <div className={`transition-opacity ${courseSort.key === 'flag' ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
                        <IconArrow direction={courseSort.key === 'flag' ? courseSort.direction : 'descending'} />
                      </div>
                    </div>
                  </th>
                  <HeaderComp l="CITY" k="city" w="w-[17%] px-1" isCourse={true} activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="COUNTRY" k="country" w="w-[17%] px-1" isCourse={true} activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="CR (M)" k="mRecord" a="right" w="w-[15%] px-1" isCourse={true} activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="CR (W)" k="fRecord" a="right" w="w-[15%] pr-4 sm:pr-10" isCourse={true} activeSort={courseSort} handler={setCourseSort} />
                </tr></thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {courseList.map((c) => (<tr key={`course-${c.name}`} onClick={() => setSelCourse(c)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'}`}><td className="pl-4 sm:pl-10 py-4 sm:py-8"><span className="text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight block">{c.name}</span></td><td className="px-1 py-4 sm:py-8 text-center text-xl sm:text-3xl leading-none">{c.flag}</td><td className="px-1 py-4 sm:py-8 text-[8px] sm:text-[13px] font-bold uppercase opacity-60 leading-tight">{c.city || '-'}</td><td className="px-1 py-4 sm:p-6 text-[8px] sm:text-[13px] font-bold uppercase opacity-60 leading-tight">{c.country || '-'}</td><td className="px-1 py-4 sm:py-8 text-right font-mono font-black text-[9px] sm:text-[14px] text-blue-500">{c.mRecord ? c.mRecord.toFixed(2) : '-'}</td><td className="px-1 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-mono font-black text-[9px] sm:text-[14px] text-blue-500">{c.fRecord ? c.fRecord.toFixed(2) : '-'}</td></tr>))}
                  </tbody>
                </table>
              )}
            </div></div>
        )}
      </main>
      <footer className="mt-24 text-center pb-24 opacity-20 font-black uppercase tracking-[0.4em] text-[10px]">© 2026 APEX SPEED RUN</footer>
    </div>
  );
}

export default App;

// Entry point logic: 
// If this file is being imported by index.js, the code below won't run.
// If this file IS the entry point, it will mount to 'root'.
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
