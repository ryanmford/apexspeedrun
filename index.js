import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client'; // <--- Ensure this is here

const CustomStyles = () => (
  <style>{`
    @keyframes subtlePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    .animate-subtle-pulse {
      animation: subtlePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .glow-gold { filter: drop-shadow(0 0 4px rgba(234, 179, 8, 0.6)); }
    .glow-silver { filter: drop-shadow(0 0 4px rgba(161, 161, 170, 0.5)); }
    .glow-bronze { filter: drop-shadow(0 0 4px rgba(206, 137, 70, 0.6)); }
    .glow-fire { filter: drop-shadow(0 0 5px rgba(249, 115, 22, 0.7)); }
    
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
    
    .stat-column { white-space: nowrap; }
    
    .table-fixed-layout {
      table-layout: fixed;
      width: 100%;
    }

    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `}</style>
);

// --- ICONS ---
const IconSpeed = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'skewX(-18deg)' }} className="overflow-visible">
    <path d="M3 19l6-7-6-7" opacity="0.2" />
    <path d="M9 19l6-7-6-7" opacity="0.5" />
    <path d="M15 19l6-7-6-7" />
  </svg>
);
const IconFlag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5c2.5-1.5 5.5 1.5 9 0s6.5-1.5 9 0v11c-2.5-1.5-5.5 1.5-9 0s-6.5-1.5-9 0V5z" />
  </svg>
);
const IconSearch = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-current"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconX = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconArrow = ({ direction }) => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconSun = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v20M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/><path d="M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const IconMoon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

const RankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = rank === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-[22px] h-[22px] sm:w-9 sm:h-9';
  const textClass = size === 'lg' ? 'text-[11px] sm:text-[13px]' : 'text-[7px] sm:text-[11px]';
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

// --- DATA TOOLS ---
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

  const ratingIdx = findIdx(['ovr', 'overall', 'rating']) !== -1 ? findIdx(['ovr', 'overall', 'rating']) : 3;
  const ptsIdx = findIdx(['pts', 'points', 'asr']) !== -1 ? findIdx(['pts', 'points', 'asr']) : 4;
  const runIdx = findIdx(['runs', 'totalruns', 'total', '#']) !== -1 ? findIdx(['runs', 'totalruns', 'total', '#']) : 5;
  const winIdx = findIdx(['wins', 'victories']) !== -1 ? findIdx(['wins', 'victories']) : 6;
  const setIdx = findIdx(['sets', 'total sets', ' s ']) !== -1 ? findIdx(['sets', 'total sets', ' s ']) : 7;
  const regIdx = findIdx(['flag', 'region', 'loc', 'nationality', 'country']);
  const cIdx = findIdx(['🪙', 'contribution']);
  const fireIdx = findIdx(['🔥', 'fire']);
  const nameIdx = Math.max(0, findIdx(['name', 'player', 'athlete']));

  return lines.slice(hIdx + 1).map((line, i) => {
    const vals = parseLine(line); 
    const pName = (vals[nameIdx] || "").trim();
    if (pName.length < 2) return null;
    return { 
      id: `${gender}-${normalizeName(pName)}-${i}`, 
      name: pName, 
      pKey: normalizeName(pName),
      gender, 
      rating: cleanNumeric(vals[ratingIdx]) || 0, 
      runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
      wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), 
      pts: cleanNumeric(vals[ptsIdx]) || 0, 
      sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
      region: regIdx !== -1 ? vals[regIdx] : "🏳️", 
      contributionScore: cleanNumeric(vals[cIdx]) || 0, 
      totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0
    };
  }).filter(p => p !== null);
};

