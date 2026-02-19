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
      -webkit-font-smoothing: antialiased;
    }
    
    html, body { 
      text-rendering: optimizeLegibility; 
      width: 100%; 
      margin: 0; 
      padding: 0; 
      overflow-x: hidden;
    }

    .data-table, .hof-table { 
      table-layout: auto !important; 
      width: 100%;
      border-collapse: collapse;
    }

    .data-table td, .data-table th, .hof-table td, .hof-table th {
      vertical-align: middle;
      white-space: normal;
      word-break: break-word;
    }

    .data-table th, .hof-table th {
      white-space: nowrap !important;
    }

    .num-col, .flag-col { 
      white-space: nowrap !important; 
    }

    .hof-table th, .hof-table td, .data-table th, .data-table td { 
      padding: 1rem 0.35rem; 
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
    const shadowColor = theme === 'dark' ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'drop-shadow-[0_2px_4_rgba(0,0,0,0.1)]';

    return (
        <div className="flex gap-2 sm:gap-10 font-mono text-center">
            {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
            ].map((unit) => (
                <div key={unit.label} className="flex flex-col items-center">
                    <span className={`text-2xl xs:text-3xl sm:text-7xl font-black tracking-tighter tabular-nums ${textColor} ${shadowColor}`}>
                        {String(unit.value).padStart(2, '0')}
                    </span>
                    <span className={`text-[5px] sm:text-[10px] uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] mt-0.5 ${textColor}`}>
                        {unit.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- DATA HELPERS ---
const robustSort = (a, b, key, dir) => {
    let aVal = a[key];
    let bVal = b[key];
    const isANum = aVal !== null && aVal !== undefined && !isNaN(parseFloat(aVal)) && isFinite(aVal);
    const isBNum = bVal !== null && bVal !== undefined && !isNaN(parseFloat(bVal)) && isFinite(bVal);
    if (isANum && isBNum) return (parseFloat(aVal) - parseFloat(bVal)) * dir;
    const aStr = String(aVal || "").toLowerCase();
    const bStr = String(bVal || "").toLowerCase();
    return aStr.localeCompare(bStr) * dir;
};

const fixCountryEntity = (name, flag) => {
    const n = (name || "").toUpperCase().trim();
    const f = (flag || "").trim();
    if (n === "PUERTO RICO" || f === "🇵🇷") return { name: "PUERTO RICO", flag: "🇵🇷" };
    if (n === "USA" || n === "UNITED STATES" || n === "UNITED STATES OF AMERICA") return { name: "USA", flag: "🇺🇸" };
    return { name, flag };
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

// --- DATA PROCESSORS ---
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

const calculateCityStats = (rawCourseList) => {
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
    return Object.values(cityMap).map(city => ({ 
        ...city, 
        players: city.playersSet.size,
        avgElevation: city.elevationCount > 0 ? (city.totalElevation / city.elevationCount) : 0
    }));
};

const calculateCountryStats = (rawCourseList) => {
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
    return Object.values(countryMap).map(country => ({ 
        ...country, 
        players: country.playersSet.size, 
        cities: country.citiesSet.size,
        avgElevation: country.elevationCount > 0 ? (country.totalElevation / country.elevationCount) : 0
    }));
};

const calculateHofStats = (data, atPerfs, lbAT, atMet, cityList, countryList, medalSort) => {
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
};

const PerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-fire" };
    return <span className={`inline-flex items-center gap-1 text-[11px] select-none shrink-0 ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const ProfileCourseList = ({ courses, theme, onCourseClick, filterKey, filterValue }) => {
    return (
        <div className="grid grid-cols-1 gap-2">
            {courses
                .filter(c => c[filterKey] === filterValue)
                .sort((a, b) => (b.totalAthletes || 0) - (a.totalAthletes || 0))
                .map(c => (
                <div key={c.name} onClick={() => onCourseClick(c)} className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3 pr-4 min-w-0">
                        <IconCourse />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[10px] sm:text-sm font-black uppercase">{c.name}</span>
                            {filterKey === 'country' && <span className="text-[7px] sm:text-[8px] font-black opacity-40 uppercase">{c.city}</span>}
                        </div>
                    </div>
                    <div className="flex gap-2 sm:gap-6 shrink-0">
                        <div className="flex flex-col items-end"><span className="text-[6px] sm:text-[8px] font-black opacity-40">CR (M)</span><span className="text-[9px] sm:text-xs font-mono font-bold text-blue-500">{c.mRecord?.toFixed(2) || '-'}</span></div>
                        <div className="flex flex-col items-end"><span className="text-[6px] sm:text-[8px] font-black opacity-40">CR (W)</span><span className="text-[9px] sm:text-xs font-mono font-bold text-blue-500">{c.fRecord?.toFixed(2) || '-'}</span></div>
                        <div className="flex flex-col items-end"><span className="text-[6px] sm:text-[8px] font-black opacity-40">PLAYERS</span><span className="text-[9px] sm:text-xs font-mono font-bold">{c.totalAthletes}</span></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- COMPONENTS ---

const RankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = rank === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-6 h-6 sm:w-9 sm:h-9';
  const textClass = size === 'lg' ? 'text-[11px] sm:text-[13px]' : 'text-[8px] sm:text-[11px]';
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

const BaseModal = ({ isOpen, onClose, theme, header, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[90vh]`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 relative h-fit min-h-[90px] sm:min-h-[144px] p-4 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30' : 'from-slate-400/40'} to-transparent`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"><IconX size={16} /></button>
          {header}
        </div>
        <div className={`flex-grow overflow-y-auto p-4 sm:p-10 space-y-6 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const LocationModal = ({ isOpen, onClose, data, type, theme, courses, onCourseClick }) => {
    if (!isOpen || !data) return null;
    const isCity = type === 'city';
    const stats = isCity ? [
        { l: 'COURSES', v: data.courses, c: 'text-blue-500' },
        { l: 'RUNS', v: data.runs },
        { l: 'PLAYERS', v: data.players },
        { l: 'AVG ELEVATION', v: data.avgElevation ? `${data.avgElevation.toFixed(0)}m` : '-' }
    ] : [
        { l: 'CITIES', v: data.cities, c: 'text-blue-500' },
        { l: 'COURSES', v: data.courses },
        { l: 'RUNS', v: data.runs },
        { l: 'PLAYERS', v: data.players }
    ];

    const Header = (
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full pr-8">
            <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl border flex items-center justify-center text-blue-500 shrink-0 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}>
                {isCity ? <IconCity /> : <IconGlobe />}
            </div>
            <div className="flex flex-col min-w-0">
                <h2 className="text-lg sm:text-3xl font-black tracking-tight uppercase truncate">{data.name}</h2>
                <div className="text-sm sm:text-xl leading-none mt-1">{data.flag}</div>
            </div>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} theme={theme} header={Header}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {stats.map((s, i) => (
                    <div key={i} className={`flex flex-col border p-2.5 sm:p-5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                        <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-wider mb-1 opacity-50 whitespace-nowrap">{s.l}</span>
                        <span className={`text-[10px] sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span>
                    </div>
                ))}
            </div>
            <ProfileCourseList courses={courses} theme={theme} onCourseClick={onCourseClick} filterKey={type} filterValue={data.name} />
        </BaseModal>
    );
};

const DataTable = ({ columns, data, sort, onSort, theme, onRowClick, isLocked }) => {
    const renderCell = (col, item) => {
        const val = item[col.key];
        if (col.isRank) return <RankBadge rank={item.currentRank} theme={theme} />;
        
        if (col.type === 'profile') {
            const sub = col.subKey ? item[col.subKey] : null;
            return (
                <div className="flex flex-col">
                    <span className="text-[8px] sm:text-[14px] font-black uppercase tracking-tight block">{val}</span>
                    {sub && <span className="text-sm sm:text-xl mt-0.5 sm:mt-1 leading-none">{sub || '🏳️'}</span>}
                </div>
            );
        }
        
        if (col.type === 'number' || col.type === 'highlight') {
            const display = (val === null || val === undefined) ? '-' : (typeof val === 'number' && col.decimals !== undefined ? val.toFixed(col.decimals) : val);
            const colorClass = col.type === 'highlight' ? 'text-blue-500' : (col.opacity ? 'opacity-60' : '');
            return <span className={`font-mono font-bold text-[7px] sm:text-[14px] tabular-nums num-col ${colorClass}`}>{display}</span>;
        }
        
        return <span className="text-[8px] sm:text-[14px] font-bold">{val}</span>;
    };

    return (
        <table className={`data-table min-w-full ${isLocked ? 'blur-locked' : ''}`}>
            <thead>
                <tr className={`border-b text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    {columns.map((col, i) => (
                        col.isRank ? 
                            <th key={i} className="pl-3 sm:pl-10 py-4 sm:py-5 text-left w-12 sm:w-28 whitespace-nowrap">RANK</th> :
                            <HeaderComp key={col.key} l={col.label} k={col.key} a={col.align} w={col.width} activeSort={sort} handler={onSort} />
                    ))}
                </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                {data.map((item) => (
                    <tr key={item.id || item.name} onClick={() => onRowClick && onRowClick(item)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${!onRowClick ? '' : ''} ${item.isQualified === false ? 'opacity-40' : ''}`}>
                        {columns.map((col, i) => (
                            <td key={i} className={`${col.isRank ? 'pl-3 sm:pl-10 py-3 sm:py-8' : (col.cellClass || `px-2 py-3 sm:py-8 ${col.align === 'right' ? 'text-right' : 'text-left'}`)}`}>
                                {renderCell(col, item)}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const HeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler }) => {
  return (
    <th className={`${w} px-2 py-4 sm:py-5 cursor-pointer group select-none transition-colors ${activeSort.key === k ? 'bg-blue-600/10' : ''} hover:bg-blue-600/5`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-1 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase tracking-tighter text-[6px] xs:text-[7px] sm:text-[10px] font-black leading-none">{l}</span>
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
          <IconArrow direction={activeSort.key === k ? activeSort.direction : 'descending'} />
        </div>
      </div>
    </th>
  );
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
    { l: 'RATING', v: (p.rating || 0).toFixed(2), c: 'text-blue-500' }, { l: 'RUNS', v: p.runs || 0 }, 
    { l: 'POINTS', v: (p.pts || 0).toFixed(2) }, { l: '🪙', v: p.contributionScore || 0, g: 'glow-gold' }, 
    { l: 'WIN %', v: ((p.wins / (p.runs || 1)) * 100).toFixed(2) }, { l: 'WINS', v: p.wins || 0 }, 
    { l: 'SETS', v: p.sets || 0 }, { l: '🔥', v: totalFires, g: 'glow-fire' }
  ];

  const Header = (
    <div className="flex items-center gap-3 sm:gap-8 min-w-0 w-full pr-8">
        <div className={`w-12 h-12 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl border flex items-center justify-center text-sm sm:text-3xl font-black shadow-xl shrink-0 uppercase ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>{getInitials(p.name)}</div>
        <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-4xl leading-tight flex items-center gap-2 flex-wrap">
            <span className="shrink-0">{p.region || '🏳️'}</span><h2 className="font-black tracking-tight">{p.name}</h2>
            </div>
            {p.countryName && <div className="text-[8px] sm:text-xs font-black uppercase tracking-widest opacity-50 ml-0.5">{p.countryName}</div>}
        </div>
    </div>
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} theme={theme} header={Header}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((s, i) => (
            <div key={i} className={`flex flex-col border p-2 sm:p-5 rounded-xl sm:rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
            <span className={`text-[6px] sm:text-[8px] font-black uppercase tracking-[0.1em] mb-1 sm:mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{s.l}</span>
            <span className={`text-xs sm:text-xl font-mono font-black num-col ${s.c || ''} ${s.g || ''}`}>{s.v}</span>
            </div>
        ))}
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
        {courseData.map((c, i) => (
            <div key={i} onClick={() => onCourseClick?.(c.label)} className={`flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
            <div className="flex flex-col min-w-0 pr-3">
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {c.rank > 0 && c.rank <= 3 && <PerformanceBadge type={c.rank} />}
                {c.rank >= 4 && <span className="text-[8px] font-mono font-black italic opacity-40">{c.rank}</span>}
                {getFires(c.num, p.gender) > 0 && <PerformanceBadge type="fire" count={getFires(c.num, p.gender)} />}
                </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] sm:text-lg font-mono font-black text-blue-500 num-col">{c.points.toFixed(2)}</span>
                <span className="text-[8px] sm:text-[10px] font-mono font-bold -mt-0.5 sm:-mt-1 opacity-70 num-col">{c.num.toFixed(2)}</span>
            </div>
            </div>
        ))}
        </div>
    </BaseModal>
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
        <div className="space-y-2 sm:space-y-3">
            <h3 className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{title}</h3>
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
                {athletes.slice(0, 10).map(([pKey, time], i) => {
                    const meta = athleteMetadata[pKey] || {};
                    const points = genderRecord ? (genderRecord / time) * 100 : 0;
                    return (
                        <div key={pKey} onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })} className={`flex items-center justify-between p-2.5 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-3">
                                <RankBadge rank={i + 1} theme={theme} />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-[9px] sm:text-[12px] font-black uppercase ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{athleteDisplayNameMap[pKey]}</span>
                                  <span className="text-[7px] sm:text-[10px] uppercase font-black">{meta.region || '🏳️'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end shrink-0"><span className="text-[10px] sm:text-sm font-mono font-black text-blue-500 num-col">{time.toFixed(2)}</span><span className={`text-[8px] sm:text-[10px] font-mono font-black num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{points.toFixed(2)}</span></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const Header = (
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 w-full pr-8">
            <div className={`w-10 h-10 sm:w-16 sm:h-16 rounded-xl border flex items-center justify-center text-blue-500 shrink-0 ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}><IconCourse /></div>
            <div className="flex flex-col min-w-0"><h2 className="text-sm sm:text-3xl font-black tracking-tight uppercase">{course.name} SPEED RUN</h2><div className="text-[7px] sm:text-[12px] font-bold uppercase tracking-wider sm:tracking-widest ml-0.5 flex items-center gap-1.5 flex-wrap"><span className="opacity-60">{course.city || '??'}, {course.country || '??'}</span><span className="opacity-100 shrink-0">{course.flag}</span></div></div>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} theme={theme} header={Header}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">{stats.map((s, i) => (<div key={i} className={`flex flex-col border p-2.5 sm:p-5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}><span className="text-[6px] sm:text-[8px] font-black uppercase tracking-wider mb-1 opacity-50 whitespace-nowrap">{s.l}</span><span className={`text-[10px] sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span></div>))}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8"><RankList title="MEN'S TOP 10" athletes={course.athletesM} genderRecord={course.mRecord} /><RankList title="WOMEN'S TOP 10" athletes={course.athletesF} genderRecord={course.fRecord} /></div>
        </BaseModal>
    );
};

const HallOfFame = ({ stats, theme, onPlayerClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const tColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {[
          { l: 'TOP RATED', k: 'rating' },
          { l: 'MOST COURSE RECORDS', k: 'wins' },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'MOST SETS', k: 'sets' },
          { l: 'MOST COINS', k: 'contributionScore' },
          { l: 'MOST FIRE', k: 'totalFireCount' },
          { l: 'MOST CITIES', k: 'cityStats' },
          { l: 'MOST COUNTRIES', k: 'countryStats' }
        ].map((sec) => (
          <div key={sec.k} className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
            <div className="p-3 sm:p-4 border-b border-inherit bg-inherit flex items-center justify-between"><h4 className="text-[7px] sm:text-[9px] font-black uppercase tracking-wider">{sec.l.split(' ').map((word, wi) => (<span key={wi} className={word === 'FIRE' || word === 'COINS' ? 'opacity-100 brightness-150 glow-fire' : 'opacity-60'}>{word}{' '}</span>))}</h4></div>
            <div className={`divide-y ${theme === 'dark' ? 'divide-white/[0.03]' : 'divide-slate-100'}`}>
              {stats.topStats[sec.k].map((p, i) => {
                const displayVal = sec.k === 'rating' ? (p.rating || 0).toFixed(2) : (p[sec.k] !== undefined ? String(p[sec.k]) : String(p.value || 0));
                return (
                  <div key={`${sec.k}-${i}-${p.name}`} className={`flex items-center justify-between p-2.5 sm:p-4 hover:bg-white/[0.03] transition-colors gap-2 ${['cityStats', 'countryStats'].includes(sec.k) ? '' : 'cursor-pointer group/item'}`} onClick={() => !['cityStats', 'countryStats'].includes(sec.k) && onPlayerClick(p)}>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 pr-1">
                      <RankBadge rank={i + 1} theme={theme} />
                      <div className="flex flex-col ml-0.5">
                        <span className={`text-[8px] sm:text-[13px] font-black uppercase leading-tight ${!['cityStats', 'countryStats'].includes(sec.k) ? 'group-hover/item:text-blue-500' : ''} transition-colors`}>{p.name}</span>
                        <span className="text-sm sm:text-xl mt-0.5 leading-none">{p.region || '🏳️'}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-black text-blue-500 text-[8px] sm:text-[14px] shrink-0 tabular-nums num-col ${sec.k === 'totalFireCount' ? 'glow-fire' : ''} ${sec.k === 'contributionScore' ? 'glow-gold' : ''}`}>{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="p-4 sm:p-6 border-b border-inherit bg-inherit"><h3 className="text-[8px] sm:text-[11px] font-black uppercase tracking-[0.2em]">WORLDWIDE MEDAL COUNT</h3></div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="hof-table min-w-full">
            <thead><tr className={`border-b text-[7px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 text-slate-500 border-white/5' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <HeaderComp l="RANK" k="rank" a="left" w="w-12 sm:w-28" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="COUNTRY" k="name" a="left" w="w-auto px-2" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="GOLD" k="gold" a="center" w="w-8 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="SILVER" k="silver" a="center" w="w-8 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="BRONZE" k="bronze" a="center" w="w-8 sm:w-24" activeSort={medalSort} handler={setMedalSort} />
              <HeaderComp l="TOTAL" k="total" a="right" w="w-12 sm:w-32 pr-4 sm:pr-10" activeSort={medalSort} handler={setMedalSort} />
            </tr></thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={`medal-row-${c.name}-${c.flag}`} className="group hover:bg-black/[0.02] transition-colors">
                  <td className="pl-2 sm:pl-10 py-3 sm:py-8 text-center sm:text-left"><RankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="px-2 py-3 sm:py-8 min-w-[80px] sm:min-w-[140px]">
                    <div className="flex flex-col">
                      <span className={`text-[8px] sm:text-[14px] font-black uppercase tracking-tight leading-tight block ${tColor}`}>{c.name}</span>
                      <span className="text-sm sm:text-xl mt-0.5 leading-none drop-shadow-sm shrink-0">{c.flag}</span>
                    </div>
                  </td>
                  <td className={`text-center font-mono font-black text-[8px] sm:text-[14px] glow-gold tabular-nums num-col text-blue-500`}>{c.gold}</td>
                  <td className={`text-center font-mono font-black text-[8px] sm:text-[14px] glow-silver tabular-nums num-col ${tColor}`}>{c.silver}</td>
                  <td className={`text-center font-mono font-black text-[8px] sm:text-[14px] glow-bronze tabular-nums num-col ${tColor}`}>{c.bronze}</td>
                  <td className={`pr-4 sm:pr-10 text-right font-mono font-black ${tColor} text-[8px] sm:text-[14px] tabular-nums num-col`}>{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const NavBar = ({ theme, setTheme, view, setView }) => (
    <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-14 sm:h-16 flex items-center justify-between px-2 sm:px-8 gap-1 sm:gap-6 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-1.5 shrink-0">
            <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}>
                <IconSpeed />
            </div>
            <span className="font-black tracking-tighter text-[9px] xs:text-[11px] sm:text-2xl uppercase italic leading-none transition-all whitespace-nowrap">
                ASR <span className="hidden xs:inline">APEX SPEED RUN</span>
            </span>
        </div>
        
        <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-2xl border shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
            <div className="flex items-center">
                {[{id:'players',l:'PLAYERS'},{id:'courses',l:'COURSES'},{id:'cities',l:'CITIES'},{id:'countries',l:'COUNTRIES'},{id:'hof',l:'HOF'}].map(v => (
                    <button key={v.id} onClick={() => setView(v.id)} className={`px-0.5 xs:px-1 sm:px-4 py-1.5 rounded-md sm:rounded-xl text-[5px] xs:text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                        {v.l}
                    </button>
                ))}
            </div>
        </div>
        
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center border rounded-lg sm:rounded-2xl transition-all shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600'}`}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
    </nav>
);

const ControlBar = ({ view, eventType, setEventType, gen, setGen, search, setSearch, theme }) => (
    <header className={`pt-20 sm:pt-24 pb-6 sm:pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col gap-4 sm:gap-10 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {view !== 'hof' ? (
                <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                    <div className="flex flex-wrap gap-0.5">
                        {[{id:'all-time',l:'ASR ALL-TIME'},{id:'open',l:'2026 ASR OPEN'}].map(ev => (
                            <button key={ev.id} onClick={() => setEventType(ev.id)} className={`px-2 sm:px-4 py-1.5 rounded-lg text-[6px] xs:text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${eventType === ev.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{ev.l}</button>
                        ))}
                    </div>
                </div>
            ) : <div />}

            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                {['courses', 'cities', 'countries'].includes(view) && (
                    <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                        <a 
                            href="https://www.google.com/maps/d/u/0/edit?mid=1qOq-qniep6ZG1yo9KdK1LsQ7zyvHyzY&usp=sharing" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-2 sm:px-4 py-1 rounded-md sm:rounded-xl text-[6px] xs:text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all bg-blue-600 text-white shadow-lg hover:brightness-110 flex items-center gap-1.5"
                        >
                            ASR MAP
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                    </div>
                )}

                {view === 'players' && (
                    <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                        <div className="flex">
                            {[{id:'M',l:'MEN'},{id:'F',l:'WOMEN'}].map(g => (
                                <button key={g.id} onClick={() => setGen(g.id)} className={`px-2.5 sm:px-4 py-1 rounded-md sm:rounded-xl text-[6px] xs:text-[7px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${gen === g.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{g.l}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {eventType === 'open' && view !== 'hof' && (
            <div className={`p-3 sm:p-8 rounded-xl sm:rounded-[2rem] border animate-in fade-in slide-in-from-top-4 duration-700 ${theme === 'dark' ? 'bg-blue-600/5 border-blue-500/20 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                <div className="flex items-start gap-2.5 sm:gap-4">
                    <div className="p-1 sm:p-2 rounded-lg bg-blue-600 text-white shrink-0"><IconInfo /></div>
                    <div className="space-y-2 sm:space-y-3">
                        <p className="text-[7px] sm:text-xs font-bold opacity-80 leading-relaxed max-w-4xl tracking-wide">
                            The 2026 ASR Open runs March 1 thru May 31. Players must submit at least 3 new runs on qualifying courses to get ranked. Top 6 men and women qualify for the World Championships in Brno, Czechia.
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        {view !== 'hof' && eventType !== 'open' && (
            <div className="w-full relative group">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-500`}>
                    <IconSearch size={12} />
                </div>
                <input type="text" placeholder="" value={search} onChange={e => setSearch(e.target.value)} className={`rounded-xl sm:rounded-2xl pl-10 pr-10 py-2.5 sm:py-4 w-full text-[11px] sm:text-[14px] font-medium outline-none transition-all border ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-white focus:bg-white/[0.07] focus:border-white/10 shadow-xl' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500/30 shadow-md'}`} />
                {search && (
                    <button onClick={() => setSearch('')} className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                        <IconX size={14} />
                    </button>
                )}
            </div>
        )}
    </header>
);

const Footer = () => (
    <footer className="mt-16 sm:mt-24 text-center pb-12 sm:pb-24 opacity-20 font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[8px] sm:text-[10px] whitespace-nowrap shrink-0">© 2026 APEX SPEED RUN</footer>
);

// --- STATIC DATA & CONFIGURATION ---
const SHADOW_ATHLETES = [
    { id: 'shadow-p-0', name: "Marcus Chen", region: "🇺🇸", rating: 98.45, runs: 5, wins: 3, sets: 4, currentRank: 1 },
    { id: 'shadow-p-1', name: "Sarah Jenkins", region: "🇬🇧", rating: 97.25, runs: 6, wins: 3, sets: 5, currentRank: 2 },
    { id: 'shadow-p-2', name: "Leo Dubois", region: "🇫🇷", rating: 96.05, runs: 7, wins: 3, sets: 4, currentRank: 3 },
    { id: 'shadow-p-3', name: "Elena Petrova", region: "🇷🇺", rating: 94.85, runs: 5, wins: 2, sets: 5, currentRank: 4 },
    { id: 'shadow-p-4', name: "Jack Thorne", region: "🇨🇦", rating: 93.65, runs: 6, wins: 2, sets: 4, currentRank: 5 },
    { id: 'shadow-p-5', name: "Yuki Tanaka", region: "🇯🇵", rating: 92.45, runs: 7, wins: 2, sets: 5, currentRank: 6 },
    { id: 'shadow-p-6', name: "Alex Rivera", region: "🇲🇽", rating: 91.25, runs: 5, wins: 1, sets: 4, currentRank: 7 },
    { id: 'shadow-p-7', name: "Mia Rossi", region: "🇮🇹", rating: 90.05, runs: 6, wins: 1, sets: 5, currentRank: 8 },
    { id: 'shadow-p-8', name: "Noah Berg", region: "🇳🇴", rating: 88.85, runs: 7, wins: 1, sets: 4, currentRank: 9 },
    { id: 'shadow-p-9', name: "Sofia Costa", region: "🇧🇷", rating: 87.65, runs: 5, wins: 0, sets: 5, currentRank: 10 },
    { id: 'shadow-p-10', name: "Erik Vogt", region: "🇩🇪", rating: 86.45, runs: 6, wins: 0, sets: 4, currentRank: 11 },
    { id: 'shadow-p-11', name: "Aria Moon", region: "🇦🇺", rating: 85.25, runs: 7, wins: 0, sets: 5, currentRank: 12 }
];

const SHADOW_COURSES = [
    { name: "ASR ORIGINS", flag: "🇺🇸", totalAthletes: 12, mRecord: 6.45, fRecord: 8.22, currentRank: 1 },
    { name: "NEON DISTRICT", flag: "🇯🇵", totalAthletes: 14, mRecord: 6.55, fRecord: 8.34, currentRank: 2 },
    { name: "QUARTZ QUARRY", flag: "🇩🇪", totalAthletes: 16, mRecord: 6.65, fRecord: 8.46, currentRank: 3 },
    { name: "MISTY PEAK", flag: "🇨🇦", totalAthletes: 18, mRecord: 6.75, fRecord: 8.58, currentRank: 4 },
    { name: "RUST HARBOR", flag: "🇬🇧", totalAthletes: 20, mRecord: 6.85, fRecord: 8.70, currentRank: 5 },
    { name: "COBALT CANYON", flag: "🇦🇺", totalAthletes: 22, mRecord: 6.95, fRecord: 8.82, currentRank: 6 },
    { name: "IVORY TOWER", flag: "🇫🇷", totalAthletes: 24, mRecord: 7.05, fRecord: 8.94, currentRank: 7 },
    { name: "EMERALD ISLE", flag: "🇮🇪", totalAthletes: 26, mRecord: 7.15, fRecord: 9.06, currentRank: 8 }
];

const SHADOW_CITIES = [
    { name: "NEW YORK", flag: "🇺🇸", players: 45, runs: 120, courses: 3, currentRank: 1 },
    { name: "TOKYO", flag: "🇯🇵", players: 44, runs: 135, courses: 4, currentRank: 2 },
    { name: "BERLIN", flag: "🇩🇪", players: 43, runs: 150, courses: 3, currentRank: 3 },
    { name: "VANCOUVER", flag: "🇨🇦", players: 42, runs: 165, courses: 4, currentRank: 4 },
    { name: "LONDON", flag: "🇬🇧", players: 41, runs: 180, courses: 3, currentRank: 5 },
    { name: "SYDNEY", flag: "🇦🇺", players: 40, runs: 195, courses: 4, currentRank: 6 },
    { name: "PARIS", flag: "🇫🇷", players: 39, runs: 210, courses: 3, currentRank: 7 },
    { name: "DUBLIN", flag: "🇮🇪", players: 38, runs: 225, courses: 4, currentRank: 8 }
];

const SHADOW_COUNTRIES = [
    { name: "USA", flag: "🇺🇸", cities: 4, players: 80, runs: 350, courses: 12, currentRank: 1 },
    { name: "JAPAN", flag: "🇯🇵", cities: 5, players: 75, runs: 370, courses: 13, currentRank: 2 },
    { name: "GERMANY", flag: "🇩🇪", cities: 6, players: 70, runs: 390, courses: 14, currentRank: 3 },
    { name: "CANADA", flag: "🇨🇦", cities: 4, players: 65, runs: 410, courses: 15, currentRank: 4 },
    { name: "UK", flag: "🇬🇧", cities: 5, players: 60, runs: 430, courses: 12, currentRank: 5 },
    { name: "AUSTRALIA", flag: "🇦🇺", cities: 6, players: 55, runs: 450, courses: 13, currentRank: 6 },
    { name: "FRANCE", flag: "🇫🇷", cities: 4, players: 50, runs: 470, courses: 14, currentRank: 7 },
    { name: "IRELAND", flag: "🇮🇪", cities: 5, players: 45, runs: 490, courses: 15, currentRank: 8 }
];

const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-auto px-2 py-4 sm:py-5 min-w-[90px] sm:min-w-[120px]' },
    { label: 'RATING', type: 'highlight', key: 'rating', decimals: 2, align: 'right', width: 'w-12 sm:w-32' },
    { label: 'RUNS', type: 'number', key: 'runs', align: 'right', width: 'w-8 sm:w-24' },
    { label: 'WINS', type: 'number', key: 'wins', align: 'right', width: 'w-8 sm:w-24' },
    { label: 'SETS', type: 'number', key: 'sets', align: 'right', width: 'w-8 sm:w-24 pr-3 sm:pr-10' }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-auto px-2 py-4 sm:py-5 min-w-[100px] sm:min-w-[120px]' },
    { label: 'PLAYERS', type: 'highlight', key: 'totalAthletes', align: 'right', width: 'w-8 sm:w-24' },
    { label: 'CR (MEN)', type: 'number', key: 'mRecord', decimals: 2, align: 'right', width: 'w-12 sm:w-32' },
    { label: 'CR (WOMEN)', type: 'number', key: 'fRecord', decimals: 2, opacity: false, align: 'right', width: 'w-12 sm:w-32 pr-3 sm:pr-10' }
];

const CITY_COLS = [
    { isRank: true },
    { label: 'CITY', type: 'profile', key: 'name', subKey: 'flag', width: 'w-auto px-2 py-4 sm:py-5 min-w-[100px] sm:min-w-[140px]' },
    { label: 'PLAYERS', type: 'highlight', key: 'players', align: 'right', width: 'w-8 sm:w-24' },
    { label: 'RUNS', type: 'number', key: 'runs', opacity: true, align: 'right', width: 'w-8 sm:w-24' },
    { label: 'COURSES', type: 'number', key: 'courses', align: 'right', width: 'w-12 sm:w-32 pr-3 sm:pr-10' }
];

const COUNTRY_COLS = [
    { isRank: true },
    { label: 'COUNTRY', type: 'profile', key: 'name', subKey: 'flag', width: 'w-auto px-2 py-4 sm:py-5 min-w-[90px] sm:min-w-[140px]' },
    { label: 'PLAYERS', type: 'highlight', key: 'players', align: 'right', width: 'w-6 sm:w-24' },
    { label: 'RUNS', type: 'number', key: 'runs', opacity: true, align: 'right', width: 'w-6 sm:w-24' },
    { label: 'COURSES', type: 'number', key: 'courses', opacity: true, align: 'right', width: 'w-6 sm:w-24' },
    { label: 'CITIES', type: 'number', key: 'cities', opacity: true, align: 'right', width: 'w-10 sm:w-32 pr-3 sm:pr-10' }
];

// --- CUSTOM HOOKS ---
const useASRData = () => {
  const [state, setState] = useState({
    data: [], openData: [], atPerfs: {}, opPerfs: {},
    lbAT: {M:{},F:{}}, lbOpen: {M:{},F:{}}, atMet: {}, dnMap: {}, cMet: {}
  });

  const fetchData = useCallback(async () => {
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
      
      setState({
        data: [...pM, ...pF],
        openData: processed.openRankings,
        atPerfs: processed.allTimePerformances,
        opPerfs: processed.openPerformances,
        lbAT: processed.allTimeLeaderboards,
        lbOpen: processed.openLeaderboards,
        atMet: processed.athleteMetadata,
        dnMap: processed.athleteDisplayNameMap,
        cMet: processed.courseMetadata
      });
    } catch(e) { console.error("Data fetch failed:", e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return state;
};

function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('all-time');
  const [view, setView] = useState('players'); 
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [selCourse, setSelCourse] = useState(null);
  const [selCity, setSelCity] = useState(null);
  const [selCountry, setSelCountry] = useState(null);
  
  // Unified Sort State
  const [viewSorts, setViewSorts] = useState({
    players: { key: 'rating', direction: 'descending' },
    courses: { key: 'totalAthletes', direction: 'descending' },
    cities: { key: 'players', direction: 'descending' },
    countries: { key: 'players', direction: 'descending' },
    hof: { key: 'gold', direction: 'descending' }
  });

  const handleSort = (newSort) => {
    const updated = typeof newSort === 'function' ? newSort(viewSorts[view]) : newSort;
    setViewSorts(prev => ({ ...prev, [view]: updated }));
  };

  const { data, openData, atPerfs, opPerfs, lbAT, lbOpen, atMet, dnMap, cMet } = useASRData();

  const list = useMemo(() => {
    const src = eventType === 'all-time' ? data : openData;
    const filtered = src.filter(p => p.gender === gen && (p.name.toLowerCase().includes(search.toLowerCase()) || (p.countryName || "").toLowerCase().includes(search.toLowerCase())));
    const isQual = (p) => p.gender === 'M' ? p.runs >= 4 : (p.gender === 'F' ? p.runs >= 2 : false);
    let qual = filtered.filter(isQual), unranked = filtered.filter(p => !isQual(p));
    const sort = viewSorts.players;
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
  }, [search, viewSorts.players, gen, eventType, data, openData]);

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
    const sort = viewSorts.courses;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const sorted = filtered.sort((a, b) => { 
        if (['mRecord', 'fRecord'].includes(sort.key)) {
            const aVal = a[sort.key]; const bVal = b[sort.key];
            return ((aVal === null ? (dir === 1 ? 999999 : -1) : aVal) - (bVal === null ? (dir === 1 ? 999999 : -1) : bVal)) * dir;
        }
        return robustSort(a, b, sort.key, dir);
    });
    return sorted.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, search, viewSorts.courses]);

  const cityList = useMemo(() => {
    const base = calculateCityStats(rawCourseList);
    const sort = viewSorts.cities;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const result = base.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.countryName.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => robustSort(a, b, sort.key, dir));
    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, viewSorts.cities, search]);

  const countryList = useMemo(() => {
    const base = calculateCountryStats(rawCourseList);
    const sort = viewSorts.countries;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const result = base.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => robustSort(a, b, sort.key, dir));
    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, viewSorts.countries, search]);

  const hofStats = useMemo(() => {
    return calculateHofStats(data, atPerfs, lbAT, atMet, cityList, countryList, viewSorts.hof);
  }, [data, lbAT, cityList, countryList, atMet, atPerfs, viewSorts.hof]);

  const currentView = useMemo(() => {
    if (view === 'hof') return null;
    const isOpen = eventType === 'open';
    const config = {
      players: { columns: PLAYER_COLS, data: isOpen ? SHADOW_ATHLETES : list, onClick: (p) => !isOpen && setSel(p) },
      courses: { columns: COURSE_COLS, data: isOpen ? SHADOW_COURSES : courseList, onClick: (c) => !isOpen && setSelCourse(c) },
      cities: { columns: CITY_COLS, data: isOpen ? SHADOW_CITIES : cityList, onClick: (c) => !isOpen && setSelCity(c) },
      countries: { columns: COUNTRY_COLS, data: isOpen ? SHADOW_COUNTRIES : countryList, onClick: (c) => !isOpen && setSelCountry(c) }
    }[view];
    return config ? { ...config, sort: viewSorts[view] } : null;
  }, [view, eventType, viewSorts, list, courseList, cityList, countryList]);

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <NavBar theme={theme} setTheme={setTheme} view={view} setView={setView} />
      
      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} performanceData={eventType === 'all-time' ? atPerfs : opPerfs} onCourseClick={(name) => { setSel(null); setSelCourse(rawCourseList.find(c => c.name === name)); }} />
      <CourseModal isOpen={!!selCourse} onClose={() => setSelCourse(null)} course={selCourse} theme={theme} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => { setSelCourse(null); setSel(p); }} />
      <LocationModal isOpen={!!selCity} onClose={() => setSelCity(null)} data={selCity} type='city' theme={theme} courses={rawCourseList} onCourseClick={(c) => { setSelCity(null); setSelCourse(c); }} />
      <LocationModal isOpen={!!selCountry} onClose={() => setSelCountry(null)} data={selCountry} type='country' theme={theme} courses={rawCourseList} onCourseClick={(c) => { setSelCountry(null); setSelCourse(c); }} />
      
      <ControlBar view={view} eventType={eventType} setEventType={setEventType} gen={gen} setGen={setGen} search={search} setSearch={setSearch} theme={theme} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 flex-grow w-full relative">
        {view === 'hof' ? (<HallOfFame stats={hofStats} theme={theme} onPlayerClick={setSel} medalSort={viewSorts.hof} setMedalSort={handleSort} />) : (
          <div className={`border rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
            <div className="overflow-x-auto scrollbar-hide relative">
              {eventType === 'open' && (
                <div className={`absolute inset-0 z-10 flex flex-col items-center pt-16 sm:pt-32 p-4 sm:p-8 text-center bg-gradient-to-t pointer-events-none ${theme === 'dark' ? 'from-black/40 via-transparent to-transparent' : 'from-slate-300/40 via-transparent to-transparent'}`}>
                    <h4 className={`mb-4 sm:mb-8 text-[8px] sm:text-lg font-black uppercase tracking-[0.1em] sm:tracking-[0.3em] animate-subtle-pulse drop-shadow-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        THE 2026 ASR OPEN STARTS IN...
                    </h4>
                    <CountdownTimer targetDate={new Date('2026-03-01T00:00:00-10:00')} theme={theme} />
                </div>
              )}
              {currentView && (
                <DataTable 
                    isLocked={eventType === 'open'}
                    theme={theme}
                    columns={currentView.columns}
                    sort={currentView.sort}
                    onSort={handleSort}
                    data={currentView.data}
                    onRowClick={currentView.onClick}
                />
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);
root.render(<App />);

export default App;
