import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
// --- ICONS (Custom SVG for specialized look) ---
const IconZap = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.71 13.5 3l-1.5 9h8L10.5 21l1.5-9z"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconX = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const IconArrow = ({ direction }) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconRefresh = ({ className }) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.83 6.72 2.24"/><path d="M21 3v9h-9"/></svg>;
const IconMedal = ({ rank = 1 }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 2l7 12 7-12h-4l-3 6-3-6H5z" /><circle cx="12" cy="16" r="8.5" />
    <text x="12" y="20" textAnchor="middle" className="font-mono font-black select-none" style={{ fontSize: '11px', fill: 'rgba(0,0,0,0.65)', pointerEvents: 'none' }}>{rank}</text>
  </svg>
);

// --- HELPERS & UTILITIES ---
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

const extractFlags = (s) => (s?.match(/(\ud83c[\udde6-\uddff]{2})/g) || [])[0] || null;
const extractDifficulty = (s) => (s?.match(/(🔵|🟢|🟡|🟠|🔴|🟣|⚫|⚪|➕|➖|⭐|✨)/g) || []).join(' ') || null;

const getFireIcons = (tStr, g) => {
  const t = parseFloat(tStr); 
  if (isNaN(t)) return null;
  const limits = g === 'F' ? [9.0, 10.0, 11.0] : [7.0, 8.0, 9.0];
  if (t < limits[0]) return "🔥 🔥 🔥"; 
  if (t < limits[1]) return "🔥 🔥"; 
  if (t < limits[2]) return "🔥";
  return null;
};

const countFireValue = (tStr, g) => {
  const t = parseFloat(tStr); 
  if (isNaN(t)) return 0;
  const limits = g === 'F' ? [9.0, 10.0, 11.0] : [7.0, 8.0, 9.0];
  return t < limits[0] ? 3 : t < limits[1] ? 2 : t < limits[2] ? 1 : 0;
};

// --- DATA PROCESSING LOGIC ---
const getRatingFromGrid = (row, cIdx) => cleanNumeric(row[cIdx + 4] || row[cIdx + 5]);

const indexCourseTabRobust = (csv, courseName) => {
  const grid = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim()).map(parseLine);
  const idx = {}; 
  let venue = "", diff = "";
  
  grid.slice(0, 15).forEach(row => { 
    const s = row.join(' '); 
    const fD = extractDifficulty(s); 
    const fF = extractFlags(s);
    if (fD && !diff) diff = fD; 
    if (fF && !venue) venue = fF;
  });

  grid.forEach(row => {
    row.forEach((cell, cIdx) => {
      const key = normalizeName(cell);
      if (!key || key.length < 3 || ['name', 'rank', 'points', 'time', 'athlete', 'player', 'record', 'date'].includes(key)) return;
      
      const timeVal = formatSeconds(row[cIdx + 1]);
      if (timeVal) {
        idx[key] = {
          name: courseName.toUpperCase().replace('SPEED RUN', '').trim(),
          difficulty: diff || "",
          time: timeVal,
          rank: parseInt(row[cIdx - 1]) || "-",
          deltaSec: (row[cIdx + 2] || "0.00").toString().toLowerCase().replace('s', '').trim(),
          deltaPct: (row[cIdx + 3] || "0.00%").toString().toLowerCase().trim(),
          rating: getRatingFromGrid(row, cIdx),
          courseFlag: venue || ""
        };
      }
    });
  });
  return idx;
};

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
      sets: cleanNumeric(setIdx !== -1 ? vals[setIdx] : vals[11]), 
      winPct: wIdx !== -1 ? vals[wIdx] : "0.00%", 
      region: regIdx !== -1 ? vals[regIdx] : (rData.region || ""), 
      status: rData.status || rData.rank || "Official", 
      contributionScore: cleanNumeric(cIdx !== -1 ? vals[cIdx] : vals[vals.length - 1]), 
      coursePerformance: pPerf, 
      totalFireCount: pPerf.reduce((acc, cp) => acc + countFireValue(cp.time, gender), 0) 
    };
  }).filter(p => p.name.length > 2);
};