const processSetListData = (csv) => {
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return {};
    const headers = parseLine(lines[0]);
    const courseIdx = headers.findIndex(h => /course|track/i.test(h)) !== -1 ? headers.findIndex(h => /course|track/i.test(h)) : 1;
    const dateIdx = 15;
    const map = {};
    lines.slice(1).forEach(l => {
        const vals = parseLine(l);
        const course = (vals[courseIdx] || "").trim().toUpperCase();
        const dateVal = vals[dateIdx] || "";
        if (course) map[course] = dateVal.includes('2026');
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
  const regionIdx = findIdx(['region', 'flag']);
  const tagIdx = findIdx(['tag', 'event', 'category']) !== -1 ? findIdx(['tag', 'event', 'category']) : 6;

  const allTimeAthleteBestTimes = {}; 
  const allTimeCourseLeaderboards = { M: {}, F: {} };
  const openAthleteBestTimes = {}; 
  const openCourseLeaderboards = { M: {}, F: {} }; 
  const openAthleteSetCount = {};
  const athleteRegionMap = {};
  const athleteDisplayNameMap = {};

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
    if (regionIdx !== -1 && !athleteRegionMap[pKey]) athleteRegionMap[pKey] = vals[regionIdx];

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
      if (courseSetMap[normalizedCourseName]) openAthleteSetCount[pKey] = (openAthleteSetCount[pKey] || 0) + 1;
    }
  });

  const getRecs = (lb) => {
    const r = {};
    Object.keys(lb).forEach(k => r[k] = Math.min(...Object.values(lb[k])));
    return r;
  };
  const atMRecs = getRecs(allTimeCourseLeaderboards['M']);
  const atFRecs = getRecs(allTimeCourseLeaderboards['F']);

  const buildPerfs = (source) => {
    const res = {};
    Object.keys(source).forEach(pKey => {
      const pGender = athleteMetadata[pKey]?.gender || 'M';
      res[pKey] = Object.entries(source[pKey]).map(([normL, data]) => {
        const board = allTimeCourseLeaderboards[pGender][normL] || {};
        const sorted = Object.entries(board).sort((a, b) => a[1] - b[1]);
        const rank = sorted.findIndex(e => e[0] === pKey) + 1;
        const record = (pGender === 'F' ? atFRecs[normL] : atMRecs[normL]) || data.num;
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
      id: `open-${pKey}`,
      name: athleteDisplayNameMap[pKey] || pKey,
      pKey, gender: pGender,
      rating: perfs.length > 0 ? (totalPts / perfs.length) : 0,
      runs: perfs.length,
      wins: perfs.filter(p => p.rank === 1).length,
      pts: totalPts, 
      sets: openAthleteSetCount[pKey] || 0,
      region: athleteMetadata[pKey]?.region || athleteRegionMap[pKey] || '🏳️',
      allTimeRank: athleteMetadata[pKey]?.allTimeRank || 9999
    };
  });

  return { allTimePerformances: buildPerfs(allTimeAthleteBestTimes), openPerformances: buildPerfs(openAthleteBestTimes), openRankings: openRankingArray };
};

// --- UI COMPONENTS ---
const PerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-fire" };
    return <span className={`inline-flex items-center gap-1 text-[11px] select-none ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const Modal = ({ isOpen, onClose, player: p, theme, performanceData }) => {
  if (!isOpen || !p) return null;
  const pKey = p.pKey || normalizeName(p.name);
  
  // Reverted Sorting Logic: Records first -> Fastest Record Time -> Points Descending
  const courseData = useMemo(() => {
    const base = (performanceData?.[pKey] || []);
    return [...base].sort((a, b) => {
      const aIsRecord = a.rank === 1;
      const bIsRecord = b.rank === 1;
      if (aIsRecord && !bIsRecord) return -1;
      if (!aIsRecord && bIsRecord) return 1;
      if (aIsRecord && bIsRecord) return a.num - b.num;
      return b.points - a.points;
    });
  }, [performanceData, pKey]);

  const getFires = (t, g) => g === 'M' ? (t < 7 ? 3 : t < 8 ? 2 : t < 9 ? 1 : 0) : (t < 9 ? 3 : t < 10 ? 2 : t < 11 ? 1 : 0);
  const totalFires = courseData.reduce((acc, c) => acc + getFires(c.num, p.gender), 0);

  const stats = [
    { l: 'OVR', v: (p.rating || 0).toFixed(2), c: 'text-blue-500' }, 
    { l: 'RUNS', v: p.runs || 0 }, { l: 'POINTS', v: Math.floor(p.pts || 0) }, 
    { l: '🪙', v: p.contributionScore || 0, g: 'glow-gold' }, 
    { l: 'WIN %', v: typeof p.winPct === 'string' ? p.winPct : ((p.wins / (p.runs || 1)) * 100).toFixed(1) + '%' }, 
    { l: 'WINS', v: p.wins || 0 }, { l: 'SETS', v: p.sets || 0 }, 
    { l: '🔥', v: totalFires, g: 'glow-fire' }
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
                <span className="shrink-0">{p.region || '🏳️'}</span>
                <h2 className="font-black tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</h2>
              </div>
            </div>
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] mb-2 ${s.g || ''} ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{s.l}</span>
                <span className={`text-base sm:text-xl font-mono font-black ${s.c || ''}`}>{s.v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {courseData.map((c, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
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
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold -mt-1 opacity-70">{c.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('all-time');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [sort, setSort] = useState({ key: 'rating', direction: 'descending' });
  const [load, setLoad] = useState(false);
  const [data, setData] = useState([]);
  const [openData, setOpenData] = useState([]);
  const [atPerfs, setAtPerfs] = useState({});
  const [opPerfs, setOpPerfs] = useState({});

  const fetchFromSheet = useCallback(async () => {
    setLoad(true);
    const getCsv = (q) => `https://docs.google.com/spreadsheets/d/1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4/gviz/tq?tqx=out:csv&${q}&t=${Date.now()}`;
    try {
      const [rM, rF, rLive, rSet] = await Promise.all([
        fetch(getCsv('sheet=RANKINGS (M)')).then(r => r.text()),
        fetch(getCsv('sheet=RANKINGS (F)')).then(r => r.text()),
        fetch(getCsv('gid=623600169')).then(r => r.text()),
        fetch(getCsv('gid=1961325686')).then(r => r.text())
      ]);
      const athleteMetadata = {};
      const pM = processRankingData(rM, 'M');
      const pF = processRankingData(rF, 'F');
      pM.forEach((p, i) => athleteMetadata[p.pKey] = { ...p, gender: 'M', allTimeRank: i + 1 });
      pF.forEach((p, i) => athleteMetadata[p.pKey] = { ...p, gender: 'F', allTimeRank: i + 1 });
      const { allTimePerformances, openPerformances, openRankings } = processLiveFeedData(rLive, athleteMetadata, processSetListData(rSet));
      setData([...pM, ...pF]); setOpenData(openRankings); setAtPerfs(allTimePerformances); setOpPerfs(openPerformances);
    } catch(e) {
      console.error("Data fetch failed:", e);
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { fetchFromSheet(); }, [fetchFromSheet]);

  const list = useMemo(() => {
    const src = eventType === 'all-time' ? data : openData;
    const filtered = src.filter(p => p.gender === gen && (p.name.toLowerCase().includes(search.toLowerCase()) || p.region.toLowerCase().includes(search.toLowerCase())));
    const isQual = (p) => eventType === 'open' ? p.runs >= 2 : (p.gender === 'M' ? p.runs >= 4 : p.runs >= 2);
    let qual = filtered.filter(isQual), unranked = filtered.filter(p => !isQual(p));
    
    const dir = sort.direction === 'ascending' ? 1 : -1;
    qual.sort((a, b) => {
      const aVal = a[sort.key] || 0;
      const bVal = b[sort.key] || 0;
      if (aVal !== bVal) return (aVal - bVal) * dir;
      return (b.rating - a.rating);
    });

    unranked.sort((a, b) => b.runs - a.runs || b.rating - a.rating);
    return [...qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true })), ...unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }))];
  }, [search, sort, gen, eventType, data, openData]);

  const HeaderComp = ({ l, k, a = 'left', w = "" }) => (
    <th className={`${w} px-2 py-5 cursor-pointer group select-none transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-300/30'} ${a === 'right' ? 'text-right' : 'text-left'}`} onClick={() => setSort(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-1 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase tracking-[0.1em] text-[7px] sm:text-[10px] font-black">{l}</span>
        <div className={`transition-opacity ${sort.key === k ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}><IconArrow direction={sort.key === k ? sort.direction : 'descending'} /></div>
      </div>
    </th>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-16 flex items-center justify-between px-3 sm:px-8 gap-3 sm:gap-6 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}><IconSpeed /></div>
          <span className="font-black tracking-tighter text-lg sm:text-2xl uppercase italic leading-none transition-all">
            <span className="sm:hidden">ASR</span>
            <span className="hidden sm:inline">APEX SPEED RUN</span>
          </span>
        </div>
        
        {/* REORDERED TOGGLES */}
        <div className={`flex items-center p-1 rounded-2xl border ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
          <div className="flex">
            {[{id:'all-time',l:'ALL-TIME',s:'ALL-TIME'},{id:'open',l:'OPEN',s:'OPEN'}].map(ev => (
              <button key={ev.id} onClick={() => setEventType(ev.id)} className={`px-2.5 sm:px-5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${eventType === ev.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className="sm:hidden">{ev.s}</span>
                <span className="hidden sm:inline">{ev.l}</span>
              </button>
            ))}
          </div>
          <div className={`w-[1px] h-6 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-400/30'} mx-2`} />
          <div className="flex">
            {['M', 'F'].map(g => (
              <button key={g} onClick={() => setGen(g)} className={`px-2.5 sm:px-5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${gen === g ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className="sm:hidden">{g}</span>
                <span className="hidden sm:inline">{g === 'M' ? 'MEN' : 'WOMEN'}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-10 h-10 flex items-center justify-center border rounded-2xl transition-all shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600'}`}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </nav>

      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} performanceData={eventType === 'all-time' ? atPerfs : opPerfs} />

      <header className={`pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col gap-6 sm:gap-10 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
        <div className="flex flex-row items-center w-full gap-4 sm:gap-8 overflow-hidden">
          <div className="w-1/2 min-w-0">
            <h1 className={`font-black tracking-tighter uppercase leading-none whitespace-nowrap overflow-hidden transition-all ${theme === 'dark' ? 'text-white' : 'text-black'} text-[6.2vw] sm:text-[5.5vw] lg:text-[6vw] xl:text-[76px]`}>
              {eventType === 'all-time' ? 'ASR ALL-TIME' : '2026 ASR OPEN'}
            </h1>
          </div>
          <div className="w-1/2 flex justify-end min-w-0">
            <div className="w-full relative group">
              <div className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-500`}><IconSearch size={14} /></div>
              <input 
                type="text" 
                placeholder="" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className={`rounded-xl sm:rounded-2xl pl-9 sm:pl-11 pr-3 sm:pr-5 py-2.5 sm:py-4 w-full text-[12px] sm:text-[14px] font-medium outline-none transition-all border ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-white focus:bg-white/[0.07] focus:border-white/10 shadow-2xl' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500/30 shadow-lg'}`} 
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-1 sm:px-8 flex-grow w-full">
        <div className={`border rounded-3xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
          <div className="overflow-x-auto no-scrollbar">
            <table className="table-fixed-layout text-left border-collapse">
              <thead>
                <tr className={`border-b text-[8px] sm:text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                  <th className="pl-3 sm:pl-8 py-5 text-left w-[45px] sm:w-[90px]">RANK</th>
                  <th className="px-1 py-5 text-center w-[35px] sm:w-[50px]"><div className="flex justify-center items-center opacity-60"><IconFlag /></div></th>
                  {/* Renamed Column to NAME */}
                  <th className="px-2 py-5 text-left w-auto">NAME</th>
                  <HeaderComp l="OVR" k="rating" a="right" w="w-[50px] sm:w-[90px]" />
                  <HeaderComp l="RUNS" k="runs" a="right" w="w-[45px] sm:w-[75px]" />
                  <HeaderComp l="WINS" k="wins" a="right" w="w-[45px] sm:w-[75px]" />
                  <HeaderComp l="SETS" k="sets" a="right" w="w-[45px] sm:pr-8 sm:w-[90px]" />
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                {list.length > 0 ? (
                  list.map((p, idx) => (
                    <React.Fragment key={p.id}>
                      {idx > 0 && !p.isQualified && list[idx-1].isQualified && (
                        <tr className={`${theme === 'dark' ? 'bg-white/[0.02]' : 'bg-slate-200/50'} border-y-2 border-dashed ${theme === 'dark' ? 'border-white/10' : 'border-slate-400/30'}`}>
                          <td colSpan="7" className="py-6 text-center"><span className="text-[9px] font-black uppercase tracking-[0.2em] italic opacity-40">RUN {eventType === 'open' ? '2+' : (gen === 'M' ? '4+' : '2+')} COURSES TO GET RANKED</span></td>
                        </tr>
                      )}
                      <tr onClick={() => setSel(p)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${!p.isQualified ? 'opacity-40' : ''}`}>
                        <td className="pl-3 sm:pl-8 py-4 sm:py-6"><RankBadge rank={p.currentRank} theme={theme} /></td>
                        {/* Stacking Flags Vertically */}
                        <td className="px-1 py-4 sm:py-6 text-center">
                          <div className="flex flex-col items-center justify-center leading-[0.9] gap-0.5">
                            <span className="text-base sm:text-2xl inline-block max-w-[1.2em] break-all text-center">
                              {p.region || '🏳️'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-4 sm:py-6 text-left"><div className="text-[9px] sm:text-[15px] font-bold pr-1 break-words">{p.name}</div></td>
                        <td className="px-1 py-4 sm:py-6 text-right font-bold text-[9px] sm:text-[15px] tabular-nums text-blue-500">{(p.rating || 0).toFixed(2)}</td>
                        <td className="px-1 py-4 sm:py-6 text-right font-bold text-[9px] sm:text-[15px] tabular-nums">{p.runs}</td>
                        <td className="px-1 py-4 sm:py-6 text-right font-bold text-[9px] sm:text-[15px] tabular-nums">{p.wins}</td>
                        <td className="px-1 pr-3 sm:pr-8 py-4 sm:py-6 text-right font-bold text-[9px] sm:text-[15px] tabular-nums">{p.sets}</td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <div className="animate-spin text-blue-500"><IconSpeed /></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Syncing Leaderboard Data...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <footer className="mt-24 text-center pb-24 opacity-20 font-black uppercase tracking-[0.8em] text-[10px]">FINDING THE FASTEST IN THE REAL WORLD 🔥</footer>
    </div>
  );
}

export default App;
export default App;
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
