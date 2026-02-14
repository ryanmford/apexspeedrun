/**
 * APEX SPEED RUN (ASR) - ALL-TIME RANKINGS
 * Version: 2.1.0
 * Description: High-performance React leaderboard fetching live data from Google Sheets.
 * Features: Mobile-responsive, Dark/Light mode, Fire protocol, & Advanced sorting.
 * Author: Ryan Ford (Apex School of Movement)
 * Website: apexmovement.com
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
// ... rest of your imports
const CustomStyles = () => (
  <style>{`
    @keyframes subtlePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }
    .animate-subtle-pulse {
      animation: subtlePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    /* Snappy scrollbar and text rendering optimizations */
    ::-webkit-scrollbar {
      display: none;
    }
    * {
      -ms-overflow-style: none;
      scrollbar-width: none;
      -webkit-tap-highlight-color: transparent;
    }
    html {
      scroll-behavior: smooth;
      overflow-x: hidden;
    }
    body {
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
  `}</style>
);

// --- FIRE CALCULATION PROTOCOL ---
const getFireCount = (time, gender) => {
  const t = parseFloat(time);
  if (isNaN(t)) return 0;
  const limits = gender === 'F' ? [9.0, 10.0, 11.0] : [7.0, 8.0, 9.0];
  if (t < limits[0]) return 3;
  if (t < limits[1]) return 2;
  if (t < limits[2]) return 1;
  return 0;
};

// --- ICONS & VISUAL ASSETS ---
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

const FireIcons = ({ time, gender }) => {
  const fireCount = getFireCount(time, gender);
  if (fireCount === 0) return null;
  return (
    <span className="inline-flex gap-0.5 animate-subtle-pulse drop-shadow-[0_0_3px_rgba(249,115,22,0.6)]">
      {Array(fireCount).fill("🔥").map((f, i) => <span key={i}>{f}</span>)}
    </span>
  );
};

// --- UNIFIED RANK BADGE COMPONENT ---
const RankBadge = ({ rank, theme, size = 'md' }) => {
  const rankNum = rank === "-" ? "?" : rank;
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-8 h-8 sm:w-10 sm:h-10';
  const textClass = size === 'lg' ? 'text-[11px] sm:text-[13px]' : 'text-[10px] sm:text-[12px]';
  const isPodium = rank === 1 || rank === 2 || rank === 3;

  const styles = {
    1: {
      bg: 'bg-transparent',
      border: theme === 'dark' ? 'border-yellow-500' : 'border-yellow-600',
      text: theme === 'dark' ? 'text-yellow-500' : 'text-yellow-700',
      glow: theme === 'dark' ? 'shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'shadow-[0_0_12px_rgba(202,138,4,0.3)]'
    },
    2: {
      bg: 'bg-transparent',
      border: theme === 'dark' ? 'border-zinc-400' : 'border-zinc-500',
      text: theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600',
      glow: theme === 'dark' ? 'shadow-[0_0_15px_rgba(161,161,170,0.25)]' : 'shadow-[0_0_12px_rgba(113,113,122,0.2)]'
    },
    3: {
      bg: 'bg-transparent',
      border: 'border-[#CE8946]',
      text: 'text-[#CE8946]',
      glow: theme === 'dark' ? 'shadow-[0_0_15px_rgba(206,137,70,0.3)]' : 'shadow-[0_0_12px_rgba(206,137,70,0.25)]'
    },
    default: {
      bg: 'bg-transparent',
      border: 'border-transparent',
      text: theme === 'dark' ? 'text-white' : 'text-black',
      glow: 'shadow-none' 
    }
  };

  const current = styles[rank] || styles.default;

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-500 ${dim} ${textClass} ${current.bg} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[3px] animate-subtle-pulse' : 'border-0'}`}>
      {rankNum}
    </span>
  );
};

// --- DATA PARSING UTILITIES ---
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
const cleanNumeric = (v) => (!v || v === "" || String(v).includes("#")) ? 0 : (parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0);

const formatSeconds = (val) => {
  if (!val || String(val).includes("#") || String(val).includes("-") || String(val) === "0") return null;
  let s = String(val); 
  if (s.includes(':')) { 
    const p = s.split(':'); 
    s = p[p.length - 1]; 
  }
  const n = parseFloat(s.replace(/[^\d.-]/g, '')); 
  return (isNaN(n) || n === 0) ? null : n.toFixed(2);
};