// --- MODAL COMPONENT ---
const Modal = ({ isOpen, onClose, player: p }) => {
  if (!isOpen || !p) return null;

  const stats = [
    { l: 'OVR', v: (p.rating || 0).toFixed(2), c: 'text-cyan-400' }, 
    { l: 'RUNS', v: p.runs || 0 }, 
    { l: 'POINTS', v: Math.floor(p.pts || 0) }, 
    { l: '🪙', v: p.contributionScore || 0 }, 
    { l: 'WIN %', v: p.winPct || '0.00%' }, 
    { l: 'WINS', v: p.wins || 0 }, 
    { l: 'SETS', v: p.sets || 0 }, 
    { l: '🔥', v: p.totalFireCount }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md bg-black/80 animate-in fade-in cursor-pointer" onClick={onClose}>
      <div className="bg-[#0a0c10] border border-white/10 w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 max-h-[90vh] flex flex-col text-slate-100 cursor-default" onClick={e => e.stopPropagation()}>
        
        {/* Profile Header */}
        <div className="relative shrink-0 h-24 sm:h-40 bg-gradient-to-r from-blue-600/20 via-cyan-600/20 to-indigo-600/20 p-4 sm:p-8 flex items-end">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-[110] transition-colors">
            <IconX />
          </button>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="w-10 h-10 sm:w-20 sm:h-20 rounded-lg sm:rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-base sm:text-2xl font-black text-blue-400 shadow-xl shrink-0 uppercase tracking-tighter">
              {getInitials(p.name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-3xl font-black text-white leading-tight">{p.name}</h2>
                <div className="bg-blue-600 p-0.5 sm:p-1 rounded-full text-white shrink-0 shadow-lg ring-2 ring-blue-500/30">
                  <IconCheck />
                </div>
              </div>
              <p className="text-[10px] sm:text-sm font-bold text-slate-300 mt-1 uppercase tracking-widest">{p.region}</p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-4 sm:p-8 space-y-6 overflow-y-auto flex-grow pb-8 scrollbar-hide">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-2 sm:p-4 rounded-xl transition-all hover:border-white/20">
                <span className={`text-[7px] sm:text-[8px] font-black uppercase text-slate-500 block mb-1 tracking-widest ${s.l === '🔥' ? 'drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse' : ''}`}>{s.l}</span>
                <span className={`text-xs sm:text-lg font-mono font-black ${s.c || 'text-slate-400'}`}>{s.v}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-3 pt-2">
            {p.coursePerformance?.length ? p.coursePerformance.map((cp, idx) => (
              <div key={idx} className="group flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 p-2 sm:p-4 rounded-xl transition-all">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  {/* Sequence Number */}
                  <div className="text-[9px] sm:text-[10px] font-mono font-black text-slate-700 w-3 sm:w-5 text-right shrink-0 select-none">
                    {idx + 1}
                  </div>
                  
                  {/* Rank Display */}
                  <div className={`shrink-0 w-7 h-7 sm:w-10 sm:h-10 rounded-lg border flex items-center justify-center font-mono text-[9px] sm:text-xs font-bold transition-colors ${
                    cp.rank === 1 ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-500' : 
                    cp.rank === 2 ? 'bg-zinc-400/20 border-zinc-400/40 text-zinc-400' : 
                    cp.rank === 3 ? 'bg-[#cd7f32]/20 border-[#cd7f32]/40 text-[#cd7f32]' : 
                    'bg-slate-900 border-white/5 text-blue-400'}`}>
                    {[1, 2, 3].includes(cp.rank) ? <IconMedal rank={cp.rank} /> : <span className="inline-flex items-center justify-center w-full h-full">{cp.rank === "-" ? "?" : cp.rank}</span>}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">
                          {cp.name}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {cp.rank === 1 && <span className="text-[7px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-black leading-none uppercase">CR</span>}
                          {getFireIcons(cp.time, p.gender) && (
                            <span className="text-[8px] sm:text-[10px] animate-pulse drop-shadow-[0_0_2px_rgba(249,115,22,0.9)] leading-none">
                              {getFireIcons(cp.time, p.gender)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Course Flag */}
                      {cp.courseFlag && (
                        <div className="text-[7px] sm:text-[10px] font-black text-slate-400 tracking-tight uppercase italic mt-0.5">
                          {cp.courseFlag} Location
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-6 text-right shrink-0">
                  <div className="flex flex-col items-end">
                    <div className="text-[7px] font-black text-slate-600 uppercase tracking-tighter mb-0.5">Time</div>
                    <div className="text-[10px] sm:text-xs font-mono font-black text-blue-400">{cp.time}</div>
                    <div className="text-[7px] font-bold text-slate-500 mt-1">{cp.rank !== 1 && cp.deltaSec !== '0.00' ? `+${cp.deltaSec}` : ''}</div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="text-[7px] font-black text-slate-600 uppercase tracking-tighter mb-0.5">Points</div>
                    <div className="text-[10px] sm:text-xs font-mono font-black text-white">{(cp.rating || 0).toFixed(2)}</div>
                    <div className="text-[7px] font-bold text-slate-500 mt-1">{cp.rank !== 1 && cp.deltaPct !== '0.00%' ? `+${cp.deltaPct}` : ''}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest italic animate-pulse">No verified course runs found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
export default function App() {
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
  
  const fetchFromSheet = useCallback(async () => {
    setLoad(true); 
    setErr(null);
    const bUrl = (n) => `https://docs.google.com/spreadsheets/d/${S_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(n)}&t=${Date.now()}`;
    
    try {
      // 1. Kick off Ranking fetches immediately in the background
      const rankingPromises = [
        fetch(bUrl('RANKINGS (M)'), { cache: 'no-store' }), 
        fetch(bUrl('RANKINGS (F)'), { cache: 'no-store' })
      ];

      const courses = [
        'BFI', 'PASSBY', 'WAVE ORGAN', "O'RORKE", 'CAL', 'FUNSTON', 'SHERWOOD', 'PSU', 'IRVING', 'AUCOIN', 'LOHS', 'PROGRESS', 'JEFFERSON', 'WATER GARDEN', 'IRON WORKS', 'POINT GREY', 'COTTONWOOD 1', 'C4C', 'RED ROCKS', 'PAINTED STAIRS', 'TOWNSHIP 9', 'PALI', "KĀNEWAI", 'CASABLANCA', 'BOUKAR', 'ANBAR', 'WATERFRONT', 'MINES 1', 'MINES 2', 'SANTIAGO', 'WALLACE 1', 'JURONG', 'SAWS', 'ÉVRY', 'TOLERÀNCIA', 'TIANMU', 'ORMSUND', 'MILLENNIUM', 'CSU', 'JACKSONVILLE', 'FESTIVAL', 'UCCS', 'HIGHLAND', 'LOS CABOS', 'BANDSHELL', 'AURARIA 1', 'BEAN LOG', 'WEST', 'RAPID', 'TUNNELS', 'CPRC 1', 'RINO', 'AURARIA 2', 'GDAŃSK', 'UMKC', 'WILL VILL', 'MEDICAL', 'NEURO', 'WYOMING', 'EAGLETON', 'ACC', 'MILLER', 'HARBOURFRONT 1', 'HARBOURFRONT 2', 'LASTMAN', 'BAHEN', 'NELSON-SHELL', 'VINE CITY', 'PEACHTREE', 'URBAN LIFE', 'HARRISON', 'NOGUCHI', 'SEWELL', 'TABLE MESA', 'HANCE 1', 'HANCE 2', 'PPL', 'RIVERBANK', 'SPEEDWAY', 'DRINKWATER', 'AZ FALLS', "KAKA'AKO", 'WINDWARD', "MAKAPU'U", 'UH1', 'UH2', 'UH3', "KAPI'OLANI", 'CHAPULTEPEC 1', 'CHAPULTEPEC 2', 'CRI CRI', 'ANTIGUA', 'ATITLÁN', 'WALLACE 2', 'OBELISCO', 'PARQUE CANCÚN 1', 'PARQUE CANCÚN 2', 'BOHEMIO', 'PARQUE CANCÚN 3', 'FOLK', 'UNAM 1', 'MCCARTHY', 'PRADOS', 'ATLANTIS', 'PARCUR', 'UNAM 2', 'NEZAHUALCÓYOTL', 'CHAPULTEPEC 3', 'CUSCATLÁN 1', 'ESPINO', 'CUSCATLÁN 2', 'CUSCATLÁN 3', 'OLDE TOWN', 'TRAX', 'BELMAR', 'TIVOLI', 'UMC', 'HILL', 'COTTONWOOD 2', 'TP', 'PONTINHA', 'KAOS', 'BAR SPOT', 'LABYRINTH', 'WHALE TAIL', 'GROUND ZERO', 'YELLOW WALLS', 'RED WALLS', 'SHELL FARM', 'HORTA 1', 'HORTA 2', 'PDN', 'GARRISON', 'PCHS', 'KELLER', 'FREEWAY 1', 'UW', 'CORDATA', 'GAS WORKS 1', 'DAIRY', 'LUTHER BURBANK', 'SHOREWOOD', 'FREEWAY 2', 'SFU', 'LAM', 'COAL HARBOUR', 'STEAMSHIP', 'FREEWAY 3', 'GREEN LAKE', 'GAS WORKS 2', 'RHODES 1', 'RHODES 2', 'UU1', 'GALLIVAN', 'UTAH', 'UU2', 'USH', 'WINCHESTER', 'UNLV', 'LVCH', 'HCH', 'NSU', 'CSN', 'PCRC', 'UU3', 'BLACK HILLS', 'STUART', 'MCILVOY', 'SPEER', 'YORK', 'DMNS', 'BAUTISTA', 'VÓRTICE', 'BENEFICENCIA', 'TÓTEM', 'COLISEO', 'RUINAS', 'NAVFAC', 'PEÑUELAS', 'LINEAL', 'CPRC 2', 'VILLARROEL', 'KAPOLEI', 'JAFFA'
      ].map(c => c + ' SPEED RUN');

      const cIdxs = {}; 
      let successfulTracks = 0;
      
      // 2. Optimization: Increase chunk size to 20 for higher concurrency
      const chunks = [];
      for (let i = 0; i < courses.length; i += 20) chunks.push(courses.slice(i, i + 20));

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async n => { 
          try { 
            const r = await fetch(bUrl(n), { cache: 'no-store' }); 
            if (r.ok) {
              const text = await r.text();
              // Skip processing if track is effectively empty
              if (text && text.length > 50) {
                cIdxs[n] = indexCourseTabRobust(text, n); 
                successfulTracks++;
              }
            }
          } catch(e){} 
        }));
        // Update UI intermittently as chunks complete
        setTrackCount(successfulTracks);
      }

      // 3. Collect the background Ranking results
      const rankingResponses = await Promise.all(rankingPromises);
      const [mR, fR] = rankingResponses;

      let combined = []; 
      if (mR.ok) combined = [...combined, ...processRankingData(await mR.text(), 'M', cIdxs)]; 
      if (fR.ok) combined = [...combined, ...processRankingData(await fR.text(), 'F', cIdxs)];
      
      if (combined.length) { 
        setData(combined); 
        setSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })); 
      } else {
        throw new Error("Sync Failure");
      }
    } catch(e) { 
      setErr("Protocol Sync Timeout."); 
    } finally { 
      setLoad(false); 
    }
  }, []);
// --- SWIPE TO REFRESH LOGIC ---
  useEffect(() => {
    let touchStart = 0;
    const handleStart = (e) => { touchStart = e.touches[0].pageY; };
    const handleEnd = (e) => {
      const touchEnd = e.changedTouches[0].pageY;
      // If user swipes down more than 150px and is at the top of the page
      if (touchEnd - touchStart > 150 && window.scrollY <= 0 && !load) {
        fetchFromSheet();
      }
    };

    window.addEventListener('touchstart', handleStart);
    window.addEventListener('touchend', handleEnd);
    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [fetchFromSheet, load]);
  
  useEffect(() => { 
    fetchFromSheet(); 
  }, [fetchFromSheet]);

  const list = useMemo(() => {
    const res = data.filter(p => 
      p.gender === gen && 
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.region.toLowerCase().includes(search.toLowerCase()))
    );
    const filteredRes = res.filter(p => gen === 'M' ? p.runs >= 4 : p.runs >= 2);
    if (sort.key) {
      filteredRes.sort((a, b) => { 
        let vA = a[sort.key], vB = b[sort.key]; 
        if (typeof vA === 'number') return sort.direction === 'ascending' ? vA - vB : vB - vA; 
        return sort.direction === 'ascending' ? (vA < vB ? -1 : 1) : (vA > vB ? -1 : 1); 
      });
    }
    return filteredRes.map((p, i) => ({ ...p, currentRank: i + 1 }));
  }, [search, sort, gen, data]);

  const Header = ({ l, k, a = 'left', s = false }) => (
    <th 
      className={`px-1.5 sm:px-6 py-3 cursor-pointer hover:bg-white/10 group select-none transition-colors ${a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : ''}`} 
      onClick={() => setSort(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}
    >
      <div className={`flex items-center gap-1 sm:gap-2 ${a === 'right' ? 'justify-end' : a === 'center' ? 'justify-center' : ''}`}>
        <span className={`truncate ${s ? 'drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse' : ''}`}>{l}</span>
        <div className={`transition-opacity ${sort.key === k ? 'opacity-100 text-blue-400' : 'opacity-0 group-hover:opacity-40'}`}>
          <IconArrow direction={sort.key === k ? sort.direction : 'descending'} />
        </div>
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 font-sans pb-20 select-none flex flex-col antialiased">
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/5 z-50 h-14 sm:h-16 flex items-center justify-between px-2 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="text-blue-500 animate-pulse"><IconZap /></div>
          <span className="font-black tracking-tighter text-base sm:text-xl text-white uppercase italic underline decoration-blue-500/20">Apex Speed Run</span>
        </div>
        <div className="flex gap-1.5">
          <div className="flex bg-slate-800 border border-white/10 rounded-lg p-0.5 sm:p-1">
            {['M', 'F'].map(g => (
              <button key={g} onClick={() => setGen(g)} className={`px-2 sm:px-5 py-1 sm:py-2 rounded-md text-[10px] sm:text-[11px] font-black transition-all ${gen === g ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {g === 'M' ? 'MEN' : 'WOMEN'}
              </button>
            ))}
          </div>
          <button onClick={fetchFromSheet} className="p-2 sm:p-3 bg-slate-800 border border-white/10 rounded-lg text-slate-500 active:scale-90 transition-transform">
            <IconRefresh className={load ? 'animate-spin text-blue-400' : ''} />
          </button>
        </div>
      </nav>
      <Modal isOpen={!!sel} onClose={() => setSel(null)} player={sel} />
      <header className="pt-20 sm:pt-24 pb-4 px-4 sm:px-6 bg-gradient-to-b from-blue-600/10 to-transparent max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className={`flex items-center gap-2 px-2 py-0.5 rounded-full border text-[8px] sm:text-[10px] font-bold uppercase tracking-widest ${err ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
              <span className={`w-1 h-1 rounded-full ${load ? 'bg-yellow-400 animate-pulse' : err ? 'bg-red-400' : 'bg-green-400'}`} />
              {load ? `Loading ${trackCount} Courses...` : err || `Live Sync: ${sync || 'Ready'}`}
            </div>
            {!load && trackCount > 0 && (
              <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">
                {trackCount} Courses Indexed
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">All-Time Rankings</h1>
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconSearch /></div>
          <input type="text" placeholder="Search players" value={search} onChange={e => setSearch(e.target.value)} className="bg-slate-900 border border-white/10 rounded-xl sm:rounded-2xl px-9 py-2.5 w-full md:w-96 text-xs sm:text-sm font-bold placeholder:text-slate-700 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-1 sm:px-6 flex-grow w-full mt-4">
        <div className="bg-slate-900/50 border border-white/5 rounded-xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
          <table className="w-full text-left border-collapse table-auto min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5 bg-white/5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-1.5 sm:px-8 py-3 w-10 sm:w-24 text-center">Rank</th>
                <th className="px-1.5 sm:px-8 py-3">PLAYER</th>
                <Header l="Rating" k="rating" a="center" />
                <Header l="Runs" k="runs" a="center" />
                <Header l="Wins" k="wins" a="center" />
                <Header l="Sets" k="sets" a="center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.length ? list.map(p => (
                <tr key={p.id} onClick={() => setSel(p)} className="group hover:bg-white/10 transition-all cursor-pointer active:scale-[0.99] origin-center">
                  <td className="px-1.5 sm:px-8 py-2.5 font-mono font-black text-xs sm:text-lg text-slate-500">
                    <div className="flex items-center justify-center">
                      {p.currentRank <= 3 && !search ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-9 sm:h-9 rounded-full shadow-lg ${p.currentRank === 1 ? 'bg-yellow-500 text-black' : p.currentRank === 2 ? 'bg-zinc-400 text-black' : 'bg-[#cd7f32] text-black'}`}>
                          {p.currentRank}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 sm:w-9 sm:h-9">
                          {p.currentRank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1.5 sm:px-8 py-2.5">
                    <div className="flex items-center gap-1.5 sm:gap-4">
                      <div className="shrink-0 w-6 h-6 sm:w-12 sm:h-12 rounded-md sm:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center font-bold text-[8px] sm:text-base text-blue-400 uppercase tracking-tighter">
                        {getInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-[10px] sm:text-base group-hover:text-blue-400 transition-colors leading-tight">
                          {p.name}
                        </div>
                        <div className="text-[7px] sm:text-[10px] font-black text-slate-400 tracking-tight uppercase italic">
                          {p.region || 'Indep.'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-1 sm:px-8 text-center font-mono font-bold text-[10px] sm:text-xl text-blue-400">{(p.rating || 0).toFixed(2)}</td>
                  <td className="px-1 sm:px-8 text-center text-slate-400 font-mono text-[9px] sm:text-base">{p.runs}</td>
                  <td className="px-1 sm:px-8 text-center text-slate-400 font-mono text-[9px] sm:text-base">{p.wins}</td>
                  <td className="px-1 sm:px-8 text-center text-slate-400 font-mono text-[9px] sm:text-base">{p.sets}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center text-slate-700 uppercase font-black text-[10px] tracking-widest italic">
                    {load ? 'Decrypting Protocol Matrix...' : 'No Official Records Detected'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
      <footer className="mt-12 text-center pb-12 opacity-30 select-none">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">APEX SPEED RUN</p>
      </footer>
    </div>
  );
}
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
