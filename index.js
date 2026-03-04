import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronsRight, Search, X, CornerUpLeft, CornerUpRight, 
  ChevronDown, Sun, Moon, MapPin, Globe, Instagram, Play, Trophy,
  Compass, Info, ChevronRight, Navigation, ShieldCheck,
  Video, HelpCircle, Building2, Map as MapIcon, GraduationCap, 
  HeartHandshake, Rocket, ExternalLink, Sparkles, ShoppingBag, 
  Users, MessageSquare, TrendingUp, Fingerprint, Zap,
  Dna, Ruler, Mountain, Calendar, AlertCircle, Timer
} from 'lucide-react';

// --- CONSTANTS ---
const SNAPSHOT_KEY = 'asr_data_vault_v1_integrated_v13'; 
const REFRESH_INTERVAL = 300000; // 5 mins
const SKOOL_LINK = "https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93";

// --- UTILITIES & HELPERS ---

const normalizeName = (n) => {
  if (!n) return "";
  return String(n)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9]/g, '')     
    .trim();
};

const normalizeCountryName = (name) => {
    let n = String(name || "").toUpperCase().trim();
    n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const map = {
        'UNITED STATES OF AMERICA': 'USA',
        'UNITED STATES': 'USA',
        'US': 'USA',
        'UNITED KINGDOM': 'UK',
        'GREAT BRITAIN': 'UK',
        'ENGLAND': 'UK',
        'SCOTLAND': 'UK',
        'WALES': 'UK',
        'NORTHERN IRELAND': 'UK',
        'SOUTH KOREA': 'KOREA',
        'REPUBLIC OF KOREA': 'KOREA',
        'RUSSIAN FEDERATION': 'RUSSIA',
        'THE NETHERLANDS': 'NETHERLANDS',
        'CZECH REPUBLIC': 'CZECHIA',
        'UNITED MEXICAN STATES': 'MEXICO',
        'MACAO': 'MACAU'
    };
    return map[n] || n;
};

const cleanNumeric = (v) => {
  if (v === undefined || v === null || v === "" || String(v).includes("#")) return null;
  const clean = String(v).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (clean === "") return null;
  const num = parseFloat(clean);
  return (isNaN(num)) ? null : num;
};

const parseLine = (line = '') => {
  const result = []; 
  let cur = '', inQuotes = false;
  for (let char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(cur.trim().replace(/^"|$/g, '')); cur = ''; }
    else cur += char;
  }
  result.push(cur.trim().replace(/^"|$/g, '')); 
  return result;
};

const fixCountryEntity = (name, flag) => {
    const n = (name || "").toUpperCase().trim();
    const f = (flag || "").trim();

    const flagFallbackMap = {
      "USA": "🇺🇸", "UNITED STATES": "🇺🇸", "UNITED STATES OF AMERICA": "🇺🇸",
      "UK": "🇬🇧", "UNITED KINGDOM": "🇬🇧", "GREAT BRITAIN": "🇬🇧",
      "CANADA": "🇨🇦", "MEXICO": "🇲🇽", "FRANCE": "🇫🇷", "GERMANY": "🇩🇪",
      "SPAIN": "🇪🇸", "ITALY": "🇮🇹", "JAPAN": "🇯🇵", "AUSTRALIA": "🇦🇺",
      "BRAZIL": "🇧🇷", "PUERTO RICO": "🇵🇷", "CZECHIA": "🇨🇿", "CZECH REPUBLIC": "🇨🇿",
      "NETHERLANDS": "🇳🇱", "SWITZERLAND": "🇨🇭", "AUSTRIA": "🇦🇹", "BELGIUM": "🇧🇪",
      "SWEDEN": "🇸🇪", "NORWAY": "🇳🇴", "FINLAND": "🇫🇮", "DENMARK": "🇩🇰",
      "KOREA": "🇰🇷", "SOUTH KOREA": "🇰🇷", "CHINA": "🇨🇳"
    };

    const finalName = n || "UNKNOWN";
    const finalFlag = (f && f !== "🏳️") ? f : (flagFallbackMap[finalName] || "🏳️");

    return { name: finalName, flag: finalFlag };
};

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

const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue; 
};

const isQualifiedAthlete = (p) => {
    if (!p) return false;
    return p.gender === 'M' ? (p.runs >= 4) : (p.runs >= 2);
};

const isNameInList = (name, listStr) => {
    if (!listStr || !name) return false;
    const parts = listStr.split(/[,&/]| and /i).map(n => n.trim().toLowerCase());
    return parts.includes(name.toLowerCase().trim());
};

// --- DATA CONSTANTS ---

const continents = {
  "eu": ["ALBANIA", "ANDORRA", "ARMENIA", "AUSTRIA", "AZERBAIJAN", "BELARUS", "BELGIUM", "BOSNIA AND HERZEGOVINA", "BULGARIA", "CROATIA", "CYPRIA", "CZECHIA", "CZECH REPUBLIC", "DENMARK", "ESTONIA", "FINLAND", "FRANCE", "GEORGIA", "GERMANY", "GREECE", "HUNGARY", "ICELAND", "IRELAND", "ITALY", "KAZAKHSTAN", "KOSOVO", "LATVIA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MALTA", "MOLDOVA", "MONACO", "MONTENEGRO", "NETHERLANDS", "NORTH MACEDONIA", "NORWAY", "POLAND", "PORTUGAL", "ROMANIA", "RUSSIA", "SAN MARINO", "SERBIA", "SLOVAKIA", "SLOVENIA", "SPAIN", "SWEDEN", "SWITZERLAND", "TURKEY", "UKRAINE", "UK", "UNITED KINGDOM"],
  "na": ["ANTIGUA AND BARBUDA", "BAHAMAS", "BARBADOS", "BELIZE", "CANADA", "COSTA RICA", "CUBA", "DOMINICA", "DOMINICAN REPUBLIC", "EL SALVADOR", "GRENADA", "GUATEMALA", "HAITI", "HONDURAS", "JAMAICA", "MEXICO", "NICARAGUA", "PANAMA", "SAINT KITTS AND NEVIS", "SAINT LUCIA", "SAINT VINCENT AND THE GRENADINES", "TRINIDAD AND TOBAGO", "USA", "UNITED STATES", "PUERTO RICO"],
  "sa": ["ARGENTINA", "BOLIVIA", "BRAZIL", "CHILE", "COLOMBIA", "ECUADOR", "GUYANA", "PARAGUAY", "PERU", "SURINAME", "URUGUAY", "VENEZUELA"],
  "as": ["AFGHANISTAN", "BAHRAIN", "BANGLADESH", "BHUTAN", "BRUNEI", "CAMBODIA", "CHINA", "INDIA", "INDONESIA", "IRAN", "IRAQ", "ISRAEL", "JAPAN", "JORDAN", "KOREA", "SOUTH KOREA", "KUWAIT", "KYRGYZSTAN", "LAOS", "LEBANON", "MALAYSIA", "MALDIVES", "MONGOLIA", "MYANMAR", "NEPAL", "OMAN", "PAKISTAN", "PALESTINE", "PHILIPPINES", "QATAR", "SAUDI ARABIA", "SINGAPORE", "SRI LANKA", "SYRIA", "TAIWAN", "TAJIKISTAN", "THAILAND", "TIMOR-LESTE", "TURKMENISTAN", "UNITED ARAB EMIRATES", "UZBEKISTAN", "VIETNAM", "YEMEN"],
  "af": ["ALGERIA", "ANGOLA", "BENIN", "BOTSWANA", "BURKINA FASO", "BURUNDI", "CABO VERDE", "CAMEROON", "CENTRAL AFRICAN REPUBLIC", "CHAD", "COMOROS", "CONGO", "DJIBOUTI", "EGYPT", "EQUATORIAL GUINEA", "ERITREA", "ESWATINI", "ETHIOPIA", "GABON", "GAMBIA", "GHANA", "IVORY COAST", "KENYA", "LESOTHO", "LIBERIA", "LIBYA", "MADAGASCAR", "MALAWI", "MALI", "MAURITANIA", "MAURITIUS", "MOROCCO", "MOZAMBIQUE", "NAMIBIA", "NIGER", "NIGERIA", "RWANDA", "SAO TOME AND PRINCIPE", "SENEGAL", "SEYCHELLES", "SIERRA LEONE", "SOMALIA", "SOUTH AFRICA", "SOUTH SUDAN", "SUDAN", "TANZANIA", "TOGO", "TUNISIA", "UGANDA", "ZAMBIA", "ZIMBABWE"],
  "oc": ["AUSTRALIA", "FIJI", "KIRIBATI", "MARSHALL ISLANDS", "MICRONESIA", "NAURU", "NEW ZEALAND", "PALAU", "PAPUA NEW GUINEA", "SAMOA", "SOLOMON ISLANDS", "TONGA", "TUVALU", "VANUATU"]
};

const getContinentData = (country) => {
    const c = normalizeCountryName(country);
    const regionMap = {
        'eu': { name: 'EUROPE', flag: '🌍' },
        'na': { name: 'NORTH AMERICA', flag: '🌎' },
        'sa': { name: 'SOUTH AMERICA', flag: '🌎' },
        'as': { name: 'ASIA', flag: '🌏' },
        'oc': { name: 'AUSTRALIA / OCEANIA', flag: '🌏' },
        'af': { name: 'AFRICA', flag: '🌍' }
    };

    for (const [regionCode, countriesArr] of Object.entries(continents)) {
        if (countriesArr.includes(c)) return regionMap[regionCode];
    }
    return { name: 'OTHER', flag: '🌐' };
};

const getFireCountForRun = (time, gender) => {
  if (time === null || time === undefined) return 0;
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

// --- STYLES ---

const CustomStyles = () => (
  <style>{`
    @keyframes subtle-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }
    .animate-subtle-pulse { animation: subtle-pulse 3s infinite ease-in-out; }
    
    .glow-gold { text-shadow: 0 0 12px rgba(212, 175, 55, 0.7); }
    .glow-blue { text-shadow: 0 0 15px rgba(37, 99, 235, 0.7); }
    
    .num-col { font-variant-numeric: tabular-nums; }
    
    .ios-clip-fix {
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      isolation: isolate;
      overflow: hidden;
      -webkit-mask-image: -webkit-radial-gradient(white, black);
    }

    .asr-cluster {
      background: rgba(37, 99, 235, 0.25) !important;
      backdrop-filter: blur(8px) !important;
      border: 3px solid #2563eb !important;
      border-radius: 50%;
      color: #2563eb !important;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      font-weight: 900 !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      transition: transform 0.1s ease;
      pointer-events: auto !important;
      z-index: 500 !important;
    }

    /* Fix for mobile scroll/drag and click issues */
    #asr-map-container {
      touch-action: pan-x pan-y !important;
      cursor: grab;
    }
    #asr-map-container:active {
      cursor: grabbing;
    }

    .leaflet-container {
        touch-action: pan-x pan-y !important;
        -webkit-tap-highlight-color: transparent;
    }

    .leaflet-marker-icon, 
    .leaflet-marker-shadow, 
    .leaflet-popup, 
    .leaflet-pane > svg path, 
    .leaflet-tile-container {
        pointer-events: auto !important;
    }

    .asr-marker-outer {
        cursor: pointer !important;
        pointer-events: auto !important;
        z-index: 1000 !important;
    }

    .asr-marker-container {
      cursor: pointer !important;
      pointer-events: none; /* Inner icon doesn't block marker interaction */
      -webkit-tap-highlight-color: transparent;
    }

    .btn-blue-gradient {
      background: rgba(37, 99, 235, 0.08);
      border: 2px solid rgba(37, 99, 235, 0.3);
      color: #2563eb;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1 !important;
    }
    .btn-blue-gradient:hover {
      background: rgba(37, 99, 235, 0.15);
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    }
    .btn-blue-gradient:active { transform: scale(0.96); }
    .btn-blue-gradient.active {
      background: linear-gradient(145deg, #3b82f6, #2563eb);
      color: white;
      border-color: #2563eb;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
    }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    .stat-card-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 4px;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.4;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      pointer-events: none;
      opacity: 0;
      transition: all 0.2s ease-out;
      z-index: 100;
      width: 200px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    }
    .stat-card-container:hover .stat-card-tooltip {
      opacity: 1;
      transform: translateX(-50%) translateY(-2px);
    }
    
    .textured-surface { position: relative; overflow: hidden; }
    .textured-surface::after {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.12;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    }

    .promo-card {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      position: relative;
      overflow: hidden;
    }

    .leaflet-popup-content-wrapper {
        border-radius: 1.5rem !important;
        padding: 0 !important;
        overflow: hidden !important;
        box-shadow: 0 10px 40px -10px rgba(0,0,0,0.4) !important;
        backdrop-filter: blur(12px) !important;
        background: rgba(255, 255, 255, 0.98) !important;
        pointer-events: auto !important;
    }
    .dark .leaflet-popup-content-wrapper {
        background: rgba(10, 10, 12, 0.95) !important;
        border: 2px solid rgba(255, 255, 255, 0.15) !important;
    }
    .leaflet-popup-content { 
      margin: 0 !important; 
      pointer-events: auto !important;
    }
    .leaflet-popup-tip { display: none !important; }
    
    .shadow-premium { box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15); }
    .border-subtle { border-color: rgba(0,0,0,0.1); }
    .dark .border-subtle { border-color: rgba(255,255,255,0.12); }

    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --prestige-gold: #D4AF37;
    }
    
    html, body {
      height: 100%;
      height: 100dvh;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: #000;
    }

    .animate-spin-slow { animation: spin 8s linear infinite; }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `}</style>
);

// --- ATOMIC UI COMPONENTS ---

const IconSpeed = ({ size = 24, className = "" }) => <ChevronsRight size={size} strokeWidth={2.5} className={`overflow-visible shrink-0 transition-colors ${className}`} style={{ transform: 'skewX(-18deg)' }} />;
const IconSearch = ({ size = 16, className = "" }) => <Search size={size} strokeWidth={2.5} className={`text-current shrink-0 ${className}`} />;
const IconX = ({ size = 20, className = "" }) => <X size={size} strokeWidth={2.5} className={`shrink-0 ${className}`} />;
const IconCornerUpLeft = ({ size = 20, className = "" }) => <CornerUpLeft size={size} strokeWidth={2.5} className={`shrink-0 transition-colors ${className}`} />;
const IconCornerUpRight = ({ size = 20, className = "" }) => <CornerUpRight size={size} strokeWidth={2.5} className={`shrink-0 transition-colors ${className}`} />;
const IconArrow = ({ direction }) => <ChevronDown size={16} strokeWidth={3} className={`transition-transform duration-500 shrink-0 ${direction === 'ascending' ? 'rotate-180' : ''}`} />;
const IconSun = () => <Sun size={14} strokeWidth={2.5} className="shrink-0" />;
const IconMoon = () => <Moon size={14} strokeWidth={2.5} className="shrink-0" />;

const ASRSectionHeading = ({ children, theme, className = "" }) => (
    <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] px-1 sm:px-2 mb-4 opacity-70 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'} ${className}`}>
        {children}
    </h3>
);

const IconVideoPlay = ({ size = 16, className = "" }) => (
  <div className="flex items-center justify-center w-full h-full">
    <Play 
      size={size} 
      strokeWidth={2} 
      className={`shrink-0 transition-colors ${className}`} 
    />
  </div>
);

const FallbackAvatar = ({ name, sizeCls = "text-xl sm:text-4xl", initialsOverride = "" }) => {
  const GRADIENTS = [
    'from-blue-600 to-indigo-700', 'from-emerald-600 to-cyan-700',
    'from-cyan-600 to-blue-700', 'from-teal-600 to-emerald-700',
    'from-violet-700 to-purple-700', 'from-blue-500 to-indigo-500',
    'from-sky-600 to-blue-700', 'from-indigo-600 to-purple-700'
  ];
  
  const stringToHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
  };

  const getInitials = (n) => {
    if (!n) return '??'; 
    if (initialsOverride) return initialsOverride.toUpperCase();
    const w = n.trim().split(/\s+/).filter(Boolean);
    if (w.length === 0) return '??';
    return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : n.slice(0, 2)).toUpperCase();
  };

  const hash = stringToHash(name || "");
  const grad = GRADIENTS[hash % GRADIENTS.length];

  return (
    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black drop-shadow-md rounded-inherit ${sizeCls} textured-surface ios-clip-fix`}>
      <span className="relative z-10">{getInitials(name)}</span>
    </div>
  );
};

const formatLocationSubtitle = (namesStr, flagsStr, prefix = '') => {
    if (!namesStr && !flagsStr) return <div className="whitespace-nowrap overflow-hidden text-ellipsis text-inherit font-black">UNKNOWN 🏳️</div>;
    if (!namesStr) return <div className="whitespace-nowrap overflow-hidden text-ellipsis text-inherit font-black">{flagsStr}</div>;
    const names = String(namesStr).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    const flagsMatch = String(flagsStr || '').match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]|🏳️/g) || [];
    
    return (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis text-inherit font-black">
            {names.map((name, i) => {
                const flag = flagsMatch[i] || flagsMatch[0] || '';
                return <span key={i} className="text-inherit">{i > 0 ? ' / ' : prefix}{name} {flag}</span>;
            })}
        </div>
    );
};

const ASRRankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = rank === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-10 sm:h-10';
  const textClass = size === 'lg' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm';
  const isPodium = rank === 1 || rank === 2 || rank === 3;
  const styles = {
    1: { border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]' },
    2: { border: 'border-zinc-400', text: 'text-zinc-600 dark:text-zinc-400', glow: 'shadow-[0_0_15px_rgba(161,161,170,0.3)]' },
    3: { border: 'border-[#CE8946]', text: 'text-[#CE8946]', glow: 'shadow-[0_0_15px_rgba(206,137,70,0.4)]' },
    unranked: { border: 'border-none', text: 'text-slate-500', glow: 'shadow-none' },
    default: { border: 'border-none', text: theme === 'dark' ? 'text-white' : 'text-black', glow: 'shadow-none' }
  };
  const current = isUnranked ? styles.unranked : (styles[rank] || styles.default);
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-500 shrink-0 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[3px] animate-subtle-pulse' : 'border-0'} ios-clip-fix`}>
      {rankNum}
    </span>
  );
};

const ASRPerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-blue" };
    return <span className={`inline-flex items-center gap-1 text-xs select-none shrink-0 ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const ASRStatCard = ({ label, value, theme, colorClass, glowClass, tooltip, icon }) => {
  return (
    <div className={`stat-card-container relative flex flex-col border p-3 sm:p-5 rounded-3xl transition-all ${theme === 'dark' ? 'bg-black/40 border-white/20' : 'bg-white border-slate-300 shadow-md'} ${tooltip ? 'cursor-help' : ''}`}>
        {tooltip && (
          <div className={`stat-card-tooltip ${theme === 'dark' ? 'bg-slate-800 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-900 shadow-xl'}`}>
            {tooltip}
          </div>
        )}
        <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 opacity-60 text-inherit whitespace-nowrap overflow-hidden shrink-0`}>
            {label}
            {tooltip && <HelpCircle size={9} className="opacity-60" />}
        </span>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0">
          {icon && <span className="text-xs sm:text-sm shrink-0 mb-0.5">{icon}</span>}
          <span className={`text-[12px] sm:text-[18px] lg:text-[22px] font-mono font-black num-col leading-tight break-all ${colorClass || ''} ${glowClass || ''}`}>{value}</span>
        </div>
    </div>
  );
};

const ASRRecordsBlock = ({ mRecord, fRecord, theme }) => {
  const timeColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const labelColor = theme === 'dark' ? 'text-white/40' : 'text-slate-600';
  return (
    <div className="flex flex-col items-end font-mono leading-tight tabular-nums min-w-[75px] sm:min-w-[100px]">
        <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${labelColor}`}>M:</span>
            <span className={`text-xs sm:text-[15px] font-black num-col ${timeColor}`}>
                {typeof mRecord === 'number' ? mRecord.toFixed(2) : '-'}
            </span>
        </div>
        <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${labelColor}`}>W:</span>
            <span className={`text-xs sm:text-[15px] font-black num-col ${timeColor}`}>
                {typeof fRecord === 'number' ? fRecord.toFixed(2) : '-'}
            </span>
        </div>
    </div>
  );
};

