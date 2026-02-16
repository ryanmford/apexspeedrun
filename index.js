import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client'; // <--- Ensure this is here

/**
 * APEX SPEED RUN - ALL-TIME RANKINGS
 * Features: 
 * - v10.4 Icon Sync: Restored custom SVG flag symbol to match theme toggle style.
 * - v10.2 Header Alignment: Optimized mobile scale and baseline alignment for title/search.
 * - v10.1 Header Scale: Increased title font size to fill more usable space on all devices.
 * - v9.8 Universal Layout: Forced 2-line title and side-by-side search bar for both Mobile and Laptop.
 */

// --- GLOBAL UI REFINEMENTS ---
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
    html { scroll-behavior: smooth; overflow-x: hidden; }
    body { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; width: 100%; overflow-x: hidden; }
    
    .stat-column { white-space: nowrap; min-width: 60px; }
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
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500/60"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconX = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconArrow = ({ direction }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconSun = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v20M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/><path d="M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const IconMoon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

const RankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = rank === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-8 h-8 sm:w-10 sm:h-10';
  const textClass = size === 'lg' ? 'text-[11px] sm:text-[13px]' : 'text-[10px] sm:text-[12px]';
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
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-500 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[3px] animate-subtle-pulse' : isUnranked ? 'border' : 'border-0'}`}>
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
  return (isNaN(num) || num <= 0) ? null : num;
};

// --- DATA HUB ENGINE ---
const processRankingData = (csv, gender) => {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const hIdx = lines.findIndex(l => {
    const low = l.toLowerCase();
    return low.includes('name') || low.includes('player') || low.includes('athlete');
  }); 
  if (hIdx === -1) return [];

  const rHeaders = parseLine(lines[hIdx]); 
  const findIdx = (keys) => rHeaders.findIndex(h => keys.some(k => {
    const header = h.toLowerCase().trim();
    return header === k || header.includes(k);
  }));

  let ratingIdx = findIdx(['ovr', 'overall', 'rating']);
  if (ratingIdx === -1) ratingIdx = 3;
  let ptsIdx = findIdx(['pts', 'points', 'asr', 'as points']);
  if (ptsIdx === -1) ptsIdx = 4;
  let runIdx = findIdx(['runs', 'totalruns', 'total', '#']);
  if (runIdx === -1) runIdx = 5; 
  let winIdx = findIdx(['wins', 'victories', 'winner']);
  if (winIdx === -1) winIdx = 6;
  
  let setIdx = findIdx(['sets', 'total sets', 'played', 'sets played', 'set count', ' s ']);
  if (setIdx === -1) setIdx = 7;

  const regIdx = findIdx(['flag', 'region', 'loc', 'nationality', 'country']);
  const cIdx = findIdx(['🪙', 'contribution', 'star']);
  const wPctIdx = findIdx(['win %', 'win%', 'wpct']);
  const fireIdx = findIdx(['🔥', 'fire', 'total fire']);
  const nameIdx = Math.max(0, findIdx(['name', 'player', 'athlete']));

  return lines.slice(hIdx + 1).map((line, i) => {
    const vals = parseLine(line); 
    const pName = vals[nameIdx] || "";
    if (pName.length < 2) return null;
    const pKey = normalizeName(pName);

    return { 
      id: `${gender}-${pKey}-${i}`, 
      name: pName, 
      pKey,
      gender, 
      rating: cleanNumeric(vals[ratingIdx]) || 0, 
      runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
      wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), 
      pts: cleanNumeric(vals[ptsIdx]) || 0, 
      sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
      winPct: wPctIdx !== -1 ? vals[wPctIdx] : "0.00%", 
      region: regIdx !== -1 ? vals[regIdx] : "", 
      contributionScore: cleanNumeric(vals[cIdx]) || 0, 
      totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0
    };
  }).filter(p => p !== null);
};

