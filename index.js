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

// --- CONSTANTS & THEME TOKENS ---
const SNAPSHOT_KEY = 'asr_data_vault_v1_integrated_v20'; 
const REFRESH_INTERVAL = 300000; // 5 mins
const SKOOL_LINK = "https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93";

const THEME = {
  CARD: (t) => t === 'dark' 
    ? "bg-zinc-950/60 border-zinc-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.5)]" 
    : "bg-white border-slate-300 shadow-premium",
  
  GLASS: (t) => t === 'dark'
    ? "bg-zinc-900/80 border-zinc-700/50 backdrop-blur-xl shadow-2xl"
    : "bg-white/80 border-slate-300 backdrop-blur-md shadow-xl",

  MODAL_SURFACE: (t) => t === 'dark'
    ? "bg-[#080808] border-zinc-800 text-slate-100"
    : "bg-[#f1f5f9] border-slate-400 text-slate-900",

  HEADING_SM: "text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-70",
  HEADING_MAIN: "text-4xl sm:text-[80px] font-black uppercase tracking-tighter leading-none",
  LABEL: "text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-60",
  VALUE: "font-mono font-black tabular-nums num-col",
  
  INPUT: (t) => t === 'dark'
    ? "bg-zinc-900/50 text-white focus:bg-zinc-900/80 border-zinc-800 focus:border-blue-600/60 shadow-2xl"
    : "bg-white text-slate-900 border-slate-300 focus:border-blue-600 shadow-xl",
  
  BUTTON_ROUNDED: "rounded-[0.9rem] sm:rounded-[1.8rem] transition-all whitespace-nowrap",
  NAV_ITEM: "px-4 sm:px-12 py-2 sm:py-3.5 rounded-2xl sm:rounded-[1.8rem] text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all text-inherit whitespace-nowrap",
  
  ICON: "shrink-0 transition-colors"
};

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

const csvToObjects = (csv, mapping, headerRowIndex = 0) => {
  if (!csv) return [];
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length <= headerRowIndex) return [];

  const headers = parseLine(lines[headerRowIndex]);
  const colMap = {};

  Object.entries(mapping).forEach(([field, searchTerms]) => {
    colMap[field] = headers.findIndex(h => 
      searchTerms.some(term => h.toLowerCase().trim().includes(term.toLowerCase()))
    );
  });

  return lines.slice(headerRowIndex + 1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    Object.keys(mapping).forEach(field => {
      const idx = colMap[field];
      obj[field] = idx !== -1 ? vals[idx] : undefined;
    });
    obj.__raw = vals;
    return obj;
  });
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

// Threshold Logic
const isQualifiedAthlete = (p, isAllTime = true) => {
    if (!p) return false;
    const runs = p.runs || 0;
    if (isAllTime) {
      return p.gender === 'M' ? (runs >= 4) : (runs >= 2);
    } else {
      return runs >= 3;
    }
};

const isNameInList = (name, listStr) => {
    if (!listStr || !name) return false;
    const searchName = name.toLowerCase().trim();
    const parts = listStr.split(/[,&/]| and /i).map(n => n.trim().toLowerCase());
    return parts.some(p => p === searchName || p.includes(searchName) || searchName.includes(p));
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
    
    .glow-gold { text-shadow: 0 0 12px rgba(245, 158, 11, 0.7); }
    .glow-blue { text-shadow: 0 0 15px rgba(37, 99, 235, 0.7); }
    
    .num-col { font-variant-numeric: tabular-nums; }
    
    .ios-clip-fix {
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      isolation: isolate;
      overflow: hidden;
      -webkit-mask-image: -webkit-radial-gradient(white, black);
    }

    #asr-map-container {
      touch-action: none !important; 
      overflow: hidden;
      position: relative;
      background: #000;
    }

    .leaflet-container {
        touch-action: none !important;
        -webkit-tap-highlight-color: transparent;
        z-index: 10 !important;
        background: #000 !important;
    }

    .leaflet-marker-pane {
        pointer-events: none !important;
    }

    .leaflet-marker-icon, 
    .leaflet-marker-shadow,
    .asr-cluster,
    .asr-marker-outer {
        pointer-events: auto !important;
        cursor: pointer !important;
        -webkit-user-select: none;
    }

    .asr-marker-outer:active {
        transform: scale(0.9);
    }

    .asr-cluster {
      background: rgba(37, 99, 235, 0.9) !important;
      border: 2px solid #ffffff !important;
      border-radius: 50%;
      color: #ffffff !important;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      cursor: pointer !important;
      font-weight: 900 !important;
      font-size: 11px !important;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      z-index: 1000 !important;
    }

    .asr-marker-outer {
        cursor: pointer !important;
        z-index: 1000 !important;
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
    
    .shadow-premium { box-shadow: 0 10px 40px -10px rgba(0,0,0,0.15); }
    .border-subtle { border-color: rgba(0,0,0,0.1); }
    .dark .border-subtle { border-color: rgba(255,255,255,0.08); }

    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --announcement-height: 28px;
    }
    
    html, body {
      height: 100%;
      height: 100dvh;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: #000;
    }
  `}</style>
);

// --- ATOMIC UI COMPONENTS ---

const ASRSectionHeading = ({ children, theme, className = "" }) => (
    <h3 className={`${THEME.HEADING_SM} px-1 sm:px-2 mb-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-800'} ${className}`}>
        {children}
    </h3>
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
    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black shadow-md rounded-inherit ${sizeCls} textured-surface ios-clip-fix`}>
      <span className="relative z-10">{getInitials(name)}</span>
    </div>
  );
};

const formatLocationSubtitle = (namesStr, flagsStr, prefix = '') => {
    if (!namesStr && !flagsStr) return <div className="whitespace-normal text-inherit font-black">UNKNOWN 🏳️</div>;
    if (!namesStr) return <div className="whitespace-normal text-inherit font-black">{flagsStr}</div>;
    const names = String(namesStr).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    const flagsMatch = String(flagsStr || '').match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]|🏳️/g) || [];
    
    return (
        <div className="whitespace-normal text-inherit font-black">
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
    unranked: { border: 'border-none', text: 'text-zinc-500', glow: 'shadow-none' },
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
    <div className={`stat-card-container relative flex flex-col border p-3 sm:p-5 rounded-3xl transition-all ${THEME.CARD(theme)} ${tooltip ? 'cursor-help' : ''}`}>
        <span className={`${THEME.LABEL} mb-1.5 flex items-center gap-1.5 text-inherit whitespace-nowrap overflow-hidden shrink-0`}>
            {label}
        </span>
        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0 min-w-0">
          {icon && <span className="text-xs sm:text-sm shrink-0 mb-0.5">{icon}</span>}
          <span className={`text-[12px] sm:text-[18px] lg:text-[22px] leading-tight break-all ${THEME.VALUE} ${colorClass || ''} ${glowClass || ''}`}>{value}</span>
        </div>
    </div>
  );
};

const ASRListItem = ({ 
  rank, title, subtitle, variant = 'table', stats = [], columns = [], videoUrl, icon, theme, onClick, isUnranked = false,
  badgeContent, shouldFade = false
}) => {
  const accentColor = 'text-blue-600';
  
  if (variant === 'table') {
    return (
      <div 
        onClick={onClick} 
        className={`group flex items-center transition-all cursor-pointer active:scale-[0.98] ios-clip-fix py-6 sm:py-8 px-0 ${theme === 'dark' ? 'hover:bg-zinc-800/40' : 'hover:bg-slate-200/40'} ${shouldFade ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="w-20 sm:w-24 pl-4 sm:pl-10 shrink-0">
           <ASRRankBadge rank={rank} theme={theme} />
        </div>
        <div className="flex-1 flex min-w-0 h-full items-center">
            <div className="flex-1 flex flex-col min-w-[120px] pr-2 pl-4 sm:pl-8 text-left">
              <span className={`text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight group-hover:${accentColor} transition-colors overflow-hidden line-clamp-2`}>
                {title}
              </span>
              <div className="opacity-70 text-[9px] sm:text-xs font-black uppercase whitespace-normal break-words mt-0.5">
                {subtitle}
              </div>
              {badgeContent && <div className="mt-1 h-4 flex items-center gap-1">{badgeContent}</div>}
            </div>
            {stats.map((s, idx) => {
                const colDef = columns.filter(c => !c.isRank && c.type !== 'profile')[idx];
                return (
                  <div key={idx} className={`${colDef?.width || 'w-20 sm:w-24'} px-2 sm:px-4 flex items-center justify-end text-right shrink-0 h-full`}>
                    <span className={`${THEME.VALUE} ${idx === 0 ? `text-xs sm:text-[18px] ${s.color || accentColor}` : 'text-[9px] sm:text-[13px] opacity-60'}`}>
                      {s.value}
                    </span>
                  </div>
                );
            })}
            <div className="w-10 sm:w-16 flex items-center justify-center shrink-0">
              {videoUrl ? (
                <a 
                  href={videoUrl} target="_blank" rel="noopener noreferrer" 
                  onClick={e => e.stopPropagation()} 
                  className="p-2 sm:p-2.5 rounded-xl transition-all hover:scale-120 text-slate-500 hover:text-blue-600 flex items-center justify-center"
                >
                  <Play size={18} strokeWidth={2.5} className={THEME.ICON} />
                </a>
              ) : <div className="p-2 sm:p-2.5" />}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick} 
      className={`group flex items-center justify-between transition-all cursor-pointer active:scale-[0.98] ios-clip-fix 
        p-4 rounded-3xl border h-auto min-h-[72px] py-4
        ${theme === 'dark' 
          ? 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60' 
          : 'bg-white border-slate-300 shadow-md hover:bg-slate-50'}
        ${shouldFade ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
        {icon ? (
          <div className="p-2.5 rounded-xl text-zinc-500 group-hover:text-blue-600 transition-colors shrink-0">
            {icon}
          </div>
        ) : (
          <div className="shrink-0">
            <ASRRankBadge rank={rank} theme={theme} />
          </div>
        )}
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight group-hover:${accentColor} transition-colors`}>
              {title}
            </span>
          </div>
          <div className="flex flex-col mt-0.5">
            <div className="opacity-70 text-[9px] sm:text-xs font-black uppercase whitespace-normal break-words">
              {subtitle}
            </div>
            {badgeContent && <div className="mt-1 h-4 flex items-center gap-1">{badgeContent}</div>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 pr-2 shrink-0 h-full">
        <div className="flex flex-col items-end min-w-[60px] sm:min-w-[100px] text-right">
          {stats.map((s, idx) => (
            <span key={idx} className={`${THEME.VALUE} ${idx === 0 ? `text-xs sm:text-[18px] ${s.color || accentColor}` : 'text-[9px] opacity-60'}`}>
              {s.value}
            </span>
          ))}
        </div>
        <div className="w-10 sm:w-16 flex items-center justify-center shrink-0">
          {videoUrl ? (
            <a 
              href={videoUrl} target="_blank" rel="noopener noreferrer" 
              onClick={e => e.stopPropagation()} 
              className="p-2.5 rounded-xl transition-all hover:scale-120 text-slate-500 hover:text-blue-600 flex items-center justify-center"
            >
              <Play size={20} strokeWidth={2.5} className={THEME.ICON} />
            </a>
          ) : <div className="p-2.5" />}
        </div>
      </div>
    </div>
  );
};

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
            <p className="text-[10px] sm:text-xs font-black uppercase whitespace-normal break-words opacity-90">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl group-hover:bg-blue-50 transition-colors whitespace-nowrap">
          {config.btnText} <ChevronRight size={14} strokeWidth={3} className={THEME.ICON} />
        </div>
      </div>
    </a>
  );
};