// --- RANKING ENGINE ---
const processRankingData = (csv, gender, courseIndices) => {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  const hIdx = lines.findIndex(l => l.toLowerCase().includes('name')); 
  if (hIdx === -1) return [];

  const rHeaders = parseLine(lines[hIdx]); 
  const headers = rHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  
  const cIdx = rHeaders.findIndex(h => h.includes('🪙') || h.toLowerCase().includes('contribution') || h.toLowerCase().includes('star'));
  const wIdx = rHeaders.findIndex(h => h.toLowerCase().includes('win %') || h.toLowerCase().includes('win%') || h.toLowerCase().includes('wpct'));
  const ptsIdx = rHeaders.findIndex(h => ['pts', 'points', 'asr'].some(k => h.toLowerCase().includes(k)));
  const regIdx = rHeaders.findIndex(h => ['flag', 'region', 'loc', 'nationality', 'country', 'city'].some(k => h.toLowerCase().includes(k)));
  const setIdx = rHeaders.findIndex(h => ['sets', 'totalsets', 'played', 'setcount'].some(k => h.toLowerCase().includes(k)));

  return lines.slice(hIdx + 1).map((line, i) => {
    const vals = parseLine(line); 
    const rData = {}; 
    headers.forEach((h, j) => rData[h] = vals[j] || "");
    const pName = rData.name || rData.athlete || rData.player || ""; 
    const pKey = normalizeName(pName);

    const pPerf = Object.values(courseIndices)
      .map(trackIdx => trackIdx[pKey])
      .filter(entry => entry && entry.time)
      .sort((a, b) => {
        if (a.rank === 1 && b.rank === 1) return parseFloat(a.time) - parseFloat(b.time);
        if (a.rank === 1) return -1;
        if (b.rank === 1) return 1;
        return Number(b.rating) - Number(a.rating);
      });

    return { 
      id: rData.id || `${gender}-${pKey}-${i}`, 
      name: pName, 
      gender, 
      rating: cleanNumeric(rData.rating || rData.ovr || rData.overallrating), 
      runs: parseInt(rData.runs || rData.count || pPerf.length) || 0, 
      wins: parseInt(rData.wins || rData.victories) || 0, 
      pts: cleanNumeric(ptsIdx !== -1 ? vals[ptsIdx] : (rData.pts || rData.points)), 
      sets: cleanNumeric(setIdx !== -1 ? vals[setIdx] : (vals[11] || 0)), 
      winPct: wIdx !== -1 ? vals[wIdx] : "0.00%", 
      region: rData.region || vals[regIdx] || "", 
      contributionScore: cleanNumeric(cIdx !== -1 ? vals[cIdx] : vals[vals.length - 1]), 
      coursePerformance: pPerf, 
      totalFireCount: pPerf.reduce((acc, cp) => acc + getFireCount(cp.time, gender), 0)
    };
  }).filter(p => p.name.length > 2);
};