const processLiveFeedData = (csv, masterRegistry = {}) => {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return {};

  let headers = [];
  let hIdx = -1;
  for(let i=0; i<Math.min(10, lines.length); i++) {
    const tempHeaders = parseLine(lines[i]);
    if (tempHeaders.some(h => /athlete|name|course|track|pb|result/i.test(h))) {
        headers = tempHeaders;
        hIdx = i;
        break;
    }
  }

  const findIdx = (keys) => headers.findIndex(h => keys.some(k => h.toLowerCase().includes(k)));
  
  const athleteIdx = findIdx(['athlete', 'name', 'player']) !== -1 ? findIdx(['athlete', 'name', 'player']) : 1;
  const courseIdx = findIdx(['course', 'track', 'level', 'map']) !== -1 ? findIdx(['course', 'track', 'level', 'map']) : 2;
  const resultIdx = findIdx(['result', 'time', 'pb', 'score']) !== -1 ? findIdx(['result', 'time', 'pb', 'score']) : 3;
  const genderIdx = findIdx(['div', 'gender', 'sex']) !== -1 ? findIdx(['div', 'gender', 'sex']) : 4;

  const athleteBestTimes = {}; 
  const athleteGenderMap = { ...masterRegistry }; 
  const courseLeaderboards = { M: {}, F: {} }; 

  lines.slice(hIdx + 1).forEach(line => {
    const vals = parseLine(line);
    const pName = (vals[athleteIdx] || "").trim();
    const rawGender = (vals[genderIdx] || "").toUpperCase().trim();
    if (!pName) return;
    const pKey = normalizeName(pName);
    if (!athleteGenderMap[pKey] && rawGender) {
        if (rawGender.startsWith('F')) athleteGenderMap[pKey] = 'F';
        else if (rawGender.startsWith('M')) athleteGenderMap[pKey] = 'M';
    }
  });

  lines.slice(hIdx + 1).forEach(line => {
    const vals = parseLine(line);
    const pName = (vals[athleteIdx] || "").trim();
    const rawCourse = (vals[courseIdx] || "").trim();
    const resultVal = vals[resultIdx];
    const numericValue = cleanNumeric(resultVal);

    if (!pName || !rawCourse || numericValue === null) return;
    
    const pKey = normalizeName(pName);
    const normalizedCourseName = rawCourse.toUpperCase();
    const pGender = athleteGenderMap[pKey] || 'M';

    if (!athleteBestTimes[pKey]) athleteBestTimes[pKey] = {};

    if (!athleteBestTimes[pKey][normalizedCourseName] || numericValue < athleteBestTimes[pKey][normalizedCourseName].num) {
      athleteBestTimes[pKey][normalizedCourseName] = { 
        label: rawCourse, 
        value: String(resultVal), 
        num: numericValue 
      };
    }

    if (!courseLeaderboards[pGender][normalizedCourseName]) courseLeaderboards[pGender][normalizedCourseName] = {};
    if (!courseLeaderboards[pGender][normalizedCourseName][pKey] || numericValue < courseLeaderboards[pGender][normalizedCourseName][pKey]) {
        courseLeaderboards[pGender][normalizedCourseName][pKey] = numericValue;
    }
  });

  const maleCourseRecords = {};
  Object.keys(courseLeaderboards['M']).forEach(courseKey => {
    const times = Object.values(courseLeaderboards['M'][courseKey]);
    if (times.length > 0) maleCourseRecords[courseKey] = Math.min(...times);
  });

  const finalMap = {};
  Object.keys(athleteBestTimes).forEach(pKey => {
    const pGender = athleteGenderMap[pKey] || 'M';
    
    finalMap[pKey] = Object.entries(athleteBestTimes[pKey]).map(([normLabel, data]) => {
      const board = courseLeaderboards[pGender][normLabel] || {};
      const sortedBoard = Object.entries(board)
        .filter(entry => entry[1] > 0)
        .sort((a, b) => a[1] - b[1]); 
        
      const rankWithinGender = sortedBoard.findIndex(e => e[0] === pKey) + 1;
      
      const maleRecord = maleCourseRecords[normLabel] || data.num; 
      const calculatedPoints = (maleRecord / data.num) * 100;
      
      return { 
          label: data.label, 
          value: data.value, 
          num: data.num, 
          rank: rankWithinGender,
          points: calculatedPoints
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  });

  return finalMap;
};

// --- UI COMPONENTS ---
const PerformanceBadge = ({ type, count = 1 }) => {
    const badges = {
        1: { icon: "🥇", glow: "glow-gold", label: "Gold" },
        2: { icon: "🥈", glow: "glow-silver", label: "Silver" },
        3: { icon: "🥉", glow: "glow-bronze", label: "Bronze" },
        fire: { icon: "🔥", glow: "glow-fire", label: "Fire" }
    };
    const b = badges[type];
    if (!b) return null;
    
    return (
        <span className={`inline-flex items-center gap-1 text-[11px] select-none ${b.glow}`} title={b.label}>
            {Array.from({ length: count }).map((_, i) => (
                <span key={i}>{b.icon}</span>
            ))}
        </span>
    );
};

const Modal = ({ isOpen, onClose, player: p, theme, performances }) => {
  if (!isOpen || !p) return null;
  
  const pKey = p.pKey || normalizeName(p.name);
  const courseData = performances?.[pKey] || [];

  const getFireCount = (time, gender) => {
    if (gender === 'M') {
      if (time < 7) return 3;
      if (time < 8) return 2;
      if (time < 9) return 1;
    } else {
      if (time < 9) return 3;
      if (time < 10) return 2;
      if (time < 11) return 1;
    }
    return 0;
  };

  const totalFiresEarned = courseData.reduce((acc, course) => acc + getFireCount(course.num, p.gender), 0);

  const stats = [
    { l: 'OVR', v: (p.rating || 0).toFixed(2), c: theme === 'dark' ? 'text-blue-400' : 'text-blue-500' }, 
    { l: 'RUNS', v: p.runs || 0, c: theme === 'dark' ? 'text-white' : 'text-slate-900' }, 
    { l: 'POINTS', v: Math.floor(p.pts || 0), c: theme === 'dark' ? 'text-white' : 'text-slate-900' }, 
    { l: '🪙', v: p.contributionScore || 0, c: theme === 'dark' ? 'text-white' : 'text-slate-900', g: 'glow-gold' }, 
    { l: 'WIN %', v: p.winPct.replace('%', ''), c: theme === 'dark' ? 'text-white' : 'text-slate-900' }, 
    { l: 'WINS', v: p.wins || 0, c: theme === 'dark' ? 'text-white' : 'text-slate-900' }, 
    { l: 'SETS', v: p.sets || 0, c: theme === 'dark' ? 'text-white' : 'text-slate-900' }, 
    { l: '🔥', v: totalFiresEarned, c: theme === 'dark' ? 'text-white' : 'text-slate-900', g: 'glow-fire' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 relative h-28 sm:h-40 p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30 via-slate-700/10 to-transparent' : 'from-slate-400/40 via-slate-300/20 to-transparent'}`}>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white z-[110] transition-colors">
            <IconX />
          </button>
          <div className="flex items-center gap-4 sm:gap-8 min-w-0 w-full pr-12">
            <div className={`w-14 h-14 sm:w-24 sm:h-24 rounded-xl sm:rounded-3xl border flex items-center justify-center text-lg sm:text-3xl font-black shadow-xl shrink-0 uppercase tracking-tighter ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>
              {getInitials(p.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl sm:text-4xl leading-tight flex items-center gap-2 min-w-0 w-full">
                <span className="shrink-0">{p.region || '🏳️'}</span>
                <h2 className={`font-black tracking-tight whitespace-nowrap ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</h2>
              </div>
            </div>
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-10 pb-16 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl transition-all duration-500 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:shadow-md'}`}>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] mb-2 ${s.g || ''} ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{s.l}</span>
                <span className={`text-base sm:text-xl font-mono font-black ${s.c}`}>{s.v}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {courseData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {courseData.map((course, i) => {
                  const fires = getFireCount(course.num, p.gender);
                  return (
                    <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                      <div className="flex flex-col">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{course.label}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                              {course.rank > 0 && course.rank <= 3 && <PerformanceBadge type={course.rank} />}
                              {fires > 0 && <PerformanceBadge type="fire" count={fires} />}
                          </div>
                      </div>
                      <div className="flex flex-col items-end">
                          <span className={`text-xs sm:text-lg font-mono font-black ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                              {(course.points || 0).toFixed(2)}
                          </span>
                          <span className={`text-[9px] sm:text-[10px] font-mono font-bold -mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                              {course.value}
                          </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-10 text-center border-2 border-dashed rounded-3xl ${theme === 'dark' ? 'border-white/5 text-slate-600' : 'border-slate-300 text-slate-400'} text-[10px] font-black uppercase tracking-[0.2em] italic`}>
                No Historical Data Found
              </div>
            )}
          </div>

          <div className="text-center pt-4 opacity-40 italic text-[10px] font-bold uppercase tracking-widest">
              ASR Historical Sync v8.7
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState(null);
  const [sort, setSort] = useState({ key: 'rating', direction: 'descending' });
  const [load, setLoad] = useState(false);
  const [sync, setSync] = useState(null);
  const [err, setErr] = useState(null);
  const [data, setData] = useState([]);
  const [performances, setPerformances] = useState({});

  const SHEET_ID = '1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4';
  const LIVE_FEED_GID = '623600169';

  const fetchFromSheet = useCallback(async () => {
    setLoad(true); setErr(null);
    const getUrl = (name) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&t=${Date.now()}`;
    const getGidUrl = (gid) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&t=${Date.now()}`;
    
    try {
      const [rM, rF, rLive] = await Promise.all([
        fetch(getUrl('RANKINGS (M)')).then(r => r.ok ? r.text() : null),
        fetch(getUrl('RANKINGS (F)')).then(r => r.ok ? r.text() : null),
        fetch(getGidUrl(LIVE_FEED_GID)).then(r => r.ok ? r.text() : null)
      ]);

      if (!rM && !rF) throw new Error("Connection failed.");

      let combined = [];
      const masterRegistry = {}; 

      if (rM) {
        const processedM = processRankingData(rM, 'M');
        combined = [...combined, ...processedM];
        processedM.forEach(p => { masterRegistry[p.pKey] = 'M'; });
      }
      if (rF) {
        const processedF = processRankingData(rF, 'F');
        combined = [...combined, ...processedF];
        processedF.forEach(p => { masterRegistry[p.pKey] = 'F'; });
      }
      
      if (rLive) setPerformances(processLiveFeedData(rLive, masterRegistry));
      
      setData(combined);
      setSync(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));
    } catch(e) { 
      setErr("Sync Error"); 
    } finally { 
      setLoad(false); 
    }
  }, []);

  useEffect(() => { fetchFromSheet(); }, [fetchFromSheet]);

  const list = useMemo(() => {
    const M_REQ = 4;
    const F_REQ = 2;

    let filtered = data.filter(p => p.gender === gen && (
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.region.toLowerCase().includes(search.toLowerCase())
    ));

    const checkQualified = (p) => p.gender === 'M' ? p.runs >= M_REQ : p.runs >= F_REQ;

    let qualified = filtered.filter(checkQualified);
    let unranked = filtered.filter(p => !checkQualified(p));

    const tierSort = (arr) => {
      if (sort.key) {
        arr.sort((a, b) => { 
          let vA = a[sort.key], vB = b[sort.key]; 
          if (typeof vA === 'number') return sort.direction === 'ascending' ? vA - vB : vB - vA; 
          return sort.direction === 'ascending' ? (String(vA) < String(vB) ? -1 : 1) : (String(vA) > String(vB) ? -1 : 1); 
        });
      }
      return arr;
    };

    qualified = tierSort(qualified).map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true }));
    unranked = tierSort(unranked).map(p => ({ ...p, currentRank: "UR", isQualified: false }));

    return [...qualified, ...unranked];
  }, [search, sort, gen, data]);

  const HeaderComp = ({ l, k, a = 'left', hideOnMobile = false, widthClass = "" }) => (
    <th className={`${widthClass} px-2 sm:px-3 md:px-4 py-5 cursor-pointer group select-none transition-colors ${hideOnMobile ? 'hidden md:table-cell' : ''} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-300/30'} ${a === 'right' ? 'text-right' : 'text-left'}`} onClick={() => setSort(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-1.5 h-full ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase tracking-[0.15em] text-[9px] sm:text-[10px] font-black whitespace-nowrap leading-tight">{l}</span>
        <div className={`transition-opacity duration-500 shrink-0 ${sort.key === k ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : 'opacity-0 group-hover:opacity-40'}`}><IconArrow direction={sort.key === k ? sort.direction : 'descending'} /></div>
      </div>
    </th>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-16 flex items-center justify-between px-3 sm:px-8 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-2 shrink-0 mr-1 overflow-hidden">
          <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}><IconSpeed /></div>
          <span className={`font-black tracking-tighter text-base sm:text-2xl uppercase italic underline decoration-blue-500/20 whitespace-nowrap leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Apex Speed Run</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className={`flex rounded-xl p-0.5 sm:p-1 border ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
            {['M', 'F'].map(g => (<button key={g} onClick={() => setGen(g)} className={`px-2 sm:px-6 py-1 sm:py-2 rounded-lg text-[9px] sm:text-[11px] font-black transition-all ${gen === g ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>{g === 'M' ? 'M' : 'W'}<span className="hidden sm:inline">{g === 'M' ? 'EN' : 'OMEN'}</span></button>))}
          </div>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center border rounded-xl transition-all active:scale-90 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400 hover:text-blue-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600 hover:text-blue-600 shadow-sm'}`}>{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
        </div>
      </nav>

      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} performances={performances} />

      <header className={`pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-row items-end justify-between gap-3 sm:gap-6 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
        <div className="space-y-2 sm:space-y-3 w-1/2">
          <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-full border text-[8px] sm:text-[9px] font-bold uppercase tracking-widest w-fit ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 'bg-blue-500/10 text-blue-500 border-blue-500/10'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${load ? 'bg-blue-400 animate-pulse' : err ? 'bg-red-500' : 'bg-green-500'}`} />
            {load ? `SCAN...` : err || `LIVE: ${sync || 'OK'}`}
          </div>
          <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-black tracking-tighter uppercase leading-[0.8] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            All-Time <br /> Rankings
          </h1>
        </div>
        <div className="relative group w-1/2 shrink-0 mb-[-1px] sm:mb-0">
          <div className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 scale-90 sm:scale-100"><IconSearch /></div>
          <input 
            type="text" 
            placeholder="Search athletes..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className={`border rounded-xl sm:rounded-2xl pl-10 sm:pl-11 pr-3 sm:pr-4 py-3 sm:py-4 w-full text-xs sm:text-base font-bold placeholder:text-slate-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white shadow-2xl' : 'bg-white border-slate-300 text-slate-900 shadow-sm'}`} 
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-1 sm:px-8 flex-grow w-full overflow-hidden">
        <div className={`border overflow-hidden rounded-[1.5rem] sm:rounded-[3rem] shadow-2xl ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className={`border-b text-[9px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                <th className="px-2 sm:px-3 md:px-4 py-5 text-left w-12 sm:w-20 lg:w-24">RANK</th>
                <th className="px-0 py-5 text-center w-10 sm:w-16 lg:w-20">
                  <div className="flex justify-center items-center opacity-60">
                    <IconFlag />
                  </div>
                </th>
                <th className="px-2 sm:px-3 md:px-4 py-5 text-left min-w-[120px]">ATHLETE</th>
                <HeaderComp l="OVR" k="rating" a="right" />
                <HeaderComp l="RUNS" k="runs" a="right" hideOnMobile />
                <HeaderComp l="WINS" k="wins" a="right" hideOnMobile />
                <HeaderComp l="SETS" k="sets" a="right" hideOnMobile />
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {list.map(p => (
                <tr key={p.id} onClick={() => setSel(p)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${!p.isQualified ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                  <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4"><RankBadge rank={p.currentRank} theme={theme} /></td>
                  <td className="px-0 py-3 sm:py-4 text-center"><span className="text-sm sm:text-lg leading-none">{p.region || '🏳️'}</span></td>
                  <td className="px-2 sm:px-3 md:px-4 py-3 sm:py-4 text-left">
                    <div className={`text-xs sm:text-lg font-bold whitespace-nowrap leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</div>
                    <div className="flex md:hidden items-center gap-1 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase ${theme === 'dark' ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>R:{p.runs}</span>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase ${theme === 'dark' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-yellow-100 text-yellow-700'}`}>W:{p.wins}</span>
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>S:{p.sets}</span>
                    </div>
                  </td>
                  <td className={`px-2 sm:px-3 md:px-4 py-3 sm:py-4 text-right font-bold text-xs sm:text-lg tabular-nums stat-column ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>{ (p.rating || 0).toFixed(2) }</td>
                  <td className={`hidden md:table-cell px-3 md:px-4 py-4 text-right font-bold text-sm sm:text-lg tabular-nums stat-column ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.runs}</td>
                  <td className={`hidden md:table-cell px-3 md:px-4 py-4 text-right font-bold text-sm sm:text-lg tabular-nums stat-column ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.wins}</td>
                  <td className={`hidden md:table-cell px-3 md:px-4 py-4 text-right font-bold text-sm sm:text-lg tabular-nums stat-column ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.sets}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && !load && (
            <div className="py-40 text-center text-slate-500 uppercase font-black text-[10px] tracking-[0.4em] italic opacity-30">No Data Detected</div>
          )}
        </div>
      </main>
      <footer className="mt-16 text-center pb-16 opacity-20"><p className="text-[10px] font-black uppercase tracking-[0.8em]">APEX SPEED RUN</p></footer>
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