const ASRPatronPill = ({ course, theme, compact = false }) => {
    const isMillennium = course.name?.toUpperCase() === 'MILLENNIUM';
    
    const goldBg = theme === 'dark' ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10' : 'bg-gradient-to-br from-amber-100 to-amber-50';
    const goldBorder = theme === 'dark' ? 'border-amber-500/60' : 'border-amber-500/50';
    const goldTextPrimary = theme === 'dark' ? 'text-amber-500' : 'text-amber-700';
    const goldTextSecondary = theme === 'dark' ? 'text-amber-500/70' : 'text-amber-700/80';
    const goldIconBg = 'bg-amber-500';
    const goldIconText = 'text-white';

    const fadedBg = theme === 'dark' ? 'bg-zinc-800/20' : 'bg-slate-100/80';
    const fadedBorder = theme === 'dark' ? 'border-zinc-800' : 'border-slate-300';
    const fadedTextPrimary = theme === 'dark' ? 'text-zinc-400' : 'text-slate-600';
    const fadedTextSecondary = theme === 'dark' ? 'text-zinc-500' : 'text-slate-400';

    if (!compact) {
      if (isMillennium) {
        return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`w-full flex items-center gap-4 px-5 py-3 rounded-[1.5rem] border backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl shrink-0 transition-all hover:scale-[1.01] active:scale-[0.99] group ${goldBg} ${goldBorder} ios-clip-fix h-[72px]`}>
              <div className="relative">
                <div className={`w-9 h-9 rounded-full ${goldIconBg} flex items-center justify-center text-[10px] ${goldIconText} font-black italic shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:rotate-12 transition-transform`}>JB</div>
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
              <div className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-slate-400 shadow-sm'} group-hover:text-amber-500`}>
                <Building2 size={16} className={THEME.ICON} />
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] ${fadedTextSecondary} leading-tight`}>Course Partnership Available</span>
                <span className={`text-[10px] sm:text-[12px] font-black uppercase whitespace-normal break-words ${fadedTextPrimary} group-hover:text-amber-500 transition-colors leading-tight`}>ADOPT A COURSE, SUPPORT THE PROJECT</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-zinc-800 text-zinc-500 group-hover:border-amber-500 group-hover:text-amber-500' : 'border-slate-300 text-slate-400 group-hover:border-amber-500 group-hover:text-amber-500'} whitespace-nowrap`}>
              ENQUIRE
            </div>
        </a>
      );
    }

    if (isMillennium) {
      return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.05] active:scale-95 group shadow-md ${goldBg} ${goldBorder} ios-clip-fix h-[50px]`}>
              <div className={`w-5 h-5 rounded-full ${goldIconBg} flex items-center justify-center text-[8px] ${goldIconText} font-black italic shadow-[0_0_5px_rgba(245,158,11,0.3)]`}>JB</div>
              <div className="flex flex-col text-left">
                  <span className={`text-[7px] font-black uppercase tracking-widest ${goldTextSecondary} opacity-80 leading-none`}>Sponsor</span>
                  <span className={`text-[10px] font-black uppercase whitespace-normal break-words ${goldTextPrimary}`}>Juicebox.money</span>
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
      icon: <Users size={18} className={THEME.ICON} />,
      link: SKOOL_LINK,
      btn: "JOIN NOW"
    },
    shop_gear: {
      title: "Verify Your Run",
      desc: "Submit and verify your video proof via Apex Skool app.",
      icon: <Video size={18} className={THEME.ICON} />,
      link: SKOOL_LINK,
      btn: "GET VERIFIED"
    },
    pro_setter: {
        title: "Course Setter Certification",
        desc: "Take the course setter certification on Apex Skool app.",
        icon: <GraduationCap size={18} className={THEME.ICON} />,
        link: SKOOL_LINK,
        btn: "LEARN MORE"
    }
  };
  const c = cards[type];
  if (!c) return null;
  return (
    <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.005] textured-surface ${theme === 'dark' ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50 border-blue-300 shadow-md'} ios-clip-fix h-[72px]`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm text-blue-600">{c.icon}</div>
        <div className="text-left">
          <h5 className="text-xs font-black uppercase tracking-tight">{c.title}</h5>
          <p className="text-[10px] font-black opacity-60 uppercase whitespace-normal break-words">{c.desc}</p>
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
      <div className={`w-full max-w-xl rounded-[3rem] p-8 sm:p-14 border ${theme === 'dark' ? 'bg-[#050505] border-zinc-800' : 'bg-white border-slate-300'} shadow-[0_0_100px_rgba(0,0,0,0.6)] relative overflow-hidden ios-clip-fix`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        {step > 0 && (
          <button onClick={prevStep} className="absolute top-8 left-8 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20" title="Go Back">
            <CornerUpLeft size={24} strokeWidth={2.5} className={THEME.ICON} />
          </button>
        )}

        <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20">
          <X size={24} strokeWidth={2.5} className={THEME.ICON} />
        </button>
        
        <div className="flex flex-col items-center text-center space-y-10 relative z-10 pt-12 sm:pt-0">
          <div className={`p-7 rounded-[2.5rem] textured-surface bg-blue-500/10 animate-subtle-pulse mx-auto flex items-center justify-center`}>
            {React.cloneElement(steps[step].icon, { className: "relative z-10" })}
          </div>
          
          <div className="space-y-5">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.9] whitespace-normal break-words">
              {steps[step].title}
            </h2>
            <p className="text-lg sm:text-xl font-black opacity-70 leading-relaxed max-w-md text-inherit whitespace-normal break-words">
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
                  {steps[step].action} <CornerUpRight size={20} strokeWidth={2.5} className={THEME.ICON} />
                </a>
              ) : (
                <button 
                  onClick={nextStep} 
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 text-xs sm:text-sm shadow-2xl whitespace-nowrap"
                >
                  Next <ChevronRight size={20} strokeWidth={2.5} className={THEME.ICON} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ASRBaseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, theme, header, breadcrumbs, onBreadcrumbClick, children }) => {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Reset scroll on breadcrumb change (new profile/course entry)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [breadcrumbs?.length]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-xl bg-black/90 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`${THEME.MODAL_SURFACE(theme)} border w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.7)] scale-100 animate-in fade-in zoom-in-[0.98] duration-300 ease-out flex flex-col max-h-[94vh] ios-clip-fix`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 flex flex-col p-6 sm:p-8 lg:p-10 gap-6 bg-gradient-to-b ${theme === 'dark' ? 'from-zinc-900/40' : 'from-slate-300/60'} to-transparent relative`}>
          <div className="flex items-start justify-between gap-4 z-10 w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <button aria-label="Go Back" onClick={onBack} className={`group p-2.5 sm:p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all shrink-0`} title="Go Back">
                      <CornerUpLeft size={18} strokeWidth={2.5} className={`${THEME.ICON} text-slate-200 group-hover:text-white`} />
                  </button>
                  {canGoForward && (
                      <button aria-label="Go Forward" onClick={onForward} className={`group p-2.5 sm:p-3 bg-black/30 hover:bg-black/50 rounded-full text-white transition-all shrink-0`} title="Go Forward">
                          <CornerUpRight size={18} strokeWidth={2.5} className={`${THEME.ICON} text-slate-200 group-hover:text-white`} />
                      </button>
                  )}
                  {breadcrumbs && breadcrumbs.length > 0 && (
                      <div className={`ml-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap px-4 py-2.5 rounded-full border shadow-xl shrink min-w-0 ${THEME.GLASS(theme)}`}>
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
                  <X size={18} strokeWidth={2.5} className={THEME.ICON} />
              </button>
          </div>
          <div className="w-full pt-1 sm:pt-0">
            {header}
          </div>
        </div>
        <div ref={scrollContainerRef} className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-12 scrollbar-hide ${theme === 'dark' ? 'bg-[#050505]' : 'bg-slate-100'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// --- INSPECTOR BODY COMPONENTS ---

const CourseDetails = ({ course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, onSetterClick }) => {
  const stats = [
    { label: 'CR (M)', value: typeof course.allTimeMRecord === 'number' ? course.allTimeMRecord.toFixed(2) : '-', icon: <Zap size={14} className={THEME.ICON} />, color: 'text-blue-600' },
    { label: 'CR (W)', value: typeof course.allTimeFRecord === 'number' ? course.allTimeFRecord.toFixed(2) : '-', icon: <Zap size={14} className={THEME.ICON} />, color: 'text-blue-600' },
    { label: 'Diff', value: course.difficulty || '-', icon: <Compass size={14} className={THEME.ICON} /> }, 
    { label: 'Players', value: course.totalAllTimeAthletes, icon: <Users size={14} className={THEME.ICON} /> },
    { label: 'Length', value: course.length ? `${course.length}m` : '-', icon: <Ruler size={14} className={THEME.ICON} /> },
    { label: 'Elev', value: course.elevation ? `${course.elevation}m` : '-', icon: <Mountain size={14} className={THEME.ICON} /> },
    { label: 'Type', value: course.type || '-', icon: <Dna size={14} className={THEME.ICON} /> },
    { label: 'Date', value: course.dateSet || '-', icon: <Calendar size={14} className={THEME.ICON} /> }
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-14 sm:gap-20">
        <ASRRankList title="MEN'S TOP 10" athletes={course.allTimeAthletesM || []} genderRecord={course.allTimeMRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
        <ASRRankList title="WOMEN'S TOP 10" athletes={course.allTimeAthletesF || []} genderRecord={course.allTimeFRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
      </div>

      <div className="space-y-8">
        <ASRSectionHeading theme={theme} className="text-left">COURSE STATS</ASRSectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className={`p-4 rounded-[1.5rem] border text-left flex flex-col gap-1 ${THEME.CARD(theme)} ios-clip-fix`}>
              <div className="flex items-center justify-between opacity-60">
                <span className={`${THEME.LABEL} leading-none`}>{s.label}</span>
                {s.icon}
              </div>
              <span className={`text-[15px] sm:text-[16px] leading-tight ${THEME.VALUE} ${s.color || ''}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {(course.leadSetters || course.assistantsetters) && (
        <div className="space-y-8 text-left">
          <ASRSectionHeading theme={theme}>COURSE SETTERS</ASRSectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {course.leadSetters && (
              <div className={`p-6 rounded-3xl border flex flex-col justify-center ${THEME.CARD(theme)} ios-clip-fix`}>
                <span className={`${THEME.HEADING_SM} mb-2`}>Leads</span>
                <div className={`text-[15px] sm:text-lg font-mono font-black text-blue-600`}>
                  <SetterDisplay text={course.leadSetters} onSetterClick={onSetterClick} />
                </div>
              </div>
            )}
            {course.assistantsetters && (
              <div className={`p-6 rounded-3xl border flex flex-col justify-center ${THEME.CARD(theme)} ios-clip-fix`}>
                <span className={`${THEME.HEADING_SM} mb-2`}>Assistants</span>
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
    </>
  );
};

const PlayerDetails = ({ identity, initialRole, theme, allCourses, openRankings, atPerfs, opPerfs, openModal }) => {
  const [activeRole, setActiveRole] = useState(initialRole || 'all-time');
  
  const pKey = useMemo(() => {
    if (identity.pKey && (atPerfs[identity.pKey] || opPerfs[identity.pKey])) return identity.pKey;
    const displayKey = normalizeName(identity.name);
    if (atPerfs[displayKey] || opPerfs[displayKey]) return displayKey;
    return identity.pKey || displayKey;
  }, [identity, atPerfs, opPerfs]);

  const renderRoleContent = (roleId) => {
    const isSetter = roleId === 'setter';
    
    if (isSetter) {
        const setterData = identity.setterData || identity;
        const setterCourses = allCourses
            .filter(c => isNameInList(identity.name, c.leadSetters) || isNameInList(identity.name, c.assistantsetters))
            .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));
        
        const impact = setterData.impact || setterCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);
        const setsCount = setterData.sets || setterCourses.length;
        const avgImpact = setsCount > 0 ? (impact / setsCount).toFixed(2) : '0.00';

        const setterStats = [
            { l: 'IMPACT', v: impact, c: 'text-blue-600' },
            { l: 'AVG IMPACT', v: avgImpact },
            { l: 'SETS', v: setsCount },
            { l: 'LEADS', v: setterData.leads || 0 },
            { l: 'ASSISTS', v: setterData.assists || 0 },
            { l: 'CITIES', v: new Set(setterCourses.map(c => c.city).filter(Boolean)).size || 0 },
            { l: 'COUNTRIES', v: new Set(setterCourses.map(c => c.country).filter(Boolean)).size || 0 },
            { l: '🪙', v: setterData.contributionScore || identity.contributionScore || 0 }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
                    {setterStats.map((s, i) => (
                      <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} tooltip={s.t} colorClass={s.c} />
                    ))}
                </div>
                <ASRSectionHeading theme={theme} className="text-left">VERIFIED SETS</ASRSectionHeading>
                <div className="grid grid-cols-1 gap-2">
                    {setterCourses.length > 0 ? setterCourses.map((c, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} title={c.name} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                        icon={<MapPin size={22} strokeWidth={2.5} className={THEME.ICON} />}
                        stats={[{ label: 'RUNS', value: c.totalAllTimeRuns || 0 }]}
                        videoUrl={c.demoVideo}
                        onClick={() => openModal('course', c)}
                      />
                    )) : (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                            <Building2 size={40} className={THEME.ICON} /><span className="text-[10px] font-black uppercase whitespace-normal break-words">No verified sets found</span>
                        </div>
                    )}
                </div>
                <div className="pt-8"><ASRPromotionBanner type="setter" theme={theme} /></div>
            </div>
        );
    }

    const isAllTime = roleId === 'all-time';
    const perfSource = isAllTime ? (atPerfs[pKey] || []) : (opPerfs[pKey] || []);
    const metaSource = isAllTime ? identity : (identity.openStats || { rating: 0, pts: 0, runs: 0, wins: 0, openFireCount: 0 });

    const courseData = perfSource.map(cd => {
      const matched = allCourses.find(c => c.name.toUpperCase() === cd.label.toUpperCase());
      return { ...cd, coordinates: matched?.coordinates, flag: matched?.flag, country: matched?.country, city: matched?.city, mRecord: matched?.allTimeMRecord, fRecord: matched?.allTimeFRecord };
    }).sort((a, b) => {
        const aGold = a.rank === 1;
        const bGold = b.rank === 1;
        if (aGold && !bGold) return -1;
        if (!aGold && bGold) return 1;
        if (aGold && bGold) return (a.num || 0) - (b.num || 0);
        return (b.points || 0) - (a.points || 0);
    });

    const currentOpenRankIndex = openRankings?.findIndex(p => p.pKey === pKey);
    const currentOpenRank = currentOpenRankIndex !== -1 ? currentOpenRankIndex + 1 : "UR";
    
    const runsInContext = metaSource.runs || 0;
    let isQualifiedInProfile = false;
    if (isAllTime) {
      isQualifiedInProfile = identity.gender === 'M' ? (runsInContext >= 4) : (runsInContext >= 2);
    } else {
      isQualifiedInProfile = runsInContext >= 3;
    }

    const currentRankValue = isQualifiedInProfile ? (isAllTime ? (identity.allTimeRank || "UR") : currentOpenRank) : "UR";

    const playerStats = [
        { l: 'RANK', v: currentRankValue },
        { l: 'RATING', v: typeof metaSource.rating === 'number' ? metaSource.rating.toFixed(2) : '0.00', c: 'text-blue-600' }, 
        { l: 'POINTS', v: typeof metaSource.pts === 'number' ? metaSource.pts.toFixed(2) : '0.00' }, 
        { l: 'RUNS', v: runsInContext }, 
        { l: 'WINS', v: metaSource.wins || 0 }, 
        { l: 'WIN %', v: ((metaSource.wins / (runsInContext || 1)) * 100).toFixed(2) + '%' }, 
        { l: 'CITIES', v: new Set(courseData.map(c => c.city).filter(Boolean)).size || 0 },
        { l: 'COUNTRIES', v: new Set(courseData.map(c => c.country).filter(Boolean)).size || 0 },
        { l: '🔥', v: isAllTime ? (identity.allTimeFireCount || 0) : (identity.openStats?.openFireCount || 0), g: 'glow-blue' }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-14">
                {playerStats.map((s, i) => (
                  <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} glowClass={s.g} tooltip={s.t} colorClass={s.c} />
                ))}
            </div>
            <ASRSectionHeading theme={theme} className="text-left">VERIFIED RUNS</ASRSectionHeading>
            <div className="grid grid-cols-1 gap-2">
                {courseData.length > 0 ? courseData.map((c, i) => {
                    const target = allCourses.find(x => x.name.toUpperCase() === c.label.toUpperCase());
                    return (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} title={c.label} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                        icon={target?.coordinates ? <MapPin size={22} strokeWidth={2.5} className={THEME.ICON} /> : <div className="p-2.5 opacity-20"><MapPin size={22} /></div>}
                        stats={[{ value: (c.points || 0).toFixed(2) }, { value: (c.num || 0).toFixed(2) }]}
                        videoUrl={c.videoUrl}
                        badgeContent={<>{c.rank > 0 && c.rank <= 3 && <ASRPerformanceBadge type={c.rank} />}{c.fireCount > 0 && <ASRPerformanceBadge type="fire" count={c.fireCount} />}</>}
                        onClick={() => { if(target) openModal('course', target); }}
                      />
                    );
                }) : (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                        <Compass size={40} className={THEME.ICON} /><span className="text-[10px] font-black uppercase whitespace-normal break-words">No verified runs found</span>
                    </div>
                )}
            </div>
            <div className="pt-8"><ASRPromotionBanner type="coach" theme={theme} /></div>
        </div>
    );
  };

  const tabs = [
    { id: 'all-time', label: 'ALL-TIME' },
    { id: 'asr-open', label: 'ASR OPEN' },
    { id: 'setter', label: 'SETS' }
  ];

  return (
    <>
      <div className={`flex p-1.5 rounded-2xl mb-12 border w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto scrollbar-hide ${THEME.GLASS(theme)} ios-clip-fix`}>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveRole(tab.id)} 
            className={`flex-1 sm:flex-none px-6 sm:px-10 py-3 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeRole === tab.id ? 'bg-blue-600 text-white shadow-xl' : 'opacity-70 hover:opacity-100 text-inherit'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderRoleContent(activeRole)}
    </>
  );
};

const RegionDetails = ({ region, theme, allCourses, allPlayers, playerPerformances, openModal }) => {
  const regionalCourses = allCourses.filter(c => 
      (region.type === 'city' && c.city === region.name) ||
      (region.type === 'country' && c.country === region.name) ||
      (region.type === 'continent' && c.continent === region.name)
  ).sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));

  const regionalPlayers = allPlayers.filter(p => {
      if (region.type === 'city') {
          return (playerPerformances[p.pKey] || []).some(perf => {
              const matched = allCourses.find(c => c.name.toUpperCase() === perf.label.toUpperCase());
              return matched?.city === region.name;
          }) && isQualifiedAthlete(p);
      }
      const countryTerm = normalizeCountryName(region.name);
      const playerCountries = (p.countryName || "").split(/[,\/]/).map(c => normalizeCountryName(c));
      const isMatch = (region.type === 'country' && playerCountries.includes(countryTerm)) ||
                      (region.type === 'continent' && playerCountries.some(pc => getContinentData(pc).name === region.name));
      return isMatch && isQualifiedAthlete(p);
  }).sort((a, b) => b.rating - a.rating);

  return (
    <>
      <div className="grid grid-cols-2 gap-6 mb-14">
          <ASRStatCard label="RANKED PLAYERS" value={regionalPlayers.length} theme={theme} />
          <ASRStatCard label="ACTIVE COURSES" value={regionalCourses.length} theme={theme} />
      </div>
      <div className="space-y-14 text-left">
          <div>
              <ASRSectionHeading theme={theme}>TOP ATHLETES</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-2">
                  {regionalPlayers.slice(0, 10).map((p, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} rank={i + 1} title={p.name} subtitle={p.region}
                        stats={[{ value: typeof p.rating === 'number' ? p.rating.toFixed(2) : '--.--' }]}
                        onClick={() => openModal('player', p)}
                      />
                  ))}
              </div>
          </div>
          <div>
              <ASRSectionHeading theme={theme}>TOP COURSES</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-2">
                  {regionalCourses.slice(0, 10).map((c, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} title={c.name} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                        icon={<MapPin size={22} strokeWidth={2.5} className={THEME.ICON} />}
                        stats={[{ label: 'RUNS', value: c.totalAllTimeRuns || 0 }]}
                        onClick={() => openModal('course', c)}
                      />
                  ))}
              </div>
          </div>
      </div>
    </>
  );
};

const InspectorBody = ({ activeModal, theme, allCourses, openRankings, atPerfs, opPerfs, atMet, dnMap, settersWithImpact, openModal, onSetterClick }) => {
  if (!activeModal) return null;

  switch (activeModal.type) {
    case 'player':
    case 'setter': {
      const pKeyFromData = activeModal.data.pKey || normalizeName(activeModal.data.name);
      const athleteData = atMet[pKeyFromData] || 
                        Object.values(atMet).find(a => normalizeName(a.name) === normalizeName(activeModal.data.name)) || 
                        activeModal.data;
      
      const pKey = athleteData.pKey || pKeyFromData;
      const openAthleteData = openRankings.find(p => p.pKey === pKey) || openRankings.find(p => normalizeName(p.name) === normalizeName(athleteData.name));
      const setterData = settersWithImpact.find(s => normalizeName(s.name) === pKey) || settersWithImpact.find(s => normalizeName(s.name) === normalizeName(athleteData.name));
      const targetRole = activeModal.roleOverride || (activeModal.type === 'player' ? 'all-time' : 'setter');
      
      return (
        <PlayerDetails 
          identity={{ ...athleteData, setterData, openStats: openAthleteData }} 
          initialRole={targetRole} 
          theme={theme} 
          allCourses={allCourses} 
          openRankings={openRankings} 
          atPerfs={atPerfs} 
          opPerfs={opPerfs} 
          openModal={openModal} 
        />
      );
    }
    case 'course':
      return (
        <CourseDetails 
          course={activeModal.data} 
          theme={theme} 
          athleteMetadata={atMet} 
          athleteDisplayNameMap={dnMap} 
          onPlayerClick={(p) => openModal('player', p)} 
          onSetterClick={onSetterClick} 
        />
      );
    case 'region':
      return (
        <RegionDetails 
          region={activeModal.data} 
          theme={theme} 
          allCourses={allCourses} 
          allPlayers={Object.values(atMet)} 
          playerPerformances={atPerfs} 
          openModal={openModal} 
        />
      );
    default:
      return null;
  }
};

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

      const RANKING_MAPPING = {
        name: ['athlete', 'name', 'player'],
        country: ['country'],
        flag: ['flag'],
        rating: ['ovr', 'overall', 'rating'],
        pts: ['pts', 'points', 'asr'],
        runs: ['runs', 'totalruns', 'total', '#'],
        wins: ['wins', 'victories'],
        sets: ['sets', 'total sets'],
        contribution: ['🪙', 'contribution'],
        fire: ['🔥', 'fire'],
        ig: ['ig', 'instagram', 'social'],
        avg: ['avg time', 'average', 'avg']
      };

      const SET_LIST_MAPPING = {
        course: ['course', 'track', 'level'],
        length: ['length', 'dist'],
        elev: ['elev', 'gain'],
        rating: ['rating', 'diff', 'difficulty'],
        type: ['type', 'style'],
        city: ['city', 'location'],
        country: ['country', 'nation'],
        flag: ['flag', 'emoji'],
        dateSet: ['set on', 'updated', 'date set'],
        demo: ['demo', 'rules', 'video', 'url'],
        coords: ['coord', 'gps', 'location', 'pin'],
        state: ['state', 'prov', 'region'],
        leads: ['lead', 'lead setter', 'leads', 'leadsetters'],
        assists: ['assistant', 'assistants', 'assistant setter', 'assistantsetters']
      };

      const SETTER_MAPPING = {
        name: ['setter', 'name'],
        leads: ['leads'],
        assists: ['assist', 'assists', 'assistant'],
        sets: ['sets', 'total sets'],
        country: ['country', 'nation'],
        flag: ['flag', 'emoji', 'region'],
        ig: ['ig', 'instagram'],
        contribution: ['🪙', 'contribution']
      };

      const LIVE_FEED_MAPPING = {
        athlete: ['athlete', 'name', 'player'],
        course: ['course', 'track', 'level'],
        result: ['result', 'time', 'pb'],
        gender: ['div', 'gender', 'sex'],
        date: ['date', 'day', 'timestamp'],
        tag: ['tag', 'event', 'category', 'season'],
        proof: ['proof', 'link', 'video', 'url']
      };

      const processRankingData = (csv, gender) => {
        const dataRows = csvToObjects(csv, RANKING_MAPPING);
        return dataRows.map((vals, i) => {
          const pName = (vals.name || "").trim();
          if (pName.length < 2) return null; 
          const fixed = fixCountryEntity(vals.country, vals.flag);
          const rawIg = (vals.ig || "").replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\?.*/, '').replace(/@/g, '').replace(/\/$/, '').trim();
          const searchKey = `${pName} ${fixed.name} ${rawIg}`.toLowerCase();
          return { 
            id: `${gender}-${normalizeName(pName)}-${i}`, 
            name: pName, pKey: normalizeName(pName), gender, 
            countryName: fixed.name, 
            region: fixed.flag, 
            igHandle: rawIg,
            rating: cleanNumeric(vals.rating) || 0, 
            runs: Math.floor(cleanNumeric(vals.runs) || 0), 
            wins: Math.floor(cleanNumeric(vals.wins) || 0), 
            pts: cleanNumeric(vals.pts) || 0, 
            sets: Math.floor(cleanNumeric(vals.sets) || 0), 
            contributionScore: cleanNumeric(vals.contribution) || 0, 
            allTimeFireCount: Math.floor(cleanNumeric(vals.fire) || 0),
            avgTime: cleanNumeric(vals.avg) || 0,
            searchKey
          };
        }).filter(Boolean);
      };

      const processSetListData = (csv) => {
          const dataRows = csvToObjects(csv, SET_LIST_MAPPING);
          const map = {};
          dataRows.forEach(vals => {
              const course = (vals.course || "").trim().toUpperCase();
              if (course) {
                  const fixed = fixCountryEntity(vals.country, vals.flag);
                  const valAG = String(vals.__raw[32] || "").toUpperCase().trim();
                  const is2026 = valAG === 'YES' || valAG === 'TRUE' || valAG.includes('OPEN');
                  map[course] = { 
                      is2026, flag: fixed.flag || '🏳️',
                      city: (vals.city || "").trim().toUpperCase() || "UNKNOWN", 
                      stateProv: (vals.state || "").trim().toUpperCase(),
                      country: fixed.name.toUpperCase() || "UNKNOWN", 
                      difficulty: (vals.rating || "").trim(),
                      length: (vals.length || "").trim(),
                      elevation: (vals.elev || "").trim(),
                      type: (vals.type || "").trim(),
                      dateSet: (vals.dateSet || "").trim(),
                      setter: (vals.leads || "") + ((vals.assists) ? `, ${vals.assists}` : ""),
                      leadSetters: (vals.leads || "").trim(),
                      assistantsetters: (vals.assists || "").trim(),
                      demoVideo: (vals.demo || "").trim(),
                      coordinates: (vals.coords || "").trim(),
                      searchKey: `${course} ${vals.city} ${fixed.name}`.toLowerCase()
                  };
              }
          });
          return map;
      };

      const processSettersData = (csv) => {
          const dataRows = csvToObjects(csv, SETTER_MAPPING);
          return dataRows.map((vals, i) => {
              const name = vals.name;
              if (!name) return null;
              const fixed = fixCountryEntity(vals.country, vals.flag);
              return {
                  id: `setter-${normalizeName(name)}-${i}`,
                  name: name.trim(),
                  region: fixed.flag || '🏳️',
                  countryName: fixed.name,
                  igHandle: (vals.ig || "").replace(/@/g, '').trim(),
                  sets: cleanNumeric(vals.sets) || 0,
                  leads: cleanNumeric(vals.leads) || 0,
                  assists: cleanNumeric(vals.assists) || 0,
                  contributionScore: cleanNumeric(vals.contribution) || 0
              };
          }).filter(Boolean);
      };

      const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
        const result = { 
          allTimePerformances: {}, openPerformances: {}, openRankings: [], 
          allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, 
          athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, 
          atRawBest: {}, opRawBest: {} 
        };
        if (!csv) return result;
        const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        let hIdx = -1;
        for(let i=0; i<Math.min(10, lines.length); i++) {
          if (/athlete|name|course|track|pb|result/i.test(lines[i])) { hIdx = i; break; }
        }
        if (hIdx === -1) return result;
        const dataRows = csvToObjects(csv, LIVE_FEED_MAPPING, hIdx);
        const OPEN_START = new Date('2026-03-02T00:00:00Z');
        const OPEN_END = new Date('2026-05-31T23:59:59Z');
        const allTimeAthleteBestTimes = {}; const allTimeCourseLeaderboards = { M: {}, F: {} };
        const openAthleteBestTimes = {}; const openCourseLeaderboards = { M: {}, F: {} }; 
        const openAthleteSetCount = {}; const athleteDisplayNameMap = {};
        dataRows.forEach(vals => {
          const pName = (vals.athlete || "").trim();
          const rawCourse = (vals.course || "").trim();
          const numericValue = cleanNumeric(vals.result);
          if (!pName || !rawCourse || numericValue === null) return;
          const pKey = normalizeName(pName);
          const normC = rawCourse.toUpperCase();
          if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;
          const pGender = athleteMetadata[pKey]?.gender || (((vals.gender || "").toUpperCase().startsWith('F')) ? 'F' : 'M');
          if (!athleteMetadata[pKey]) {
              athleteMetadata[pKey] = { pKey, name: pName, gender: pGender, region: '🏳️', countryName: '', searchKey: pName.toLowerCase() };
          } else if (pName.length > (athleteMetadata[pKey].name || "").length) {
              athleteMetadata[pKey].name = pName;
              athleteDisplayNameMap[pKey] = pName;
          }
          if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
          if (!allTimeAthleteBestTimes[pKey][normC] || numericValue < allTimeAthleteBestTimes[pKey][normC].num) {
            allTimeAthleteBestTimes[pKey][normC] = { label: rawCourse, value: vals.result, num: numericValue, videoUrl: vals.proof || vals.__raw[7] || "" };
          }
          if (!allTimeCourseLeaderboards[pGender][normC]) allTimeCourseLeaderboards[pGender][normC] = {};
          if (!allTimeCourseLeaderboards[pGender][normC][pKey] || numericValue < allTimeCourseLeaderboards[pGender][normC][pKey]) {
              allTimeCourseLeaderboards[pGender][normC][pKey] = numericValue;
          }
          const runDate = vals.date ? new Date(vals.date) : null;
          const isASROpenTag = (vals.tag || "").toUpperCase().includes("OPEN");
          const isInOpenWindow = runDate && !isNaN(runDate.getTime()) && runDate >= OPEN_START && runDate <= OPEN_END;
          if (isASROpenTag || isInOpenWindow) {
            if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
            if (!openAthleteBestTimes[pKey][normC] || numericValue < openAthleteBestTimes[pKey][normC].num) {
              openAthleteBestTimes[pKey][normC] = { label: rawCourse, value: vals.result, num: numericValue, videoUrl: vals.proof || vals.__raw[7] || "" };
            }
            if (!openCourseLeaderboards[pGender][normC]) openCourseLeaderboards[pGender][normC] = {};
            if (!openCourseLeaderboards[pGender][normC][pKey] || numericValue < openCourseLeaderboards[pGender][normC][pKey]) {
                openCourseLeaderboards[pGender][normC][pKey] = numericValue;
            }
            if (courseSetMap[normC]?.is2026) openAthleteSetCount[pKey] = (openAthleteSetCount[pKey] || 0) + 1;
          }
        });

        const buildPerfs = (source, isAllTimeBuild = false) => {
          const res = {};
          Object.keys(source).forEach(pKey => {
            const pGender = athleteMetadata[pKey]?.gender || 'M';
            let fireTotal = 0;
            res[pKey] = Object.entries(source[pKey]).map(([normL, data]) => {
              const board = (allTimeCourseLeaderboards[pGender] || {})[normL] || {};
              const record = Math.min(...Object.values(board));
              const sorted = Object.entries(board).sort((a, b) => a[1] - b[1]);
              const rank = sorted.findIndex(e => e[0] === pKey) + 1;
              const fires = getFireCountForRun(data.num, pGender);
              fireTotal += fires;
              return { label: data.label, value: data.value, num: data.num, rank, points: (record / data.num) * 100, videoUrl: data.videoUrl, fireCount: fires };
            });
            
            if (athleteMetadata[pKey]) {
              if (isAllTimeBuild) {
                if (!athleteMetadata[pKey].allTimeFireCount || fireTotal > athleteMetadata[pKey].allTimeFireCount) {
                  athleteMetadata[pKey].allTimeFireCount = fireTotal;
                }
              } else {
                athleteMetadata[pKey].openFireCount = fireTotal;
              }
            }
          });
          return res;
        };

        result.allTimePerformances = buildPerfs(allTimeAthleteBestTimes, true);
        result.openPerformances = buildPerfs(openAthleteBestTimes, false);
        result.allTimeLeaderboards = allTimeCourseLeaderboards;
        result.openLeaderboards = openCourseLeaderboards;
        result.athleteDisplayNameMap = athleteDisplayNameMap;
        result.atRawBest = allTimeAthleteBestTimes;
        result.opRawBest = openAthleteBestTimes;
        result.openRankings = Object.keys(athleteMetadata).map(pKey => {
          const meta = athleteMetadata[pKey];
          const perfs = result.openPerformances[pKey] || [];
          const totalPts = perfs.reduce((sum, p) => sum + p.points, 0);
          return {
            ...meta, id: `open-${pKey}`, rating: perfs.length > 0 ? (totalPts / perfs.length) : 0, 
            runs: perfs.length, wins: perfs.filter(p => p.rank === 1).length, pts: totalPts, 
            sets: openAthleteSetCount[pKey] || 0, openFireCount: perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0)
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
      const allSetters = [...processSettersData(rSettersM || ""), ...processSettersData(rSettersF || "")];
      const nextState = {
        data: [...pM, ...pF], openData: processed.openRankings, atPerfs: processed.allTimePerformances,
        opPerfs: processed.openPerformances, lbAT: processed.allTimeLeaderboards, lbOpen: processed.openLeaderboards,
        atMet: processed.athleteMetadata, dnMap: processed.athleteDisplayNameMap, cMet: processed.courseMetadata,
        settersData: allSetters, atRawBest: processed.atRawBest, opRawBest: processed.opRawBest,
        isLoading: false, hasError: hasTotalError, hasPartialError
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

const useFilteredData = (source, searchTerm, sortConfig, predicate = null) => {
  return useMemo(() => {
    if (!source) return [];
    const term = searchTerm.toLowerCase();
    let processed = source.filter(item => {
      const matchesSearch = (item?.searchKey || "").includes(term);
      const matchesPredicate = predicate ? predicate(item) : true;
      return matchesSearch && matchesPredicate;
    });
    if (sortConfig) {
      const dir = sortConfig.direction === 'ascending' ? 1 : -1;
      processed.sort((a, b) => robustSort(a, b, sortConfig.key, dir));
    }
    return processed;
  }, [source, searchTerm, sortConfig, predicate]);
};

const getAggregatedStats = (rawCourseList, groupBy) => {
    const map = {};
    rawCourseList.forEach(c => {
        let name = c[groupBy];
        let flag = c.flag;
        let key = name;
        if (groupBy === 'country') {
            const fixed = fixCountryEntity(c.country, c.flag);
            name = fixed.name;
            flag = fixed.flag;
            key = name;
        } else if (groupBy === 'continent') {
            if (c.continent === 'GLOBAL') return;
            name = c.continent || 'OTHER';
            flag = c.continentFlag || '🌐';
            key = name;
        }
        if (!name) return;
        if (!map[key]) {
            map[key] = {
                name, flag, courses: 0, runs: 0, playersSet: new Set(),
                coords: c.coords || c.parsedCoords,
                ...(groupBy === 'city' ? { countryName: c.country, continent: c.continent } : {}),
                ...(groupBy === 'country' ? { continent: c.continent } : {})
            };
        }
        const entry = map[key];
        entry.courses++;
        entry.runs += (c.totalRuns || 0);
        (c.athletesM || []).forEach(a => entry.playersSet.add(a[0]));
        (c.athletesF || []).forEach(a => entry.playersSet.add(a[0]));
    });
    return Object.values(map)
        .map(item => ({ ...item, players: item.playersSet.size }))
        .sort((a, b) => b.courses - a.courses);
};

const calculateHofStats = (data, atPerfs, lbAT, atMet, medalSort, settersWithImpact) => {
    if (!data.length) return null;
    const qualifiedAthletes = data.filter(p => isQualifiedAthlete(p, true)).map(p => { 
        const performances = atPerfs[p.pKey] || []; 
        const calculatedFires = performances.reduce((sum, run) => sum + (run.fireCount || 0), 0);
        return { 
            ...p, allTimeFireCount: calculatedFires, winPercentage: p.runs > 0 ? (p.wins / p.runs) * 100 : 0
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
        totalFireCount: [...qualifiedAthletes].sort((a,b) => (b.allTimeFireCount || 0) - (a.allTimeFireCount || 0)).slice(0, 10)
    }};
};

// --- VIEW COMPONENTS ---

const ASRGlobalMap = ({ courses, continents: conts, cities, countries, theme, eventType, setEventType, onCourseClick, onCountryClick, onCityClick, onContinentClick }) => {
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
                script.id = id; script.src = url; script.async = true;
                script.onload = () => resolve(); script.onerror = () => reject(new Error(`Script load error for ${url}`));
                document.head.appendChild(script);
            });
        };
        const injectCSS = (url, id) => {
            if (document.getElementById(id)) return;
            const link = document.createElement('link');
            link.id = id; link.rel = 'stylesheet'; link.href = url;
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
            } catch (err) { console.error("Map scripts failed to load", err); }
        };
        loadAll();
    }, []);

    useEffect(() => {
        if (!isScriptsLoaded || !window.L || !mapContainerRef.current) return;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        const map = window.L.map(mapContainerRef.current, {
            zoomControl: false, attributionControl: false, 
            minZoom: 2, maxZoom: 18, worldCopyJump: true, dragging: true, touchZoom: true,
            scrollWheelZoom: true, doubleClickZoom: true, boxZoom: true, keyboard: true
        }).setView([20, 0], 2);
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);
        const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        tileLayerRef.current = window.L.tileLayer(theme === 'dark' ? darkTile : lightTile, { subdomains: 'abcd', maxZoom: 20 }).addTo(map);
        if (window.L.markerClusterGroup) {
            clusterGroupRef.current = window.L.markerClusterGroup({
                chunkedLoading: true, maxClusterRadius: 45, showCoverageOnHover: false, 
                spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    return window.L.divIcon({ 
                        html: `<div class="flex items-center justify-center w-full h-full">${count}</div>`,
                        className: 'asr-cluster', iconSize: window.L.point(38, 38)
                    });
                }
            });
            map.addLayer(clusterGroupRef.current);
        }
        mapRef.current = map;
        setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 100);
        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    }, [isScriptsLoaded, theme]);

    useEffect(() => {
        if (!mapRef.current || !tileLayerRef.current) return;
        const lightTile = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const darkTile = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        tileLayerRef.current.setUrl(theme === 'dark' ? darkTile : lightTile);
    }, [theme]);

    useEffect(() => {
        if (!mapRef.current || !clusterGroupRef.current || !window.L) return;
        clusterGroupRef.current.clearLayers();
        courses.forEach(c => {
            if (!c.parsedCoords) return;
            const marker = window.L.marker(c.parsedCoords, {
                icon: window.L.divIcon({
                    html: `
                        <div class="asr-marker-container w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-lg pointer-events-none">
                            <div class="w-1.5 h-1.5 rounded-full bg-white animate-subtle-pulse"></div>
                        </div>
                    `,
                    className: 'asr-marker-outer', iconSize: [32, 32], iconAnchor: [16, 16]
                })
            });
            window.L.DomEvent.disableClickPropagation(marker);
            marker.on('click', (e) => {
                window.L.DomEvent.stopPropagation(e);
                onCourseClick('course', c);
            });
            clusterGroupRef.current.addLayer(marker);
        });
    }, [courses, isScriptsLoaded, onCourseClick, theme]);

    const handleFindMe = () => {
      if (!mapRef.current || !navigator.geolocation) return;
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          mapRef.current.flyTo([latitude, longitude], 12, { duration: 1.5 });
          setIsLocating(false);
        }, () => setIsLocating(false), { enableHighAccuracy: true }
      );
    };

    const jumpToLocation = (item) => {
      if (!mapRef.current || !item.coords) return;
      mapRef.current.flyTo(item.coords, activeTab === 'cities' ? 12 : 5, { duration: 1.5 });
    };

    const displayData = (activeTab === 'cities' ? cities : (activeTab === 'countries' ? countries : conts)).filter(x => x.name !== 'GLOBAL');
    const mapPillStyle = `px-6 py-3.5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all border-2 shadow-2xl backdrop-blur-md ${theme === 'dark' ? 'bg-zinc-950/80 border-blue-600/40 text-slate-100' : 'bg-white/90 border-blue-600 text-slate-900'}`;

    if (!isScriptsLoaded) {
        return (
            <div className={`w-full h-[60vh] sm:h-[75vh] flex flex-col items-center justify-center rounded-3xl border shadow-premium ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-800 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                <div className="animate-spin opacity-70 mb-4"><ChevronsRight size={24} strokeWidth={2.5} className={`${THEME.ICON} text-blue-600`} style={{ transform: 'skewX(-18deg)' }} /></div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse opacity-70">Initializing Map Environment...</div>
            </div>
        );
    }

    return (
        <div id="asr-map-container" className={`relative w-full h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border border-subtle`}>
            <div ref={mapContainerRef} className="w-full h-full z-[10]" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40] pointer-events-none">
              <button onClick={handleFindMe} className={`${mapPillStyle} pointer-events-auto hover:bg-blue-600/10 hover:scale-105 active:scale-95 whitespace-nowrap`}>
                <Navigation size={12} className={`mr-2 inline ${isLocating ? 'animate-spin' : ''}`} /> Find Courses Near Me
              </button>
            </div>
            <div className="absolute top-4 left-4 z-[40] flex flex-col gap-2 items-start pointer-events-none w-full max-w-[280px] sm:max-w-xs">
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className={`${mapPillStyle} pointer-events-auto w-fit flex items-center gap-2 hover:bg-blue-600/10 active:scale-95 whitespace-nowrap`}>
                    <Globe size={12} className={THEME.ICON} /> {isPanelOpen ? 'HIDE' : 'COURSES & RANKINGS'}
                </button>
                <div className={`pointer-events-auto flex flex-col transition-all duration-300 origin-top-left overflow-hidden rounded-[2rem] border-2 backdrop-blur-xl shadow-2xl w-[280px] sm:w-[320px] ${isPanelOpen ? 'scale-100 opacity-100 max-h-[70vh]' : 'scale-95 opacity-0 h-0 border-transparent'} ${theme === 'dark' ? 'bg-black/95 border-blue-600/30 text-white' : 'bg-white/98 border-blue-600/30 text-slate-900'} ios-clip-fix`}>
                    <div className={`flex items-center p-3 border-b shrink-0 gap-2 ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-300'}`}>
                        <button onClick={() => setEventType('open')} className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${eventType === 'open' ? 'btn-blue-gradient active' : 'opacity-60 hover:opacity-100 text-inherit'}`}>ASR OPEN</button>
                        <button onClick={() => setEventType('all-time')} className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${eventType === 'all-time' ? 'btn-blue-gradient active' : 'opacity-60 hover:opacity-100 text-inherit'}`}>ALL TIME</button>
                    </div>
                    <div className={`flex items-center p-2 border-b shrink-0 gap-1 bg-current/[0.03] ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-200'}`}>
                        {['continents', 'countries', 'cities'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'opacity-50'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-0.5 p-3 overflow-y-auto scrollbar-hide h-[400px]">
                        {displayData.slice(0, 40).map((c, i) => (
                            <div key={i} onClick={() => { jumpToLocation(c); if(activeTab === 'cities') onCityClick(c); else if(activeTab === 'countries') onCountryClick(c); else onContinentClick(c); }} className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-300/50'}`}>
                                 <div className="flex items-center gap-3 min-w-0 pr-2 text-left">
                                    <div className="scale-90 origin-left shrink-0"><ASRRankBadge rank={i + 1} theme={theme} /></div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-tight whitespace-normal break-words transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500`}>
                                          {c.name} <span className="ml-1 opacity-80">{c.flag}</span>
                                        </span>
                                    </div>
                                 </div>
                                 <span className={`text-sm sm:text-base font-mono font-black text-blue-600 tabular-nums`}>{c.courses}</span>
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
    const displayAthletes = [...athletes.slice(0, 10)];
    while (displayAthletes.length < 3) displayAthletes.push(null);
    return (
        <div className="space-y-1">
            <ASRSectionHeading theme={theme}>{title}</ASRSectionHeading>
            <div className="grid grid-cols-1 gap-2">
                {displayAthletes.map((athleteRow, i) => {
                    if (!athleteRow) {
                        return (
                            <div key={`empty-${i}`} className={`flex items-center justify-between p-4 rounded-3xl border opacity-30 ${THEME.CARD(theme)} ios-clip-fix h-auto min-h-[72px]`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <ASRRankBadge rank={i + 1} theme={theme} />
                                    <span className="text-xs sm:text-[15px] font-black uppercase tracking-widest opacity-40">---</span>
                                </div>
                                <div className="flex flex-col items-end min-w-[70px] sm:min-w-[90px] text-right">
                                    <span className="text-xs sm:text-[16px] font-mono font-black num-col opacity-40">--.--</span>
                                </div>
                            </div>
                        );
                    }
                    const [pKey, time, videoUrl] = athleteRow;
                    const meta = athleteMetadata[pKey] || {};
                    const points = genderRecord && typeof time === 'number' && time !== 0 ? (genderRecord / time) * 100 : 0;
                    return (
                        <ASRListItem 
                          key={pKey} variant="card" theme={theme} rank={i + 1} title={athleteDisplayNameMap[pKey] || pKey} subtitle={meta.region || '🏳️'}
                          stats={[{ value: typeof time === 'number' ? time.toFixed(2) : '--.--' }, { value: typeof points === 'number' ? points.toFixed(2) : '--.--' }]}
                          videoUrl={videoUrl}
                          onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })}
                        />
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
            <div className={`absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'} group-focus-within:text-blue-600`}><Search size={18} strokeWidth={2.5} className={THEME.ICON} /></div>
            <input 
              type="text" 
              aria-label="Search" 
              value={search || ''} 
              onChange={e => setSearch(e.target.value)}
              className={`rounded-[1.5rem] sm:rounded-[2.2rem] pl-12 sm:pl-16 pr-10 sm:pr-12 py-4 sm:py-6 w-full text-[11px] sm:text-[15px] font-black uppercase tracking-widest outline-none transition-all border-2 ${THEME.INPUT(theme)} placeholder:text-zinc-500`}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-inherit">
                <X size={20} strokeWidth={2.5} className={THEME.ICON} />
              </button>
            )}
        </div>
        {view === 'players' && (
            <div className={`flex items-center p-1.5 rounded-[1.4rem] sm:rounded-[2.4rem] border-2 shrink-0 ${theme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-slate-300 shadow-xl'} ios-clip-fix`}>
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

const ASRHallOfFame = ({ stats, theme, onPlayerClick, onSetterClick, onRegionClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const highlightColor = 'text-blue-600';
  return (
    <div className="space-y-12 sm:space-y-24 animate-in fade-in duration-700 pb-32 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {[
          { l: 'TOP RATING', k: 'rating' },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'HIGHEST WIN %', k: 'winPercentage' },
          { l: 'MOST RECORDS', k: 'wins' },
          { l: 'MOST 🪙', k: 'contributionScore' },
          { l: 'MOST 🔥', k: 'totalFireCount' },
          { l: 'MOST IMPACT', k: 'impact' },
          { l: 'MOST SETS', k: 'sets' }
        ].map((sec) => (
            <div key={sec.k} className={`stat-card-container relative rounded-[2.2rem] border flex flex-col overflow-visible ${THEME.CARD(theme)}`}>
              <div className={`p-5 border-b border-inherit opacity-80 ${THEME.HEADING_SM} flex items-center justify-between`}>
                {sec.l}
              </div>
              <div className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-800/30' : 'divide-slate-200'}`}>
                {(stats.topStats[sec.k] || []).map((p, i) => (
                  <div key={i} className="group flex items-center justify-between p-4 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer" onClick={() => ['impact', 'sets'].includes(sec.k) ? onSetterClick(p) : onPlayerClick(p, null, null, 'all-time')}>
                    <div className="flex items-center gap-3 text-left">
                      <ASRRankBadge rank={i + 1} theme={theme} />
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase whitespace-normal break-words group-hover:text-blue-600 transition-colors">{p.name}</span>
                        <span className="text-sm mt-1">{p.region}</span>
                      </div>
                    </div>
                    <span className={`text-xs ${highlightColor} ${THEME.VALUE}`}>{sec.k === 'rating' ? (typeof p.rating === 'number' ? p.rating.toFixed(2) : '0.00') : (sec.k === 'winPercentage' ? (typeof p.winPercentage === 'number' ? p.winPercentage.toFixed(1)+'%' : '0%') : (sec.k === 'totalFireCount' ? p.allTimeFireCount : p[sec.k]))}</span>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>
      <div className={`rounded-[2.8rem] border border-subtle overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-zinc-950/60' : 'bg-white shadow-premium'} ios-clip-fix`}>
        <div className={`p-8 border-b border-inherit ${THEME.HEADING_SM} opacity-80 text-left`}>NATION MEDAL COUNT</div>
        <div className="overflow-auto scrollbar-hide">
          <table className="min-w-full table-fixed">
            <thead className={`sticky top-0 z-20 backdrop-blur-2xl border-b border-subtle ${theme === 'dark' ? 'bg-[#000000]/95 text-slate-300' : 'bg-white/95 text-slate-700'}`}>
              <tr className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest h-16">
                <th className="w-16 sm:w-24 text-left pl-4 sm:pl-12">RANK</th>
                <th className="text-left px-4">COUNTRY</th>
                <th className="w-12 sm:w-20 text-right">🥇</th>
                <th className="w-12 sm:w-20 text-right">🥈</th>
                <th className="w-12 sm:w-20 text-right">🥉</th>
                <th className="w-20 sm:w-32 text-right pr-4 sm:pr-12">TOTAL</th>
              </tr>
            </thead>
            <tbody className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-800/30' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={c.name} onClick={() => onRegionClick({ ...c, type: 'country' })} className="group hover:bg-black/[0.05] transition-colors cursor-pointer text-inherit">
                <td className="pl-4 sm:pl-12 py-6"><ASRRankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="py-6 px-4">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight group-hover:text-blue-600 transition-colors">{c.name}</span>
                      <span className="text-xl sm:text-2xl shrink-0 leading-none">{c.flag}</span>
                    </div>
                  </td>
                  <td className={`text-right text-amber-500 text-sm sm:text-lg ${THEME.VALUE}`}>{c.gold}</td>
                  <td className={`text-right text-sm sm:text-lg ${THEME.VALUE}`}>{c.silver}</td>
                  <td className={`text-right text-sm sm:text-lg ${THEME.VALUE}`}>{c.bronze}</td>
                  <td className={`pr-4 sm:pr-12 text-right text-sm sm:text-lg ${THEME.VALUE}`}>{c.total}</td>
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
    <div 
        className={`${w} ${paddingClass} py-8 cursor-pointer group select-none transition-all stat-card-container ${activeSort.key === k ? 'bg-current/[0.08]' : 'hover:bg-current/[0.05]'} text-inherit border-b-2 border-transparent`} 
        onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}
    >
      <div className={`flex items-center gap-2.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase text-[10px] sm:text-[12px] font-black">{l}</span>
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? 'text-blue-600' : 'opacity-0 group-hover:opacity-60'}`}>
          <ChevronDown size={16} strokeWidth={3} className={`${THEME.ICON} ${activeSort.key === k && activeSort.direction === 'ascending' ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
};

const ASRDataTable = ({ columns, data, sort, onSort, theme, onRowClick }) => {
    const [visibleCount, setVisibleCount] = useState(50);
    const observerTarget = useRef(null);
    useEffect(() => { setVisibleCount(50); }, [data, sort]);
    useEffect(() => {
        if (!observerTarget.current) return;
        const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) setVisibleCount(p => Math.min(p + 50, data.length)); }, { threshold: 0.1, rootMargin: '400px' });
        const currentTarget = observerTarget.current; observer.observe(currentTarget);
        return () => observer.disconnect();
    }, [data.length]);
    const visibleData = useMemo(() => {
        const result = []; const baseData = data.slice(0, visibleCount);
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
    return (
        <div className="min-w-full flex flex-col">
            <div className={`sticky top-0 z-20 backdrop-blur-xl border-b border-subtle flex items-center ${theme === 'dark' ? 'bg-[#000000]/95 text-slate-300' : 'bg-[#f1f5f9]/95 text-slate-700'}`}>
                <div className="w-20 sm:w-24 pl-4 sm:pl-10 py-8 text-left font-black text-[9px] sm:text-[12px] uppercase tracking-widest shrink-0">RANK</div>
                <div className="flex-1 flex min-w-0 h-full">
                  {columns.filter(c => !c.isRank).map((col, i) => (
                      <ASRHeaderComp 
                        key={col.key} l={col.label} k={col.key} a={col.align} w={col.width} 
                        activeSort={sort} handler={onSort} tooltip={col.tooltip} 
                        paddingClass={col.type === 'profile' ? "pl-4 sm:pl-8 pr-2 flex-1" : "px-2 sm:px-4 shrink-0"}
                      />
                  ))}
                  <div className="w-10 sm:w-16 shrink-0" />
                </div>
            </div>
            <div className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-800/30' : 'divide-slate-200'}`}>
                {visibleData.map((item, idx) => {
                    if (item.isDivider) return <div key={idx} className="py-14 text-center opacity-60 text-[11px] font-black uppercase tracking-[0.5em]">{item.label}</div>;
                    if (item.isUtility) return <div key={idx} className="px-6 py-6"><ASRInlineValueCard type={item.type} theme={theme} /></div>;
                    const athleteStats = [
                      { value: typeof item.rating === 'number' ? item.rating.toFixed(2) : '--.--' },
                      { value: item.runs || 0 }
                    ];
                    const courseStats = [
                      { value: item.totalAthletes || 0 }
                    ];
                    return (
                        <ASRListItem 
                          key={idx} variant="table" theme={theme} columns={columns}
                          rank={item.currentRank} title={item.name} subtitle={`${item.city || ''} ${item.region || item.flag || ''}`}
                          isUnranked={item.isQualified === false}
                          shouldFade={item.shouldFade}
                          stats={columns.some(c => c.key === 'rating') ? athleteStats : courseStats}
                          videoUrl={item.demoVideo}
                          onClick={() => onRowClick?.(item)}
                        />
                    );
                })}
                <div ref={observerTarget} className="h-4" />
            </div>
        </div>
    );
};

const ASRNavBar = ({ theme, setTheme, view, setView, onOpenIntro }) => {
    return (
        <nav className={`fixed top-[calc(var(--announcement-height)+var(--safe-top))] w-full backdrop-blur-2xl border-b z-50 flex items-center justify-between px-4 sm:px-12 transition-all duration-500 ${theme === 'dark' ? 'bg-[#000000]/90 border-zinc-800 text-slate-100' : 'bg-white/80 border-slate-300 text-slate-900'} h-16 sm:h-24 shadow-sm`}>
            <div className="group flex items-center gap-3 shrink-0">
                <div className="text-blue-600 animate-pulse"><ChevronsRight size={28} strokeWidth={2.5} className={THEME.ICON} style={{ transform: 'skewX(-18deg)' }} /></div>
                <span className="font-black text-lg sm:text-2xl uppercase italic leading-none hidden xs:block tracking-tighter">APEX RUN</span>
            </div>
            <div className="flex-1 flex justify-center gap-1 sm:gap-4 px-4 h-full items-center">
                {['map', 'players', 'hof'].map(v => (
                    <button key={v} onClick={() => setView(v)} className={`${THEME.NAV_ITEM} ${view === v ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'}`}>
                        {v.toUpperCase()}
                    </button>
                ))}
            </div>
            <div className="shrink-0 flex items-center gap-2 sm:gap-3">
                <button onClick={onOpenIntro} className="w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-2xl transition-all border-subtle hover:border-blue-500"><HelpCircle size={20} className={THEME.ICON} /></button>
                <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded-2xl transition-all border-subtle hover:border-blue-500">{theme === 'dark' ? <Sun size={14} strokeWidth={2.5} className={THEME.ICON} /> : <Moon size={14} strokeWidth={2.5} className={THEME.ICON} />}</button>
            </div>
        </nav>
    );
};

const ASRAnnouncementBar = ({ theme }) => {
    return (
      <div className={`fixed top-[var(--safe-top)] left-0 w-full z-[60] h-[var(--announcement-height)] flex items-center justify-center px-4 overflow-hidden border-b transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1e40af] border-blue-400/20 text-blue-50' : 'bg-blue-600 border-blue-700 text-white'}`}>
        <div className="flex items-center gap-3 animate-in fade-in duration-700">
          <span className="animate-pulse text-xs leading-none">●</span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">THE 2026 ASR OPEN IS LIVE, CLIPS DUE MAY 31</span>
        </div>
      </div>
    );
};

const ASRControlBar = ({ view, eventType, setEventType, theme }) => {
    const spacingClass = view === 'hof' ? "py-20 sm:py-32" : "pt-12 pb-12 sm:pt-20 sm:pb-20";
    
    return (
        <header className={`${spacingClass} px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col items-center justify-center gap-12 sm:gap-20`}>
            <h1 className={`${THEME.HEADING_MAIN} ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{view === 'hof' ? 'HALL OF FAME' : view.toUpperCase()}</h1>
            {view !== 'hof' && (
                <div className={`flex items-center p-2 rounded-[1.8rem] border border-subtle w-fit ${theme === 'dark' ? 'bg-zinc-950/60 shadow-2xl' : 'bg-white shadow-xl'}`}>
                    <div className="flex gap-2">
                        <button onClick={() => setEventType('open')} className={`px-8 sm:px-16 py-4 rounded-[1.2rem] text-[10px] sm:text-[16px] font-black uppercase tracking-widest transition-all ${eventType === 'open' ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} whitespace-nowrap`}>ASR OPEN</button>
                        <button onClick={() => setEventType('all-time')} className={`px-8 sm:px-16 py-4 rounded-[1.2rem] text-[10px] sm:text-[16px] font-black uppercase tracking-widest transition-all ${eventType === 'all-time' ? 'btn-blue-gradient active' : 'opacity-70 hover:opacity-100'} whitespace-nowrap`}>ALL-TIME</button>
                    </div>
                </div>
            )}
        </header>
    );
};

// --- MAIN APP ---

const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-full' },
    { label: 'RATING', type: 'number', key: 'rating', decimals: 2, align: 'right', width: 'w-20 sm:w-40' },
    { label: 'RUNS', type: 'number', key: 'runs', align: 'right', width: 'w-16 sm:w-32' }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-full' },
    { label: 'PLAYERS', type: 'number', key: 'totalAthletes', align: 'right', width: 'w-24 sm:w-40' }
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
  const rawCourseList = useMemo(() => masterCourseList.filter(c => isAllTimeContext || c.is2026), [masterCourseList, isAllTimeContext]);
  const filteredCourses = useFilteredData(rawCourseList, debouncedSearch, viewSorts.courses);
  const courseList = useMemo(() => filteredCourses.map((c, i) => ({ ...c, currentRank: i + 1 })), [filteredCourses]);
  const athletePool = isAllTimeContext ? data : openData;
  const filteredAthletes = useFilteredData(athletePool, debouncedSearch, viewSorts.players, useCallback(p => p && p.gender === gen, [gen]));
  
  const list = useMemo(() => {
    if (filteredAthletes.length === 0) return [];
    let qual = filteredAthletes.filter(p => isQualifiedAthlete(p, isAllTimeContext));
    let unranked = filteredAthletes.filter(p => !isQualifiedAthlete(p, isAllTimeContext));
    
    if (!isAllTimeContext) {
      const allTimeRankedKeys = new Set(data.map(p => p.pKey));
      unranked = unranked.filter(p => allTimeRankedKeys.has(p.pKey));
    }
    
    const fQual = qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true, shouldFade: false }));
    const fUnranked = unranked.map(p => ({ 
      ...p, 
      currentRank: "UR", 
      isQualified: false,
      shouldFade: isAllTimeContext ? true : ((p.runs || 0) === 0)
    }));
    
    let dividerLabel = "UNRANKED";
    if (isAllTimeContext) {
      dividerLabel = gen === 'M' ? "RUN 4+ COURSES TO GET RANKED" : "RUN 2+ COURSES TO GET RANKED";
    } else {
      dividerLabel = "RUN 3 COURSES TO GET RANKED";
    }

    return fQual.length && fUnranked.length ? [...fQual, { isDivider: true, label: dividerLabel }, ...fUnranked] : [...fQual, ...fUnranked];
  }, [filteredAthletes, isAllTimeContext, data, gen]);

  const settersWithImpact = useMemo(() => {
    return (settersData || []).map(s => {
        const sName = s.name.trim();
        const leadCourses = masterCourseList.filter(c => isNameInList(sName, c.leadSetters));
        const assistCourses = masterCourseList.filter(c => isNameInList(sName, c.assistantsetters));
        const allSetCourses = Array.from(new Set([...leadCourses, ...assistCourses]));
        return { 
            ...s, leads: leadCourses.length, assists: assistCourses.length,
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

  const getModalHeader = (modal) => {
    if (!modal) return null;
    const { type, data } = modal;
    if (type === 'course') {
        let locStr = data.city && data.city !== 'UNKNOWN' ? data.city : '';
        if ((data.country === 'USA' || data.country === 'CANADA') && data.stateProv) locStr += `, ${data.stateProv}`;
        return (
          <div className="flex flex-col gap-6 w-full text-left">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full">
              <div className={`w-26 h-26 sm:w-[100px] sm:h-[100px] rounded-3xl border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-zinc-800 bg-black/50' : 'border-slate-400 bg-white'} ios-clip-fix`}>
                <FallbackAvatar name={data.name} sizeCls="text-xl sm:text-4xl" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tighter whitespace-normal break-words uppercase leading-none mb-2 text-inherit">{data.name}</h2>
                <div className="text-[10px] sm:text-[14px] font-black uppercase tracking-widest min-w-0 opacity-80 text-inherit whitespace-normal break-words">
                  {formatLocationSubtitle(data.country, data.flag, locStr ? locStr + ', ' : '')}
                </div>
              </div>
            </div>
            <ASRPatronPill course={data} theme={theme} />
            <div className="flex flex-row items-center gap-3 w-full">
              <a href={data.demoVideo || "#"} target={data.demoVideo ? "_blank" : "_self"} rel="noopener noreferrer" className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border shadow-xl h-[72px] text-center ${data.demoVideo ? 'border-rose-600/50 text-rose-500 hover:bg-rose-600 hover:text-white' : 'border-zinc-800/40 text-zinc-600/50 grayscale opacity-40 cursor-not-allowed'} whitespace-nowrap`}><Play size={14} className={THEME.ICON} /><span>RULES</span></a>
              <a href={data.coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.coordinates)}` : "#"} target={data.coordinates ? "_blank" : "_self"} rel="noopener noreferrer" className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all border shadow-xl h-[72px] text-center ${data.coordinates ? 'border-blue-600/50 text-blue-500 hover:bg-blue-600 hover:text-white' : 'border-zinc-800/40 text-zinc-600/50 grayscale opacity-40 cursor-not-allowed'} whitespace-nowrap`}><MapPin size={14} className={THEME.ICON} /><span>MAP</span></a>
            </div>
          </div>
        );
    }
    if (type === 'player' || type === 'setter') {
        return (
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 min-w-0 w-full pr-2 text-left">
            <div className={`w-26 h-26 sm:w-[100px] lg:w-[116px] sm:h-[100px] lg:h-[116px] rounded-3xl border flex items-center justify-center text-2xl sm:text-5xl font-black shadow-2xl shrink-0 uppercase overflow-hidden relative ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800 text-slate-400' : 'bg-white border-slate-400 text-slate-500'} ios-clip-fix`}><FallbackAvatar name={data.name} /></div>
            <div className="min-w-0 flex-1 flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
                <div className="flex wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mb-2 min-w-0 w-full"><h2 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tight uppercase leading-none text-inherit max-w-full break-words whitespace-normal">{data.name}</h2></div>
                <div className="flex items-center gap-3 sm:gap-4 mt-1">
                    {data.region && <div className="text-2xl sm:text-3xl leading-none flex items-center gap-1.5 drop-shadow-sm">{data.region}</div>}
                    {data.igHandle && <a href={`https://instagram.com/${data.igHandle}`} target="_blank" rel="noopener noreferrer" className={`group/ig flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all hover:scale-110 shadow-sm border ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-300 text-slate-900'} ios-clip-fix`} title={`@${data.igHandle}`}><Instagram size={18} strokeWidth={2.5} className="text-[#E1306C] transition-transform group-hover/ig:rotate-6" /></a>}
                </div>
            </div>
          </div>
        );
    }
    if (type === 'region') {
      return (
        <div className="flex items-center gap-6 sm:gap-10 text-left">
            <div className={`w-26 h-26 sm:w-[100px] sm:h-[100px] rounded-3xl border shadow-2xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-300'} ios-clip-fix`}><FallbackAvatar name={data.name} initialsOverride={data.name === 'GLOBAL' ? 'GL' : ''} /></div>
            <div className="flex flex-col"><h2 className="text-xl sm:text-5xl lg:text-7xl font-black uppercase leading-tight text-inherit whitespace-normal break-words">{data.name}</h2><div className="text-3xl sm:text-5xl mt-3">{data.flag}</div></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`min-h-[100dvh] transition-colors duration-500 font-sans pb-32 flex flex-col antialiased ${theme === 'dark' ? 'bg-[#000000] text-slate-100' : 'bg-[#f8fafc] text-slate-900'}`}>
      <CustomStyles />
      <ASRAnnouncementBar theme={theme} />
      <ASRNavBar theme={theme} setTheme={setTheme} view={view} setView={setView} onOpenIntro={() => setShowIntro(true)} />
      <ASROnboarding isOpen={showIntro} onClose={() => setShowIntro(false)} theme={theme} />
      <div className="flex-1 flex flex-col pt-[calc(64px+var(--announcement-height)+var(--safe-top))] sm:pt-[calc(96px+var(--announcement-height)+var(--safe-top))]">
        <ASRBaseModal 
          isOpen={historyIndex >= 0} onClose={closeAllModals} onBack={goBackModal} onForward={goForwardModal} canGoForward={canGoForward} 
          theme={theme} header={getModalHeader(activeModal)} breadcrumbs={breadcrumbsArr} onBreadcrumbClick={jumpToHistory}
        >
          <InspectorBody 
             activeModal={activeModal} theme={theme} allCourses={masterCourseList} openRankings={openData} atPerfs={atPerfs} opPerfs={opPerfs} 
             atMet={atMet} dnMap={dnMap} settersWithImpact={settersWithImpact} openModal={openModal}
             onSetterClick={(sName) => { const sObj = settersWithImpact.find(s => s.name.toLowerCase() === sName.toLowerCase()); if (sObj) openModal('setter', sObj); }}
          />
        </ASRBaseModal>
        <ASRControlBar view={view} eventType={eventType} setEventType={setEventType} theme={theme} />
        <main className="max-w-7xl mx-auto px-4 sm:px-12 flex-grow w-full">
          {isLoading && data.length === 0 ? <div className={`border-2 border-subtle rounded-[3.5rem] h-96 animate-pulse ${theme === 'dark' ? 'bg-zinc-950' : 'bg-slate-200'}`} /> : 
           view === 'hof' ? <ASRHallOfFame stats={hofStats} theme={theme} onPlayerClick={p => openModal('player', p, 'all-time')} onSetterClick={s => openModal('setter', s, 'setter')} onRegionClick={r => openModal('region', r)} medalSort={viewSorts.hof} setMedalSort={handleSort} /> : 
           <div className="space-y-12">
             {view === 'map' && (
               <ASRGlobalMap 
                 courses={rawCourseList} continents={getAggregatedStats(rawCourseList, 'continent')} 
                 cities={getAggregatedStats(rawCourseList, 'city')} countries={getAggregatedStats(rawCourseList, 'country')} 
                 theme={theme} eventType={eventType} setEventType={setEventType} onCourseClick={openModal} 
                 onCountryClick={c => openModal('region', {...c, type: 'country'})} onCityClick={c => openModal('region', {...c, type: 'city'})} 
                 onContinentClick={c => openModal('region', {...c, type: 'continent'})} 
               />
             )}
             <ASRSearchInput search={search} setSearch={setSearch} gen={gen} setGen={setGen} theme={theme} view={view} />
             <div className={`relative border border-subtle rounded-[2rem] sm:rounded-[3.5rem] shadow-premium overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-zinc-950/40' : 'bg-white'}`}>
               <div className="overflow-auto scrollbar-hide max-h-[80vh] relative w-full text-left">
                 {(view === 'map' ? courseList : list).length > 0 ? (
                   <ASRDataTable theme={theme} columns={view === 'map' ? COURSE_COLS : PLAYER_COLS} sort={viewSorts[view === 'map' ? 'courses' : 'players']} onSort={handleSort} data={view === 'map' ? courseList : list} onRowClick={item => openModal(view === 'map' ? 'course' : 'player', item, isAllTimeContext ? 'all-time' : 'asr-open')} />
                 ) : (
                   <div className="flex flex-col items-center justify-center py-40 opacity-30"><ChevronsRight size={28} strokeWidth={2.5} className={`${THEME.ICON} text-blue-600 mb-20 scale-[4.5]`} style={{ transform: 'skewX(-18deg)' }} /><h3 className="text-sm sm:text-2xl font-black uppercase tracking-[0.5em]">CALIBRATING DATA</h3></div>
                 )}
               </div>
             </div>
             <div className="animate-in fade-in duration-1000 slide-in-from-bottom-4">
                {view === 'map' && <ASRPromotionBanner type="setter" theme={theme} />}
                {view === 'players' && <ASRPromotionBanner type="coach" theme={theme} />}
             </div>
           </div>}
        </main>
      </div>
      <footer className="mt-40 text-center pb-[calc(80px+var(--safe-bottom))] opacity-30 font-black uppercase tracking-[0.6em] text-[11px]">© 2026 APEX MOVEMENT SPEED PROJECT</footer>
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
