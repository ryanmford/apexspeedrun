import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

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
    * { 
      -ms-overflow-style: none; 
      scrollbar-width: none; 
      -webkit-tap-highlight-color: transparent;
      word-break: keep-all !important;
      overflow-wrap: normal !important;
      hyphens: none !important;
    }
    
    html, body { 
      text-rendering: optimizeLegibility; 
      -webkit-font-smoothing: antialiased; 
      width: 100%; 
      margin: 0; 
      padding: 0; 
    }

    .data-table, .hof-table { 
      table-layout: auto !important; 
      width: 100%;
      border-collapse: collapse;
    }

    .data-table td, .data-table th, .hof-table td, .hof-table th {
      vertical-align: middle;
      white-space: normal; 
    }

    .data-table th, .hof-table th {
      white-space: nowrap !important;
    }

    .num-col, .flag-col { 
      white-space: nowrap !important; 
    }

    .hof-table th, .hof-table td, .data-table th, .data-table td { 
      padding: 1rem 0.5rem; 
    }
    @media (min-width: 640px) {
      .hof-table th, .hof-table td, .data-table th, .data-table td { padding: 1.5rem 1rem; }
    }
    .blur-locked {
        filter: blur(12px) grayscale(0.5);
        opacity: 0.25;
        pointer-events: none; user-select: none;
    }
  `}</style>
);

// --- ICONS ---
const IconSpeed = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'skewX(-18deg)' }} className="overflow-visible shrink-0">
    <path d="M3 19l6-7-6-7" opacity="0.2" /><path d="M9 19l6-7-6-7" opacity="0.5" /><path d="M15 19l6-7-6-7" />
  </svg>
);
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-current shrink-0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconX = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconArrow = ({ direction }) => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 shrink-0 ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconSun = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v20M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/><path d="M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const IconMoon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconCourse = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconCity = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>
);
const IconGlobe = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
);
const IconInfo = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
);

const CountdownTimer = ({ targetDate, theme }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const calculate = () => {
            const now = new Date();
            const difference = targetDate - now;
            
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            }
        };

        const timer = setInterval(calculate, 1000);
        calculate();
        return () => clearInterval(timer);
    }, [targetDate]);

    const textColor = theme === 'dark' ? 'text-white' : 'text-slate-800';
    const shadowColor = theme === 'dark' ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]';

    return (
        <div className="flex gap-4 sm:gap-10 font-mono text-center">
            {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
            ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center">
                    <span className={`text-4xl sm:text-7xl font-black tracking-tighter tabular-nums ${textColor} ${shadowColor}`}>
                        {String(unit.value).padStart(2, '0')}
                    </span>
                    <span className={`text-[7px] sm:text-[10px] uppercase font-black tracking-[0.2em] mt-1 ${textColor}`}>
                        {unit.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- HELPERS ---
const robustSort = (a, b, key, dir) => {
    let aVal = a[key];
    let bVal = b[key];
    
    const isANum = aVal !== null && aVal !== undefined && !isNaN(parseFloat(aVal)) && isFinite(aVal);
    const isBNum = bVal !== null && bVal !== undefined && !isNaN(parseFloat(bVal)) && isFinite(bVal);

    if (isANum && isBNum) {
        return (parseFloat(aVal) - parseFloat(bVal)) * dir;
    }
    
    const aStr = String(aVal || "").toLowerCase();
    const bStr = String(bVal || "").toLowerCase();
    return aStr.localeCompare(bStr) * dir;
};

const fixCountryEntity = (name, flag) => {
    const n = (name || "").toUpperCase().trim();
    const f = (flag || "").trim();
    if (n === "PUERTO RICO" || f === "🇵🇷") {
        return { name: "PUERTO RICO", flag: "🇵🇷" };
    }
    if (n === "USA" || n === "UNITED STATES" || n === "UNITED STATES OF AMERICA") {
        return { name: "USA", flag: "🇺🇸" };
    }
    return { name, flag };
};

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
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-500 shrink-0 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[2px] sm:border-[3px] animate-subtle-pulse' : isUnranked ? 'border' : 'border-0'}`}>
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

    const rawCountry = countryNameIdx !== -1 ? vals[countryNameIdx]?.trim() : "";
    const rawFlag = flagEmojiIdx !== -1 ? (vals[flagEmojiIdx]?.trim() || "🏳️") : "🏳️";
    const fixed = fixCountryEntity(rawCountry, rawFlag);

    return { 
      id: `${gender}-${normalizeName(pName)}-${i}`, 
      name: pName, pKey: normalizeName(pName), gender, 
      countryName: fixed.name, 
      region: fixed.flag, 
      rating: cleanNumeric(vals[ratingIdx]) || 0, runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
      wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), pts: cleanNumeric(vals[ptsIdx]) || 0, 
      sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
      contributionScore: cleanNumeric(vals[cIdx]) || 0, totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0
    };
  }).filter(p => p !== null);
};