const ASRCourseCard = ({ course, theme, onClick, accentColor = 'text-blue-600', isPerformance = false, perfData = {} }) => {
    const videoToUse = isPerformance ? perfData.videoUrl : course.demoVideo;
    
    return (
        <div onClick={onClick} className={`flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-black/30 border-white/20' : 'bg-white border-slate-300 shadow-md'} ios-clip-fix h-[72px]`}>
            <div className="flex items-center gap-3 pr-4 min-w-0 flex-1">
                {course.coordinates ? (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.coordinates)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2.5 rounded-xl transition-all text-slate-500 hover:text-blue-600 hover:scale-110 active:scale-90`}
                    title="View on Google Maps"
                  >
                    <MapPin size={22} strokeWidth={2.5} />
                  </a>
                ) : (
                  <div className={`p-2.5 rounded-xl text-slate-400/30`}>
                      <MapPin size={22} strokeWidth={2.5} />
                  </div>
                )}
                
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-[16px] font-black uppercase text-ellipsis overflow-hidden whitespace-nowrap leading-none transition-colors`}>{course.name}</span>
                    </div>
                    <div className="flex flex-col mt-1 gap-0.5">
                      <div className="opacity-60 text-[10px] sm:text-xs font-black uppercase flex items-center gap-1">
                        {course.city || 'Unknown'} {course.flag}
                      </div>
                      {isPerformance && (perfData.rank > 0 || perfData.fireCount > 0) && (
                        <div className="flex items-center gap-1 opacity-80 h-4">
                            {perfData.rank > 0 && perfData.rank <= 3 && <ASRPerformanceBadge type={perfData.rank} />}
                            {perfData.fireCount > 0 && <ASRPerformanceBadge type="fire" count={perfData.fireCount} />}
                        </div>
                      )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end min-w-[70px] sm:min-w-[90px] text-right">
                    {isPerformance ? (
                        <>
                            <span className={`text-xs sm:text-[16px] font-mono font-black num-col ${accentColor}`}>
                                {typeof perfData.points === 'number' ? perfData.points.toFixed(2) : '0.00'}
                            </span>
                            <span className="text-[10px] font-mono font-black num-col opacity-60">
                                {typeof perfData.num === 'number' ? perfData.num.toFixed(2) : '0.00'}
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="text-[9px] font-black opacity-60 uppercase">RUNS</span>
                            <div className={`text-xs sm:text-[16px] font-mono font-black num-col ${accentColor}`}>
                                {course.totalAllTimeRuns || 0}
                            </div>
                        </>
                    )}
                </div>
                <div className="w-10 sm:w-12 flex items-center justify-center shrink-0">
                    {videoToUse ? (
                        <a 
                            href={videoToUse} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={e => e.stopPropagation()} 
                            className={`p-2.5 rounded-xl transition-all hover:scale-120 text-slate-500 hover:text-blue-600 flex items-center justify-center`}
                        >
                            <IconVideoPlay size={22} />
                        </a>
                    ) : (
                        <div className="p-2.5" />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- PROMOTIONAL & CTA COMPONENTS ---

const ASRPromotionBanner = ({ type, theme }) => {
  const configs = {
    setter: {
      title: "COURSE SETTER CERTIFICATION",
      subtitle: "Become an Apex certified speed parkour course setter.",
      icon: <GraduationCap className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET STARTED"
    },
    coach: {
      title: "SPEED PARKOUR COACHING CERTIFICATION",
      subtitle: "Become an Apex certified speed parkour specialist.",
      icon: <ShieldCheck className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET STARTED"
    },
    masterclass: {
        title: "VERIFY YOUR RUN",
        subtitle: "Get your runs verified for free in the Apex Skool app.",
        icon: <Zap className="text-white" size={24} />,
        link: SKOOL_LINK,
        btnText: "GET VERIFIED"
    },
    community: {
        title: "JOIN APEX SKOOL APP",
        subtitle: "Join the Apex worldwide community.",
        icon: <Users className="text-white" size={24} />,
        link: SKOOL_LINK,
        btnText: "JOIN NOW"
    }
  };

  const config = configs[type];
  if (!config) return null;

  return (
    <a 
      href={config.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="group block w-full my-4 px-6 py-8 sm:py-10 rounded-[2.5rem] sm:rounded-[3rem] promo-card textured-surface shadow-2xl hover:scale-[0.99] transition-all duration-300 ios-clip-fix"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/30 rounded-2xl backdrop-blur-md">
            {config.icon}
          </div>
          <div className="flex flex-col text-left">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tighter leading-none mb-2">{config.title}</h3>
            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-90">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl group-hover:bg-blue-50 transition-colors whitespace-nowrap">
          {config.btnText} <ChevronRight size={14} strokeWidth={3} />
        </div>
      </div>
    </a>
  );
};

const ASRPatronPill = ({ course, theme, compact = false }) => {
    const isMillennium = course.name?.toUpperCase() === 'MILLENNIUM';
    
    // Prestige Gold Theme - #D4AF37
    const goldBg = theme === 'dark' ? 'bg-gradient-to-br from-[#D4AF37]/15 to-[#D4AF37]/5' : 'bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5';
    const goldBorder = theme === 'dark' ? 'border-[#D4AF37]/50' : 'border-[#D4AF37]/60';
    const goldTextPrimary = theme === 'dark' ? 'text-[#D4AF37]' : 'text-[#A68928]';
    const goldTextSecondary = theme === 'dark' ? 'text-[#D4AF37]/60' : 'text-[#A68928]/70';
    const goldIconBg = 'bg-[#D4AF37]';
    const goldIconText = 'text-white';

    const fadedBg = theme === 'dark' ? 'bg-slate-800/20' : 'bg-slate-100/80';
    const fadedBorder = theme === 'dark' ? 'border-white/10' : 'border-slate-300';
    const fadedTextPrimary = theme === 'dark' ? 'text-slate-400' : 'text-slate-600';
    const fadedTextSecondary = theme === 'dark' ? 'text-slate-500' : 'text-slate-400';

    if (!compact) {
      if (isMillennium) {
        return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`w-full flex items-center gap-4 px-5 py-3 rounded-[1.5rem] border backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl shrink-0 transition-all hover:scale-[1.01] active:scale-[0.99] group ${goldBg} ${goldBorder} ios-clip-fix h-[72px]`}>
              <div className="relative">
                <div className={`w-9 h-9 rounded-full ${goldIconBg} flex items-center justify-center text-[10px] ${goldIconText} font-black italic shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:rotate-12 transition-transform`}>JB</div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#D4AF37] border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center shadow-sm">
                   <ShieldCheck size={10} className="text-white" />
                </div>
              </div>
              <div className="flex flex-col flex-1 text-left">
                  <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.25em] ${goldTextSecondary} opacity-90 leading-none`}>OFFICIAL SPONSOR</span>
                  <span className={`text-[12px] sm:text-[14px] font-black uppercase tracking-tighter ${goldTextPrimary} mt-0.5`}>Juicebox.money | Fund Your Thing</span>
              </div>
          </a>
        );
      }
      
      return (
        <a href={`mailto:apexmovement@gmail.com?subject=Course Sponsorship Enquiry: ${course.name}`} className={`w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-3 rounded-[1.5rem] border transition-all duration-300 hover:scale-[1.005] group ${fadedBg} ${fadedBorder} shadow-sm hover:shadow-lg ios-clip-fix h-[72px]`}>
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <div className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-700/50 text-slate-500' : 'bg-white text-slate-400 shadow-sm'} group-hover:text-[#D4AF37]`}>
                <Building2 size={16} />
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] ${fadedTextSecondary} leading-tight`}>Course Partnership Available</span>
                <span className={`text-[10px] sm:text-[12px] font-black uppercase tracking-tighter ${fadedTextPrimary} group-hover:text-[#D4AF37] transition-colors leading-tight`}>ADOPT A COURSE, SUPPORT THE PROJECT</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-white/10 text-slate-500 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37]' : 'border-slate-300 text-slate-400 group-hover:border-[#D4AF37] group-hover:text-[#D4AF37]'} whitespace-nowrap`}>
              ENQUIRE
            </div>
        </a>
      );
    }

    if (isMillennium) {
      return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.05] active:scale-95 group shadow-md ${goldBg} ${goldBorder} ios-clip-fix h-[50px]`}>
              <div className={`w-5 h-5 rounded-full ${goldIconBg} flex items-center justify-center text-[8px] ${goldIconText} font-black italic shadow-[0_0_5px_rgba(212,175,55,0.3)]`}>JB</div>
              <div className="flex flex-col text-left">
                  <span className={`text-[7px] font-black uppercase tracking-widest ${goldTextSecondary} opacity-80 leading-none`}>Sponsor</span>
                  <span className={`text-[10px] font-black uppercase tracking-tight ${goldTextPrimary}`}>Juicebox.money</span>
              </div>
          </a>
      );
    }
    return null;
};

const ASRInlineValueCard = ({ theme, type }) => {
  const cards = {
    skool_training: {
      title: "Apex Global Network",
      desc: "Join our worldwide network on Apex Skool app.",
      icon: <Users size={18} />,
      link: SKOOL_LINK,
      btn: "JOIN NOW"
    },
    shop_gear: {
      title: "Verify Your Run",
      desc: "Submit and verify your video proof via Apex Skool app.",
      icon: <Video size={18} />,
      link: SKOOL_LINK,
      btn: "GET VERIFIED"
    },
    pro_setter: {
        title: "Course Setter Certification",
        desc: "Take the course setter certification on Apex Skool app.",
        icon: <GraduationCap size={18} />,
        link: SKOOL_LINK,
        btn: "LEARN MORE"
    }
  };
  const c = cards[type];
  if (!c) return null;
  return (
    <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.005] textured-surface ${theme === 'dark' ? 'bg-blue-900/20 border-blue-500/40' : 'bg-blue-50 border-blue-300 shadow-md'} ios-clip-fix h-[72px]`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white dark:bg-black/60 rounded-2xl shadow-sm text-blue-600">{c.icon}</div>
        <div className="text-left">
          <h5 className="text-xs font-black uppercase tracking-tight">{c.title}</h5>
          <p className="text-[10px] font-black opacity-60 uppercase">{c.desc}</p>
        </div>
      </div>
      <a href={c.link} target="_blank" className="shrink-0 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl whitespace-nowrap">
        {c.btn}
      </a>
    </div>
  );
};

// --- MODALS ---

const ASROnboarding = ({ isOpen, onClose, theme }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      title: "How to get started",
      desc: "Because our courses are set in outdoor, public spaces, anyone can start anytime.",
      icon: <Compass size={44} className="text-blue-500" />
    },
    {
      title: "1. Find a course",
      desc: "Use our map and course guides to find a course near you. Join Apex Skool app to access the latest ASR resources.",
      icon: <Compass size={44} className="text-blue-500" />
    },
    {
      title: "2. Film your run",
      desc: "Video proof is everything. Check Apex Skool app for filming requirements and official rules to ensure that your best runs count.",
      icon: <Video size={44} className="text-blue-600" />
    },
    {
      title: "3. Get verified",
      desc: "Post your fastest runs in Apex Skool app for official review. Once verified, your stats will update and broadcast live on our website.",
      icon: <ShieldCheck size={44} className="text-blue-600" />,
      action: "JOIN APEX SKOOL APP"
    }
  ];

  const nextStep = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className={`w-full max-w-xl rounded-[3rem] p-8 sm:p-14 border ${theme === 'dark' ? 'bg-[#000000] border-white/20' : 'bg-white border-slate-300'} shadow-[0_0_100px_rgba(0,0,0,0.6)] relative overflow-hidden ios-clip-fix`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        {step > 0 && (
          <button onClick={prevStep} className="absolute top-8 left-8 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20" title="Go Back">
            <IconCornerUpLeft size={24} />
          </button>
        )}

        <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20">
          <IconX size={24} />
        </button>
        
        <div className="flex flex-col items-center text-center space-y-10 relative z-10 pt-12 sm:pt-0">
          <div className={`p-7 rounded-[2.5rem] textured-surface bg-blue-500/10 animate-subtle-pulse mx-auto flex items-center justify-center`}>
            {React.cloneElement(steps[step].icon, { className: "relative z-10" })}
          </div>
          
          <div className="space-y-5">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.9]">
              {steps[step].title}
            </h2>
            <p className="text-lg sm:text-xl font-black opacity-70 leading-relaxed max-w-md text-inherit">
              {steps[step].desc}
            </p>
          </div>
          
          <div className="flex gap-2.5 py-2 justify-center">
            {steps.map((_, i) => (
              <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${i === step ? 'w-14 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'w-4 bg-current opacity-20'}`} />
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex gap-4 w-full">
              {steps[step].action ? (
                <a 
                  href={SKOOL_LINK} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 text-xs sm:text-sm shadow-2xl whitespace-nowrap"
                >
                  {steps[step].action} <CornerUpRight size={20} />
                </a>
              ) : (
                <button 
                  onClick={nextStep} 
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 text-xs sm:text-sm shadow-2xl whitespace-nowrap"
                >
                  Next <ChevronRight size={20} />
                </button>
              )}
            </div>
            
            <button onClick={onClose} className="text-[11px] font-black uppercase opacity-60 hover:opacity-100 transition-opacity tracking-widest py-2 px-1">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ASRBaseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, theme, header, breadcrumbs, onBreadcrumbClick, children }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-xl bg-black/90 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#050505] border-white/20 text-slate-100' : 'bg-[#f1f5f9] border-slate-400 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.7)] scale-100 animate-in fade-in zoom-in-[0.98] duration-300 ease-out flex flex-col max-h-[94vh] ios-clip-fix`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 flex flex-col p-6 sm:p-8 lg:p-10 gap-6 bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/40' : 'from-slate-300/60'} to-transparent relative`}>
          <div className="flex items-start justify-between gap-4 z-10 w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <button aria-label="Go Back" onClick={onBack} className={`group p-2.5 sm:p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all shrink-0`} title="Go Back">
                      <IconCornerUpLeft size={18} className={`text-slate-200 group-hover:text-white transition-colors`} />
                  </button>
                  {canGoForward && (
                      <button aria-label="Go Forward" onClick={onForward} className={`group p-2.5 sm:p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all shrink-0`} title="Go Forward">
                          <IconCornerUpRight size={18} className={`text-slate-200 group-hover:text-white transition-colors`} />
                      </button>
                  )}
                  {breadcrumbs && breadcrumbs.length > 0 && (
                      <div className={`ml-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap px-4 py-2.5 rounded-full border shadow-xl shrink min-w-0 ${theme === 'dark' ? 'bg-black/60 border-white/20 text-white' : 'bg-white/80 border-slate-400 text-slate-900'}`}>
                          {breadcrumbs.map((b, i) => (
                              <React.Fragment key={i}>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onBreadcrumbClick(i); }}
                                      disabled={i === breadcrumbs.length - 1}
                                      className={`transition-colors outline-none whitespace-nowrap ${i === breadcrumbs.length - 1 ? 'opacity-100 font-black' : 'opacity-40 cursor-pointer hover:opacity-100 active:opacity-75'}`}
                                  >
                                      {String(b).toUpperCase()}
                                  </button>
                                  {i < breadcrumbs.length - 1 && <span className="opacity-30 shrink-0 mx-1">/</span>}
                              </React.Fragment>
                          ))}
                      </div>
                  )}
              </div>
              <button aria-label="Close Modal" onClick={onClose} className="p-2.5 sm:p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all shrink-0" title="Close">
                  <IconX size={18} />
              </button>
          </div>
          <div className="w-full pt-1 sm:pt-0">
            {header}
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-12 scrollbar-hide ${theme === 'dark' ? 'bg-[#000000]' : 'bg-slate-100'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// --- DATA LOGIC HOOKS ---

const useASRData = () => {
  const [state, setState] = useState({
    data: [], openData: [], atPerfs: {}, opPerfs: {},
    lbAT: {M:{},F:{}}, lbOpen: {M:{},F:{}}, atMet: {}, dnMap: {}, cMet: {}, settersData: [],
    atRawBest: {}, opRawBest: {},
    isLoading: true, hasError: false, hasPartialError: false
  });

  const fetchData = useCallback(async () => {
    try {
        const cached = localStorage.getItem(SNAPSHOT_KEY);
        if (cached) {
            const parsedCache = JSON.parse(cached);
            setState(prev => ({ ...prev, ...parsedCache, isLoading: false }));
        }
    } catch (e) { console.warn("Cache recovery fail-safe."); }

    const cacheBucket = Math.floor(Date.now() / REFRESH_INTERVAL); 
    const getCsv = (q) => encodeURI(`https://docs.google.com/spreadsheets/d/1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4/gviz/tq?tqx=out:csv&${q}&cb=${cacheBucket}`);

    const safeFetch = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) { return null; } 
    };

    try {
      const [rM, rF, rLive, rSet, rSettersM, rSettersF] = await Promise.all([
        safeFetch(getCsv('sheet=RANKINGS (M)')),
        safeFetch(getCsv('sheet=RANKINGS (F)')),
        safeFetch(getCsv('gid=623600169')),
        safeFetch(getCsv('gid=1961325686')),
        safeFetch(getCsv('gid=595214914')),
        safeFetch(getCsv('gid=566627843'))
      ]);
      
      const hasTotalError = rM === null && rF === null && rLive === null;
      const hasPartialError = !hasTotalError && (rM === null || rF === null || rLive === null || rSet === null);

      const processRankingData = (csv, gender) => {
        if (!csv) return [];
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
        const igIdx = findIdx(['ig', 'instagram', 'social']);
        const avgIdx = findIdx(['avg time', 'average', 'avg']);

        return lines.slice(hIdx + 1).map((line, i) => {
          const vals = parseLine(line); 
          const pName = (vals[nameIdx] || "").trim();
          if (pName.length < 2) return null; 
          const rawCountry = countryNameIdx !== -1 ? vals[countryNameIdx]?.trim() : "";
          const rawFlag = flagEmojiIdx !== -1 ? (vals[flagEmojiIdx]?.trim() || "🏳️") : "🏳️";
          const fixed = fixCountryEntity(rawCountry, rawFlag);
          
          let rawIg = igIdx !== -1 ? (vals[igIdx] || "") : "";
          rawIg = rawIg.replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\?.*/, '').replace(/@/g, '').replace(/\/$/, '').trim();

          const searchKey = `${pName} ${fixed.name} ${rawIg}`.toLowerCase();

          return { 
            id: `${gender}-${normalizeName(pName)}-${i}`, 
            name: pName, pKey: normalizeName(pName), gender, 
            countryName: fixed.name, 
            region: fixed.flag, 
            igHandle: rawIg,
            rating: cleanNumeric(vals[ratingIdx]) || 0, runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
            wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), pts: cleanNumeric(vals[ptsIdx]) || 0, 
            sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
            contributionScore: cleanNumeric(vals[cIdx]) || 0, totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0,
            avgTime: cleanNumeric(avgIdx !== -1 ? vals[avgIdx] : vals[14]) || 0,
            searchKey
          };
        }).filter(p => p !== null);
      };

      const processSetListData = (csv) => {
          if (!csv) return {};
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
          const dateSetIdx = findIdx(['set on', 'updated', 'date set']);
          const demoIdx = findIdx(['demo', 'rules', 'video', 'url']);
          const coordsIdx = findIdx(['coord', 'gps', 'location', 'pin']);
          const stateIdx = findIdx(['state', 'prov', 'region']); 
          const leadsIdx = findIdx(['lead', 'lead setter', 'leads', 'leadsetters']);
          const assistsIdx = findIdx(['assistant', 'assistants', 'assistant setter', 'assistantsetters']);
          
          const map = {};
          lines.slice(1).forEach(l => {
              const vals = parseLine(l);
              const course = (vals[courseIdx] || "").trim().toUpperCase();
              if (course) {
                  const rawCountry = (vals[countryIdx] || "").trim();
                  const rawFlag = (vals[flagIdx] || "").trim();
                  const fixed = fixCountryEntity(rawCountry, rawFlag);
                  const leadSetters = leadsIdx !== -1 ? (vals[leadsIdx] || "").trim() : "";
                  const assistantSetters = assistsIdx !== -1 ? (vals[assistsIdx] || "").trim() : "";
                  const coordinates = coordsIdx !== -1 ? (vals[coordsIdx] || "").trim() : "";
                  const stateProv = stateIdx !== -1 ? (vals[stateIdx] || "").trim().toUpperCase() : "";

                  const valAG = String(vals[32] || "").toUpperCase().trim();
                  const is2026 = valAG === 'YES' || valAG === 'TRUE' || valAG.includes('OPEN');

                  map[course] = { 
                      is2026, 
                      flag: fixed.flag || '🏳️',
                      city: (vals[cityIdx] || "").trim().toUpperCase() || "UNKNOWN", 
                      stateProv: stateProv,
                      country: fixed.name.toUpperCase() || "UNKNOWN", 
                      difficulty: (vals[ratingIdx] || "").trim(),
                      length: (vals[lengthIdx] || "").trim(),
                      elevation: (vals[elevIdx] || "").trim(),
                      type: (vals[typeIdx] || "").trim(),
                      dateSet: (vals[dateSetIdx] || "").trim(),
                      setter: leadSetters + (assistantSetters ? `, ${assistantSetters}` : ""),
                      leadSetters,
                      assistantsetters: assistantSetters,
                      demoVideo: demoIdx !== -1 ? (vals[demoIdx] || "").trim() : "",
                      coordinates,
                      searchKey: `${course} ${vals[cityIdx]} ${fixed.name}`.toLowerCase()
                  };
              }
          });
          return map;
      };

      const processSettersData = (csv) => {
          if (!csv) return [];
          const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
          if (lines.length < 1) return [];
          const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
          const nameIdx = headers.findIndex(h => h === 'setter' || h === 'name');
          const leadsIdx = headers.findIndex(h => h === 'leads' || h === 'leads');
          const assistsIdx = headers.findIndex(h => h === 'assist' || h === 'assists' || h === 'assistant');
          const setsIdx = headers.findIndex(h => h === 'sets' || h === 'total sets');
          const countryIdx = headers.findIndex(h => h === 'country' || h === 'nation');
          const flagIdx = headers.findIndex(h => h === 'flag' || h === 'emoji' || h === 'region');
          const igIdx = headers.findIndex(h => h === 'ig' || h === 'instagram');
          const contributionIdx = headers.findIndex(h => h === '🪙' || h.includes('contribution'));

          return lines.slice(1).map((line, i) => {
              const vals = parseLine(line);
              const name = vals[nameIdx];
              if (!name) return null;
              const fixed = fixCountryEntity(vals[countryIdx], vals[flagIdx]);
              return {
                  id: `setter-${normalizeName(name)}-${i}`,
                  name: name.trim(),
                  region: fixed.flag || '🏳️',
                  countryName: fixed.name,
                  igHandle: igIdx !== -1 ? (vals[igIdx] || "").replace(/@/g, '').trim() : "",
                  sets: setsIdx !== -1 ? (cleanNumeric(vals[setsIdx]) || 0) : 0,
                  leads: leadsIdx !== -1 ? (cleanNumeric(vals[leadsIdx]) || 0) : 0,
                  assists: assistsIdx !== -1 ? (cleanNumeric(vals[assistsIdx]) || 0) : 0,
                  contributionScore: contributionIdx !== -1 ? (cleanNumeric(vals[contributionIdx]) || 0) : 0
              };
          }).filter(p => p !== null);
      };

      const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
        const result = { allTimePerformances: {}, openPerformances: {}, openRankings: [], allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, atRawBest: {}, opRawBest: {} };
        if (!csv) return result;
        const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 1) return result;
        
        const OPEN_START = new Date('2026-03-02T00:00:00Z');
        const OPEN_END = new Date('2026-05-31T23:59:59Z');

        let headers = []; let hIdx = -1;
        for(let i=0; i<Math.min(10, lines.length); i++) {
          const tempHeaders = parseLine(lines[i]);
          if (tempHeaders.some(h => /athlete|name|course|track|pb|result/i.test(h))) { headers = tempHeaders; hIdx = i; break; }
        }
        if (hIdx === -1) return result;
        const findIdx = (keys) => headers.findIndex(h => keys.some(k => h.toLowerCase().includes(k)));
        
        const athleteIdx = Math.max(0, findIdx(['athlete', 'name', 'player']));
        const courseIdx = Math.max(0, findIdx(['course', 'track', 'level']));
        const resultIdx = Math.max(0, findIdx(['result', 'time', 'pb']));
        const genderIdx = findIdx(['div', 'gender', 'sex']);
        const dateIdx = findIdx(['date', 'day', 'timestamp']);
        const tagIdx = findIdx(['tag', 'event', 'category', 'season']);
        
        let videoIdx = findIdx(['proof', 'link']);
        if (videoIdx === -1) videoIdx = findIdx(['video', 'url']);
        if (headers.length >= 8 && headers[7].toLowerCase().includes('proof')) {
          videoIdx = 7;
        } else if (videoIdx === -1 && headers.length >= 8) {
          videoIdx = 7;
        }
        
        const allTimeAthleteBestTimes = {}; const allTimeCourseLeaderboards = { M: {}, F: {} };
        const openAthleteBestTimes = {}; const openCourseLeaderboards = { M: {}, F: {} }; 
        const openAthleteSetCount = {}; const athleteDisplayNameMap = {};

        lines.slice(hIdx + 1).forEach(line => {
          const vals = parseLine(line);
          const pName = (vals[athleteIdx] || "").trim();
          const rawCourse = (vals[courseIdx] || "").trim();
          const numericValue = cleanNumeric(vals[resultIdx]);
          const runDateStr = dateIdx !== -1 ? vals[dateIdx] : null;
          const runDate = runDateStr ? new Date(runDateStr) : null;
          const rawVideo = videoIdx !== -1 ? (vals[videoIdx] || "").trim() : "";
          const rawTag = tagIdx !== -1 ? (vals[tagIdx] || "") : "";
          if (!pName || !rawCourse || numericValue === null) return;
          
          const pKey = normalizeName(pName);
          const normalizedCourseName = rawCourse.toUpperCase();
          
          if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;
          
          const pGender = athleteMetadata[pKey]?.gender || ((genderIdx !== -1 && (vals[genderIdx] || "").toUpperCase().startsWith('F')) ? 'F' : 'M');
          if (!athleteMetadata[pKey]) {
              athleteMetadata[pKey] = { pKey, name: pName, gender: pGender, region: '🏳️', countryName: '', searchKey: pName.toLowerCase() };
          } else {
              if (pName.length > (athleteMetadata[pKey].name || "").length) {
                athleteMetadata[pKey].name = pName;
                athleteDisplayNameMap[pKey] = pName;
              }
          }
          
          if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
          if (!allTimeAthleteBestTimes[pKey][normalizedCourseName] || numericValue < allTimeAthleteBestTimes[pKey][normalizedCourseName].num) {
            allTimeAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue, videoUrl: rawVideo };
          }
          
          if (!allTimeCourseLeaderboards[pGender]) allTimeCourseLeaderboards[pGender] = {};
          if (!allTimeCourseLeaderboards[pGender][normalizedCourseName]) allTimeCourseLeaderboards[pGender][normalizedCourseName] = {};
          if (!allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] || numericValue < allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey]) {
              allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] = numericValue;
          }
          
          const isASROpenTag = rawTag.toUpperCase().includes("ASR OPEN") || rawTag.toUpperCase().includes("OPEN");
          const isValidDate = runDate && !isNaN(runDate.getTime());
          const isInOpenWindow = isValidDate && runDate >= OPEN_START && runDate <= OPEN_END;

          if (isASROpenTag || isInOpenWindow) {
            if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
            if (!openAthleteBestTimes[pKey][normalizedCourseName] || numericValue < openAthleteBestTimes[pKey][normalizedCourseName].num) {
              openAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue, videoUrl: rawVideo };
            }
            if (!openCourseLeaderboards[pGender]) openCourseLeaderboards[pGender] = {};
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
            let fireTotal = 0;
            res[pKey] = Object.entries(source[pKey]).map(([normL, data]) => {
              const boardValues = Object.values((allTimeCourseLeaderboards[pGender] || {})[normL] || {});
              const record = boardValues.length > 0 ? Math.min(...boardValues) : data.num;
              const board = (allTimeCourseLeaderboards[pGender] || {})[normL] || {};
              const sorted = Object.entries(board).sort((a, b) => a[1] - b[1]);
              const rank = sorted.findIndex(e => e[0] === pKey) + 1;
              const fires = getFireCountForRun(data.num, pGender);
              fireTotal += fires;
              return { label: data.label, value: data.value, num: data.num, rank, points: (record / data.num) * 100, videoUrl: data.videoUrl, fireCount: fires };
            });
            
            if (athleteMetadata[pKey]) {
              athleteMetadata[pKey].totalFireCount = fireTotal;
            }
          });
          return res;
        };
        
        result.allTimePerformances = buildPerfs(allTimeAthleteBestTimes);
        result.openPerformances = buildPerfs(openAthleteBestTimes);
        result.allTimeLeaderboards = allTimeCourseLeaderboards;
        result.openLeaderboards = openCourseLeaderboards;
        result.athleteDisplayNameMap = athleteDisplayNameMap;
        result.atRawBest = allTimeAthleteBestTimes;
        result.opRawBest = openAthleteBestTimes;

        result.openRankings = Object.keys(athleteMetadata).map(pKey => {
          const meta = athleteMetadata[pKey];
          const pGender = meta.gender || 'M';
          const perfs = result.openPerformances[pKey] || [];
          const totalPts = perfs.reduce((sum, p) => sum + p.points, 0);
          const totalFires = perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0);
          
          return {
            id: `open-${pKey}`, 
            name: meta.name || pKey, 
            pKey, 
            gender: pGender,
            rating: perfs.length > 0 ? (totalPts / perfs.length) : 0, 
            runs: perfs.length,
            wins: perfs.filter(p => p.rank === 1).length, 
            pts: totalPts, 
            sets: openAthleteSetCount[pKey] || 0,
            region: meta.region || '🏳️',
            allTimeRank: meta.allTimeRank || 9999,
            allTimeRating: meta.rating || 0,
            countryName: meta.countryName || "",
            igHandle: meta.igHandle || "",
            avgTime: meta.avgTime || 0,
            contributionScore: meta.contributionScore || 0,
            totalFireCount: totalFires,
            searchKey: meta.searchKey || pKey.toLowerCase()
          };
        }).sort((a, b) => b.rating - a.rating); 

        return result;
      };

      const pM = processRankingData(rM || "", 'M'); 
      const pF = processRankingData(rF || "", 'F');
      const initialMetadata = {};
      pM.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'M', allTimeRank: i + 1 });
      pF.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'F', allTimeRank: i + 1 });
      const processed = processLiveFeedData(rLive || "", initialMetadata, processSetListData(rSet || ""));
      
      const settersM = processSettersData(rSettersM || "");
      const settersF = processSettersData(rSettersF || "");
      const allSetters = [...settersM, ...settersF];
      
      const nextState = {
        data: [...pM, ...pF],
        openData: processed.openRankings,
        atPerfs: processed.allTimePerformances,
        opPerfs: processed.openPerformances,
        lbAT: processed.allTimeLeaderboards,
        lbOpen: processed.openLeaderboards,
        atMet: processed.athleteMetadata,
        dnMap: processed.athleteDisplayNameMap,
        cMet: processed.courseMetadata,
        settersData: allSetters,
        atRawBest: processed.atRawBest,
        opRawBest: processed.opRawBest,
        isLoading: false,
        hasError: hasTotalError,
        hasPartialError
      };

      setState(nextState);
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextState));

    } catch(e) { 
        setState(prev => ({ ...prev, isLoading: false, hasError: true, hasPartialError: false }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return state;
};

// --- DATA CALCULATION ---

const calculateCityStats = (rawCourseList) => {
    const cityMap = {};
    rawCourseList.forEach(c => {
        if (!cityMap[c.city]) cityMap[c.city] = { name: c.city, flag: c.flag, countryName: c.country, continent: c.continent, courses: 0, runs: 0, playersSet: new Set(), coords: c.coords };
        cityMap[c.city].courses++;
        cityMap[c.city].runs += c.totalRuns;
        (c.athletesM || []).forEach(a => cityMap[c.city].playersSet.add(a[0]));
        (c.athletesF || []).forEach(a => cityMap[c.city].playersSet.add(a[0]));
    });
    return Object.values(cityMap)
        .map(city => ({ ...city, players: city.playersSet.size }))
        .sort((a, b) => b.courses - a.courses);
};

const calculateCountryStats = (rawCourseList) => {
    const countryMap = {};
    rawCourseList.forEach(c => {
        const fixed = fixCountryEntity(c.country, c.flag);
        if (!countryMap[fixed.name]) countryMap[fixed.name] = { name: fixed.name, flag: fixed.flag, continent: c.continent, courses: 0, runs: 0, playersSet: new Set(), coords: c.coords };
        countryMap[fixed.name].courses++;
        countryMap[fixed.name].runs += c.totalRuns;
        (c.athletesM || []).forEach(a => countryMap[fixed.name].playersSet.add(a[0]));
        (c.athletesF || []).forEach(a => countryMap[fixed.name].playersSet.add(a[0]));
    });
    return Object.values(countryMap)
        .map(country => ({ ...country, players: country.playersSet.size }))
        .sort((a, b) => b.courses - a.courses);
};

const calculateContinentStats = (rawCourseList) => {
    const map = {};
    rawCourseList.forEach(c => {
        const contName = c.continent || 'OTHER';
        if (contName === 'GLOBAL') return;
        if (!map[contName]) map[contName] = { name: contName, flag: c.continentFlag || '🌐', courses: 0, runs: 0, playersSet: new Set(), coords: c.coords };
        map[contName].courses++;
        map[contName].runs += c.totalRuns;
        (c.athletesM || []).forEach(a => map[contName].playersSet.add(a[0]));
        (c.athletesF || []).forEach(a => map[contName].playersSet.add(a[0]));
    });
    return Object.values(map)
        .map(cont => ({ ...cont, players: cont.playersSet.size }))
        .sort((a, b) => b.courses - a.courses);
};

const calculateHofStats = (data, atPerfs, lbAT, atMet, medalSort, settersWithImpact) => {
    if (!data.length) return null;
    const qualifiedAthletes = data.filter(p => isQualifiedAthlete(p)).map(p => { 
        const performances = atPerfs[p.pKey] || []; 
        const calculatedFires = performances.reduce((sum, run) => sum + (run.fireCount || 0), 0);
        return { 
            ...p, 
            totalFireCount: calculatedFires,
            winPercentage: p.runs > 0 ? (p.wins / p.runs) * 100 : 0
        }; 
    });
    
    const medalsBase = {};
    const processMedals = (lb) => {
      if (!lb) return;
      Object.entries(lb).forEach(([courseName, athletes]) => {
        if (!athletes) return;
        const sorted = Object.entries(athletes).sort((a,b) => a[1]-b[1]);
        sorted.slice(0, 3).forEach(([pKey, time], rankIdx) => {
          const athlete = atMet[pKey] || {};
          const names = athlete.countryName ? athlete.countryName.split(/[,\/]/).map(s => s.trim().toUpperCase()).filter(Boolean) : ["UNKNOWN"];
          const flags = athlete.region ? (athlete.region.match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g) || [athlete.region]) : ['🏳️'];
          names.forEach((name, i) => {
            const fixed = fixCountryEntity(name, flags[i] || flags[0]);
            if (!medalsBase[fixed.name]) medalsBase[fixed.name] = { name: fixed.name, flag: fixed.flag, gold: 0, silver: 0, bronze: 0, total: 0 };
            if (rankIdx === 0) medalsBase[fixed.name].gold++; else if (rankIdx === 1) medalsBase[fixed.name].silver++; else medalsBase[fixed.name].bronze++;
             medalsBase[fixed.name].total++;
          });
        });
      });
    };
    processMedals(lbAT.M); processMedals(lbAT.F);
    const sortedMedalCount = Object.values(medalsBase).sort((a,b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze).map((c, i) => ({ ...c, displayRank: i + 1 }));
    const dir = medalSort.direction === 'ascending' ? 1 : -1;
    sortedMedalCount.sort((a, b) => robustSort(a, b, medalSort.key, dir));
    
    return { medalCount: sortedMedalCount, topStats: { 
        rating: [...qualifiedAthletes].sort((a,b) => b.rating - a.rating).slice(0, 10), 
        runs: [...qualifiedAthletes].sort((a,b) => b.runs - a.runs).slice(0, 10), 
        winPercentage: [...qualifiedAthletes].sort((a,b) => b.winPercentage - a.winPercentage || b.runs - a.runs).slice(0, 10),
        wins: [...qualifiedAthletes].sort((a,b) => b.wins - a.wins).slice(0, 10), 
        impact: [...(settersWithImpact || [])].sort((a,b) => b.impact - a.impact).slice(0, 10),
        sets: [...(settersWithImpact || [])].sort((a,b) => b.sets - a.sets).slice(0, 10), 
        contributionScore: [...qualifiedAthletes].sort((a,b) => b.contributionScore - a.contributionScore).slice(0, 10), 
        totalFireCount: [...qualifiedAthletes].sort((a,b) => b.totalFireCount - a.totalFireCount).slice(0, 10)
    }};
};

// --- VIEW COMPONENTS ---

const ASRGlobalMap = ({ courses, continents: conts, cities, countries, theme, eventType, onCourseClick, onCountryClick, onCityClick, onContinentClick }) => {
    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const clusterGroupRef = useRef(null);
    const tileLayerRef = useRef(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('continents');
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        const injectScript = (url, id) => {
            if (document.getElementById(id)) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.id = id;
                script.src = url;
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Script load error for ${url}`));
                document.head.appendChild(script);
            });
        };

        const injectCSS = (url, id) => {
            if (document.getElementById(id)) return;
            const link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
        };

        const loadAll = async () => {
            try {
                injectCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'leaflet-css');
                await injectScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'leaflet-js');
                
                injectCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css', 'cluster-css');
                injectCSS('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css', 'cluster-default-css');
                await injectScript('https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js', 'cluster-js');
                
                setIsScriptsLoaded(true);
            } catch (err) {
                console.error("Map scripts failed to load", err);
            }
        };

        loadAll();
    }, []);

    useEffect(() => {
        if (!isScriptsLoaded || !window.L || !mapContainerRef.current) return;
        
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        const map = window.L.map(mapContainerRef.current, {
            zoomControl: false,
            minZoom: 2,
            maxZoom: 18,
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0,
            worldCopyJump: true,
            preferCanvas: true,
            // Re-enabling explicit tap support for mobile Safari
            tap: true, 
            dragging: true,
            touchZoom: true,
            bounceAtZoomLimits: true
        }).setView([20, 0], 2);
        
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        tileLayerRef.current = window.L.tileLayer(theme === 'dark' ? darkTile : lightTile, {
            attribution: '&copy; OSM &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        if (window.L.markerClusterGroup) {
            clusterGroupRef.current = window.L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 40,
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                zoomToBoundsOnClick: true,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    return window.L.divIcon({ 
                        html: `<div class="flex items-center justify-center w-full h-full">${count}</div>`,
                        className: 'asr-cluster', 
                        iconSize: window.L.point(40, 40) 
                    });
                }
            });
            map.addLayer(clusterGroupRef.current);
        }
        
        mapRef.current = map;
        
        const timer = setTimeout(() => {
            if (mapRef.current) mapRef.current.invalidateSize();
        }, 300);

        return () => {
            clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isScriptsLoaded, theme]);

    useEffect(() => {
        if (!mapRef.current || !tileLayerRef.current) return;
        const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        tileLayerRef.current.setUrl(theme === 'dark' ? darkTile : lightTile);
    }, [theme]);

    useEffect(() => {
        if (!mapRef.current || !clusterGroupRef.current || !courses.length || !window.L) return;
        
        clusterGroupRef.current.clearLayers();
        
        courses.forEach(c => {
            if (!c.parsedCoords) return;
            
            // Re-structured marker for better interaction capture
            const marker = window.L.marker(c.parsedCoords, {
                icon: window.L.divIcon({
                    html: `
                        <div class="asr-marker-container w-10 h-10 rounded-full bg-blue-600/15 border-[3px] border-blue-600 flex items-center justify-center text-blue-600 shadow-xl backdrop-blur-md group ios-clip-fix">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                        </div>
                    `,
                    className: 'asr-marker-outer',
                    iconSize: [44, 44],
                    iconAnchor: [22, 22],
                    popupAnchor: [0, -22]
                })
            });

            const handleInteract = (e) => {
                if (window.L.DomEvent) {
                  window.L.DomEvent.stopPropagation(e);
                  window.L.DomEvent.preventDefault(e);
                }
                onCourseClick('course', c);
            };

            // Use multiple event listeners to catch mobile interaction nuances
            marker.on('click', handleInteract);
            marker.on('touchend', handleInteract);

            const popupContent = `
                <div class="p-4 min-w-[140px] flex flex-col items-center text-center">
                    <div class="font-black text-xs uppercase mb-1 text-slate-900 dark:text-white tracking-tighter">${c.name}</div>
                    <div class="text-[9px] font-black opacity-80 uppercase tracking-widest text-slate-700 dark:text-slate-300">${c.city} ${c.flag}</div>
                </div>
            `;

            marker.bindPopup(popupContent, { closeButton: false, offset: [0, -10] });
            clusterGroupRef.current.addLayer(marker);
        });
    }, [courses, isScriptsLoaded, onCourseClick]);

    const handleFindMe = () => {
      if (!mapRef.current || !navigator.geolocation) return;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapRef.current.flyTo([latitude, longitude], 12, { duration: 1.5 });
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
    };

    const jumpToLocation = (item) => {
      if (!mapRef.current || !item.coords) return;
      mapRef.current.flyTo(item.coords, activeTab === 'cities' ? 12 : 5, { duration: 1.5 });
    };

    const displayData = (activeTab === 'cities' ? cities : (activeTab === 'countries' ? countries : conts)).filter(x => x.name !== 'GLOBAL');

    if (!isScriptsLoaded) {
        return (
            <div className={`w-full h-[60vh] sm:h-[75vh] flex flex-col items-center justify-center rounded-3xl border shadow-premium ${theme === 'dark' ? 'bg-black/40 border-white/20 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'} ios-clip-fix`}>
                <div className="animate-spin opacity-70 mb-4"><IconSpeed className="text-blue-600" /></div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse opacity-70">Calibrating Satellites...</div>
            </div>
        );
    }

    const mapPillStyle = `pointer-events-auto px-6 py-3.5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all border-3 shadow-2xl backdrop-blur-md ${theme === 'dark' ? 'bg-black/60 border-blue-600/40 text-slate-100' : 'bg-white/80 border-blue-600 text-slate-900'}`;

    return (
        <div id="asr-map-container" className={`relative w-full h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border border-subtle ios-clip-fix`}>
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40]">
              <button 
                onClick={handleFindMe}
                className={`${mapPillStyle} hover:bg-blue-600/10 hover:scale-105 active:scale-95 whitespace-nowrap`}
              >
                <Navigation size={12} className={`mr-2 inline ${isLocating ? 'animate-spin' : ''}`} />
                Find Courses Near Me
              </button>
            </div>

            <div className="absolute top-4 right-4 z-[40]">
                <div className={`${mapPillStyle} flex items-center gap-2 whitespace-nowrap`}>
                    <span className={`text-blue-600 animate-pulse text-lg leading-none`}>●</span>
                    <span>{eventType === 'open' ? 'ASR OPEN' : 'ALL-TIME'} ({courses.length})</span>
                </div>
            </div>

            <div className="absolute top-4 left-4 z-[40] flex flex-col gap-2.5 max-w-xs h-[calc(100%-8rem)] sm:h-auto items-start">
                <button 
                  onClick={() => setIsPanelOpen(!isPanelOpen)} 
                  className={`${mapPillStyle} w-fit flex items-center gap-2 hover:bg-blue-600/10 active:scale-95 whitespace-nowrap`}
                >
                    <Globe size={12} className="shrink-0" />
                    {isPanelOpen ? 'HIDE' : 'COURSES'}
                </button>
                <div className={`pointer-events-auto flex flex-col transition-all duration-300 origin-top-left overflow-hidden rounded-[2rem] border-3 backdrop-blur-xl shadow-2xl ${isPanelOpen ? 'scale-100 opacity-100 flex-1 sm:max-h-[60vh]' : 'scale-95 opacity-0 h-0 border-transparent'} ${theme === 'dark' ? 'bg-black/95 border-blue-600/30 text-white' : 'bg-white/98 border-blue-600/30 text-slate-900'} ios-clip-fix`}>
                    <div className={`flex items-center p-2 border-b shrink-0 gap-1 ${theme === 'dark' ? 'border-white/10' : 'border-slate-300'}`}>
                        <button onClick={() => setActiveTab('continents')} className={`flex-1 py-3 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'continents' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-80'}`}>CONTINENTS</button>
                        <button onClick={() => setActiveTab('countries')} className={`flex-1 py-3 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'countries' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-80'}`}>COUNTRIES</button>
                        <button onClick={() => setActiveTab('cities')} className={`flex-1 py-3 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'cities' ? 'bg-blue-600 text-white shadow-sm' : 'opacity-80'}`}>CITIES</button>
                    </div>
                    <div className="flex flex-col gap-0.5 p-3 overflow-y-auto scrollbar-hide flex-1">
                        {displayData.slice(0, 25).map((c, i) => (
                            <div key={i} 
                                   onClick={() => { 
                                     jumpToLocation(c);
                                     if(activeTab === 'cities') onCityClick(c); 
                                     else if(activeTab === 'countries') onCountryClick(c); 
                                     else onContinentClick(c); 
                                   }} 
                                   className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all ${theme === 'dark' ? 'hover:bg-white/15' : 'hover:bg-slate-300/50'}`}>
                                 <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="scale-90 origin-left shrink-0"><ASRRankBadge rank={i + 1} theme={theme} /></div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis leading-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500`}>
                                          {c.name} <span className="ml-1 opacity-80">{c.flag}</span>
                                        </span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end">
                                   <span className={`text-sm sm:text-base font-mono font-black text-blue-600 tabular-nums`}>{c.courses}</span>
                                 </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SetterDisplay = ({ text, onSetterClick }) => {
    if (!text) return null;
    const names = text.split(/[,&/]| and /i).map(n => n.trim()).filter(Boolean);
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {names.map((n, index) => (
                <React.Fragment key={index}>
                    <span 
                        onClick={() => onSetterClick && onSetterClick(n)} 
                        className={onSetterClick ? "cursor-pointer hover:text-current transition-colors underline decoration-current/50 underline-offset-4" : ""}
                    >{n}</span>{index < names.length - 1 && <span className="opacity-40">,</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

const ASRRankList = ({ title, athletes, genderRecord, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick }) => {
    const accentColor = 'text-blue-600';
    
    const displayAthletes = [...athletes.slice(0, 10)];
    while (displayAthletes.length < 3) displayAthletes.push(null);

    return (
        <div className="space-y-1">
            <ASRSectionHeading theme={theme}>{title}</ASRSectionHeading>
            <div className="grid grid-cols-1 gap-2">
                {displayAthletes.map((athleteRow, i) => {
                    if (!athleteRow) {
                        return (
                            <div key={`empty-${i}`} className={`flex items-center justify-between p-4 rounded-3xl border opacity-30 ${theme === 'dark' ? 'bg-black/40 border-white/20' : 'bg-white border-slate-300 shadow-sm'} ios-clip-fix h-[72px]`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <ASRRankBadge rank={i + 1} theme={theme} />
                                    <span className="text-xs sm:text-[15px] font-black uppercase tracking-widest opacity-40">---</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="flex flex-col items-end min-w-[70px] sm:min-w-[90px] text-right">
                                        <span className="text-xs sm:text-[16px] font-mono font-black num-col opacity-40">--.--</span>
                                        <span className="text-[10px] font-mono font-black num-col opacity-40">--.--</span>
                                    </div>
                                    <div className="w-10 sm:w-12 shrink-0" />
                                </div>
                            </div>
                        );
                    }
                    
                    const [pKey, time, videoUrl] = athleteRow;
                    const meta = athleteMetadata[pKey] || {};
                    const points = genderRecord && typeof time === 'number' && time !== 0 ? (genderRecord / time) * 100 : 0;
                    return (
                        <div key={pKey} onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white border-slate-300 shadow-md hover:bg-slate-50'} h-[72px]`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <ASRRankBadge rank={i + 1} theme={theme} />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs sm:text-[15px] font-black uppercase whitespace-nowrap overflow-hidden text-ellipsis transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-600`}>{athleteDisplayNameMap[pKey]}</span>
                                  <span className="text-[10px] sm:text-xs uppercase font-black opacity-70">{meta.region || '🏳️'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex flex-col items-end min-w-[70px] sm:min-w-[90px] text-right">
                                    <span className={`text-xs sm:text-[16px] font-mono font-black num-col ${accentColor}`}>
                                      {typeof time === 'number' ? time.toFixed(2) : '--.--'}
                                    </span>
                                    <span className={`text-[10px] font-mono font-black num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
                                      {typeof points === 'number' ? points.toFixed(2) : '--.--'}
                                    </span>
                                </div>
                                <div className="w-10 sm:w-12 flex items-center justify-center shrink-0">
                                    {videoUrl ? (
                                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="group/play p-2.5 rounded-xl transition-all hover:scale-120 text-slate-500 hover:text-blue-600 flex items-center justify-center">
                                            <IconVideoPlay size={22} />
                                        </a>
                                    ) : (
                                        <div className="p-2.5" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ASRSearchInput = ({ search, setSearch, gen, setGen, theme, view }) => {
  return (
    <div className="w-full flex items-center gap-2 sm:gap-4 my-6 sm:my-10 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex-1 relative group w-full">
            <div className={`absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} group-focus-within:text-blue-600`}><IconSearch size={18} /></div>
            <input 
              type="text" 
              aria-label="Search" 
              value={search || ''} 
              onChange={e => setSearch(e.target.value)} 
              className={`rounded-[1.5rem] sm:rounded-[2.2rem] pl-12 sm:pl-16 pr-10 sm:pr-12 py-4 sm:py-6 w-full text-xs sm:text-[15px] font-black uppercase tracking-widest outline-none transition-all border-2 ${theme === 'dark' ? 'bg-black/50 text-white focus:bg-black/70 border-white/15 focus:border-blue-600/60 shadow-2xl' : 'bg-white text-slate-900 border-slate-300 focus:border-blue-600 shadow-xl'} placeholder:text-slate-500`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-inherit">
                <IconX size={20} />
              </button>
            )}
        </div>

        {view === 'players' && (
            <div className={`flex items-center p-1.5 rounded-[1.4rem] sm:rounded-[2.4rem] border-2 shrink-0 ${theme === 'dark' ? 'bg-black/60 border-white/15' : 'bg-white border-slate-300 shadow-xl'} ios-clip-fix`}>
                <div className="flex gap-1.5">
                    {[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (
                        <button key={g.id} onClick={() => setGen(g.id)} className={`px-4 sm:px-12 py-3 sm:py-5 rounded-[0.9rem] sm:rounded-[1.8rem] text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all ${gen === g.id ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} text-inherit whitespace-nowrap`}>
                          {g.l}
                        </button>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

const ASRCourseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, onSetterClick, breadcrumbs, onBreadcrumbClick }) => {
    if (!isOpen || !course) return null;
    
    const stats = [
        { label: 'CR (M)', value: typeof course.allTimeMRecord === 'number' ? course.allTimeMRecord.toFixed(2) : '-', icon: <Zap size={14} />, color: 'text-blue-600' },
        { label: 'CR (W)', value: typeof course.allTimeFRecord === 'number' ? course.allTimeFRecord.toFixed(2) : '-', icon: <Zap size={14} />, color: 'text-blue-600' },
        { label: 'Diff', value: course.difficulty || '-', icon: <Compass size={14} /> }, 
        { label: 'Players', value: course.totalAllTimeAthletes, icon: <Users size={14} /> },
        { label: 'Length', value: course.length ? `${course.length}m` : '-', icon: <Ruler size={14} /> },
        { label: 'Elev', value: course.elevation ? `${course.elevation}m` : '-', icon: <Mountain size={14} /> },
        { label: 'Type', value: course.type || '-', icon: <Dna size={14} /> },
        { label: 'Date', value: course.dateSet || '-', icon: <Calendar size={14} /> }
    ];

    let locStr = '';
    if (course.city && course.city !== 'UNKNOWN') {
        locStr = course.city;
        if ((course.country === 'USA' || course.country === 'CANADA') && course.stateProv) {
            locStr += `, ${course.stateProv}`;
        }
    }

    const Header = (
        <div className="flex flex-col gap-6 w-full text-left">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full">
                <div className={`w-13 h-13 sm:w-[100px] sm:h-[100px] rounded-3xl border-2 shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-white/20 bg-black/50' : 'border-slate-400 bg-white'} ios-clip-fix`}>
                  <FallbackAvatar name={course.name} sizeCls="text-xl sm:text-4xl" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <h2 style={{ textWrap: 'nowrap' }} className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tighter truncate uppercase leading-none mb-2 text-inherit">{course.name}</h2>
                    <div className="text-[10px] sm:text-[14px] font-black uppercase tracking-widest min-w-0 opacity-80 text-inherit truncate">
                        {formatLocationSubtitle(course.country, course.flag, locStr ? locStr + ', ' : '')}
                    </div>
                </div>
            </div>
            
            <ASRPatronPill course={course} theme={theme} />

            <div className="flex flex-row items-center gap-3 w-full">
              <a 
                href={course.demoVideo || "#"} 
                target={course.demoVideo ? "_blank" : "_self"} 
                rel="noopener noreferrer" 
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border-2 shadow-xl h-[72px] text-center ${course.demoVideo ? 'border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white active:scale-95' : 'border-slate-400/40 text-slate-400/50 grayscale opacity-40 cursor-not-allowed'} whitespace-nowrap`}
              >
                  <Play size={14} /> 
                  <span>RULES</span>
              </a>

              <a 
                href={course.coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.coordinates)}` : "#"} 
                target={course.coordinates ? "_blank" : "_self"} 
                rel="noopener noreferrer" 
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border-2 shadow-xl h-[72px] text-center ${course.coordinates ? 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-95' : 'border-slate-400/40 text-slate-400/50 grayscale opacity-40 cursor-not-allowed'} whitespace-nowrap`}
              >
                  <MapPin size={14} /> 
                  <span>MAP</span>
              </a>
            </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
            <div className="grid grid-cols-1 gap-14 sm:gap-20">
                <ASRRankList title="MEN'S TOP 10" athletes={course.allTimeAthletesM || []} genderRecord={course.allTimeMRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
                <ASRRankList title="WOMEN'S TOP 10" athletes={course.allTimeAthletesF || []} genderRecord={course.allTimeFRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
            </div>

            <div className="space-y-8">
                <ASRSectionHeading theme={theme} className="text-left">COURSE STATS</ASRSectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className={`p-4 rounded-[1.5rem] border-2 text-left flex flex-col gap-1 ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white border-slate-300 shadow-md'} ios-clip-fix`}>
                            <div className="flex items-center justify-between opacity-60">
                                <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                {s.icon}
                            </div>
                            <span className={`text-[15px] sm:text-[16px] font-mono font-black num-col ${s.color || ''}`}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {(course.leadSetters || course.assistantsetters) && (
                <div className="space-y-8 text-left">
                    <ASRSectionHeading theme={theme}>COURSE SETTERS</ASRSectionHeading>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {course.leadSetters && (
                            <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white border-slate-300 shadow-md'} ios-clip-fix`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Leads</span>
                                <div className={`text-[15px] sm:text-lg font-mono font-black text-blue-600`}>
                                    <SetterDisplay text={course.leadSetters} onSetterClick={onSetterClick} />
                                </div>
                            </div>
                        )}
                        {course.assistantsetters && (
                            <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center ${theme === 'dark' ? 'bg-black/60 border-white/10' : 'bg-white border-slate-300 shadow-md'} ios-clip-fix`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Assistants</span>
                                <div className={`text-[15px] sm:text-lg font-mono font-black text-blue-600`}>
                                    <SetterDisplay text={course.assistantsetters} onSetterClick={onSetterClick} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4 flex flex-col gap-4">
              <ASRPromotionBanner type="setter" theme={theme} />
            </div>
        </ASRBaseModal>
    );
};

const ASRProfileModal = ({ isOpen, onClose, onBack, onForward, canGoForward, identity, initialRole, theme, allCourses, openRankings, atPerfs, opPerfs, openModal, breadcrumbs, jumpToHistory }) => {
    const [activeRole, setActiveRole] = useState(initialRole || 'all-time');
    const accentColor = 'text-blue-600';

    useEffect(() => { 
        if (isOpen && initialRole) {
            setActiveRole(initialRole);
        }
    }, [isOpen, initialRole]);

    if (!isOpen || !identity) return null;

    const pKey = identity.pKey || normalizeName(identity.name);
    
    const Header = (
        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 min-w-0 w-full pr-2 text-left">
            <div className={`w-13 h-13 sm:w-[100px] lg:w-[116px] sm:h-[100px] lg:h-[116px] rounded-3xl border-2 flex items-center justify-center text-2xl sm:text-5xl font-black shadow-2xl shrink-0 uppercase overflow-hidden relative ${theme === 'dark' ? 'bg-black/50 border-white/20 text-slate-400' : 'bg-white border-slate-400 text-slate-500'} ios-clip-fix`}>
                <FallbackAvatar name={identity.name} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mb-2 min-w-0 w-full">
                    <h2 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tight uppercase leading-none text-inherit max-w-full break-words">{identity.name}</h2>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 mt-1">
                    {identity.region && (
                      <div className="text-2xl sm:text-3xl leading-none flex items-center gap-1.5 drop-shadow-sm">
                        {identity.region}
                      </div>
                    )}
                    {identity.igHandle && (
                        <a 
                          href={`https://instagram.com/${identity.igHandle}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={`group/ig flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all hover:scale-110 shadow-sm border-2 ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'} ios-clip-fix`}
                          title={`@${identity.igHandle}`}
                        >
                          <div className="text-[#E1306C] transition-transform group-hover/ig:rotate-6"><Instagram size={18} strokeWidth={2.5} /></div>
                        </a>
                    )}
                </div>
            </div>
        </div>
    );

    const renderPlayerContent = (role) => {
        const isAllTime = role === 'all-time';
        const perfSource = isAllTime ? (atPerfs[pKey] || []) : (opPerfs[pKey] || []);
        const metaSource = isAllTime ? identity : (identity.openStats || { rating: 0, pts: 0, runs: 0, wins: 0, totalFireCount: 0 });

        const courseData = perfSource.map(cd => {
          const matched = allCourses.find(c => c.name.toUpperCase() === cd.label.toUpperCase());
          return { ...cd, coordinates: matched?.coordinates, flag: matched?.flag, country: matched?.country, city: matched?.city, mRecord: matched?.allTimeMRecord, fRecord: matched?.allTimeFRecord };
        }).sort((a, b) => {
            const isGoldA = a.rank === 1;
            const isGoldB = b.rank === 1;
            if (isGoldA && !isGoldB) return -1;
            if (!isGoldA && isGoldB) return 1;
            if (isGoldA && isGoldB) return a.num - b.num;
            return b.points - a.points;
        });

        const currentOpenRankIndex = openRankings?.findIndex(p => p.pKey === pKey);
        const currentOpenRank = currentOpenRankIndex !== -1 ? currentOpenRankIndex + 1 : "UR";
        const currentRankValue = isAllTime ? (identity.allTimeRank || "UR") : currentOpenRank;

        const playerStats = [
            { l: 'RANK', v: currentRankValue },
            { l: 'RATING', v: typeof metaSource.rating === 'number' ? metaSource.rating.toFixed(2) : '0.00', c: accentColor, t: "TOTAL POINTS / RUNS = RATING" }, 
            { l: 'POINTS', v: typeof metaSource.pts === 'number' ? metaSource.pts.toFixed(2) : '0.00', t: "THE SUM OF ALL INDIVIDUAL COURSE POINTS" }, 
            { l: 'RUNS', v: metaSource.runs || 0 }, 
            { l: 'WINS', v: metaSource.wins || 0 }, 
            { l: 'WIN %', v: ((metaSource.wins / (metaSource.runs || 1)) * 100).toFixed(2) + '%' }, 
            { l: 'CITIES', v: new Set(courseData.map(c => c.city).filter(Boolean)).size || 0 },
            { l: 'COUNTRIES', v: new Set(courseData.map(c => c.country).filter(Boolean)).size || 0 },
            { l: '🔥', v: metaSource.totalFireCount || 0, g: 'glow-blue', t: "FIRE BONUS FOR THE FASTEST RUNS" }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-14">
                    {playerStats.map((s, i) => (
                      <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} colorClass={s.c} glowClass={s.g} tooltip={s.t} />
                    ))}
                </div>
                <ASRSectionHeading theme={theme} className="text-left">VERIFIED RUNS</ASRSectionHeading>
                <div className="grid grid-cols-1 gap-4">
                    {courseData.length > 0 ? courseData.map((c, i) => {
                        const target = allCourses.find(x => x.name.toUpperCase() === c.label.toUpperCase());
                        return (
                          <ASRCourseCard 
                            key={i} 
                            course={target || { name: c.label }} 
                            theme={theme} 
                            onClick={() => { if(target) openModal('course', target); }}
                            isPerformance={true}
                            perfData={c}
                          />
                        );
                    }) : (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                            <Compass size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest">No verified runs found</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSetterContent = () => {
        const setterData = identity.setterData || identity;
        const setterCourses = allCourses
            .filter(c => isNameInList(identity.name, c.leadSetters) || isNameInList(identity.name, c.assistantsetters))
            .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));
        
        const impact = setterData.impact || setterCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);
        const setsCount = setterData.sets || setterCourses.length;
        const avgImpact = setsCount > 0 ? (impact / setsCount).toFixed(2) : '0.00';

        const setterStats = [
            { l: 'IMPACT', v: impact, c: accentColor, t: "TOTAL PLAYERS ON ALL COURSES SET BY THIS SETTER" },
            { l: 'AVG IMPACT', v: avgImpact, t: "AVERAGE PLAYERS PER COURSE SET", c: accentColor },
            { l: 'SETS', v: setsCount, t: "LEAD SETS + ASSISTANT SETS" },
            { l: 'LEADS', v: setterData.leads || 0 },
            { l: 'ASSISTS', v: setterData.assists || 0 },
            { l: 'CITIES', v: new Set(setterCourses.map(c => c.city).filter(Boolean)).size || 0 },
            { l: 'COUNTRIES', v: new Set(setterCourses.map(c => c.country).filter(Boolean)).size || 0 },
            { l: '🪙', v: setterData.contributionScore || identity.contributionScore || 0, t: "CONTRIBUTOR COINS FROM RUNS, WINS, & SETS" }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
                    {setterStats.map((s, i) => (
                      <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} colorClass={s.c} tooltip={s.t} />
                    ))}
                </div>
                <ASRSectionHeading theme={theme} className="text-left">VERIFIED SETS</ASRSectionHeading>
                <div className="grid grid-cols-1 gap-4">
                    {setterCourses.map((c, i) => (
                      <ASRCourseCard 
                        key={i} 
                        course={c} 
                        theme={theme} 
                        onClick={() => openModal('course', c)} 
                      />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={jumpToHistory}>
            <div className={`flex p-1.5 rounded-2xl mb-12 border-2 w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto scrollbar-hide ${theme === 'dark' ? 'bg-black/60 border-white/20' : 'bg-slate-300 border-slate-400 shadow-md'} ios-clip-fix`}>
                <button onClick={() => setActiveRole('all-time')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeRole === 'all-time' ? 'bg-blue-600 text-white shadow-xl' : 'opacity-70 hover:opacity-100 text-inherit'}`}>ALL-TIME STATS</button>
                <button onClick={() => setActiveRole('open')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeRole === 'open' ? 'bg-blue-600 text-white shadow-xl' : 'opacity-70 hover:opacity-100 text-inherit'}`}>ASR OPEN STATS</button>
                <button onClick={() => setActiveRole('setter')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeRole === 'setter' ? 'bg-blue-600 text-white shadow-xl' : 'opacity-70 hover:opacity-100 text-inherit'}`}>SETTER STATS</button>
            </div>
            
            {activeRole === 'all-time' && (
                <>
                    {renderPlayerContent('all-time')}
                    <div className="pt-8">
                        <ASRPromotionBanner type="coach" theme={theme} />
                    </div>
                </>
            )}
            
            {activeRole === 'open' && (
                <>
                    {renderPlayerContent('open')}
                    <div className="pt-8">
                        <ASRPromotionBanner type="coach" theme={theme} />
                    </div>
                </>
            )}

            {activeRole === 'setter' && (
                <>
                    {renderSetterContent()}
                    <div className="pt-8">
                        <ASRPromotionBanner type="setter" theme={theme} />
                    </div>
                </>
            )}
        </ASRBaseModal>
    );
};

const ASRRegionModal = ({ isOpen, onClose, onBack, onForward, canGoForward, region, theme, allCourses, allPlayers, playerPerformances, openModal, breadcrumbs, jumpToHistory }) => {
    if (!isOpen || !region) return null;
    const accentColor = 'text-blue-600';

    const regionalCourses = allCourses.filter(c => 
        (region.type === 'city' && c.city === region.name) ||
        (region.type === 'country' && c.country === region.name) ||
        (region.type === 'continent' && c.continent === region.name)
    ).sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));

    const regionalPlayers = allPlayers.filter(p => {
        if (region.type === 'city') {
            const perfs = playerPerformances[p.pKey] || [];
            const hasCompletedCourseInCity = perfs.some(perf => {
                const matchedCourse = allCourses.find(c => c.name.toUpperCase() === perf.label.toUpperCase());
                return matchedCourse?.city === region.name;
            });
            return hasCompletedCourseInCity && isQualifiedAthlete(p);
        }

        const countryTerm = normalizeCountryName(region.name);
        const playerCountries = (p.countryName || "").split(/[,\/]/).map(c => normalizeCountryName(c));
        
        const isMatch = (region.type === 'country' && playerCountries.includes(countryTerm)) ||
                        (region.type === 'continent' && playerCountries.some(pc => getContinentData(pc).name === region.name));
        
        return isMatch && isQualifiedAthlete(p);
    }).sort((a, b) => b.rating - a.rating);

    const Header = (
        <div className="flex items-center gap-6 sm:gap-10 text-left">
            <div className={`w-13 h-13 sm:w-[100px] sm:h-[100px] rounded-3xl border-2 shadow-2xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'bg-black/50 border-white/20' : 'bg-white border-slate-400'} ios-clip-fix`}>
              <FallbackAvatar name={region.name} initialsOverride={region.name === 'GLOBAL' ? 'GL' : ''} />
            </div>
            <div className="flex flex-col">
                <h2 className="text-xl sm:text-5xl lg:text-7xl font-black uppercase leading-tight text-inherit">{region.name}</h2>
                <div className="text-3xl sm:text-5xl mt-3">{region.flag}</div>
            </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={jumpToHistory}>
            <div className="grid grid-cols-2 gap-6 mb-14">
                <ASRStatCard label="RANKED PLAYERS" value={regionalPlayers.length} theme={theme} />
                <ASRStatCard label="ACTIVE COURSES" value={regionalCourses.length} theme={theme} />
            </div>
            <div className="space-y-14 text-left">
                <div>
                    <ASRSectionHeading theme={theme}>TOP PLAYERS</ASRSectionHeading>
                    <div className="grid grid-cols-1 gap-4">
                        {regionalPlayers.slice(0, 10).map((p, i) => (
                            <div key={i} onClick={() => openModal('player', p)} className={`group flex items-center justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-black/40 border-white/20 hover:bg-black/60' : 'bg-white border-slate-300 shadow-md hover:bg-slate-50'} ios-clip-fix h-[72px]`}>
                                <div className="flex items-center gap-3 pr-3 min-w-0">
                                    <ASRRankBadge rank={i + 1} theme={theme} />
                                    <div className="flex flex-col">
                                        <span className="text-xs sm:text-[16px] font-black uppercase text-inherit group-hover:text-blue-600">{p.name}</span>
                                        <span className="text-[10px] uppercase font-black opacity-70">{p.region}</span>
                                    </div>
                                </div>
                                <span className={`text-xs sm:text-[16px] font-mono font-black num-col ${accentColor}`}>{typeof p.rating === 'number' ? p.rating.toFixed(2) : '--.--'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <ASRSectionHeading theme={theme}>TOP COURSES</ASRSectionHeading>
                    <div className="grid grid-cols-1 gap-4">
                        {regionalCourses.slice(0, 10).map((c, i) => (
                            <ASRCourseCard 
                                key={i} 
                                course={c} 
                                theme={theme} 
                                onClick={() => openModal('course', c)} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </ASRBaseModal>
    );
};

const ASRHallOfFame = ({ stats, theme, onPlayerClick, onSetterClick, onRegionClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const highlightColor = 'text-blue-600';

  return (
    <div className="space-y-12 sm:space-y-24 animate-in fade-in duration-700 pb-32 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[
          { l: 'TOP RATING', k: 'rating', t: "TOTAL POINTS / RUNS = RATING" },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'HIGHEST WIN %', k: 'winPercentage' },
          { l: 'MOST COURSE RECORDS', k: 'wins' },
          { l: 'MOST 🪙', k: 'contributionScore', t: "CONTRIBUTOR COINS (RUNS, WINS, & SETS)" },
          { l: 'MOST 🔥', k: 'totalFireCount', t: "FIRE BONUS FOR THE FASTEST RUNS" },
          { l: 'MOST IMPACT', k: 'impact', t: "TOTAL RUNS ON ALL COURSES BY THIS SETTER (AS LEAD OR ASSISTANT)" },
          { l: 'MOST SETS', k: 'sets', t: "THE SUM OF ALL LEAD AND ASSISTANT SETS" }
        ].map((sec) => (
            <div key={sec.k} className={`stat-card-container relative rounded-[2.2rem] border-2 flex flex-col overflow-visible ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white border-slate-300 shadow-premium'}`}>
              {sec.t && (
                <div className={`stat-card-tooltip normal-case ${theme === 'dark' ? 'bg-slate-800 text-white border border-white/10' : 'bg-white border border-slate-200 text-slate-900 shadow-xl'}`}>
                    {sec.t}
                </div>
              )}
              <div className={`p-5 border-b-2 border-inherit opacity-80 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-between ${sec.t ? 'cursor-help' : ''}`}>
                {sec.l}
                {sec.t && <HelpCircle size={11} className="opacity-60" />}
              </div>
              <div className={`divide-y-2 ${theme === 'dark' ? 'divide-white/[0.05]' : 'divide-slate-200'}`}>
                {(stats.topStats[sec.k] || []).map((p, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => ['impact', 'sets'].includes(sec.k) ? onSetterClick(p) : onPlayerClick(p, null, null, 'all-time')}>
                    <div className="flex items-center gap-3">
                      <ASRRankBadge rank={i + 1} theme={theme} />
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase group-hover:text-blue-600 transition-colors">{p.name}</span>
                        <span className="text-sm mt-1">{p.region}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-black ${highlightColor} text-xs num-col tabular-nums`}>{sec.k === 'rating' ? (typeof p.rating === 'number' ? p.rating.toFixed(2) : '0.00') : (sec.k === 'winPercentage' ? (typeof p.winPercentage === 'number' ? p.winPercentage.toFixed(1)+'%' : '0%') : p[sec.k])}</span>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>
      <div className={`rounded-[2.8rem] border-2 border-subtle overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-black/60' : 'bg-white shadow-premium'} ios-clip-fix`}>
        <div className="p-8 border-b-2 border-inherit text-[12px] font-black uppercase tracking-[0.3em] opacity-80">WORLDWIDE MEDAL COUNT</div>
        <div className="overflow-auto scrollbar-hide">
          <table className="min-w-full">
            <thead className={`sticky top-0 z-20 backdrop-blur-2xl border-b-2 border-subtle ${theme === 'dark' ? 'bg-[#000000]/95 text-slate-300' : 'bg-white/95 text-slate-700'}`}>
              <tr className="text-[11px] font-black uppercase tracking-widest">
                <ASRHeaderComp l="RANK" k="rank" a="left" w="w-20 pl-8 sm:pl-12" activeSort={medalSort} handler={setMedalSort} />
                <ASRHeaderComp l="COUNTRY" k="name" a="left" w="w-full px-4" activeSort={medalSort} handler={setMedalSort} />
                <ASRHeaderComp l="🥇" k="gold" a="right" w="w-24" activeSort={medalSort} handler={setMedalSort} />
                <ASRHeaderComp l="🥈" k="silver" a="right" w="w-24" activeSort={medalSort} handler={setMedalSort} />
                <ASRHeaderComp l="🥉" k="bronze" a="right" w="w-24" activeSort={medalSort} handler={setMedalSort} />
                <ASRHeaderComp l="TOTAL" k="total" a="right" w="w-28 pr-8 sm:pr-12" activeSort={medalSort} handler={setMedalSort} />
              </tr>
            </thead>
            <tbody className={`divide-y-2 ${theme === 'dark' ? 'divide-white/10' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={c.name} onClick={() => onRegionClick({ ...c, type: 'country' })} className="group hover:bg-black/[0.05] transition-colors cursor-pointer text-inherit">
                  <td className="pl-8 sm:pl-12 py-6"><ASRRankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs sm:text-[17px] font-black uppercase group-hover:text-blue-600 transition-colors whitespace-nowrap">{c.name}</span>
                      <span className="text-xl sm:text-2xl shrink-0 leading-none">{c.flag}</span>
                    </div>
                  </td>
                  <td className="text-right font-mono font-black text-amber-500 text-lg num-col">{c.gold}</td>
                  <td className="text-right font-mono font-black text-lg num-col">{c.silver}</td>
                  <td className="text-right font-mono font-black text-lg num-col">{c.bronze}</td>
                  <td className="pr-8 sm:pr-12 text-right font-mono font-black text-lg num-col">{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-8">
        <ASRPromotionBanner type="masterclass" theme={theme} />
      </div>
    </div>
  );
};

const ASRHeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler, tooltip, paddingClass = "px-2" }) => {
  return (
    <th className={`${w} ${paddingClass} py-8 cursor-pointer group select-none transition-all stat-card-container ${activeSort.key === k ? 'bg-current/[0.08]' : 'hover:bg-current/[0.05]'} text-inherit border-b-2 border-transparent`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      {tooltip && (
        <div className="stat-card-tooltip normal-case bg-slate-800 text-white border border-white/10 dark:bg-white dark:text-slate-900">
            {tooltip}
        </div>
      )}
      <div className={`flex items-center gap-2.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase text-[10px] sm:text-[12px] font-black">{l}</span>
        {tooltip && <HelpCircle size={11} className="opacity-40 shrink-0" />}
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? 'text-blue-600' : 'opacity-0 group-hover:opacity-60'}`}>
          <IconArrow direction={activeSort.key === k ? activeSort.direction : 'descending'} />
        </div>
      </div>
    </th>
  );
};

const ASRDataTable = ({ columns, data, sort, onSort, theme, onRowClick }) => {
    const [visibleCount, setVisibleCount] = useState(50);
    const observerTarget = useRef(null);
    const accentColor = 'text-blue-600';

    useEffect(() => { setVisibleCount(50); }, [data, sort]);
    useEffect(() => {
        if (!observerTarget.current) return;
        const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) setVisibleCount(p => Math.min(p + 50, data.length)); }, { threshold: 0.1, rootMargin: '400px' });
        const currentTarget = observerTarget.current;
        observer.observe(currentTarget);
        return () => observer.disconnect();
    }, [data.length]);

    const visibleData = useMemo(() => {
        const result = [];
        const baseData = data.slice(0, visibleCount);
        const promoTypes = ['skool_training', 'shop_gear', 'pro_setter'];
        let rankedIdx = 0; let isUnranked = false;
        baseData.forEach((item, idx) => {
          if (item.isDivider || item.isQualified === false) isUnranked = true;
          result.push(item);
          if (!isUnranked && !item.isDivider) {
            rankedIdx++;
            if (rankedIdx > 0 && rankedIdx % 15 === 0) result.push({ isUtility: true, type: promoTypes[Math.floor(rankedIdx / 15) % promoTypes.length] });
          }
        });
        return result;
    }, [data, visibleCount]);

    const renderCell = (col, item) => {
        const val = item[col.key];
        if (col.isRank) return <ASRRankBadge rank={item.currentRank} theme={theme} />;
        if (col.type === 'profile') {
            return (
                <div className="flex flex-col text-left">
                  <span className={`text-xs sm:text-[17px] font-black uppercase group-hover:${accentColor} transition-colors`}>{val}</span>
                  <div className="flex items-center gap-1.5 mt-1 opacity-70 text-[10px] sm:text-[12px] font-black uppercase">{item.city} {item[col.subKey]}</div>
                </div>
            );
        }
        if (col.type === 'number' || col.type === 'highlight') {
            const display = (val === null || val === undefined) ? '-' : (typeof val === 'number' && col.decimals !== undefined ? val.toFixed(col.decimals) : val);
            return <span className={`font-mono font-black text-xs sm:text-[18px] tabular-nums num-col ${col.type === 'highlight' ? accentColor : 'opacity-80'}`}>{display}</span>;
        }
        if (col.type === 'records') return <ASRRecordsBlock mRecord={item.mRecord} fRecord={item.fRecord} theme={theme} />;
        return <span className="text-xs font-black">{val}</span>;
    };

    return (
        <table className="min-w-full">
            <thead className={`sticky top-0 z-20 backdrop-blur-xl border-b-2 border-subtle ${theme === 'dark' ? 'bg-[#000000]/95 text-slate-300' : 'bg-[#f1f5f9]/95 text-slate-700'}`}>
                <tr className="text-[11px] font-black uppercase tracking-widest">
                    {columns.map((col, i) => col.isRank ? (
                        <th key={i} className="pl-6 sm:pl-10 py-8 text-left w-24 font-black text-[10px] sm:text-[12px] uppercase tracking-widest border-b-2 border-transparent">RANK</th>
                    ) : (
                        <ASRHeaderComp 
                          key={col.key} 
                          l={col.label} 
                          k={col.key} 
                          a={col.align} 
                          w={col.width} 
                          activeSort={sort} 
                          handler={onSort} 
                          tooltip={col.tooltip} 
                          paddingClass={col.type === 'profile' ? "pl-4 sm:pl-8 pr-2" : "px-4"}
                        />
                    ))}
                </tr>
            </thead>
            <tbody className={`divide-y-2 ${theme === 'dark' ? 'divide-white/10' : 'divide-slate-200'}`}>
                {visibleData.map((item, idx) => {
                    if (item.isDivider) return <tr key={idx}><td colSpan={columns.length} className="py-14 text-center opacity-60 text-[11px] font-black uppercase tracking-[0.5em]">{item.label}</td></tr>;
                    if (item.isUtility) return <tr key={idx}><td colSpan={columns.length} className="px-6 py-6"><ASRInlineValueCard type={item.type} theme={theme} /></td></tr>;
                    return (
                        <tr key={idx} onClick={() => onRowClick?.(item)} className={`group transition-all cursor-pointer active:scale-[0.99] ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-200/40'} ${item.isQualified === false ? 'opacity-50' : ''}`}>
                            {columns.map((col, i) => <td key={i} className={`py-6 sm:py-8 ${col.isRank ? 'pl-6 sm:pl-10' : (col.type === 'profile' ? 'pl-4 sm:pl-8 pr-2' : (i === columns.length - 1 ? 'pr-6 sm:pr-12' : 'px-4'))} ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{renderCell(col, item)}</td>)}
                        </tr>
                    );
                })}
                <tr ref={observerTarget} className="h-4" />
            </tbody>
        </table>
    );
};

const ASRNavBar = ({ theme, setTheme, view, setView, onOpenIntro }) => {
    return (
        <nav className={`fixed top-[var(--safe-top)] w-full backdrop-blur-2xl border-b-2 z-50 flex items-center justify-between px-4 sm:px-12 transition-all duration-500 ${theme === 'dark' ? 'bg-[#000000]/90 border-white/10 text-slate-100' : 'bg-white/80 border-slate-300 text-slate-900'} h-16 sm:h-24 shadow-sm`}>
            <div className="group flex items-center gap-3 shrink-0">
                <div className="text-blue-600 animate-pulse"><IconSpeed size={28} /></div>
                <span className="font-black text-lg sm:text-2xl uppercase italic leading-none hidden xs:block tracking-tighter">ASR</span>
            </div>
            <div className="flex-1 flex justify-center gap-1 sm:gap-4 px-4 h-full items-center">
                {['map', 'players', 'hof'].map(v => (
                    <button key={v} onClick={() => setView(v)} className={`flex-1 sm:flex-none px-4 sm:px-12 py-2 sm:py-3.5 rounded-2xl sm:rounded-[1.8rem] text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all ${view === v ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} text-inherit whitespace-nowrap`}>
                        {v.toUpperCase()}
                    </button>
                ))}
            </div>
            <div className="shrink-0 flex items-center gap-2 sm:gap-3">
                <button onClick={onOpenIntro} className="w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-2xl transition-all border-subtle hover:border-blue-500"><HelpCircle size={20} /></button>
                <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-2xl transition-all border-subtle hover:border-blue-500">{theme === 'dark' ? <IconSun /> : <IconMoon />}</button>
            </div>
        </nav>
    );
};

const ASRControlBar = ({ view, eventType, setEventType, theme }) => {
    return (
        <header className="pt-20 sm:pt-32 pb-10 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col items-center gap-10">
            <h1 className={`text-4xl sm:text-[80px] font-black uppercase tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{view === 'hof' ? 'HALL OF FAME' : view.toUpperCase()}</h1>
            {view !== 'hof' && (
                <div className="flex flex-col items-center gap-8 w-full min-h-[160px]">
                  <div className={`flex items-center p-2 rounded-[1.8rem] border-2 border-subtle w-fit ${theme === 'dark' ? 'bg-black/60 shadow-2xl' : 'bg-white shadow-xl'}`}>
                      <div className="flex gap-2">
                          <button onClick={() => setEventType('open')} className={`px-8 sm:px-16 py-4 rounded-[1.2rem] text-[10px] sm:text-[16px] font-black uppercase tracking-widest transition-all ${eventType === 'open' ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} whitespace-nowrap`}>ASR OPEN</button>
                          <button onClick={() => setEventType('all-time')} className={`px-8 sm:px-16 py-4 rounded-[1.2rem] text-[10px] sm:text-[16px] font-black uppercase tracking-widest transition-all ${eventType === 'all-time' ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} whitespace-nowrap`}>ALL-TIME</button>
                      </div>
                  </div>

                  <div className="h-14 flex items-center justify-center">
                    {eventType === 'open' ? (
                        <div className={`inline-flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-10 py-5 rounded-3xl sm:rounded-full border-2 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 ${theme === 'dark' ? 'bg-black/90 border-white/20 text-slate-100' : 'bg-white/95 border-slate-400 text-slate-800'} ios-clip-fix`}>
                            <div className="flex items-center gap-3">
                                <span className="text-blue-500 animate-pulse text-2xl leading-none">●</span>
                                <span className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest whitespace-nowrap">THE 2026 ASR OPEN IS LIVE</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-80">
                                <Timer size={16} className="text-blue-600" />
                                <span className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest whitespace-nowrap">SUBMISSIONS DUE MAY 31</span>
                            </div>
                        </div>
                    ) : (
                        <div className={`inline-flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-10 py-5 rounded-3xl sm:rounded-full border-2 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 ${theme === 'dark' ? 'bg-black/90 border-white/20 text-slate-100' : 'bg-white/95 border-slate-400 text-slate-800'} ios-clip-fix`}>
                            <div className="flex items-center gap-3">
                                <ShieldCheck size={18} className="text-blue-600" />
                                <span className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest whitespace-nowrap">FINDING THE FASTEST IRL</span>
                            </div>
                            <div className="flex items-center gap-3 opacity-80">
                                <Fingerprint size={16} className="text-blue-600" />
                                <span className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest whitespace-nowrap">STATS TRACKED IN REAL-TIME</span>
                            </div>
                        </div>
                    )}
                  </div>
                </div>
            )}
        </header>
    );
};

// --- MAIN APP ---

const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-full px-4' },
    { label: 'RATING', type: 'highlight', key: 'rating', decimals: 2, align: 'right', width: 'w-24 sm:w-48' },
    { label: 'RUNS', type: 'number', key: 'runs', align: 'right', width: 'w-20 sm:w-32' },
    { label: 'SETS', type: 'number', key: 'sets', align: 'right', width: 'w-20 sm:w-32' }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-full px-4' },
    { label: 'PLAYERS', type: 'highlight', key: 'totalAthletes', align: 'right', width: 'w-40' },
    { label: 'RECORDS', type: 'records', key: 'mRecord', align: 'right', width: 'w-56' }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('open'); 
  const [view, setView] = useState('map'); 
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showIntro, setShowIntro] = useState(false);
  const [modalHistory, setModalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { data, openData, atPerfs, opPerfs, lbAT, atMet, dnMap, cMet, settersData, atRawBest, isLoading, hasError } = useASRData();
  const isAllTimeContext = eventType === 'all-time';

  useEffect(() => { setSearch(''); }, [view, eventType, gen]);

  const openModal = useCallback((type, data, roleOverride = null, contextOverride = null) => {
    setModalHistory(p => [...p.slice(0, historyIndex + 1), { type, data, roleOverride, contextOverride }]);
    setHistoryIndex(p => p + 1);
  }, [historyIndex]);

  const closeAllModals = useCallback(() => { setHistoryIndex(-1); setModalHistory([]); }, []);
  const goBackModal = useCallback(() => setHistoryIndex(c => Math.max(-1, c - 1)), []);
  const goForwardModal = useCallback(() => setHistoryIndex(c => Math.min(modalHistory.length - 1, c + 1)), [modalHistory.length]);
  const jumpToHistory = useCallback((index) => setHistoryIndex(index), []);

  const activeModal = historyIndex >= 0 ? modalHistory[historyIndex] : null;
  const canGoForward = historyIndex < modalHistory.length - 1;

  const [viewSorts, setViewSorts] = useState({
    players: { key: 'rating', direction: 'descending' },
    courses: { key: 'totalAllTimeRuns', direction: 'descending' }, 
    hof: { key: 'gold', direction: 'descending' }
  });

  const handleSort = (newSort) => {
    const key = view === 'map' ? 'courses' : (view === 'players' ? 'players' : view);
    setViewSorts(p => ({ ...p, [key]: typeof newSort === 'function' ? newSort(p[key]) : newSort }));
  };

  const list = useMemo(() => {
    if (view !== 'players') return []; 
    const src = isAllTimeContext ? data : openData;
    const term = debouncedSearch.toLowerCase();
    const filtered = (src || []).filter(p => p && p.gender === gen && (p.searchKey || "").includes(term));
    if (filtered.length === 0) return [];

    let qual = filtered.filter(isQualifiedAthlete);
    let unranked = filtered.filter(p => !isQualifiedAthlete(p));

    if (!isAllTimeContext) {
      const allTimeRankedKeys = new Set(data.map(p => p.pKey));
      unranked = unranked.filter(p => allTimeRankedKeys.has(p.pKey));
    }

    const sort = viewSorts.players; const dir = sort.direction === 'ascending' ? 1 : -1;
    qual.sort((a, b) => robustSort(a, b, sort.key, dir));
    unranked.sort((a, b) => b.runs - a.runs);
    
    const fQual = qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true }));
    const fUnranked = unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }));
    
    return fQual.length && fUnranked.length ? [...fQual, { isDivider: true, label: "UNRANKED" }, ...fUnranked] : [...fQual, ...fUnranked];
  }, [debouncedSearch, viewSorts.players, gen, isAllTimeContext, data, openData, view]);

  const masterCourseList = useMemo(() => {
    const courseNames = Array.from(new Set([...Object.keys(cMet || {}), ...Object.keys(lbAT.M || {}), ...Object.keys(lbAT.F || {})])).filter(Boolean);
    return courseNames.map(name => {
      const athletesMAll = Object.entries((lbAT.M || {})[name] || {}).map(([pKey, time]) => [pKey, time, atRawBest?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const athletesFAll = Object.entries((lbAT.F || {})[name] || {}).map(([pKey, time]) => [pKey, time, atRawBest?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const meta = cMet[name] || {}; const contData = getContinentData(meta.country || 'UNKNOWN');
      const mRecs = Object.values((lbAT.M || {})[name] || {}); const fRecs = Object.values((lbAT.F || {})[name] || {});
      const coordsMatch = meta.coordinates ? String(meta.coordinates).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) : null;
      return {
        name, city: meta.city || 'UNKNOWN', country: meta.country || 'UNKNOWN', flag: meta.flag || '🏳️', continent: contData.name, continentFlag: contData.flag,
        mRecord: mRecs.length ? Math.min(...mRecs) : null, fRecord: fRecs.length ? Math.min(...fRecs) : null,
        totalAthletes: new Set([...athletesMAll.map(a => a[0]), ...athletesFAll.map(a => a[0])]).size, totalRuns: athletesMAll.length + athletesFAll.length,
        allTimeMRecord: mRecs.length ? Math.min(...mRecs) : null, allTimeFRecord: fRecs.length ? Math.min(...fRecs) : null,
        allTimeAthletesM: athletesMAll, allTimeAthletesF: athletesFAll, totalAllTimeAthletes: new Set([...athletesMAll.map(a => a[0]), ...athletesFAll.map(a => a[0])]).size,
        totalAllTimeRuns: athletesMAll.length + athletesFAll.length, parsedCoords: coordsMatch ? [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])] : null, ...meta
      };
    });
  }, [lbAT, cMet, atRawBest]);

  const rawCourseList = useMemo(() => {
    return masterCourseList.filter(c => isAllTimeContext || c.is2026);
  }, [masterCourseList, isAllTimeContext]);

  const courseList = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    const filtered = (rawCourseList || []).filter(c => c && (c.searchKey || "").includes(term));
    const sort = viewSorts.courses; const dir = sort.direction === 'ascending' ? 1 : -1;
    filtered.sort((a, b) => robustSort(a, b, sort.key, dir));
    return filtered.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, debouncedSearch, viewSorts.courses]);

  const settersWithImpact = useMemo(() => {
    return (settersData || []).map(s => {
        const sName = s.name.trim();
        const leadCourses = masterCourseList.filter(c => isNameInList(sName, c.leadSetters));
        const assistCourses = masterCourseList.filter(c => isNameInList(sName, c.assistantsetters));
        const allSetCourses = Array.from(new Set([...leadCourses, ...assistCourses]));
        
        return { 
            ...s, 
            leads: leadCourses.length,
            assists: assistCourses.length,
            sets: leadCourses.length + assistCourses.length,
            impact: allSetCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0)
        };
    }).filter(s => isAllTimeContext || s.sets > 0);
  }, [settersData, masterCourseList, isAllTimeContext]);

  const hofStats = useMemo(() => {
    if (view !== 'hof' || !data || data.length === 0) return null; 
    return calculateHofStats(data, atPerfs, lbAT, atMet, viewSorts.hof, settersWithImpact);
  }, [data, lbAT, atMet, atPerfs, viewSorts.hof, settersWithImpact, view]);

  const breadcrumbsArr = useMemo(() => (historyIndex < 0) ? [] : modalHistory.slice(0, historyIndex + 1).map(h => h.data.name || 'Detail'), [modalHistory, historyIndex]);

  const renderActiveModal = () => {
    if (!activeModal) return null;
    const props = { 
      isOpen: true, 
      onClose: closeAllModals, 
      onBack: goBackModal, 
      onForward: goForwardModal, 
      canGoForward, 
      theme, 
      breadcrumbs: breadcrumbsArr, 
      onBreadcrumbClick: jumpToHistory, 
      allCourses: masterCourseList,
      openRankings: openData,
      allPlayers: data, 
      atPerfs,
      opPerfs
    };
    switch (activeModal.type) {
        case 'player': 
        case 'setter': {
            const pKey = activeModal.data.pKey || normalizeName(activeModal.data.name);
            const athleteData = atMet[pKey] || activeModal.data;
            const openAthleteData = openData.find(p => p.pKey === pKey);
            const setterData = settersWithImpact.find(s => normalizeName(s.name) === pKey);
            const targetRole = activeModal.roleOverride || (activeModal.type === 'player' ? 'all-time' : activeModal.type);
            return <ASRProfileModal {...props} identity={{ ...athleteData, setterData, openStats: openAthleteData }} initialRole={targetRole} openModal={openModal} jumpToHistory={jumpToHistory} />;
        }
        case 'course': return <ASRCourseModal {...props} course={activeModal.data} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => openModal('player', p)} onSetterClick={(sName) => { const sObj = settersWithImpact.find(s => s.name.toLowerCase() === sName.toLowerCase()); if (sObj) openModal('setter', sObj); }} />;
        case 'region': return <ASRRegionModal {...props} region={activeModal.data} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} openModal={openModal} jumpToHistory={jumpToHistory} />;
        default: return null;
    }
  };

  return (
    <div className={`min-h-[100dvh] transition-colors duration-500 font-sans pb-32 flex flex-col antialiased ${theme === 'dark' ? 'bg-[#000000] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <CustomStyles />
      <ASRNavBar theme={theme} setTheme={setTheme} view={view} setView={setView} onOpenIntro={() => setShowIntro(true)} />
      <ASROnboarding isOpen={showIntro} onClose={() => setShowIntro(false)} theme={theme} />
      
      <div className="flex-1 flex flex-col pt-[calc(64px+var(--safe-top))] sm:pt-[calc(96px+var(--safe-top))]">
        {renderActiveModal()}
        <ASRControlBar view={view} eventType={eventType} setEventType={setEventType} theme={theme} />
        <main className="max-w-7xl mx-auto px-4 sm:px-12 flex-grow w-full">
          {isLoading && data.length === 0 ? <div className={`border-2 border-subtle rounded-[3.5rem] h-96 animate-pulse ${theme === 'dark' ? 'bg-black/40' : 'bg-slate-200'}`} /> : 
           view === 'hof' ? <ASRHallOfFame stats={hofStats} theme={theme} onPlayerClick={p => openModal('player', p, null, 'all-time')} onSetterClick={s => openModal('setter', s, null, 'all-time')} onRegionClick={r => openModal('region', r)} medalSort={viewSorts.hof} setMedalSort={handleSort} /> : 
           <div className="space-y-12">
             {view === 'map' && <ASRGlobalMap courses={rawCourseList} continents={calculateContinentStats(rawCourseList)} cities={calculateCityStats(rawCourseList)} countries={calculateCountryStats(rawCourseList)} theme={theme} eventType={eventType} onCourseClick={openModal} onCountryClick={c => openModal('region', {...c, type: 'country'})} onCityClick={c => openModal('region', {...c, type: 'city'})} onContinentClick={c => openModal('region', {...c, type: 'continent'})} />}
             <ASRSearchInput search={search} setSearch={setSearch} gen={gen} setGen={setGen} theme={theme} view={view} />
             <div className={`relative border-2 border-subtle rounded-[2rem] sm:rounded-[3.5rem] shadow-premium overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-black/40' : 'bg-white'}`}>
               <div className="overflow-auto scrollbar-hide max-h-[80vh] relative w-full">
                 {(view === 'map' ? courseList : list).length > 0 ? <ASRDataTable theme={theme} columns={view === 'map' ? COURSE_COLS : PLAYER_COLS} sort={viewSorts[view === 'map' ? 'courses' : 'players']} onSort={handleSort} data={view === 'map' ? courseList : list} onRowClick={item => openModal(view === 'map' ? 'course' : 'player', item)} /> :
                 <div className="flex flex-col items-center justify-center py-40 opacity-30"><IconSpeed className="text-blue-600 mb-20 scale-[4.5]" /><h3 className="text-sm sm:text-2xl font-black uppercase tracking-[0.5em]">SYNC IN PROGRESS</h3></div>}
               </div>
             </div>
             
             <div className="animate-in fade-in duration-1000 slide-in-from-bottom-4">
                {view === 'map' && <ASRPromotionBanner type="setter" theme={theme} />}
                {view === 'players' && <ASRPromotionBanner type="coach" theme={theme} />}
             </div>
           </div>}
        </main>
      </div>
      <footer className="mt-40 text-center pb-[calc(80px+var(--safe-bottom))] opacity-30 font-black uppercase tracking-[0.6em] text-[11px]">© 2026 APEX SPEED RUN</footer>
    </div>
  );
}
                          // --- MOUNTING ---
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