// --- PLAYER PROFILE MODAL ---
const Modal = ({ isOpen, onClose, player: p, theme }) => {
  if (!isOpen || !p) return null;

  const stats = [
    { l: 'OVR', v: (p.rating || 0).toFixed(2), c: theme === 'dark' ? 'text-blue-400' : 'text-blue-500' }, 
    { l: 'RUNS', v: p.runs || 0 }, 
    { l: 'POINTS', v: Math.floor(p.pts || 0) }, 
    { l: '🪙', v: p.contributionScore || 0 }, 
    { l: 'WIN %', v: p.winPct.replace('%', '') }, 
    { l: 'WINS', v: p.wins || 0 }, 
    { l: 'SETS', v: p.sets || 0 }, 
    { l: '🔥', v: p.totalFireCount || 0 }
  ];

  const unifiedHover = `transition-all duration-500 ease-out ${theme === 'dark' ? 'hover:bg-white/10 hover:border-blue-400/30' : 'hover:bg-white hover:border-blue-500/30'}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-500 cursor-pointer" onClick={onClose}>
      <div 
        className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-500 flex flex-col cursor-default max-h-[85vh] sm:max-h-[90vh]`} 
        onClick={e => e.stopPropagation()}
      >
        <div className={`shrink-0 relative h-28 sm:h-40 p-6 sm:p-10 flex items-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/30 via-slate-700/10 to-transparent' : 'from-slate-400/40 via-slate-300/20 to-transparent'}`}>
          <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white z-[110] transition-colors duration-200">
            <IconX />
          </button>
          <div className="flex items-center gap-4 sm:gap-8">
            <div className={`w-14 h-14 sm:w-24 sm:h-24 rounded-xl sm:rounded-3xl border flex items-center justify-center text-lg sm:text-3xl font-black shadow-xl shrink-0 uppercase tracking-tighter ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>
              {getInitials(p.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="text-xl sm:text-4xl leading-tight flex items-center gap-2">
                  <span className="shrink-0 inline-flex items-center gap-1 whitespace-nowrap">{p.region || '🏳️'}</span>
                  <h2 className={`font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{p.name}</h2>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-8 pb-10 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-400'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s, i) => (
              <div key={i} className={`flex flex-col border p-3 sm:p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white/80 border-white/10 shadow-sm'} ${unifiedHover}`}>
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{s.l}</span>
                <span className={`text-base sm:text-xl font-mono font-black ${s.c || (theme === 'dark' ? 'text-slate-400' : 'text-slate-900')}`}>{s.v}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-4 pt-2">
            {/* Precision Aligned Column Headers - Consistent Grid System */}
            <div className={`flex items-center px-5 mb-2 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-700/60'}`}>
              <div className="w-12 sm:w-16 text-center shrink-0">RANK</div>
              <div className="flex-1 ml-4 sm:ml-6 text-left truncate">COURSE</div>
              <div className="w-16 sm:w-24 text-right shrink-0">POINTS</div>
              <div className="w-16 sm:w-24 text-right shrink-0">SECONDS</div>
              <div className="w-12 sm:w-20 ml-2 shrink-0"></div>
            </div>

            {p.coursePerformance?.length ? p.coursePerformance.map((cp, idx) => (
              <div key={idx} className={`group flex items-center p-3 sm:p-5 border rounded-2xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white/80 border-white/10 shadow-sm'} ${unifiedHover}`}>
                {/* Column 1: Rank */}
                <div className="w-12 sm:w-16 flex justify-center shrink-0">
                  <RankBadge rank={cp.rank} theme={theme} size="lg" />
                </div>
                
                {/* Column 2: Course Name (Bold White) + Difficulty Emoji */}
                <div className="flex-1 min-w-0 ml-4 sm:ml-6 text-left">
                  <div className={`text-xs sm:text-sm font-bold uppercase tracking-tight truncate transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {cp.name} <span className="ml-1 opacity-90">{cp.difficulty}</span>
                  </div>
                </div>

                {/* Column 3: Points (Main: Blue, Sub: % Diff) */}
                <div className="w-16 sm:w-24 flex flex-col items-end shrink-0">
                  <div className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                    {Number(cp.rating).toFixed(2)}
                  </div>
                  <div className="h-[12px]">
                    {cp.rank !== 1 && cp.percDiff && (
                      <div className="text-[9px] sm:text-[10px] font-bold text-blue-500/60 leading-none mt-0.5">
                        -{cp.percDiff.replace(/^-/, '')}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Column 4: Seconds (Main: White, Sub: Time Diff) */}
                <div className="w-16 sm:w-24 flex flex-col items-end shrink-0">
                  <div className={`text-xs sm:text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {cp.time}
                  </div>
                  <div className="h-[12px]">
                    {cp.rank !== 1 && cp.timeDiff && (
                      <div className={`text-[9px] sm:text-[10px] font-bold leading-none opacity-40 mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        +{cp.timeDiff.replace(/^\+/, '')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 5: Badges (CR & Fires) - Precise baseline alignment adjustment */}
                <div className="w-12 sm:w-20 ml-2 flex items-center gap-1.5 shrink-0 self-start pt-[3.5px] sm:pt-[4.5px]">
                  {cp.rank === 1 && (
                    <span className="text-[8px] sm:text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-lg animate-subtle-pulse shadow-yellow-500/20 shrink-0">
                      CR
                    </span>
                  )}
                  <div className="shrink-0 leading-none flex items-center h-full">
                    <FireIcons time={cp.time} gender={p.gender} />
                  </div>
                </div>
              </div>
            )) : <div className="py-16 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-40">No Verified Runs</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN LEADERBOARD APPLICATION ---
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
  const [trackCount, setTrackCount] = useState(0);

  const S_ID = '1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4';
  
  const indexCourseTabRobust = (csv, cN) => {
    const grid = csv.split(/\r?\n/).filter(l => l.trim()).map(parseLine);
    const idx = {}; 
    let diff = "";
    grid.slice(0, 15).forEach(row => { 
        const s = row.join(' '); 
        const match = s.match(/(🔵|🟢|🟡|🟠|🔴|🟣|⚫|⚪)/);
        if (match && !diff) diff = match[0]; 
    });
    grid.forEach(row => {
      row.forEach((cell, cIdx) => {
        const key = normalizeName(cell); 
        if (!key || key.length < 3) return;
        const tV = formatSeconds(row[cIdx + 1]);
        if (tV) {
            idx[key] = { 
                name: cN.toUpperCase().replace('SPEED RUN', '').trim(), 
                difficulty: diff, 
                time: tV, 
                timeDiff: row[cIdx + 2] || "",
                percDiff: row[cIdx + 3] || "",
                rank: parseInt(row[cIdx - 1]) || "-", 
                rating: cleanNumeric(row[cIdx+4] || row[cIdx+5]) 
            };
        }
      });
    });
    return idx;
  };

  const fetchFromSheet = useCallback(async () => {
    setLoad(true); setErr(null);
    const bUrl = (n) => `https://docs.google.com/spreadsheets/d/${S_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(n)}&t=${Date.now()}`;
    
    try {
      const courses = ['BFI','PASSBY','WAVE ORGAN',"O'RORKE",'CAL','FUNSTON','SHERWOOD','PSU','IRVING','AUCOIN','LOHS','PROGRESS','JEFFERSON','WATER GARDEN','IRON WORKS','POINT GREY','COTTONWOOD 1','C4C','RED ROCKS','PAINTED STAIRS','TOWNSHIP 9','PALI',"KĀNEWAI",'CASABLANCA','BOUKAR','ANBAR','WATERFRONT','MINES 1','MINES 2','SANTIAGO','WALLACE 1','JURONG','SAWS','ÉVRY','TOLERÀNCIA','TIANMU','ORMSUND','MILLENNIUM','CSU','JACKSONVILLE','FESTIVAL','UCCS','HIGHLAND','LOS CABOS','BANDSHELL','AURARIA 1','BEAN LOG','WEST','RAPID','TUNNELS','CPRC 1','RINO','AURARIA 2','GDAŃSK','UMKC','WILL VILL','MEDICAL','NEURO','WYOMING','EAGLETON','ACC','MILLER','HARBOURFRONT 1','HARBOURFRONT 2','LASTMAN','BAHEN','NELSON-SHELL','VINE CITY','PEACHTREE','URBAN LIFE','HARRISON','NOGUCHI','SEWELL','TABLE MESA','HANCE 1','HANCE 2','PPL','RIVERBANK','SPEEDWAY','DRINKWATER','AZ FALLS',"KAKA'AKO",'WINDWARD',"MAKAPU'U",'UH1','UH2','UH3',"KAPI'OLANI",'CHAPULTEPEC 1','CHAPULTEPEC 2','CRI CRI','ANTIGUA','ATITLÁN','WALLACE 2','OBELISCO','PARQUE CANCÚN 1','PARQUE CANCÚN 2','BOHEMIO','PARQUE CANCÚN 3','FOLK','UNAM 1','MCCARTHY','PRADOS','ATLANTIS','PARCUR','UNAM 2','NEZAHUALCÓYOTL','CHAPULTEPEC 3','CUSCATLÁN 1','ESPINO','CUSCATLÁN 2','CUSCATLÁN 3','OLDE TOWN','TRAX','BELMAR','TIVOLI','UMC','HILL','COTTONWOOD 2','TP','PONTINHA','KAOS','BAR SPOT','LABYRINTH','WHALE TAIL','GROUND ZERO','YELLOW WALLS','RED WALLS','SHELL FARM','HORTA 1','HORTA 2','PDN','GARRISON','PCHS','KELLER','FREEWAY 1','UW','CORDATA','GAS WORKS 1','DAIRY','LUTHER BURBANK','SHOREWOOD','FREEWAY 2','SFU','LAM','COAL HARBOUR','STEAMSHIP','FREEWAY 3','GREEN LAKE','GAS WORKS 2','RHODES 1','RHODES 2','UU1','GALLIVAN','UTAH','UU2','USH','WINCHESTER','UNLV','LVCH','HCH','NSU','CSN','PCRC','UU3','BLACK HILLS','STUART','MCILVOY','SPEER','YORK','DMNS','BAUTISTA','VÓRTICE','BENEFICENCIA','TÓTEM','COLISEO','RUINAS','NAVFAC','PEÑUELAS','LINEAL','CPRC 2','VILLARROEL','KAPOLEI','JAFFA'].map(c => c + ' SPEED RUN');
      
      const cIdxs = {}; let successfulTracks = 0;

      for (let i = 0; i < courses.length; i += 15) {
        await Promise.all(courses.slice(i, i + 15).map(async n => {
          try { 
            const r = await fetch(bUrl(n)); 
            if (r.ok) { 
              const txt = await r.text(); 
              if (txt.length > 50) { cIdxs[n] = indexCourseTabRobust(txt, n); successfulTracks++; } 
            } 
          } catch(e) {}
        }));
        setTrackCount(successfulTracks);
      }

      const rM = await fetch(bUrl('RANKINGS (M)'));
      const rF = await fetch(bUrl('RANKINGS (F)'));
      
      let combined = [];
      if (rM.ok) combined = [...combined, ...processRankingData(await rM.text(), 'M', cIdxs)];
      if (rF.ok) combined = [...combined, ...processRankingData(await rF.text(), 'F', cIdxs)];
      
      if (combined.length) { 
        setData(combined); 
        setSync(new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })); 
      } else { throw new Error(); }
    } catch(e) { setErr("Protocol Sync Timeout."); } finally { setLoad(false); }
  }, []);

  useEffect(() => {
    let ts = 0;
    const hS = (e) => { ts = e.touches[0].pageY; };
    const hE = (e) => { 
      const te = e.changedTouches[0].pageY; 
      if (te - ts > 180 && window.scrollY <= 0 && !load) fetchFromSheet(); 
    };
    window.addEventListener('touchstart', hS); 
    window.addEventListener('touchend', hE);
    return () => { 
      window.removeEventListener('touchstart', hS); 
      window.removeEventListener('touchend', hE); 
    };
  }, [fetchFromSheet, load]);

  useEffect(() => { fetchFromSheet(); }, [fetchFromSheet]);

  const list = useMemo(() => {
    let res = data.filter(p => p.gender === gen && (p.name.toLowerCase().includes(search.toLowerCase()) || p.region.toLowerCase().includes(search.toLowerCase())));
    res = res.filter(p => gen === 'M' ? p.runs >= 4 : p.runs >= 2);
    if (sort.key) {
      res.sort((a, b) => { 
        let vA = a[sort.key], vB = b[sort.key]; 
        if (typeof vA === 'number') return sort.direction === 'ascending' ? vA - vB : vB - vA; 
        return sort.direction === 'ascending' ? (String(vA) < String(vB) ? -1 : 1) : (String(vA) > String(vB) ? -1 : 1); 
      });
    }
    return res.map((p, i) => ({ ...p, currentRank: i + 1 }));
  }, [search, sort, gen, data]);

  const HeaderComp = ({ l, k, a = 'left', hideOnMobile = false }) => (
    <th 
      className={`px-4 sm:px-8 py-5 cursor-pointer group select-none transition-colors duration-500 ${hideOnMobile ? 'hidden md:table-cell' : ''} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-300/30'} ${a === 'right' ? 'text-right' : 'text-left'}`} 
      onClick={() => setSort(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}
    >
      <div className={`flex items-center gap-2 h-full ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="truncate uppercase tracking-[0.15em] text-[10px] font-black">{l}</span>
        <div className={`transition-opacity duration-500 shrink-0 ${sort.key === k ? (theme === 'dark' ? 'opacity-100 text-blue-400' : 'opacity-100 text-blue-500') : 'opacity-0 group-hover:opacity-40'}`}>
          <IconArrow direction={sort.key === k ? sort.direction : 'descending'} />
        </div>
      </div>
    </th>
  );

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-16 flex items-center justify-between px-4 sm:px-8 transition-colors duration-500 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
        <div className="flex items-center gap-3">
          <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse`}><IconSpeed /></div>
          <span className={`font-black tracking-tighter text-lg sm:text-2xl uppercase italic underline decoration-blue-500/20 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Apex Speed Run</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex rounded-xl p-1 border transition-colors duration-500 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
            {['M', 'F'].map(g => (
              <button key={g} onClick={() => setGen(g)} className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] font-black transition-all duration-300 ${gen === g ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>{g === 'M' ? 'MEN' : 'WOMEN'}</button>
            ))}
          </div>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-11 h-11 flex items-center justify-center border rounded-xl transition-all duration-500 active:scale-90 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400 hover:text-blue-400' : 'bg-slate-300/50 border-slate-400/20 text-slate-600 hover:text-blue-600 shadow-sm'}`}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </nav>

      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} theme={theme} />

      <header className={`pt-24 pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-8 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center gap-2.5 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/10' : 'bg-blue-500/10 text-blue-500 border-blue-500/10'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${load ? 'bg-blue-400 animate-pulse' : err ? 'bg-red-500' : (theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500')}`} />
              {load ? `SCANNING ${trackCount} COURSES...` : err || `LIVE SYNC: ${sync || 'OK'}`}
            </div>
          </div>
          <h1 className={`text-4xl sm:text-7xl font-black tracking-tighter uppercase leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>All-Time Rankings</h1>
        </div>
        <div className="relative group max-w-md w-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 group-focus-within:text-blue-500"><IconSearch /></div>
          <input type="text" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)} className={`border rounded-2xl px-11 py-3.5 w-full text-sm font-bold placeholder:text-slate-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-white shadow-2xl' : 'bg-slate-300/40 border-slate-400/20 shadow-inner text-slate-900'}`} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-8 flex-grow w-full">
        <div className={`border rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl overflow-x-auto transition-colors duration-500 ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-slate-100/30 border-slate-400/30 shadow-lg'}`}>
          <table className="w-full text-left border-collapse min-w-[340px] sm:min-w-[700px]">
            <thead>
              <tr className={`border-b text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-500' : 'bg-slate-200/60 border-slate-300/40 text-slate-600'}`}>
                <th className="w-14 sm:w-28 px-4 sm:px-8 py-5 text-left">RANK</th>
                <th className="hidden sm:table-cell w-14 sm:w-28 px-4 sm:px-8 py-5 text-center transition-colors duration-500">
                  <div className="flex justify-center">
                    <IconFlag className="shrink-0" />
                  </div>
                </th>
                <th className="px-4 sm:px-8 py-5 uppercase tracking-[0.2em] text-left">PLAYER</th>
                <HeaderComp l="RATING" k="rating" a="left" />
                <HeaderComp l="RUNS" k="runs" a="left" hideOnMobile />
                <HeaderComp l="WINS" k="wins" a="left" hideOnMobile />
                <HeaderComp l="SETS" k="sets" a="left" hideOnMobile />
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-300/40'}`}>
              {list.length ? list.map(p => (
                <tr key={p.id} onClick={() => setSel(p)} className={`group transition-all duration-500 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-300/80'}`}>
                  <td className="w-14 sm:w-28 px-4 sm:px-8 py-4 text-left">
                    <div className="flex flex-row items-center gap-2 sm:gap-4 whitespace-nowrap">
                      <RankBadge rank={p.currentRank} theme={theme} />
                      <span className="text-[10px] sm:text-lg block sm:hidden font-black opacity-60 inline-flex items-center gap-1 whitespace-nowrap">
                        {p.region || '🏳️'}
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell w-14 sm:w-28 px-4 sm:px-8 py-4 text-center">
                    <span className="text-sm sm:text-lg inline-flex items-center gap-1 whitespace-nowrap" title={p.region || 'Independent'}>
                      {p.region || '🏳️'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-8 py-4 text-left">
                    <div className={`text-sm sm:text-lg truncate tracking-tight font-bold transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {p.name}
                    </div>
                    <div className="flex sm:hidden gap-3 mt-0.5 opacity-50 text-[8px] font-black uppercase tracking-tighter">
                      <span>RUNS: {p.runs}</span>
                      <span>WINS: {p.wins}</span>
                    </div>
                  </td>
                  <td className={`px-4 sm:px-8 py-4 text-left font-bold text-sm sm:text-lg ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                    {p.rating.toFixed(2)}
                  </td>
                  <td className={`hidden md:table-cell px-4 sm:px-8 py-4 text-left font-bold text-sm sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {p.runs}
                  </td>
                  <td className={`hidden md:table-cell px-4 sm:px-8 py-4 text-left font-bold text-sm sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {p.wins}
                  </td>
                  <td className={`hidden md:table-cell px-4 sm:px-8 py-4 text-left font-bold text-sm sm:text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {p.sets}
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan="7" className="py-40 text-center text-slate-500 uppercase font-black text-[10px] tracking-[0.4em] italic opacity-30">
                        {load ? 'Scanning Protocol...' : 'No Records Detected'}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <footer className="mt-16 text-center pb-16 opacity-20 select-none">
        <p className={`text-[10px] font-black uppercase tracking-[0.8em] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-500'}`}>APEX SPEED RUN</p>
      </footer>
    </div>
  );
}