const processSetListData = (csv) => {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 1) return {};
    
    const headers = parseLine(lines[0]);
    const findIdx = (keys) => headers.findIndex(h => keys.some(k => h.toLowerCase().trim().includes(k.toLowerCase())));
    
    const courseIdx = Math.max(0, findIdx(['course', 'track', 'level']));
    const lengthIdx = findIdx(['length', 'dist']);
    const elevIdx = findIdx(['elev', 'gain']);
    const ratingIdx = findIdx(['rating', 'diff', 'difficulty']);
    const typeIdx = findIdx(['type', 'style']);
    const cityIdx = findIdx(['city', 'location']);
    const countryIdx = findIdx(['country', 'nation']);
    const flagIdx = findIdx(['flag', 'emoji']);
    const dateIdx = findIdx(['date', 'year']);
    const dateSetIdx = findIdx(['set on', 'updated', 'date set']);
    
    const map = {};
    lines.slice(1).forEach(l => {
        const vals = parseLine(l);
        const course = (vals[courseIdx] || "").trim().toUpperCase();
        if (course) {
            const rawCountry = (vals[countryIdx] || "").trim();
            const rawFlag = (vals[flagIdx] || "").trim();
            const fixed = fixCountryEntity(rawCountry, rawFlag);
            
            map[course] = { 
                is2026: (vals[dateIdx] || "").includes('2026'), 
                flag: fixed.flag || '🏳️',
                city: (vals[cityIdx] || "").trim().toUpperCase() || "UNKNOWN", 
                country: fixed.name.toUpperCase() || "UNKNOWN", 
                difficulty: (vals[ratingIdx] || "").trim(),
                length: (vals[lengthIdx] || "").trim(),
                elevation: (vals[elevIdx] || "").trim(),
                type: (vals[typeIdx] || "").trim(),
                dateSet: (vals[dateSetIdx] || "").trim()
            };
        }
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
    return <span className={`inline-flex items-center gap-1 text-[11px] select-none shrink-0 ${glows[type]}`}>
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
        <div className={`shrink-0 relative h-fit min-h-[112px] sm:min-h-[160px] p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"><IconX /></button>
          <div className="flex items-center gap-4 sm:gap-8 min-w-0 w-full pr-10">
            <div className={`w-14 h-14 sm:w-24 sm:h-24 rounded-3xl border flex items-center justify-center text-lg sm:text-3xl font-black shadow-xl shrink-0 uppercase ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>{getInitials(p.name)}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-4xl leading-tight flex items-center gap-2 flex-wrap">
                <span className="shrink-0">{p.region || '🏳️'}</span><h2 className="font-black tracking-tight">{p.name}</h2>
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
                <span className={`text-base sm:text-xl font-mono font-black num-col ${s.c || ''} ${s.g || ''}`}>{s.v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {courseData.map((c, i) => (
              <div key={i} onClick={() => onCourseClick?.(c.label)} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                <div className="flex flex-col min-w-0 pr-4">
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {c.rank > 0 && c.rank <= 3 && <PerformanceBadge type={c.rank} />}
                    {c.rank >= 4 && <span className="text-[10px] font-mono font-black italic opacity-40">{c.rank}</span>}
                    {getFires(c.num, p.gender) > 0 && <PerformanceBadge type="fire" count={getFires(c.num, p.gender)} />}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-xs sm:text-lg font-mono font-black text-blue-500 num-col">{c.points.toFixed(2)}</span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold -mt-1 opacity-70 num-col">{c.num.toFixed(2)}</span>
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
        { l: 'DIFFICULTY', v: displayDifficulty }, 
        { l: 'PLAYERS', v: course.totalAthletes },
        { l: 'LENGTH (M)', v: course.length || '-' },
        { l: 'ELEVATION (M)', v: course.elevation || '-' },
        { l: 'TYPE', v: course.type || '-' },
        { l: 'DATE SET', v: course.dateSet || '-' }
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
                            <div className="flex items-center gap-3 min-w-0 pr-4">
                                <RankBadge rank={i + 1} theme={theme} />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-[12px] font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{athleteDisplayNameMap[pKey]}</span>
                                  <span className="text-[10px] uppercase font-black">{meta.region || '🏳️'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0"><span className="text-sm font-mono font-black text-blue-500 num-col">{time.toFixed(2)}</span><span className={`text-[10px] font-mono font-black num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{points.toFixed(2)}</span></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
            <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className={`shrink-0 relative h-fit min-h-[112px] sm:min-h-[144px] p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"><IconX /></button>
                    <div className="flex items-center gap-4 min-w-0 w-full pr-10">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center text-blue-500 shrink-0 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}><IconCourse /></div>
                        <div className="flex flex-col min-w-0"><h2 className="text-xl sm:text-3xl font-black tracking-tight uppercase">{course.name} SPEED RUN</h2><div className="text-[10px] sm:text-[12px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2 flex-wrap"><span className="opacity-60">{course.city || 'UNKNOWN'}, {course.country || 'UNKNOWN'}</span><span className="opacity-100 shrink-0">{course.flag}</span></div></div>
                    </div>
                </div>
                <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map((s, i) => (<div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}><span className="text-[8px] font-black uppercase tracking-wider mb-2 opacity-50 whitespace-nowrap">{s.l}</span><span className={`text-sm sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span></div>))}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><RankList title="MEN'S TOP 10" athletes={course.athletesM} genderRecord={course.mRecord} /><RankList title="WOMEN'S TOP 10" athletes={course.athletesF} genderRecord={course.fRecord} /></div>
                </div>
            </div>
        </div>
    );
};

const ProfileCourseList = ({ courses, theme, onCourseClick, filterKey, filterValue }) => {
    return (
        <div className="grid grid-cols-1 gap-2">
            {courses
                .filter(c => c[filterKey] === filterValue)
                .sort((a, b) => (b.totalAthletes || 0) - (a.totalAthletes || 0))
                .map(c => (
                <div key={c.name} onClick={() => onCourseClick(c)} className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3 pr-4 min-w-0">
                        <IconCourse />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-black uppercase truncate">{c.name}</span>
                            {filterKey === 'country' && <span className="text-[8px] font-black opacity-40 uppercase truncate">{c.city}</span>}
                        </div>
                    </div>
                    <div className="flex gap-4 sm:gap-6 shrink-0">
                        <div className="flex flex-col items-end"><span className="text-[8px] font-black opacity-40">CR (M)</span><span className="text-[10px] sm:text-xs font-mono font-bold text-blue-500">{c.mRecord?.toFixed(2) || '-'}</span></div>
                        <div className="flex flex-col items-end"><span className="text-[8px] font-black opacity-40">CR (W)</span><span className="text-[10px] sm:text-xs font-mono font-bold text-blue-500">{c.fRecord?.toFixed(2) || '-'}</span></div>
                        <div className="flex flex-col items-end"><span className="text-[8px] font-black opacity-40">PLAYERS</span><span className="text-[10px] sm:text-xs font-mono font-bold">{c.totalAthletes}</span></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const CityModal = ({ isOpen, onClose, city, theme, courses, onCourseClick }) => {
    if (!isOpen || !city) return null;
    const stats = [
        { l: 'COURSES', v: city.courses, c: 'text-blue-500' },
        { l: 'RUNS', v: city.runs },
        { l: 'PLAYERS', v: city.players },
        { l: 'AVG ELEVATION', v: city.avgElevation ? `${city.avgElevation.toFixed(0)}m` : '-' }
    ];
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
            <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className={`shrink-0 relative h-fit min-h-[112px] sm:min-h-[144px] p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"><IconX /></button>
                    <div className="flex items-center gap-4 min-w-0 w-full pr-10">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center text-blue-500 shrink-0 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}><IconCity /></div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-xl sm:text-3xl font-black tracking-tight uppercase">{city.name}</h2>
                            <div className="text-lg sm:text-xl leading-none mt-1">{city.flag}</div>
                        </div>
                    </div>
                </div>
                <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map((s, i) => (<div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}><span className="text-[8px] font-black uppercase tracking-wider mb-2 opacity-50 whitespace-nowrap">{s.l}</span><span className={`text-sm sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span></div>))}</div>
                    <div className="space-y-3">
                        <ProfileCourseList courses={courses} theme={theme} onCourseClick={onCourseClick} filterKey="city" filterValue={city.name} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const CountryModal = ({ isOpen, onClose, country, theme, courses, onCourseClick }) => {
    if (!isOpen || !country) return null;
    const stats = [
        { l: 'CITIES', v: country.cities, c: 'text-blue-500' },
        { l: 'COURSES', v: country.courses },
        { l: 'RUNS', v: country.runs },
        { l: 'PLAYERS', v: country.players }
    ];
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
            <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
                <div className={`shrink-0 relative h-fit min-h-[112px] sm:min-h-[144px] p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"><IconX /></button>
                    <div className="flex items-center gap-4 min-w-0 w-full pr-10">
                        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center text-blue-500 shrink-0 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}><IconGlobe /></div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-xl sm:text-3xl font-black tracking-tight uppercase">{country.name}</h2>
                            <div className="text-lg sm:text-xl leading-none mt-1">{country.flag}</div>
                        </div>
                    </div>
                </div>
                <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map((s, i) => (<div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}><span className="text-[8px] font-black uppercase tracking-wider mb-2 opacity-50 whitespace-nowrap">{s.l}</span><span className={`text-sm sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span></div>))}</div>
                    <div className="space-y-3">
                        <ProfileCourseList courses={courses} theme={theme} onCourseClick={onCourseClick} filterKey="country" filterValue={country.name} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const HeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler }) => {
  return (
    <th className={`${w} px-2 py-4 sm:py-5 cursor-pointer group select-none transition-colors ${activeSort.key === k ? 'bg-blue-600/10' : ''} hover:bg-blue-600/5`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-1 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase tracking-tighter text-[8px] sm:text-[10px] font-black leading-none">{l}</span>
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
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
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <RankBadge rank={i + 1} theme={theme} />
                    <div className="flex flex-col ml-1">
                      <span className={`text-[10px] sm:text-[13px] font-black uppercase leading-tight ${!['cityStats', 'countryStats'].includes(sec.k) ? 'group-hover/item:text-blue-500' : ''} transition-colors`}>{p.name}</span>
                      <span className="text-lg sm:text-xl mt-1 leading-none">{p.region || '🏳️'}</span>
                    </div>
                  </div>
                  <span className={`font-mono font-black text-blue-500 text-[10px] sm:text-[14px] shrink-0 tabular-nums num-col ${sec.k === 'totalFireCount' ? 'glow-fire' : ''} ${sec.k === 'contributionScore' ? 'glow-gold' : ''}`}>{sec.k === 'rating' ? p[sec.k].toFixed(2) : (p[sec.k] ?? p.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={`rounded-3xl border overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="p-4 sm:p-6 border-b border-inherit bg-inherit"><h3 className="text-[11px] font-black uppercase tracking-[0.2em]">WORLDWIDE MEDAL COUNT</h3></div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="hof-table min-w-full">
            <thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <HeaderComp l="RANK" k="rank" a="left" w="w-20 sm:w-28" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="COUNTRY" k="name" a="left" w="w-auto px-2" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥇" k="gold" a="center" w="w-16 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥈" k="silver" a="center" w="w-16 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="🥉" k="bronze" a="center" w="w-16 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="TOTAL" k="total" a="right" w="w-20 sm:w-32 pr-4 sm:pr-10" activeSort={medalSort} handler={setMedalSort} />
            </tr></thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={`medal-row-${c.name}-${c.flag}`} className="group hover:bg-black/[0.02] transition-colors">
                  <td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="px-2 py-4 sm:py-8 min-w-[140px]">
                    <div className="flex flex-col">
                      <span className={`text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight block ${tColor}`}>{c.name}</span>
                      <span className="text-lg sm:text-xl mt-1 leading-none select-none drop-shadow-sm shrink-0">{c.flag}</span>
                    </div>
                  </td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-[14px] glow-gold tabular-nums num-col ${tColor}`}>{c.gold}</td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-[14px] glow-silver tabular-nums num-col ${tColor}`}>{c.silver}</td>
                  <td className={`text-center font-mono font-black text-[9px] sm:text-[14px] glow-bronze tabular-nums num-col ${tColor}`}>{c.bronze}</td>
                  <td className="pr-4 sm:pr-10 text-right font-mono font-black text-blue-500 text-[10px] sm:text-[20px] tabular-nums num-col">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('all-time');
  const [view, setView] = useState('players'); 
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [selCourse, setSelCourse] = useState(null);
  const [selCity, setSelCity] = useState(null);
  const [selCountry, setSelCountry] = useState(null);
  
  const [sort, setSort] = useState({ key: 'rating', direction: 'descending' });
  const [courseSort, setCourseSort] = useState({ key: 'totalAthletes', direction: 'descending' });
  const [medalSort, setMedalSort] = useState({ key: 'gold', direction: 'descending' });
  const [citySort, setCitySort] = useState({ key: 'courses', direction: 'descending' });
  const [countrySort, setCountrySort] = useState({ key: 'courses', direction: 'descending' });
  
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
    const isQual = (p) => p.gender === 'M' ? p.runs >= 4 : (p.gender === 'F' ? p.runs >= 2 : false);
    let qual = filtered.filter(isQual), unranked = filtered.filter(p => !isQual(p));
    const dir = sort.direction === 'ascending' ? 1 : -1;
    
    qual.sort((a, b) => { 
        if (sort.key === 'name') {
            const lnA = String(a.name).trim().split(/\s+/).pop().toLowerCase();
            const lnB = String(b.name).trim().split(/\s+/).pop().toLowerCase();
            return lnA.localeCompare(lnB) * dir;
        }
        return robustSort(a, b, sort.key, dir) || (b.rating - a.rating);
    });
    
    unranked.sort((a, b) => b.runs - a.runs || b.rating - a.rating);
    return [...qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true })), ...unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }))];
  }, [search, sort, gen, eventType, data, openData]);

  const rawCourseList = useMemo(() => {
    const contextM = eventType === 'all-time' ? lbAT.M : lbOpen.M;
    const contextF = eventType === 'all-time' ? lbAT.F : lbOpen.F;
    const courseNames = Array.from(new Set([...Object.keys(contextM || {}), ...Object.keys(contextF || {})])).filter(Boolean);
    return courseNames.map(name => {
      const athletesMAll = Object.entries((lbAT?.M || {})[name] || {}).sort((a, b) => a[1] - b[1]);
      const athletesFAll = Object.entries((lbAT?.F || {})[name] || {}).sort((a, b) => a[1] - b[1]);
      const ctxM = Object.entries((contextM || {})[name] || {});
      const ctxF = Object.entries((contextF || {})[name] || {});
      const meta = cMet[name] || {};
      return {
        name, city: meta.city || 'UNKNOWN', country: meta.country || 'UNKNOWN', flag: meta.flag || '🏳️',
        mRecord: athletesMAll[0]?.[1] || null, fRecord: athletesFAll[0]?.[1] || null,
        totalAthletes: new Set([...ctxM.map(a => a[0]), ...ctxF.map(a => a[0])]).size,
        totalRuns: ctxM.length + ctxF.length,
        athletesM: athletesMAll, athletesF: athletesFAll,
        ...meta
      };
    });
  }, [lbAT, lbOpen, eventType, cMet]);

  const courseList = useMemo(() => {
    const filtered = rawCourseList.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase()));
    const dir = courseSort.direction === 'ascending' ? 1 : -1;
    
    const sorted = filtered.sort((a, b) => { 
        if (['mRecord', 'fRecord'].includes(courseSort.key)) {
            const aVal = a[courseSort.key]; const bVal = b[courseSort.key];
            return ((aVal === null ? (dir === 1 ? 999999 : -1) : aVal) - (bVal === null ? (dir === 1 ? 999999 : -1) : bVal)) * dir;
        }
        return robustSort(a, b, courseSort.key, dir);
    });

    return sorted.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, search, courseSort]);

  const cityList = useMemo(() => {
    const cityMap = {};
    rawCourseList.forEach(c => {
        if (!cityMap[c.city]) cityMap[c.city] = { name: c.city, flag: c.flag, countryName: c.country, courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, playersSet: new Set() };
        cityMap[c.city].courses++;
        cityMap[c.city].runs += c.totalRuns;
        const elev = cleanNumeric(c.elevation);
        if (elev !== null) { cityMap[c.city].totalElevation += elev; cityMap[c.city].elevationCount++; }
        c.athletesM.forEach(a => cityMap[c.city].playersSet.add(a[0]));
        c.athletesF.forEach(a => cityMap[c.city].playersSet.add(a[0]));
    });
    
    const dir = citySort.direction === 'ascending' ? 1 : -1;
    const result = Object.values(cityMap).map(city => ({ 
        ...city, 
        players: city.playersSet.size,
        avgElevation: city.elevationCount > 0 ? (city.totalElevation / city.elevationCount) : 0
    })).filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.countryName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => robustSort(a, b, citySort.key, dir));

    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, citySort, search]);

  const countryList = useMemo(() => {
    const countryMap = {};
    rawCourseList.forEach(c => {
        const fixed = fixCountryEntity(c.country, c.flag);
        if (!countryMap[fixed.name]) countryMap[fixed.name] = { name: fixed.name, flag: fixed.flag, courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, citiesSet: new Set(), playersSet: new Set() };
        countryMap[fixed.name].courses++;
        countryMap[fixed.name].runs += c.totalRuns;
        const elev = cleanNumeric(c.elevation);
        if (elev !== null) { countryMap[fixed.name].totalElevation += elev; countryMap[fixed.name].elevationCount++; }
        countryMap[fixed.name].citiesSet.add(c.city);
        c.athletesM.forEach(a => countryMap[fixed.name].playersSet.add(a[0]));
        c.athletesF.forEach(a => countryMap[fixed.name].playersSet.add(a[0]));
    });
    
    const dir = countrySort.direction === 'ascending' ? 1 : -1;
    const result = Object.values(countryMap).map(country => ({ 
        ...country, 
        players: country.playersSet.size, 
        cities: country.citiesSet.size,
        avgElevation: country.elevationCount > 0 ? (country.totalElevation / country.elevationCount) : 0
    })).filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => robustSort(a, b, countrySort.key, dir));

    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, countrySort, search]);

  const hofStats = useMemo(() => {
    if (!data.length) return null;
    const getFires = (t, g) => g === 'M' ? (t < 7 ? 3 : t < 8 ? 2 : t < 9 ? 1 : 0) : (t < 9 ? 3 : t < 10 ? 2 : t < 11 ? 1 : 0);
    const qualifiedAthletes = data.filter(p => (p.gender === 'M' && p.runs >= 4) || (p.gender === 'F' && p.runs >= 2)).map(p => { 
        const performances = atPerfs[p.pKey] || []; 
        return { ...p, totalFireCount: performances.reduce((sum, perf) => sum + getFires(perf.num, p.gender), 0) }; 
    });
    
    const medalsBase = {};
    const processMedals = (lb) => {
      Object.entries(lb).forEach(([courseName, athletes]) => {
        const sorted = Object.entries(athletes).sort((a,b) => a[1]-b[1]);
        sorted.slice(0, 3).forEach(([pKey, time], rankIdx) => {
          const athlete = atMet[pKey] || {};
          const names = athlete.countryName ? athlete.countryName.split(/[,\/]/).map(s => s.trim().toUpperCase()).filter(Boolean) : [];
          const flags = athlete.region ? (athlete.region.match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g) || athlete.region.split(/[,\/]/).map(s => s.trim())) : [];
          names.forEach((name, i) => {
            const fixed = fixCountryEntity(name, (flags[i] || flags[0] || '🏳️').trim());
            if (!medalsBase[fixed.name]) medalsBase[fixed.name] = { name: fixed.name, flag: fixed.flag, gold: 0, silver: 0, bronze: 0, total: 0 };
            if (rankIdx === 0) medalsBase[fixed.name].gold++; else if (rankIdx === 1) medalsBase[fixed.name].silver++; else medalsBase[fixed.name].bronze++;
            medalsBase[fixed.name].total++;
          });
        });
      });
    };
    processMedals(lbAT.M); processMedals(lbAT.F);
    const sortedMedalCount = Object.values(medalsBase).sort((a,b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze).map((c, i) => ({ ...c, rank: i + 1, displayRank: i + 1 }));
    const dir = medalSort.direction === 'ascending' ? 1 : -1;
    sortedMedalCount.sort((a, b) => robustSort(a, b, medalSort.key, dir));
    
    return { medalCount: sortedMedalCount, topStats: { 
        rating: [...qualifiedAthletes].sort((a,b) => b.rating - a.rating).slice(0, 10), 
        wins: [...qualifiedAthletes].sort((a,b) => b.wins - a.wins).slice(0, 10), 
        runs: [...qualifiedAthletes].sort((a,b) => b.runs - a.runs).slice(0, 10), 
        sets: [...qualifiedAthletes].sort((a,b) => b.sets - a.sets).slice(0, 10), 
        contributionScore: [...qualifiedAthletes].sort((a,b) => b.contributionScore - a.contributionScore).slice(0, 10), 
        totalFireCount: [...qualifiedAthletes].sort((a,b) => b.totalFireCount - a.totalFireCount).slice(0, 10), 
        cityStats: [...cityList].sort((a,b) => b.courses - a.courses).slice(0, 10).map(c => ({ name: c.name, cityStats: c.courses, region: c.flag })), 
        countryStats: [...countryList].sort((a,b) => b.courses - a.courses).slice(0, 10).map(c => ({ name: c.name, countryStats: c.courses, region: c.flag })) 
    }};
  }, [data, lbAT, cityList, countryList, atMet, atPerfs, medalSort]);

  const shadowAthletes = useMemo(() => {
    const names = ["Marcus Chen", "Sarah Jenkins", "Leo Dubois", "Elena Petrova", "Jack Thorne", "Yuki Tanaka", "Alex Rivera", "Mia Rossi", "Noah Berg", "Sofia Costa", "Erik Vogt", "Aria Moon"];
    const flags = ["🇺🇸", "🇬🇧", "🇫🇷", "🇷🇺", "🇨🇦", "🇯🇵", "🇲🇽", "🇮🇹", "🇳🇴", "🇧🇷", "🇩🇪", "🇦🇺"];
    return names.map((name, i) => ({
        id: `shadow-p-${i}`,
        name,
        region: flags[i],
        rating: 98.45 - (i * 1.2),
        runs: 5 + (i % 3),
        wins: Math.max(0, 3 - Math.floor(i / 3)),
        sets: 4 + (i % 2),
        currentRank: i + 1
    }));
  }, []);

  const shadowCourses = useMemo(() => {
    const names = ["ASR ORIGINS", "NEON DISTRICT", "QUARTZ QUARRY", "MISTY PEAK", "RUST HARBOR", "COBALT CANYON", "IVORY TOWER", "EMERALD ISLE"];
    const flags = ["🇺🇸", "🇯🇵", "🇩🇪", "🇨🇦", "🇬🇧", "🇦🇺", "🇫🇷", "🇮🇪"];
    return names.map((name, i) => ({
        name,
        flag: flags[i],
        totalAthletes: 12 + (i * 2),
        mRecord: 6.45 + (i * 0.1),
        fRecord: 8.22 + (i * 0.12),
        currentRank: i + 1
    }));
  }, []);

  const shadowCities = useMemo(() => {
    const names = ["NEW YORK", "TOKYO", "BERLIN", "VANCOUVER", "LONDON", "SYDNEY", "PARIS", "DUBLIN"];
    const flags = ["🇺🇸", "🇯🇵", "🇩🇪", "🇨🇦", "🇬🇧", "🇦🇺", "🇫🇷", "🇮🇪"];
    return names.map((name, i) => ({
        name,
        flag: flags[i],
        players: 45 - i,
        runs: 120 + (i * 15),
        courses: 3 + (i % 2),
        currentRank: i + 1
    }));
  }, []);

  const shadowCountries = useMemo(() => {
    const names = ["USA", "JAPAN", "GERMANY", "CANADA", "UK", "AUSTRALIA", "FRANCE", "IRELAND"];
    const flags = ["🇺🇸", "🇯🇵", "🇩🇪", "🇨🇦", "🇬🇧", "🇦🇺", "🇫🇷", "🇮🇪"];
    return names.map((name, i) => ({
        name,
        flag: flags[i],
        cities: 4 + (i % 3),
        players: 80 - (i * 5),
        runs: 350 + (i * 20),
        courses: 12 + (i % 4),
        currentRank: i + 1
    }));
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-16 flex items-center justify-between px-3 sm:px-8 gap-3 sm:gap-6 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-2 shrink-0"><div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}><IconSpeed /></div><span className="font-black tracking-tighter text-lg sm:text-2xl uppercase italic leading-none transition-all whitespace-nowrap"><span className="sm:hidden">ASR</span><span className="hidden sm:inline">APEX SPEED RUN</span></span></div>
        <div className={`flex items-center p-1 rounded-2xl border shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
            <div className="flex">
                {[{id:'players',l:'PLAYERS'},{id:'courses',l:'COURSES'},{id:'cities',l:'CITIES'},{id:'countries',l:'COUNTRIES'},{id:'hof',l:'HOF'}].map(v => (
                    <button key={v.id} onClick={() => setView(v.id)} className={`px-1.5 sm:px-4 py-1.5 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                        {v.l}
                    </button>
                ))}
            </div>
        </div>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-10 h-10 flex items-center justify-center border rounded-2xl transition-all shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600'}`}>{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
      </nav>
      
      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} performanceData={eventType === 'all-time' ? atPerfs : opPerfs} onCourseClick={(name) => { setSel(null); setSelCourse(courseList.find(c => c.name === name)); }} />
      <CourseModal isOpen={!!selCourse} onClose={() => setSelCourse(null)} course={selCourse} theme={theme} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => { setSelCourse(null); setSel(p); }} />
      <CityModal isOpen={!!selCity} onClose={() => setSelCity(null)} city={selCity} theme={theme} courses={rawCourseList} onCourseClick={(c) => { setSelCity(null); setSelCourse(c); }} />
      <CountryModal isOpen={!!selCountry} onClose={() => setSelCountry(null)} country={selCountry} theme={theme} courses={rawCourseList} onCourseClick={(c) => { setSelCountry(null); setSelCourse(c); }} />
      
      <header className={`pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-10 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {view !== 'hof' ? (
                <div className={`flex items-center p-1 rounded-2xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                    <div className="flex">
                        {[{id:'all-time',l:'ASR ALL-TIME'},{id:'open',l:'2026 ASR OPEN'}].map(ev => (
                            <button key={ev.id} onClick={() => setEventType(ev.id)} className={`px-3 sm:px-4 py-1.5 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${eventType === ev.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{ev.l}</button>
                        ))}
                    </div>
                </div>
            ) : <div />}

            <div className="flex items-center gap-3">
                {['courses', 'cities', 'countries'].includes(view) && (
                    <div className={`flex items-center p-1 rounded-2xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                        <a 
                            href="https://www.google.com/maps/d/u/0/edit?mid=1qOq-qniep6ZG1yo9KdK1LsQ7zyvHyzY&usp=sharing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all bg-blue-600 text-white shadow-lg hover:brightness-110 flex items-center gap-2"
                        >
                            ASR MAP
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                    </div>
                )}

                {view === 'players' && (
                    <div className={`flex items-center p-1 rounded-2xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                        <div className="flex">
                            {[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (
                                <button key={g.id} onClick={() => setGen(g.id)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${gen === g.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{g.l}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {eventType === 'open' && view !== 'hof' && (
            <div className={`p-5 sm:p-8 rounded-[2rem] border animate-in fade-in slide-in-from-top-4 duration-700 ${theme === 'dark' ? 'bg-blue-600/5 border-blue-500/20 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0"><IconInfo /></div>
                    <div className="space-y-3">
                        <p className="text-[10px] sm:text-xs font-bold opacity-80 leading-relaxed max-w-4xl tracking-wide">
                            The 2026 ASR Open is a worldwide speed parkour competition running March 1 thru May 31. Players must complete and submit at least 3 new runs on 3 qualifying courses to get ranked. Top 6 men and top 6 women qualify for the Parkour Earth World Championships this October in Brno, Czechia.
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        {view !== 'hof' && eventType !== 'open' && (
            <div className="w-full relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-500`}>
                    <IconSearch size={14} />
                </div>
                <input type="text" placeholder="" value={search} onChange={e => setSearch(e.target.value)} className={`rounded-2xl pl-11 pr-11 py-4 w-full text-[14px] font-medium outline-none transition-all border ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-white focus:bg-white/[0.07] focus:border-white/10 shadow-2xl' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500/30 shadow-lg'}`} />
                {search && (
                    <button onClick={() => setSearch('')} className={`absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                        <IconX size={16} />
                    </button>
                )}
            </div>
        )}
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 flex-grow w-full relative">
        {view === 'hof' ? (<HallOfFame stats={hofStats} theme={theme} onPlayerClick={setSel} medalSort={medalSort} setMedalSort={setMedalSort} />) : (
          <div className={`border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
            <div className="overflow-x-auto scrollbar-hide relative">
              
              {/* Overlay for Open View */}
              {eventType === 'open' && (
                <div className={`absolute inset-0 z-10 flex flex-col items-center pt-24 sm:pt-32 p-8 text-center bg-gradient-to-t pointer-events-none ${theme === 'dark' ? 'from-black/40 via-transparent to-transparent' : 'from-slate-300/40 via-transparent to-transparent'}`}>
                    <CountdownTimer targetDate={new Date('2026-03-01T00:00:00-10:00')} theme={theme} />
                    <h4 className={`mt-8 text-sm sm:text-lg font-black uppercase tracking-[0.3em] animate-subtle-pulse drop-shadow-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        Coming Soon to a Spot Near You
                    </h4>
                </div>
              )}

              {view === 'players' ? (
                <table className={`data-table min-w-full ${eventType === 'open' ? 'blur-locked' : ''}`}>
                    <thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <th className="pl-4 sm:pl-10 py-5 text-left w-20 sm:w-28 whitespace-nowrap">RANK</th>
                    <HeaderComp l="PLAYER" k="name" w="w-auto px-2 py-5" activeSort={sort} handler={setSort} />
                    <HeaderComp l="OVR" k="rating" a="right" w="w-20 sm:w-32" activeSort={sort} handler={setSort} />
                    <HeaderComp l="RUNS" k="runs" a="right" w="w-16 sm:w-24" activeSort={sort} handler={setSort} />
                    <HeaderComp l="WINS" k="wins" a="right" w="w-16 sm:w-24" activeSort={sort} handler={setSort} />
                    <HeaderComp l="SETS" k="sets" a="right" w="w-16 sm:w-24 pr-4 sm:pr-10" activeSort={sort} handler={setSort} /></tr></thead>
                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                        {(eventType === 'open' ? shadowAthletes : list).map((p, idx) => (
                        <tr key={`p-${p.id}`} onClick={() => eventType !== 'open' && setSel(p)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${eventType !== 'open' && !p.isQualified ? 'opacity-40' : ''}`}>
                            <td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={p.currentRank} theme={theme} /></td>
                            <td className="px-2 py-4 sm:py-8 text-left min-w-[120px]">
                                <div className="flex flex-col">
                                    <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight block">{p.name}</span>
                                    <span className="text-lg sm:text-xl mt-1 leading-none">{p.region || '🏳️'}</span>
                                </div>
                            </td>
                            <td className="px-2 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[14px] tabular-nums text-blue-500 num-col">{(p.rating || 0).toFixed(2)}</td>
                            <td className="px-2 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[14px] tabular-nums num-col">{p.runs}</td>
                            <td className="px-2 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[14px] tabular-nums num-col">{p.wins}</td>
                            <td className="px-2 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-bold text-[10px] sm:text-[14px] tabular-nums num-col">{p.sets}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
              ) : view === 'courses' ? (
                <table className={`data-table min-w-full ${eventType === 'open' ? 'blur-locked' : ''}`}><thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <th className="pl-4 sm:pl-10 py-5 text-left w-20 sm:w-28 whitespace-nowrap">RANK</th>
                  <HeaderComp l="COURSE" k="name" w="w-auto px-2 py-5" activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="PLAYERS" k="totalAthletes" a="right" w="w-16 sm:w-24" activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="CR (M)" k="mRecord" a="right" w="w-20 sm:w-32" activeSort={courseSort} handler={setCourseSort} />
                  <HeaderComp l="CR (W)" k="fRecord" a="right" w="w-20 sm:w-32 pr-4 sm:pr-10" activeSort={courseSort} handler={setCourseSort} />
                </tr></thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {(eventType === 'open' ? shadowCourses : courseList).map((c) => (<tr key={`course-${c.name}`} onClick={() => eventType !== 'open' && setSelCourse(c)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'}`}>
                        <td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={c.currentRank} theme={theme} /></td>
                        <td className="px-2 py-4 sm:py-8 min-w-[140px]">
                            <div className="flex flex-col">
                                <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight block">{c.name}</span>
                                <span className="text-lg sm:text-xl mt-1 leading-none">{c.flag}</span>
                            </div>
                        </td>
                        <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] opacity-60 tabular-nums">{c.totalAthletes}</td>
                        <td className="px-2 py-4 sm:py-8 text-right font-mono font-black text-[9px] sm:text-[14px] text-blue-500 num-col">{c.mRecord ? c.mRecord.toFixed(2) : '-'}</td>
                        <td className="px-2 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-mono font-black text-[9px] sm:text-[14px] text-blue-500 num-col">{c.fRecord ? c.fRecord.toFixed(2) : '-'}</td>
                    </tr>))}
                  </tbody>
                </table>
              ) : view === 'cities' ? (
                <table className={`data-table min-w-full ${eventType === 'open' ? 'blur-locked' : ''}`}><thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <th className="pl-4 sm:pl-10 py-5 text-left w-20 sm:w-28 whitespace-nowrap">RANK</th>
                  <HeaderComp l="CITY" k="name" w="w-auto px-2 py-5" activeSort={citySort} handler={setCitySort} />
                  <HeaderComp l="PLAYERS" k="players" a="right" w="w-16 sm:w-24" activeSort={citySort} handler={setCitySort} />
                  <HeaderComp l="RUNS" k="runs" a="right" w="w-16 sm:w-24" activeSort={citySort} handler={setCitySort} />
                  <HeaderComp l="COURSES" k="courses" a="right" w="w-20 sm:w-32 pr-4 sm:pr-10" activeSort={citySort} handler={setCitySort} /></tr></thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {(eventType === 'open' ? shadowCities : cityList).map((c) => (<tr key={`city-${c.name}`} onClick={() => eventType !== 'open' && setSelCity(c)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'}`}>
                      <td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={c.currentRank} theme={theme} /></td>
                      <td className="px-2 py-4 sm:py-8 min-w-[140px]">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight">{c.name}</span>
                          <span className="text-lg sm:text-xl mt-1 leading-none">{c.flag}</span>
                        </div>
                      </td>
                      <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] opacity-60 tabular-nums">{c.players}</td>
                      <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] opacity-60 tabular-nums">{c.runs}</td>
                      <td className="px-2 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-mono font-black text-blue-500 text-[10px] sm:text-[18px] tabular-nums">{c.courses}</td></tr>))}
                  </tbody>
                </table>
              ) : (
                <table className={`data-table min-w-full ${eventType === 'open' ? 'blur-locked' : ''}`}><thead><tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <th className="pl-4 sm:pl-10 py-5 text-left w-20 sm:w-28 whitespace-nowrap">RANK</th>
                  <HeaderComp l="COUNTRY" k="name" w="w-auto px-2 py-5" activeSort={countrySort} handler={setCountrySort} />
                  <HeaderComp l="CITIES" k="cities" a="right" w="w-16 sm:w-24" activeSort={countrySort} handler={setCountrySort} />
                  <HeaderComp l="PLAYERS" k="players" a="right" w="w-16 sm:w-24" activeSort={countrySort} handler={setCountrySort} />
                  <HeaderComp l="RUNS" k="runs" a="right" w="w-16 sm:w-24" activeSort={countrySort} handler={setCountrySort} />
                  <HeaderComp l="COURSES" k="courses" a="right" w="w-20 sm:w-32 pr-4 sm:pr-10" activeSort={countrySort} handler={setCountrySort} /></tr></thead>
                  <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                    {(eventType === 'open' ? shadowCountries : countryList).map((c) => (<tr key={`country-${c.name}`} onClick={() => eventType !== 'open' && setSelCountry(c)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'}`}>
                      <td className="pl-4 sm:pl-10 py-4 sm:py-8"><RankBadge rank={c.currentRank} theme={theme} /></td>
                      <td className="px-2 py-4 sm:py-8 min-w-[140px]">
                        <div className="flex flex-col">
                          <span className="text-[10px] sm:text-[14px] font-black uppercase tracking-tight leading-tight">{c.name}</span>
                          <span className="text-lg sm:text-xl mt-1 leading-none">{c.flag}</span>
                        </div>
                      </td>
                      <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] uppercase opacity-60 tabular-nums">{c.cities}</td>
                      <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] opacity-60 tabular-nums">{c.players}</td>
                      <td className="px-2 py-4 sm:py-8 text-right font-mono font-bold text-[9px] sm:text-[14px] opacity-60 tabular-nums">{c.runs}</td>
                      <td className="px-2 pr-4 sm:pr-10 py-4 sm:py-8 text-right font-mono font-black text-blue-500 text-[10px] sm:text-[18px] tabular-nums">{c.courses}</td></tr>))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="mt-24 text-center pb-24 opacity-20 font-black uppercase tracking-[0.4em] text-[10px] whitespace-nowrap shrink-0">© 2026 APEX SPEED RUN</footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);

export default App;
