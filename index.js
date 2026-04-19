import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
  ChevronsRight, Search, X, CornerUpLeft, CornerUpRight, 
  ChevronDown, Sun, Moon, MapPin, Globe, Instagram, Play, Trophy,
  Compass, Info, ChevronRight, Navigation, ShieldCheck,
  Video, HelpCircle, Building2, Map as MapIcon, Waypoints, 
  HeartHandshake, Rocket, ExternalLink, Sparkles, ShoppingBag,
  Users, User, MessageSquare, TrendingUp, Fingerprint, Zap,
  Dna, Ruler, Mountain, Calendar, AlertCircle, Timer, List, Share, Eye, Camera, Award, Star, Medal,
  Clock, Flag
} from 'lucide-react';

// --- CONSTANTS & THEME TOKENS ---
const SNAPSHOT_KEY = 'asr_data_vault_v1_integrated_v59_teams'; 
const REFRESH_INTERVAL = 300000; // 5 mins
const SKOOL_LINK = "https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93";

const THEME = {
  CARD: (t) => t === 'dark' 
    ? "bg-zinc-950/40 border-zinc-900/50 shadow-[0_8px_30px_rgb(0,0,0,0.5)] text-white" 
    : "bg-white border-slate-200 shadow-premium text-black",
  
  GLASS: (t) => t === 'dark'
    ? "bg-zinc-900/80 border-zinc-800/50 backdrop-blur-xl shadow-2xl"
    : "bg-white/80 border-slate-200 backdrop-blur-md shadow-xl",

  MODAL_SURFACE: (t) => t === 'dark'
    ? "bg-[#080808] border-zinc-900 text-white" 
    : "bg-white border-slate-200 text-black",

  HEADING_SM: "text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] opacity-70",
  HEADING_HOF: "text-[11px] sm:text-[13px] font-black uppercase tracking-[0.15em] opacity-90",
  HEADING_MAIN: "text-4xl sm:text-[64px] font-black uppercase tracking-tighter italic leading-none",
  LABEL: "text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-50",
  VALUE: "font-mono font-black tabular-nums num-col",
  
  INPUT: (t) => t === 'dark'
    ? "bg-zinc-900/80 text-white focus:bg-black/90 border-zinc-800 focus:border-blue-600/60 shadow-2xl"
    : "bg-white text-black border-slate-200 focus:border-blue-600 shadow-xl",
  
  BUTTON_ROUNDED: "rounded-[0.9rem] sm:rounded-[1.8rem] transition-all whitespace-nowrap",
  NAV_ITEM: "px-4 sm:px-10 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] transition-all text-inherit whitespace-nowrap active:scale-95",
  
  ICON: "shrink-0 transition-colors"
};

// --- UTILITIES & HELPERS ---
const isPlaceholderPlayer = (name) => {
  if (!name) return false;
  const n = String(name).toUpperCase();
  return n.includes("INTERIM") || n.includes("TOP TIME") || n.includes("PLACEHOLDER") || n.includes("UNKNOWN");
};

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
        'UNITED STATES OF AMERICA': 'USA', 'UNITED STATES': 'USA', 'US': 'USA', 'USA': 'USA',
        'UNITED KINGDOM': 'UK', 'GREAT BRITAIN': 'UK', 'ENGLAND': 'UK', 'UK': 'UK',
        'SCOTLAND': 'UK', 'WALES': 'UK', 'NORTHERN IRELAND': 'UK',
        'SOUTH KOREA': 'KOREA', 'REPUBLIC OF KOREA': 'KOREA', 'RUSSIAN FEDERATION': 'RUSSIA',
        'THE NETHERLANDS': 'NETHERLANDS', 'CZECH REPUBLIC': 'CZECHIA',
        'UNITED MEXICAN STATES': 'MEXICO', 'MACAO': 'MACAU', 'MACAU SAR': 'MACAU',
        'ISRAEL': 'ISRAEL', 'TAIWAN': 'TAIWAN', 'SWITZERLAND': 'SWITZERLAND'
    };
    return map[n] || n;
};

const fixCountryEntity = (name, flag) => {
    let n = String(name || "").trim();
    let f = String(flag || "").trim();

    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/;
    if (flagRegex.test(n)) return { name: "UNKNOWN", flag: n };
    if (flagRegex.test(f)) return { name: n || "UNKNOWN", flag: f };

    const normalized = normalizeCountryName(n);

    const flagMandatoryMap = {
      "USA": "🇺🇸", "UNITED STATES": "🇺🇸", "UNITED STATES OF AMERICA": "🇺🇸", "US": "🇺🇸",
      "UK": "🇬🇧", "UNITED KINGDOM": "🇬🇧", "GREAT BRITAIN": "🇬🇧", "ENGLAND": "🇬🇧", "SCOTLAND": "🇬🇧", "WALES": "🇬🇧",
      "CANADA": "🇨🇦", "MEXICO": "🇲🇽", "FRANCE": "🇫🇷", "GERMANY": "🇩🇪",
      "SPAIN": "🇪🇸", "ITALY": "🇮🇹", "JAPAN": "🇯🇵", "AUSTRALIA": "🇦🇺",
      "BRAZIL": "🇧🇷", "PUERTO RICO": "🇵🇷", "CZECHIA": "🇨🇿", "CZECH REPUBLIC": "🇨🇿",
      "NETHERLANDS": "🇳🇱", "SWITZERLAND": "🇨🇭", "AUSTRIA": "🇦🇹", "BELGIUM": "🇧🇪",
      "SWEDEN": "🇸🇪", "NORWAY": "🇳🇴", "FINLAND": "🇫🇮", "DENMARK": "🇩🇰",
      "KOREA": "🇰🇷", "SOUTH KOREA": "🇰🇷", "CHINA": "🇨🇳", "MACAU": "🇲🇴", "MACAO": "🇲🇴", "HONG KONG": "🇭🇰",
      "NEW ZEALAND": "🇳🇿", "SINGAPORE": "🇸🇬", "IRELAND": "🇮🇪", "PORTUGAL": "🇵🇹",
      "POLAND": "🇵🇱", "SOUTH AFRICA": "🇿🇦", "ARGENTINA": "🇦🇷", "CHILE": "🇨🇱", "ISRAEL": "🇮🇱", "TAIWAN": "🇹🇼",
      "RUSSIA": "🇷🇺", "UKRAINE": "🇺🇦", "VIETNAM": "🇻🇳", "THAILAND": "🇹🇭", "MALAYSIA": "🇲🇾", "PHILIPPINES": "🇵🇭"
    };

    const finalName = normalized || "UNKNOWN";
    const finalFlag = flagMandatoryMap[finalName] || (f && f !== "🏳️" ? f : "🏳️");

    return { name: finalName, flag: finalFlag };
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

const formatFlagsWithSpace = (f) => {
    if (!f) return "";
    const flagRegex = /[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g;
    const matches = String(f).match(flagRegex);
    if (matches && matches.length > 1) {
        return matches.join(' ');
    }
    return f;
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

const isQualifiedAthlete = (p, isAllTime = true) => {
    if (!p || isPlaceholderPlayer(p.name)) return false;
    const runs = p.runs || 0;
    if (isAllTime) {
      return p.gender === 'M' ? (runs >= 4) : (runs >= 3);
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

const getContinentData = (country) => {
    const continents = {
      "eu": ["ALBANIA", "ANDORRA", "ARMENIA", "AUSTRIA", "AZERBAIJAN", "BELARUS", "BELGIUM", "BOSNIA AND HERZEGOVINA", "BULGARIA", "CROATIA", "CYPRIA", "CZECHIA", "CZECH REPUBLIC", "DENMARK", "ESTONIA", "FINLAND", "FRANCE", "GEORGIA", "GERMANY", "GREECE", "HUNGARY", "ICELAND", "IRELAND", "ITALY", "KAZAKHSTAN", "KOSOVO", "LATVIA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MALTA", "MOLDOVA", "MONACO", "MONTENEGRO", "NETHERLANDS", "NORTH MACEDONIA", "NORWAY", "POLAND", "PORTUGAL", "ROMANIA", "RUSSIA", "SAN MARINO", "SERBIA", "SLOVAKIA", "SLOVENIA", "SPAIN", "SWEDEN", "SWITZERLAND", "TURKEY", "UKRAINE", "UK", "UNITED KINGDOM"],
      "na": ["ANTIGUA AND BARBUDA", "BAHAMAS", "BARBADOS", "BELIZE", "CANADA", "COSTA RICA", "CUBA", "DOMINICA", "DOMINICAN REPUBLIC", "EL SALVADOR", "GRENADA", "GUATEMALA", "HAITI", "HONDURAS", "JAMAICA", "MEXICO", "NICARAGUA", "PANAMA", "SAINT KITTS AND NEVIS", "SAINT LUCIA", "SAINT VINCENT AND THE GRENADINES", "TRINIDAD AND TOBAGO", "USA", "UNITED STATES", "PUERTO RICO"],
      "sa": ["ARGENTINA", "BOLIVIA", "BRAZIL", "CHILE", "COLOMBIA", "ECUADOR", "GUYANA", "PARAGUAY", "PERU", "SURINAME", "URUGUAY", "VENEZUELA"],
      "as": ["AFGHANISTAN", "BAHRAIN", "BANGLADESH", "BHUTAN", "BRUNEI", "CAMBODIA", "CHINA", "INDIA", "INDONESIA", "IRAN", "IRAQ", "ISRAEL", "JAPAN", "JORDAN", "KOREA", "SOUTH KOREA", "KUWAIT", "KYRGYZSTAN", "LAOS", "LEBANON", "MALAYSIA", "MALDIVES", "MONGOLIA", "MYANMAR", "NEPAL", "OMAN", "PAKISTAN", "PALESTINE", "PHILIPPINES", "QATAR", "SAUDI ARABIA", "SINGAPORE", "SRI LANKA", "SYRIA", "TAIWAN", "TAJIKISTAN", "THAILAND", "TIMOR-LESTE", "TURKMENISTAN", "UNITED ARAB EMIRATES", "UZBEKISTAN", "VIETNAM", "YEMEN"],
      "af": ["ALGERIA", "ANGOLA", "BENIN", "BOTSWANA", "BURKINA FASO", "BURUNDI", "CABO VERDE", "CAMEROON", "CENTRAL AFRICAN REPUBLIC", "CHAD", "COMOROS", "CONGO", "DJIBOUTI", "EGYPT", "EQUATORIAL GUINEA", "ERITREA", "ESWATINI", "ETHIOPIA", "GABON", "GAMBIA", "GHANA", "IVORY COAST", "KENYA", "LESOTHO", "LIBERIA", "LIBYA", "MADAGASCAR", "MALAWI", "MALI", "MAURITANIA", "MAURITIUS", "MOROCCO", "MOZAMBIQUE", "NAMIBIA", "NIGER", "NIGERIA", "RWANDA", "SAO TOME AND PRINCIPE", "SENEGAL", "SEYCHELLES", "SIERRA LEONE", "SOMALIA", "SOUTH AFRICA", "SOUTH SUDAN", "SUDAN", "TANZANIA", "TOGO", "TUNISIA", "UGANDA", "ZAMBIA", "ZIMBABWE"],
      "oc": ["AUSTRALIA", "FIJI", "KIRIBATI", "MARSHALL ISLANDS", "MICRONESIA", "NAURU", "NEW ZEALAND", "PALAU", "PAPUA NEW GUINEA", "SAMOA", "SOLOMON ISLANDS", "TONGA", "TUVALU", "VANUATU"]
    };
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

// --- COMPONENT: COUNT UP ANIMATION ---
const ASRCountUp = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  
  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentCount = Math.floor(progress * end);
      
      if (currentCount !== countRef.current) {
        setCount(currentCount);
        countRef.current = currentCount;
      }
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// --- STYLES ---
const CustomStyles = () => (
  <style>{`
    @keyframes subtle-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(0.98); }
    }
    .animate-subtle-pulse { animation: subtle-pulse 3s infinite ease-in-out; }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-marquee {
      display: flex;
      width: max-content;
      animation: marquee 160s linear infinite;
    }
    .animate-marquee:hover { animation-play-state: paused; }
    
    .glow-gold { text-shadow: 0 0 12px rgba(245, 158, 11, 0.7); }
    .glow-silver { text-shadow: 0 0 12px rgba(161, 161, 170, 0.5); }
    .glow-bronze { text-shadow: 0 0 12px rgba(206, 137, 70, 0.6); }
    .glow-blue { text-shadow: 0 0 15px rgba(37, 99, 235, 0.7); }
    
    .num-col { font-variant-numeric: tabular-nums; }
    
    * { 
      -webkit-tap-highlight-color: transparent; 
      -webkit-touch-callout: none;
    }

    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --announcement-height: 32px;
      --ticker-height: 32px;
      --nav-height-mobile: 68px;
      --nav-height-desktop: 76px;
      --floating-nav-height: 58px;
    }
    
    html, body {
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      background: #000;
      min-height: 100%;
      height: -webkit-fill-available;
      overscroll-behavior-y: none;
    }

    #root {
      height: 100%;
    }

    button, a {
      user-select: none;
      -webkit-user-select: none;
    }

    .ios-clip-fix {
      isolation: isolate;
      overflow: hidden;
      -webkit-mask-image: -webkit-radial-gradient(white, black);
    }

    .btn-blue-gradient {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white !important;
    }

    .floating-nav-dock {
      position: fixed;
      bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      z-index: 100;
      width: min(88%, 420px);
      pointer-events: none;
    }
    
    .floating-nav-inner {
      pointer-events: auto;
      height: var(--floating-nav-height);
      display: flex;
      align-items: center;
      justify-content: space-around;
      border-radius: 999px;
      box-shadow: 
        0 20px 40px rgba(0,0,0,0.6), 
        0 0 0 1px rgba(255,255,255,0.08),
        inset 0 1px 1px rgba(255,255,255,0.15);
      padding: 0 12px;
      position: relative;
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .floating-nav-item-active-dot {
      position: absolute;
      bottom: 8px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #2563eb;
      box-shadow: 0 0 8px #2563eb;
    }

    .stat-card-container { overflow: visible !important; }

    .emoji-slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.4em;
      height: 1.2em;
      text-align: center;
      line-height: 1;
      flex-shrink: 0;
    }

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
    }

    .asr-cluster {
      background: rgba(37, 99, 235, 0.9);
      border: 2.5px solid #ffffff;
      color: white;
      font-weight: 900;
      font-family: sans-serif;
      border-radius: 50%;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    .asr-cluster:hover { transform: scale(1.1); }
    
    .asr-marker-pin-wrap svg {
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    }

    .search-bubble {
        box-shadow: 0 10px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.05);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-size: 16px !important;
        touch-action: manipulation;
    }
    .search-bubble:focus-within {
        box-shadow: 0 15px 40px rgba(0,0,0,0.2), 0 0 0 2px rgba(37,99,235,0.4);
    }
  `}</style>
);

// --- ATOMIC UI COMPONENTS ---
const ASRStatCard = ({ label, value, theme, colorClass, glowClass, tooltip, icon, isHeader = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => setIsFlipped(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isFlipped]);

  const statInfoMap = {
    'RATING': "RATING = POINTS / RUNS",
    'AVG POINTS': "AVERAGE POINTS PER RUN",
    'TOP RATING': "RATING = POINTS / RUNS",
    '🔥': "FIRE BONUS FOR THE FASTEST RUNS.",
    'MOST 🔥': "FIRE BONUS FOR THE FASTEST RUNS.",
    '🪙': "CONTRIBUTOR COINS EARNED FROM RUNS, WINS, & SETS.",
    'MOST 🪙': "CONTRIBUTOR COINS EARNED FROM RUNS, WINS, & SETS.",
    'IMPACT': "TOTAL RUNS ON ALL COURSES BY THIS SETTER.",
    'MOST IMPACT': "TOTAL RUNS ON ALL COURSES BY THIS SETTER.",
    'WINS': "TOTAL COURSE RECORDS CURRENTLY HELD.",
    'MOST RECORDS': "TOTAL COURSE RECORDS CURRENTLY HELD.",
    'WIN %': "WIN % = WINS / RUNS",
    'HIGHEST WIN %': "WIN % = WINS / RUNS",
    'FILMS': "TOTAL RUNS FILMED FOR OTHER PLAYERS.",
    'AVG LENGTH': "AVERAGE COURSE LENGTH (METERS).",
    'AVG TIME': "AVERAGE RUN TIME (SECONDS).",
    'LEVEL': "ASR COURSE SETTER CERTIFICATION LEVEL",
    'RUNS': "TOTAL NUMBER OF RUNS COMPLETED.",
    'MOST RUNS': "TOTAL NUMBER OF RUNS COMPLETED.",
    'SETS': "TOTAL NUMBER OF COURSES SET.",
    'MOST SETS': "TOTAL NUMBER OF COURSES SET.",
    'PLAYERS': "TOTAL UNIQUE PLAYERS AFFILIATED WITH THIS ENTITY."
  };

  const labelStr = String(label || "").toUpperCase();
  const description = tooltip || statInfoMap[labelStr];

  return (
    <div 
      onClick={(e) => {
        if (description) {
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }
      }}
      role={description ? "button" : undefined}
      tabIndex={description ? 0 : undefined}
      onKeyDown={(e) => {
        if (description && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }
      }}
      className={`stat-card-container ios-clip-fix relative flex flex-col border transition-all duration-300 select-none ${description ? 'cursor-pointer hover:border-blue-500/50 active:scale-95' : 'cursor-default'} ${isHeader ? 'p-0 border-none' : 'p-3.5 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] ' + THEME.CARD(theme)}`}
    >
        <div className={`transition-all duration-300 flex flex-col h-full w-full ${isFlipped ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100'}`}>
          <span className={`${isHeader ? THEME.HEADING_HOF : THEME.LABEL} mb-1.5 flex items-center justify-between gap-1.5 text-inherit whitespace-nowrap shrink-0 overflow-visible ${isHeader ? 'opacity-100' : ''}`}>
              {label} 
              {description && (
                <Info size={10} className="opacity-40" />
              )}
          </span>
          {!isHeader && (
            <div className="flex items-baseline gap-1.5 min-w-0 overflow-hidden">
              {icon && <span className="text-xs sm:text-sm shrink-0 mb-0.5">{icon}</span>}
              <span className={`text-[14px] sm:text-[18px] lg:text-[22px] leading-none truncate ${THEME.VALUE} ${colorClass || ''} ${glowClass || ''}`}>{value}</span>
            </div>
          )}
        </div>

        {description && (
          <div className={`transition-all duration-300 flex flex-col justify-center h-full w-full ${!isFlipped ? 'opacity-0 scale-95 pointer-events-none absolute' : 'opacity-100 scale-100'}`}>
              <p className="text-[9px] sm:text-[10px] font-black uppercase leading-[1.3] text-inherit tracking-tight overflow-hidden line-clamp-3 p-1">
                {description}
              </p>
          </div>
        )}
    </div>
  );
};

const ASRSectionHeading = ({ children, theme, className = "" }) => (
    <h3 className={`${THEME.HEADING_SM} px-1 sm:px-2 mb-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-black'} ${className}`}>
        {children}
    </h3>
);

const FallbackAvatar = ({ name, sizeCls = "text-xl sm:text-4xl", initialsOverride = "" }) => {
  const GRADIENTS = [
    'from-blue-600 to-indigo-700', 'from-emerald-600 to-cyan-700',
    'from-cyan-600 to-blue-700', 'from-teal-600 to-emerald-700',
    'from-violet-700 to-purple-700', 'from-blue-50 to-indigo-500',
    'from-sky-600 to-blue-700', 'from-indigo-600 to-purple-700'
  ];
  
  const stringToHash = (str) => {
    let hash = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
  };

  const getInitials = (n) => {
    if (!n) return '??'; 
    if (initialsOverride) return initialsOverride.toUpperCase();
    const w = String(n).trim().split(/\s+/).filter(Boolean);
    if (w.length === 0) return '??';
    return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : String(n).slice(0, 2)).toUpperCase();
  };

  const hash = stringToHash(name);
  const grad = GRADIENTS[hash % GRADIENTS.length];

  return (
    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black shadow-md rounded-[inherit] ${sizeCls} textured-surface ios-clip-fix`}>
      <span className="relative z-10">{getInitials(name)}</span>
    </div>
  );
};

const formatLocationSubtitle = (hometown, country, flags) => {
    const h = String(hometown || "").trim();
    const c = String(country || "").trim();
    const f = formatFlagsWithSpace(String(flags || "").trim());

    let displayLoc = h || c;
    
    if (!displayLoc && !f) return <span className="opacity-40 text-[9px] uppercase tracking-widest">LOCATION UNKNOWN <span className="emoji-slot">🏳️</span></span>;

    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-inherit font-black">
            <span className="truncate max-w-full">{displayLoc.toUpperCase()}</span>
            {f && <span className="flex items-center gap-0.5 shrink-0">{f}</span>}
        </div>
    );
};

const ASRRankBadge = ({ rank, theme, size = 'md' }) => {
  const isUnranked = String(rank || "").trim() === "UR";
  const rankNum = isUnranked ? "UR" : (rank === "-" ? "?" : rank);
  const dim = size === 'lg' ? 'w-10 h-10 sm:w-11 sm:h-11' : 'w-7 h-7 sm:w-10 sm:h-10';
  const textClass = size === 'lg' ? 'text-sm sm:text-base' : 'text-[10px] sm:text-sm';
  const isPodium = rank === 1 || rank === 2 || rank === 3;
  const styles = {
    1: { border: 'border-amber-500', text: theme === 'dark' ? 'text-amber-500' : 'text-amber-600', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.5)]' },
    2: { border: 'border-zinc-400', text: theme === 'dark' ? 'text-zinc-300' : 'text-zinc-400', glow: 'shadow-[0_0_15px_rgba(161,161,170,0.3)]' },
    3: { border: 'border-[#CE8946]', text: 'text-[#CE8946]', glow: 'shadow-[0_0_15px_rgba(206,137,70,0.4)]' },
    unranked: { border: theme === 'dark' ? 'border-zinc-800' : 'border-slate-200', text: 'text-zinc-500', glow: 'shadow-none' },
    default: { border: 'border-none', text: theme === 'dark' ? 'text-white' : 'text-black', glow: 'shadow-none' }
  };
  const current = isUnranked ? styles.unranked : (styles[rank] || styles.default);
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-mono font-black transition-all duration-300 shrink-0 ${dim} ${textClass} ${current.border} ${current.text} ${current.glow} ${isPodium ? 'border-[3px] animate-subtle-pulse' : (isUnranked ? 'border-2' : 'border-0')} ios-clip-fix`}>
      {rankNum}
    </span>
  );
};

const ASRPerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-blue" };
    return <span className={`inline-flex items-center gap-0 select-none shrink-0 ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i} className="emoji-slot">{badges[type]}</span>)}
    </span>;
};

const ASRListItem = ({ 
  rank, title, subtitle, variant = 'table', stats = [], columns = [], videoUrl, icon, theme, onClick, isUnranked = false,
  badgeContent, shouldFade = false
}) => {
  const accentColor = theme === 'dark' ? 'text-white' : 'text-black';
  const tableHover = theme === 'dark' ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.05]';
  const cardHover = theme === 'dark' ? 'hover:bg-zinc-900/60' : 'hover:bg-slate-50';
  
  if (variant === 'table') {
    return (
      <div 
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e);
          }
        }}
        className={`group flex items-center transition-all duration-200 ios-clip-fix py-6 sm:py-8 px-0 outline-none
          ${onClick ? `cursor-pointer active:bg-blue-600/10 focus:bg-blue-600/10 ${tableHover}` : 'cursor-default'} 
          ${shouldFade ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="w-20 sm:w-24 pl-4 sm:pl-10 shrink-0">
            <ASRRankBadge rank={rank} theme={theme} />
        </div>
        <div className="flex-1 flex min-w-0 h-full items-center">
            <div className="flex-1 flex flex-col min-w-[120px] pr-2 pl-4 sm:pl-8 text-left">
              <span className={`text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight ${onClick ? 'group-hover:text-blue-500' : ''} transition-colors overflow-hidden line-clamp-2`}>
                {title}
              </span>
              <div className="opacity-60 text-[9px] sm:text-xs font-black uppercase whitespace-normal break-words mt-0.5">
                {subtitle}
              </div>
              {badgeContent && <div className="mt-1 h-4 flex items-center gap-0.5">{badgeContent}</div>}
            </div>
            {stats.map((s, idx) => {
                const colDef = columns.filter(c => !c.isRank && c.type !== 'profile')[idx];
                return (
                  <div key={idx} className={`${colDef?.width || 'w-24 sm:w-48'} px-2 sm:px-4 flex items-center justify-end text-right shrink-0 h-full`}>
                    <span className={`${THEME.VALUE} ${idx === 0 ? `text-sm sm:text-[20px] tracking-tight ${s.value ? s.color || accentColor : 'opacity-20'}` : 'text-[9px] sm:text-[13px] opacity-60'}`}>
                      {s.value || '--'}
                    </span>
                  </div>
                );
            })}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick} 
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      }}
      className={`group flex items-center justify-between transition-all duration-200 ios-clip-fix outline-none
        p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border h-auto min-h-[72px] sm:min-h-[80px]
        ${onClick ? `cursor-pointer active:scale-[0.98] focus:scale-[0.98] focus:border-blue-500 ${cardHover}` : 'cursor-default'}
        ${theme === 'dark' 
          ? 'bg-zinc-900/30 border-zinc-900/50 shadow-md' 
          : 'bg-white border-slate-200 shadow-md'}
        ${shouldFade ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
        {icon ? (
          <div className={`p-0 rounded-xl transition-colors shrink-0`}>
            {icon}
          </div>
        ) : (
          <div className="shrink-0">
            <ASRRankBadge rank={rank} theme={theme} />
          </div>
        )}
        <div className="flex flex-col min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight ${onClick ? 'group-hover:text-blue-500' : ''} transition-colors`}>
              {title}
            </span>
          </div>
          <div className="flex flex-col mt-0.5">
            <div className="opacity-60 text-[9px] sm:text-xs font-black uppercase whitespace-normal break-words">
              {subtitle}
            </div>
            {badgeContent && <div className="mt-1 h-4 flex items-center gap-0.5">{badgeContent}</div>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 pr-2 shrink-0 h-full">
        <div className="flex flex-col items-end min-w-[60px] sm:min-w-[100px] text-right">
          {stats.map((s, idx) => (
            <span key={idx} className={`${THEME.VALUE} ${idx === 0 ? `text-sm sm:text-[20px] tracking-tight ${s.value ? s.color || accentColor : 'opacity-20'}` : 'text-[9px] opacity-60'}`}>
              {s.value || '--'}
            </span>
          ))}
        </div>
        <div className="w-10 sm:w-16 flex items-center justify-center shrink-0">
          {videoUrl && (
            <a 
              href={videoUrl} target="_blank" rel="noopener noreferrer" 
              onClick={e => e.stopPropagation()} 
              className="p-2.5 rounded-xl transition-all hover:scale-125 active:scale-90 text-slate-500 hover:text-blue-600 flex items-center justify-center"
            >
              <Play className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const ASRPromotionBanner = ({ type, theme }) => {
  const configs = useMemo(() => ({
    setter: {
      title: "COURSE SETTER CERTIFICATION",
      subtitle: "Become an Apex certified course setter.",
      icon: <Eye className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET STARTED"
    },
    coach: {
      title: "SPEED PARKOUR COACHING CERTIFICATION",
      subtitle: "Become an Apex certified speed parkour coach.",
      icon: <ShieldCheck className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET STARTED"
    },
    masterclass: {
        title: "VERIFY YOUR RUN",
        subtitle: "Get your runs verified for free in Apex Skool app.",
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
  }), []);

  const config = configs[type];
  if (!config) return null;

  return (
    <a 
      href={config.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group block w-full my-8 px-6 py-8 sm:py-10 rounded-[2.5rem] sm:rounded-[3rem] promo-card textured-surface shadow-2xl hover:scale-[0.99] active:scale-[0.97] transition-all duration-300 ios-clip-fix"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/30 rounded-2xl backdrop-blur-md">
            {config.icon}
          </div>
          <div className="flex flex-col text-left">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tighter leading-none mb-2 text-white">{config.title}</h3>
            <p className="text-[10px] sm:text-xs font-black uppercase whitespace-normal break-words opacity-90 text-white">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl group-hover:bg-blue-50 transition-colors whitespace-nowrap">
          {config.btnText} <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
        </div>
      </div>
    </a>
  );
};

const ASRPatronPill = ({ course, theme, compact = false }) => {
    const hasSponsor = !!course.sponsorName;
    const sponsorName = course.sponsorName;
    const sponsorLink = course.sponsorLink || `mailto:apexmovement@gmail.com?subject=Course Sponsorship Enquiry: ${course.name}`;
    
    const getInitials = (n) => {
      if (!n) return 'A';
      const clean = String(n).trim();
      return clean.length > 0 ? clean[0].toUpperCase() : 'A';
    };

    const goldBg = theme === 'dark' ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10' : 'bg-gradient-to-br from-amber-100 to-amber-50';
    const goldBorder = theme === 'dark' ? 'border-amber-500/60' : 'border-amber-500/50';
    const goldTextPrimary = theme === 'dark' ? 'text-amber-500' : 'text-amber-700';
    const goldTextSecondary = theme === 'dark' ? 'text-amber-500/70' : 'text-amber-700/80';
    const goldIconBg = 'bg-amber-500';
    const goldIconText = 'text-white';

    const fadedBg = theme === 'dark' ? 'bg-zinc-900/40' : 'bg-slate-100/80';
    const fadedBorder = theme === 'dark' ? 'border-zinc-800/50' : 'border-slate-300';
    const fadedTextPrimary = theme === 'dark' ? 'text-zinc-400' : 'text-slate-600';

    if (!compact) {
      if (hasSponsor) {
        return (
          <a href={sponsorLink} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center justify-between gap-4 px-5 py-3 rounded-[1.5rem] border backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 shadow-xl shrink-0 transition-all hover:scale-[1.01] active:scale-[0.99] group ${goldBg} ${goldBorder} ios-clip-fix h-[72px]`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full ${goldIconBg} flex items-center justify-center text-[10px] ${goldIconText} font-black italic shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:rotate-12 transition-transform uppercase tracking-tighter`}>
                    {getInitials(sponsorName)}
                  </div>
                </div>
                <div className="flex flex-col text-left">
                    <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.25em] ${goldTextSecondary} opacity-90 leading-none`}>OFFICIAL COURSE SPONSOR</span>
                    <span className={`text-[12px] sm:text-[14px] font-black uppercase tracking-tighter ${goldTextPrimary} mt-0.5`}>{sponsorName}</span>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-amber-500/40 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' : 'border-amber-500 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'} whitespace-nowrap`}>
                LEARN MORE
              </div>
          </a>
        );
      }
      
      return (
        <a href={sponsorLink} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-3 rounded-[1.5rem] border transition-all duration-300 hover:scale-[1.005] active:scale-[0.99] group ${fadedBg} ${fadedBorder} shadow-sm hover:shadow-lg ios-clip-fix h-[72px]`}>
            <div className="flex items-center gap-3 sm:gap-4 flex-1">
              <div className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-slate-400 shadow-sm'} group-hover:text-amber-500 group-hover:bg-amber-500/10`}>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-[10px] sm:text-[12px] font-black uppercase whitespace-normal break-words ${fadedTextPrimary} group-hover:text-amber-500 transition-colors leading-tight`}>ADOPT THIS COURSE, SUPPORT THE PROJECT</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'border-zinc-800 text-zinc-500 group-hover:border-amber-500 group-hover:text-amber-500' : 'border-slate-300 text-slate-400 group-hover:border-amber-500 group-hover:text-amber-500'} whitespace-nowrap`}>
              ENQUIRE
            </div>
        </a>
      );
    }

    if (hasSponsor) {
      return (
        <a href={sponsorLink} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.05] active:scale-[0.98] group shadow-md ${goldBg} ${goldBorder} ios-clip-fix h-[50px]`}>
            <div className={`w-5 h-5 rounded-full ${goldIconBg} flex items-center justify-center text-[8px] ${goldIconText} font-black italic shadow-[0_0_5px_rgba(245,158,11,0.3)] uppercase tracking-tighter`}>
              {getInitials(sponsorName)}
            </div>
            <div className="flex flex-col text-left">
                <span className={`text-[7px] font-black uppercase tracking-widest ${goldTextSecondary} opacity-80 leading-none`}>SPONSOR</span>
                <span className={`text-[10px] font-black uppercase whitespace-normal break-words ${goldTextPrimary}`}>{sponsorName}</span>
            </div>
        </a>
      );
    }
    return null;
};

const ASRInlineValueCard = ({ theme, type }) => {
  const cards = {
    skool_training: {
      desc: "Join our worldwide network on Apex Skool app.",
      icon: <Users className="w-4 h-4 sm:w-5 sm:h-5" />,
      link: SKOOL_LINK,
      btn: "JOIN NOW"
    },
    shop_gear: {
      desc: "Submit your video proof on Apex Skool app.",
      icon: <Video className="w-4 h-4 sm:w-5 sm:h-5" />,
      link: SKOOL_LINK,
      btn: "GET VERIFIED"
    },
    pro_setter: {
        desc: "Take our course setter certification on Apex Skool app.",
        icon: <Waypoints className="w-4 h-4 sm:w-5 sm:h-5" />,
        link: SKOOL_LINK,
        btn: "LEARN MORE"
    }
  };
  const c = cards[type];
  if (!c) return null;
  return (
    <div className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.005] active:scale-[0.99] textured-surface ${theme === 'dark' ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50 border-blue-300 shadow-md'} ios-clip-fix h-[72px]`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl shadow-sm text-blue-600 ${theme === 'dark' ? 'bg-zinc-900' : 'bg-white'}`}>{c.icon}</div>
        <div className="text-left">
          <p className={`text-[10px] font-black opacity-60 uppercase whitespace-normal break-words ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{c.desc}</p>
        </div>
      </div>
      <a href={c.link} target="_blank" rel="noopener noreferrer" className="shrink-0 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl whitespace-nowrap">
        {c.btn}
      </a>
    </div>
  );
};

// --- LIVE TICKER COMPONENT ---
const ASRLiveTicker = ({ feed = [], theme, onPlayerClick, onCourseClick }) => {
  if (!feed || feed.length === 0) return null;

  const tickerItems = [...feed, ...feed];

  return (
    <div className={`fixed top-[var(--safe-top)] left-0 w-full z-[70] h-[var(--ticker-height)] flex items-center overflow-hidden border-b transition-all duration-300 bg-black border-zinc-900 text-white opacity-100 active:opacity-100 cursor-default`}>
      <div className="animate-marquee whitespace-nowrap flex items-center gap-16 px-12">
        {tickerItems.map((item, idx) => {
          const fires = item.fireCount || 0;
          const rank = item.rank || 0;
          
          return (
            <div key={`${item.id}-${idx}`} className="flex items-center gap-0 group h-full">
              <span className={`text-[10px] sm:text-[11px] font-black italic uppercase tracking-[0.2em] flex items-center`}>
                <span className="text-white mr-3 shrink-0">{item.timeString}</span>
                
                <span className="flex items-center mr-1.5 shrink-0">
                  {rank === 1 && <span className="animate-bounce emoji-slot">🥇</span>}
                  {rank === 2 && <span className="animate-bounce emoji-slot">🥈</span>}
                  {rank === 3 && <span className="animate-bounce emoji-slot">🥉</span>}
                </span>

                <span 
                  onClick={(e) => { e.stopPropagation(); onPlayerClick(item.athlete); }}
                  className={`transition-colors cursor-pointer font-black hover:text-blue-500 mr-2 shrink-0`}
                >
                  {item.athleteName} {item.athlete?.region || ''}
                </span>
                
                <span 
                  onClick={(e) => { e.stopPropagation(); onCourseClick(item.course); }}
                  className={`font-black transition-colors cursor-pointer hover:text-blue-400 shrink-0`}
                >
                  {item.courseName}
                  {item.course?.city && item.course?.city !== 'UNKNOWN' ? `, ${item.course.city}` : ''}
                  {item.course?.flag ? <span className="emoji-slot ml-1">{item.course.flag}</span> : ''}
                </span>
                
                <span className={`${THEME.VALUE} ml-3 text-white opacity-100 text-[11px] sm:text-[12px] font-black shrink-0`}>
                  {item.result}
                </span>

                {fires > 0 && (
                  <span className="flex items-center ml-2 gap-0 shrink-0">
                    {Array.from({ length: fires }).map((_, i) => (
                      <span key={i} className="animate-pulse emoji-slot">🔥</span>
                    ))}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- COUNTDOWN TIMER COMPONENT ---
const ASRCountdownTimer = ({ className = "" }) => {
    const targetDate = useMemo(() => new Date('2026-06-01T07:00:00Z'), []);
    const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();
            
            if (difference <= 0) {
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
                clearInterval(timer);
                return;
            }

            setTimeLeft({
                d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                m: Math.floor((difference / 1000 / 60) % 60),
                s: Math.floor((difference / 1000) % 60)
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    return (
        <div className={`flex items-center gap-1 font-sans font-black tabular-nums tracking-normal ${className}`}>
            <span>{String(timeLeft.d).padStart(2, '0')}D</span>
            <span className="opacity-40">:</span>
            <span>{String(timeLeft.h).padStart(2, '0')}H</span>
            <span className="opacity-40">:</span>
            <span>{String(timeLeft.m).padStart(2, '0')}M</span>
            <span className="opacity-40">:</span>
            <span className="text-inherit">{String(timeLeft.s).padStart(2, '0')}S</span>
        </div>
    );
};

// --- MODALS ---
const ASROnboarding = ({ isOpen, onClose, theme }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setStep(0);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const steps = useMemo(() => [
    {
      title: "HOW TO START",
      desc: "Our courses are set in outdoor, public spaces. You can start anytime.",
      icon: <Compass />
    },
    {
      title: "1. Find a course",
      desc: (
        <>
          Use our map and course guides to find a course near you. Join <a href={SKOOL_LINK} target="_blank" rel="noopener noreferrer" className="underline text-inherit hover:text-blue-500 transition-colors">Apex Skool app</a> to access the latest ASR resources.
        </>
      ),
      icon: <MapPin />
    },
    {
      title: "2. Film your run",
      desc: (
        <>
          Video proof is everything. Check <a href={SKOOL_LINK} target="_blank" rel="noopener noreferrer" className="underline text-inherit hover:text-blue-500 transition-colors">Apex Skool app</a> for filming requirements and official rules to ensure that your best runs count.
        </>
      ),
      icon: <Video />
    },
    {
      title: "3. Get verified",
      desc: (
        <>
          Post your fastest runs in <a href={SKOOL_LINK} target="_blank" rel="noopener noreferrer" className="underline text-inherit hover:text-blue-500 transition-colors">Apex Skool app</a> for official review. Once verified, your stats will update and broadcast live on our website.
        </>
      ),
      icon: <ShieldCheck />,
      action: "JOIN APEX SKOOL APP"
    }
  ], []);

  if (!isOpen) return null;

  const nextStep = () => { if (step < steps.length - 1) setStep(step + 1); };
  const prevStep = () => { if (step > 0) setStep(step - 1); };

  return (
    <div 
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-3xl animate-in fade-in duration-500 ${theme === 'dark' ? 'bg-black/95' : 'bg-white/95'}`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xl rounded-[3rem] p-8 sm:p-14 border ${theme === 'dark' ? 'bg-[#050505] border-zinc-900 text-white' : 'bg-white border-slate-200 text-black'} shadow-[0_0_100px_rgba(0,0,0,0.6)] relative overflow-hidden ios-clip-fix mt-[var(--safe-top)]`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <button 
          onClick={step > 0 ? prevStep : onClose} 
          className={`absolute top-8 left-8 p-3 rounded-full transition-colors z-20 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`} 
          title={step > 0 ? "Go Back" : "Undo / Close"}
        >
          <CornerUpLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>

        <button 
          onClick={onClose} 
          className={`absolute top-8 right-8 p-3 rounded-full transition-colors z-20 ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>
        
        <div className="flex flex-col items-start text-left space-y-8 sm:space-y-10 relative z-10 pt-12 sm:pt-0 w-full">
          <div className={`self-center w-20 h-20 sm:w-28 sm:h-28 rounded-[1.8rem] sm:rounded-[2.5rem] textured-surface bg-blue-500/10 animate-subtle-pulse flex items-center justify-center shrink-0 shadow-lg`}>
            {React.cloneElement(steps[step].icon, { className: "relative z-10 w-10 h-10 sm:w-14 sm:h-14 text-blue-500" })}
          </div>
          
          <div className="space-y-5 w-full">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter italic leading-[0.9] whitespace-normal break-words text-left">
              {steps[step].title}
            </h2>
            <div className="text-lg sm:text-xl font-black opacity-70 leading-relaxed text-inherit whitespace-normal break-words w-full text-left">
              {steps[step].desc}
            </div>
          </div>
          
          <div className="flex gap-2.5 py-2 justify-start w-full">
            {steps.map((s, i) => (
              <div key={s.title} className={`h-2.5 rounded-full transition-all duration-500 ${i === step ? 'w-14 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'w-4 bg-current opacity-20'}`} />
            ))}
          </div>

          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex gap-4 w-full">
              {steps[step].action ? (
                <a 
                  href={SKOOL_LINK} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 text-xs sm:text-sm shadow-2xl whitespace-nowrap active:scale-95"
                >
                  {steps[step].action} <CornerUpRight className="w-5 h-5" strokeWidth={2.5} />
                </a>
              ) : (
                <button 
                  onClick={nextStep} 
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 text-xs sm:text-sm shadow-2xl whitespace-nowrap active:scale-95"
                >
                  Next <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 hover:opacity-100 transition-opacity"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ASRBaseModal = ({ 
  isOpen, onClose, onBack, onForward, canGoForward, onShare,
  theme, header, breadcrumbs, onBreadcrumbClick, currentIndex, children 
}) => {
  const scrollContainerRef = useRef(null);
  const historyScrollPositions = useRef({});
  const prevIndexRef = useRef(-1);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      historyScrollPositions.current = {};
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    
    // Save current scroll if we have a valid index
    if (prevIndexRef.current !== -1 && scrollContainerRef.current) {
      historyScrollPositions.current[prevIndexRef.current] = scrollContainerRef.current.scrollTop;
    }

    // Scroll to top for NEW entries (index is higher than any stored) or restored pos
    if (scrollContainerRef.current) {
        const targetScroll = historyScrollPositions.current[currentIndex] || 0;
        scrollContainerRef.current.scrollTo({ top: targetScroll, left: 0, behavior: 'auto' });
    }
    
    prevIndexRef.current = currentIndex;
  }, [currentIndex, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-xl transition-opacity duration-200" onClick={onClose}>
      <div 
        className={`${THEME.MODAL_SURFACE(theme)} border w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.7)] flex flex-col h-[calc(100dvh-28px)] sm:h-[85dvh] relative z-[130] overflow-hidden ios-clip-fix mt-[var(--safe-top)]`} 
        onClick={e => e.stopPropagation()}
      >
        <div className={`shrink-0 flex flex-col p-6 sm:p-10 pt-8 sm:pt-10 gap-6 bg-gradient-to-b ${theme === 'dark' ? 'from-zinc-900/50' : 'from-white'} to-transparent relative z-[140]`}>
          <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <button aria-label="Go Back" onClick={onBack} className="group p-3.5 sm:p-3 bg-black/30 hover:bg-black/50 active:scale-90 rounded-full text-white transition-all shrink-0" title="Go Back">
                      <CornerUpLeft className="w-5 h-5 sm:w-5 sm:h-5 text-slate-200" strokeWidth={2.5} />
                  </button>
                  {canGoForward && (
                      <button aria-label="Go Forward" onClick={onForward} className="group p-3.5 sm:p-3 bg-black/30 hover:bg-black/50 active:scale-90 rounded-full text-white transition-all shrink-0 animate-in fade-in duration-300" title="Go Forward">
                          <CornerUpRight className="w-5 h-5 sm:w-5 sm:h-5 text-slate-200" strokeWidth={2.5} />
                      </button>
                  )}
                  {breadcrumbs && breadcrumbs.length > 0 && (
                      <div className={`ml-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap px-4 py-3 rounded-full border shadow-xl shrink min-w-0 ${THEME.GLASS(theme)}`}>
                          {breadcrumbs.map((b, i) => (
                              <React.Fragment key={i}>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onBreadcrumbClick(i); }}
                                      className={`transition-colors outline-none whitespace-nowrap ${i === currentIndex ? 'opacity-100 font-black' : 'opacity-40 cursor-pointer hover:opacity-100'}`}
                                  >
                                      {String(b).toUpperCase()}
                                  </button>
                                  {i < breadcrumbs.length - 1 && <span className="opacity-30 shrink-0 mx-1">/</span>}
                              </React.Fragment>
                          ))}
                      </div>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onShare} className="p-3.5 sm:p-3 bg-black/30 hover:bg-black/50 active:scale-90 rounded-full text-white transition-all shrink-0" title="Share Link">
                    <Share size={18} strokeWidth={2.5} />
                </button>
                <button aria-label="Close Modal" onClick={onClose} className="p-3.5 sm:p-3 bg-black/30 hover:bg-black/50 active:scale-90 rounded-full text-white transition-all shrink-0" title="Close">
                    <X size={20} strokeWidth={2.5} />
                </button>
              </div>
          </div>
          <div className="w-full">{header}</div>
        </div>

        <div 
          ref={scrollContainerRef} 
          className={`flex-1 min-h-0 overflow-y-auto px-6 py-2 sm:px-12 sm:py-4 space-y-12 scrollbar-hide ${theme === 'dark' ? 'bg-[#050505]' : 'bg-white'}`}
        >
          <div className="pb-16 overflow-visible">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- INSPECTOR BODY COMPONENTS ---
const CourseDetails = ({ course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, onSetterClick }) => {
  const stats = [
    { label: 'CR (M)', value: typeof course.allTimeMRecord === 'number' ? course.allTimeMRecord.toFixed(2) : '-', icon: <Zap className="w-3.5 h-3.5" />, colorClass: theme === 'dark' ? 'text-white' : 'text-black' },
    { label: 'CR (W)', value: typeof course.allTimeFRecord === 'number' ? course.allTimeFRecord.toFixed(2) : '-', icon: <Zap className="w-3.5 h-3.5" />, colorClass: theme === 'dark' ? 'text-white' : 'text-black' },
    { label: 'Difficulty', value: course.difficulty || '-', icon: <Compass className="w-3.5 h-3.5" /> }, 
    { label: 'Players', value: String(course.totalAllTimeAthletes || 0), icon: <Users className="w-3.5 h-3.5" /> },
    { label: 'Length', value: course.length ? String(Math.round(parseFloat(course.length))) : '-', icon: <Ruler className="w-3.5 h-3.5" /> },
    { label: 'Elevation', value: course.elevation ? `${parseFloat(course.elevation).toFixed(2)}` : '-', icon: <Mountain className="w-3.5 h-3.5" /> },
    { label: 'Type', value: course.type || '-', icon: <Dna className="w-3.5 h-3.5" /> },
    { label: 'Date', value: course.dateSet || '-', icon: <Calendar className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="animate-in fade-in duration-300 space-y-12 overflow-visible">
      <div className="grid grid-cols-1 gap-12 sm:gap-14 overflow-visible">
        <ASRRankList title="MEN'S TOP 10" athletes={course.allTimeAthletesM || []} genderRecord={course.allTimeMRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
        <ASRRankList title="WOMEN'S TOP 10" athletes={course.allTimeAthletesF || []} genderRecord={course.allTimeFRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
      </div>

      <div className="space-y-6 text-left overflow-visible">
        <ASRSectionHeading theme={theme} className="!mb-0">COURSE STATS</ASRSectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-visible">
          {stats.map((s, i) => (
            <div key={i} className={`p-4 rounded-[1.5rem] border text-left flex flex-col gap-1 ${THEME.CARD(theme)} ios-clip-fix overflow-visible`}>
              <div className="flex items-center justify-between opacity-60 overflow-visible">
                <span className={`${THEME.LABEL} leading-none`}>{s.label}</span>
                {s.icon}
              </div>
              <span className={`text-[15px] sm:text-[16px] leading-tight ${THEME.VALUE} ${s.colorClass || ''}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      
      {(course.leadSetters || course.assistantsetters) && (
        <div className="space-y-6 text-left overflow-visible">
          <ASRSectionHeading theme={theme} className="!mb-0">COURSE SETTERS</ASRSectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
            {course.leadSetters && (
              <div className={`p-6 rounded-3xl border flex flex-col justify-center ${THEME.CARD(theme)} ios-clip-fix`}>
                <span className={`${THEME.HEADING_SM} mb-2`}>Leads</span>
                <div className={`text-[15px] sm:text-lg font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  <SetterDisplay text={course.leadSetters} onSetterClick={onSetterClick} />
                </div>
              </div>
            )}
            {course.assistantsetters && (
              <div className={`p-6 rounded-3xl border flex flex-col justify-center ${THEME.CARD(theme)} ios-clip-fix`}>
                <span className={`${THEME.HEADING_SM} mb-2`}>Assistants</span>
                <div className={`text-[15px] sm:text-lg font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
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
    </div>
  );
};

const PlayerDetails = ({ identity, initialRole, theme, allCourses, openRankings, atPerfs, opPerfs, openModal }) => {
  const [activeRole, setActiveRole] = useState(initialRole || 'asr-open');
  
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
        const setterCourses = (allCourses || [])
          .filter(c => isNameInList(identity.name, c.leadSetters) || isNameInList(identity.name, c.assistantsetters))
          .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));
        
        const impact = setterData.impact || setterCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);
        const setsCount = setterData.sets || setterCourses.length;

        const setterStats = [
            { l: 'LEVEL', v: String(setterData.certLevel || '-') },
            { l: 'IMPACT', v: String(Math.round(impact)), c: theme === 'dark' ? 'text-white' : 'text-black' }, 
            { l: 'SETS', v: String(setsCount) },
            { l: 'LEADS', v: String(setterData.leads || 0) },
            { l: 'ASSISTS', v: String(setterData.assists || 0) },
            { l: 'FILMS', v: String(setterData.films || 0) },
            { l: 'AVG LENGTH', v: setterData.avgLength ? String(Math.round(setterData.avgLength)) : '0' },
            { l: '🪙', v: String(Math.round(setterData.contributionScore || identity.contributionScore || 0)) }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left space-y-12 overflow-visible">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-visible">
                    {setterStats.map((s, i) => (
                      <ASRStatCard key={i} index={i} label={s.l} value={s.v} theme={theme} tooltip={s.t} colorClass={s.c} />
                    ))}
                </div>
                <div className="space-y-6 overflow-visible text-left">
                  <ASRSectionHeading theme={theme} className="!mb-0">VERIFIED SETS</ASRSectionHeading>
                  <div className="grid grid-cols-1 gap-3 overflow-visible">
                      {setterCourses.length > 0 ? setterCourses.map((c, i) => (
                        <ASRListItem 
                          key={i} variant="card" theme={theme} title={c.name} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                          icon={c.coordinates ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-2.5 rounded-xl transition-all hover:scale-125 active:scale-90 text-slate-500 hover:text-blue-600 flex items-center justify-center"
                              title="View Map"
                            >
                              <MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
                            </a>
                          ) : (
                            <div className="p-2.5 opacity-20"><MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" /></div>
                          )}
                          stats={[{ label: 'RUNS', value: String(c.totalAllTimeRuns || 0) }]}
                          videoUrl={c.demoVideo}
                          onClick={() => openModal('course', c)}
                        />
                      )) : (
                          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                            <Building2 className="w-10 h-10" /><span className="text-[10px] font-black uppercase">No verified sets found</span>
                          </div>
                      )}
                  </div>
                </div>
                <div className="pt-4"><ASRPromotionBanner type="setter" theme={theme} /></div>
            </div>
        );
    }

    const isAllTime = roleId === 'all-time';
    const perfSource = isAllTime ? (atPerfs[pKey] || []) : (opPerfs[pKey] || []);
    const metaSource = isAllTime ? identity : (identity.openStats || { rating: 0, pts: 0, runs: 0, wins: 0, openFireCount: 0 });

    const courseData = perfSource.map(cd => {
      const matched = (allCourses || []).find(c => c.name.toUpperCase() === cd.label.toUpperCase());
      return { 
        ...cd, 
        coordinates: matched?.coordinates, 
        flag: matched?.flag, 
        country: matched?.country, 
        city: matched?.city, 
        mRecord: matched?.allTimeMRecord, 
        fRecord: matched?.allTimeFRecord,
        rulesVideo: matched?.demoVideo,
        length: cleanNumeric(matched?.length) || 0
      };
    }).sort((a, b) => {
        const aGold = a.rank === 1;
        const bGold = b.rank === 1;
        if (aGold && !bGold) return -1;
        if (!aGold && bGold) return 1;
        if (aGold && bGold) return (a.num || 0) - (b.num || 0);
        return (b.points || 0) - (a.points || 0);
    });

    // Fix applied here: filter open rankings by gender and ensure they are qualified before deriving rank index
    const validOpenRankings = useMemo(() => {
        return (openRankings || [])
            .filter(p => p.gender === identity.gender && isQualifiedAthlete(p, false))
            .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [openRankings, identity.gender]);

    const currentOpenRankIndex = validOpenRankings.findIndex(p => p.pKey === pKey);
    const currentOpenRank = currentOpenRankIndex !== -1 ? currentOpenRankIndex + 1 : "UR";
    
    const runsInContext = metaSource.runs || 0;
    let isQualifiedInProfile = false;
    
    if (isAllTime) {
      isQualifiedInProfile = identity.gender === 'M' ? (runsInContext >= 4) : (runsInContext >= 3);
    } else {
      isQualifiedInProfile = runsInContext >= 3;
    }

    const currentRankValue = String(isQualifiedInProfile ? (isAllTime ? (identity.allTimeRank || "UR") : currentOpenRank) : "UR");

    const totalRunTime = courseData.reduce((sum, run) => sum + (run.num || 0), 0);
    const avgRunTime = runsInContext > 0 ? (totalRunTime / runsInContext).toFixed(2) : '0.00';
    
    const playerStats = [
        { l: 'RANK', v: String(currentRankValue) },
        { l: 'RATING', v: typeof metaSource.rating === 'number' ? metaSource.rating.toFixed(2) : '0.00', c: theme === 'dark' ? 'text-white' : 'text-black' }, 
        { l: 'POINTS', v: typeof metaSource.pts === 'number' ? metaSource.pts.toFixed(2) : '0.00' }, 
        { l: 'RUNS', v: String(runsInContext) }, 
        { l: 'WINS', v: String(metaSource.wins || 0) }, 
        { l: 'WIN %', v: ((metaSource.wins / (runsInContext || 1)) * 100).toFixed(2) }, 
        { l: 'AVG TIME', v: String(avgRunTime) },
        { l: '🔥', v: String(isAllTime ? (identity.allTimeFireCount || 0) : (identity.openStats?.openFireCount || 0)), g: 'glow-blue' }
    ];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-left space-y-12 overflow-visible">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-visible">
                {playerStats.map((s, i) => (
                  <ASRStatCard key={i} index={i} label={s.l} value={s.v} theme={theme} glowClass={s.g} tooltip={s.t} colorClass={s.c} />
                ))}
            </div>
            <div className="space-y-6 overflow-visible text-left">
              <ASRSectionHeading theme={theme} className="!mb-0">VERIFIED RUNS</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-3 overflow-visible">
                  {courseData.length > 0 ? courseData.map((c, i) => {
                      const target = (allCourses || []).find(x => x.name.toUpperCase() === c.label.toUpperCase());
                      return (
                        <ASRListItem 
                          key={i} variant="card" theme={theme} title={c.label} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                          icon={target?.coordinates ? (
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.coordinates)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-2.5 rounded-xl transition-all hover:scale-125 active:scale-90 text-slate-500 hover:text-blue-600 flex items-center justify-center"
                              title="View Map"
                            >
                              <MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
                            </a>
                          ) : (
                            <div className="p-2.5 opacity-20"><MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" /></div>
                          )}
                          stats={[{ value: (c.points || 0).toFixed(2) }, { value: (c.num || 0).toFixed(2) }]}
                          videoUrl={c.videoUrl} 
                          badgeContent={
                            <div className="flex items-center gap-0">
                              {c.rank > 0 && c.rank <= 3 && <ASRPerformanceBadge type={c.rank} />}
                              {c.fireCount > 0 && <ASRPerformanceBadge type="fire" count={c.fireCount} />}
                            </div>
                          }
                          onClick={() => { if(target) openModal('course', target); }}
                        />
                      );
                  }) : (
                      <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                          <Compass className="w-10 h-10" /><span className="text-[10px] font-black uppercase">No verified runs found</span>
                      </div>
                  )}
              </div>
            </div>
            <div className="pt-4"><ASRPromotionBanner type="coach" theme={theme} /></div>
        </div>
    );
  };

  const tabs = [
    { id: 'asr-open', label: 'OPEN' },
    { id: 'all-time', label: 'ALL-TIME' },
    { id: 'setter', label: 'SETS' }
  ];

  return (
    <div className="space-y-8 overflow-visible">
      <div className={`flex p-1.5 rounded-2xl border w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto scrollbar-hide ${THEME.GLASS(theme)} ios-clip-fix`}>
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveRole(tab.id)} 
            className={`flex-1 sm:flex-none px-6 sm:px-10 py-3 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${activeRole === tab.id ? 'btn-blue-gradient active shadow-lg' : 'opacity-70 hover:opacity-100 text-inherit hover:bg-current/[0.05]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderRoleContent(activeRole)}
    </div>
  );
};

const RegionDetails = ({ region, theme, allCourses, allPlayers, playerPerformances, openModal }) => {
  const regionalCourses = (allCourses || []).filter(c => 
      (region.type === 'city' && c.city === region.name) ||
      (region.type === 'country' && c.country === region.name) ||
      (region.type === 'continent' && c.continent === region.name)
  ).sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0));

  const totalRuns = regionalCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0);

  const regionalPlayersTotal = (allPlayers || []).filter(p => {
      if (region.type === 'city') {
          return (playerPerformances[p.pKey] || []).some(perf => {
              const matched = (allCourses || []).find(c => c.name.toUpperCase() === perf.label.toUpperCase());
              return matched?.city === region.name;
          });
      }
      const countryTerm = normalizeCountryName(region.name);
      const playerCountries = String(p.countryName || "").split(/[,\/]/).map(c => normalizeCountryName(c));
      return (region.type === 'country' && playerCountries.includes(countryTerm)) ||
             (region.type === 'continent' && playerCountries.some(pc => getContinentData(pc).name === region.name));
  });

  const regionalPlayersQualified = regionalPlayersTotal.filter(p => isQualifiedAthlete(p)).sort((a, b) => b.rating - a.rating);

  const regionalStats = [
    { label: "PLAYERS", value: String(regionalPlayersTotal.length) },
    { label: "COURSES", value: String(regionalCourses.length) },
    { label: "RUNS", value: String(totalRuns) }
  ];

  return (
    <div className="space-y-12 overflow-visible">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-visible">
          {regionalStats.map((s, i) => (
            <ASRStatCard key={i} index={i} label={s.label} value={s.value} theme={theme} />
          ))}
      </div>
      <div className="space-y-12 text-left overflow-visible">
          <div className="space-y-6 overflow-visible text-left">
              <ASRSectionHeading theme={theme} className="!mb-0">TOP PLAYERS</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-3 overflow-visible">
                  {regionalPlayersQualified.length > 0 ? regionalPlayersQualified.slice(0, 10).map((p, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} rank={i + 1} title={p.name} subtitle={p.region}
                        stats={[{ value: typeof p.rating === 'number' ? p.rating.toFixed(2) : '0.00' }]}
                        onClick={() => openModal('player', p)}
                      />
                  )) : (
                    <div className="py-12 text-center opacity-30 flex flex-col items-center gap-4">
                        <Users className="w-8 h-8" /><span className="text-[10px] font-black uppercase">No ranked players found</span>
                    </div>
                  )}
              </div>
          </div>
          <div className="space-y-6 overflow-visible text-left">
              <ASRSectionHeading theme={theme} className="!mb-0">TOP COURSES</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-3 overflow-visible">
                  {regionalCourses.slice(0, 10).map((c, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} title={c.name} subtitle={`${c.city || 'Unknown'} ${c.flag}`}
                        icon={c.coordinates ? (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-2.5 rounded-xl transition-all hover:scale-125 active:scale-90 text-slate-500 hover:text-blue-600 flex items-center justify-center"
                            title="View Map"
                          >
                            <MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" strokeWidth={2.5} />
                          </a>
                        ) : (
                          <div className="p-2.5 opacity-20"><MapPin className="w-[18px] h-[18px] sm:w-[20px] sm:h-[20px]" /></div>
                        )}
                        stats={[{ label: 'RUNS', value: String(c.totalAllTimeRuns || 0) }]}
                        videoUrl={c.demoVideo}
                        onClick={() => openModal('course', c)}
                      />
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

const TeamDetails = ({ team, theme, openModal, settersWithImpact }) => {
  // Sort by pts and take top 20
  const topPlayers = [...(team.players || [])]
    .sort((a, b) => (b.pts || 0) - (a.pts || 0))
    .slice(0, 20);
  
  const avgPts = (team.runs && team.runs > 0) ? (team.pts / team.runs).toFixed(2) : "0.00";

  // Calculate team setters
  const teamPlayerNames = new Set((team.players || []).map(p => normalizeName(p.name)));
  const teamSetters = (settersWithImpact || [])
      .filter(s => teamPlayerNames.has(normalizeName(s.name)) || normalizeName(s.homeGym) === normalizeName(team.name))
      .sort((a, b) => (b.impact || 0) - (a.impact || 0))
      .slice(0, 10);

  const teamStats = [
    { label: "PLAYERS", value: String(team.players?.length || 0) },
    { label: "POINTS", value: typeof team.pts === 'number' ? team.pts.toFixed(2) : "0.00", colorClass: theme === 'dark' ? 'text-white' : "text-black" },
    { label: "AVG POINTS", value: avgPts },
    { label: "RUNS", value: String(team.runs || 0) }
  ];

  const medalStats = [
      { label: "🥇", value: String(team.medals?.gold || 0) },
      { label: "🥈", value: String(team.medals?.silver || 0) },
      { label: "🥉", value: String(team.medals?.bronze || 0) },
      { label: "🔥", value: String(team.fires || 0), colorClass: "text-blue-500" }
  ];

  return (
    <div className="space-y-12 overflow-visible">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-visible">
          {teamStats.map((s, i) => (
            <ASRStatCard key={i} index={i} label={s.label} value={s.value} theme={theme} colorClass={s.colorClass} />
          ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-visible">
          {medalStats.map((s, i) => (
            <ASRStatCard key={i} index={i} label={s.label} value={s.value} theme={theme} colorClass={s.colorClass} />
          ))}
      </div>
      
      <div className="space-y-12 overflow-visible text-left">
          <div className="space-y-6 overflow-visible text-left">
              <ASRSectionHeading theme={theme} className="!mb-0">TOP 20 PLAYERS</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-3 overflow-visible">
                  {topPlayers.map((p, i) => (
                      <ASRListItem 
                        key={i} variant="card" theme={theme} rank={i + 1} title={p.name} subtitle={p.region}
                        stats={[{ value: (p.pts || 0).toFixed(2) }]}
                        onClick={() => openModal('player', p)}
                      />
                  ))}
                  {topPlayers.length === 0 && (
                    <div className="py-12 text-center opacity-30 flex flex-col items-center gap-4">
                      <Users className="w-8 h-8" /><span className="text-[10px] font-black uppercase">No players found in this team</span>
                    </div>
                  )}
              </div>
          </div>
          
          <div className="space-y-6 text-left overflow-visible">
              <ASRSectionHeading theme={theme} className="!mb-0">TOP 10 SETTERS</ASRSectionHeading>
              <div className="grid grid-cols-1 gap-3 overflow-visible">
                  {teamSetters.map((s, i) => (
                      <ASRListItem 
                        key={`setter-${i}`} variant="card" theme={theme} rank={i + 1} title={s.name} subtitle={s.region}
                        stats={[{ value: String(Math.round(s.impact || 0)) }]}
                        onClick={() => openModal('setter', s)}
                      />
                  ))}
                  {teamSetters.length === 0 && (
                    <div className="py-12 text-center opacity-30 flex flex-col items-center gap-4">
                      <Waypoints className="w-8 h-8" /><span className="text-[10px] font-black uppercase">No setters found in this team</span>
                    </div>
                  )}
              </div>
          </div>
      </div>
    </div>
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
      const targetRole = activeModal.roleOverride || (activeModal.type === 'player' ? 'asr-open' : 'setter');
      
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
    case 'course': {
      const richCourse = allCourses.find(c => c.name.toUpperCase() === activeModal.data.name?.toUpperCase()) || activeModal.data;
      
      return (
        <CourseDetails 
          course={richCourse} 
          theme={theme} 
          athleteMetadata={atMet} 
          athleteDisplayNameMap={dnMap} 
          onPlayerClick={(p) => openModal('player', p)} 
          onSetterClick={onSetterClick} 
        />
      );
    }
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
    case 'team':
      return (
        <TeamDetails 
          team={activeModal.data} 
          theme={theme} 
          openModal={openModal} 
          settersWithImpact={settersWithImpact}
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
    atRawBest: {}, opRawBest: {}, recentFeed: [],
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
    const SPREADSHEET_ID = '1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4';
    
    const getDocsUrl = (gid) => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&cb=${cacheBucket}`;

    const safeFetch = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) { return null; } 
    };

    try {
      const [rM, rF, rLive, rSet] = await Promise.all([
        safeFetch(getDocsUrl('595214914')), 
        safeFetch(getDocsUrl('566627843')), 
        safeFetch(getDocsUrl('623600169')), 
        safeFetch(getDocsUrl('1961325686'))
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
        avg: ['avg time', 'average', 'avg'],
        cert: ['cert', 'level', 'certification'],
        location: ['location', 'city', 'region', 'hometown'], 
        homeGym: ['gym', 'home gym']
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
        contribution: ['🪙', 'contribution'],
        cert: ['cert', 'level', 'certification'],
        location: ['location', 'city'],
        homeGym: ['gym', 'home gym']
      };

      const LIVE_FEED_MAPPING = {
        athlete: ['athlete', 'name', 'player'],
        course: ['course', 'track', 'level'],
        result: ['result', 'time', 'pb'],
        gender: ['div', 'gender', 'sex'],
        date: ['date', 'day', 'timestamp'],
        tag: ['tag', 'event', 'category', 'season'],
        proof: ['proof', 'link', 'video', 'url'],
        fire: ['🔥'],
        filmer: ['filmer', 'videographer', 'filmed by']
      };

      const processRankingData = (csv, gender) => {
        const dataRows = csvToObjects(csv, RANKING_MAPPING);
        return dataRows.map((vals, i) => {
          const pName = (vals.name || "").trim();
          if (pName.length < 2 || isPlaceholderPlayer(pName)) return null; 
          
          const fixed = fixCountryEntity(vals.country, vals.flag);
          const rawIg = (vals.ig || "").replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\?.*/, '').replace(/@/g, '').replace(/\/$/, '').trim();
          
          const pLocation = vals.__raw ? (vals.__raw[18] || "").trim() : (vals.location || "").trim();
          const pHomeGym = vals.__raw ? (vals.__raw[20] || "").trim() : (vals.homeGym || "").trim();
          const pTeamLocation = vals.__raw ? (vals.__raw[21] || "").trim() : ""; 

          const townFlagRaw = vals.__raw ? (vals.__raw[19] || "").trim() : "";
          const gymFlagRaw = vals.__raw ? (vals.__raw[22] || "").trim() : "";
          
          const townEntity = fixCountryEntity("", townFlagRaw);
          const gymEntity = fixCountryEntity("", gymFlagRaw);

          const searchKey = `${pName} ${fixed.name} ${rawIg} ${pLocation} ${pHomeGym}`.toLowerCase();
          return { 
            id: `${gender}-${normalizeName(pName)}-${i}`, 
            name: pName, pKey: normalizeName(pName), gender, 
            countryName: fixed.name, 
            region: fixed.flag, 
            location: pLocation,
            homeGym: pHomeGym,
            teamLocation: pTeamLocation, 
            townFlag: townEntity.flag,
            gymFlag: gymEntity.flag,
            igHandle: rawIg,
            rating: cleanNumeric(vals.rating) || 0, 
            runs: Math.floor(cleanNumeric(vals.runs) || 0), 
            wins: Math.floor(cleanNumeric(vals.wins) || 0), 
            pts: cleanNumeric(vals.pts) || 0, 
            sets: Math.floor(cleanNumeric(vals.sets) || 0), 
            contributionScore: cleanNumeric(vals.contribution) || 0, 
            allTimeFireCount: Math.floor(cleanNumeric(vals.fire) || 0),
            avgTime: cleanNumeric(vals.avg) || 0,
            certLevel: (vals.cert || "").trim().toUpperCase(),
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
                  const valAG = vals.__raw ? String(vals.__raw[32] || "").toUpperCase().trim() : "";
                  const rulesVideoFromCol = vals.__raw ? String(vals.__raw[31] || "").trim() : "";
                  const sponsorName = vals.__raw ? (vals.__raw[34] || "").trim() : "";
                  const sponsorLink = vals.__raw ? (vals.__raw[35] || "").trim() : "";
                  
                  const is2026 = valAG === 'YES' || valAG === 'TRUE' || valAG.includes('OPEN');
                  map[course] = { 
                      is2026, flag: fixed.flag || '🏳️',
                      city: (vals.city || "").trim().toUpperCase() || "UNKNOWN", 
                      stateProv: (vals.state || "").trim().toUpperCase(),
                      country: fixed.name.toUpperCase() || "UNKNOWN", 
                      difficulty: (vals.rating || "").trim(),
                      length: (vals.length || "").trim(),
                      elevation: (vals.elevation || "").trim(),
                      type: (vals.type || "").trim(),
                      dateSet: (vals.dateSet || "").trim(),
                      setter: (vals.leads || "") + ((vals.assists) ? `, ${vals.assists}` : ""),
                      leadSetters: (vals.leads || "").trim(),
                      assistantsetters: (vals.assists || "").trim(),
                      demoVideo: rulesVideoFromCol || (vals.demo || "").trim(),
                      coordinates: (vals.coords || "").trim(),
                      sponsorName,
                      sponsorLink,
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
              if (!name || isPlaceholderPlayer(name)) return null;
              const fixed = fixCountryEntity(vals.country, vals.flag);
              
              const pLocation = vals.__raw ? (vals.__raw[18] || "").trim() : (vals.location || "").trim();
              const pHomeGym = vals.__raw ? (vals.__raw[20] || "").trim() : (vals.homeGym || "").trim();

              const townFlagRaw = vals.__raw ? (vals.__raw[19] || "").trim() : "";
              const gymFlagRaw = vals.__raw ? (vals.__raw[22] || "").trim() : "";
              const townEntity = fixCountryEntity("", townFlagRaw);
              const gymEntity = fixCountryEntity("", gymFlagRaw);

              return {
                  id: `setter-${normalizeName(name)}-${i}`,
                  name: name.trim(),
                  region: fixed.flag || '🏳️',
                  location: pLocation,
                  homeGym: pHomeGym,
                  townFlag: townEntity.flag,
                  gymFlag: gymEntity.flag,
                  countryName: fixed.name,
                  igHandle: (vals.ig || "").replace(/@/g, '').trim(),
                  sets: cleanNumeric(vals.sets) || 0,
                  leads: cleanNumeric(vals.leads) || 0,
                  assists: cleanNumeric(vals.assists) || 0,
                  contributionScore: cleanNumeric(vals.contribution) || 0,
                  certLevel: (vals.cert || "").trim().toUpperCase(),
                  searchKey: `${name} ${fixed.name} ${pLocation} ${pHomeGym}`.toLowerCase()
              };
          }).filter(Boolean);
      };

      const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
        const result = { 
          allTimePerformances: {}, openPerformances: {}, openRankings: [], 
          allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, 
          athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, 
          atRawBest: {}, opRawBest: {}, filmerCredits: {}, recentFeed: []
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
        const filmerCreditsCount = {};
        
        dataRows.forEach(vals => {
          const pName = (vals.athlete || "").trim();
          const rawCourse = (vals.course || "").trim();
          const numericValue = cleanNumeric(vals.result);
          if (!pName || !rawCourse || numericValue === null) return;

          const rawGenderValue = (vals.gender || "").toUpperCase().trim();
          const baseKey = normalizeName(pName);
          const pGender = athleteMetadata[baseKey]?.gender || 
                          ((rawGenderValue.startsWith('W') || rawGenderValue.startsWith('F')) ? 'F' : 'M');

          let pKey = baseKey;
          if (isPlaceholderPlayer(pName)) {
            pKey = `${baseKey}-${pGender.toLowerCase()}`;
          }

          const normC = rawCourse.toUpperCase();
          const isCourseOpen = courseSetMap[normC]?.is2026;
          
          if (!athleteDisplayNameMap[pKey]) athleteDisplayNameMap[pKey] = pName;

          const rawFilmer = (vals.filmer || (vals.__raw && vals.__raw[8]) || "").trim();
          if (rawFilmer) {
            const filmerKey = normalizeName(rawFilmer);
            filmerCreditsCount[filmerKey] = (filmerCreditsCount[filmerKey] || 0) + 1;
          }
          
          if (!athleteMetadata[pKey]) {
              athleteMetadata[pKey] = { pKey, name: pName, gender: pGender, region: '🏳️', location: '', homeGym: '', teamLocation: '', countryName: '', searchKey: pName.toLowerCase() };
          } else if (pName.length > (athleteMetadata[pKey].name || "").length) {
              athleteMetadata[pKey].name = pName;
              athleteDisplayNameMap[pKey] = pName;
          }

          if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
          if (!allTimeAthleteBestTimes[pKey][normC] || numericValue < allTimeAthleteBestTimes[pKey][normC].num) {
            allTimeAthleteBestTimes[pKey][normC] = { label: rawCourse, value: vals.result, num: numericValue, videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "" };
          }
          if (!allTimeCourseLeaderboards[pGender][normC]) allTimeCourseLeaderboards[pGender][normC] = {};
          if (!allTimeCourseLeaderboards[pGender][normC][pKey] || numericValue < allTimeCourseLeaderboards[pGender][normC][pKey]) {
              allTimeCourseLeaderboards[pGender][normC][pKey] = numericValue;
          }
          const runDate = vals.date ? new Date(vals.date) : null;
          const isASROpenTag = (vals.tag || "").toUpperCase().includes("OPEN");
          const isInOpenWindow = runDate && !isNaN(runDate.getTime()) && runDate >= OPEN_START && runDate <= OPEN_END;
          
          if ((isASROpenTag || isInOpenWindow) && isCourseOpen) {
            if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
            if (!openAthleteBestTimes[pKey][normC] || numericValue < openAthleteBestTimes[pKey][normC].num) {
              openAthleteBestTimes[pKey][normC] = { label: rawCourse, value: vals.result, num: numericValue, videoUrl: vals.proof || (vals.__raw && vals.__raw[7]) || "" };
            }
            if (!openCourseLeaderboards[pGender][normC]) openCourseLeaderboards[pGender][normC] = {};
            if (!openCourseLeaderboards[pGender][normC][pKey] || numericValue < openCourseLeaderboards[pGender][normC][pKey]) {
                openCourseLeaderboards[pGender][normC][pKey] = numericValue;
            }
            openAthleteSetCount[pKey] = (openAthleteSetCount[pKey] || 0) + 1;
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
              athleteMetadata[pKey].films = filmerCreditsCount[pKey] || 0;
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
        result.opRawBest = openAthleteSetCount;
        result.filmerCredits = filmerCreditsCount;
        
        const chronologicalRuns = [...dataRows].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA; 
        }).slice(0, 20); 

        result.recentFeed = chronologicalRuns.map((run, i) => {
          const pName = (run.athlete || "").trim();
          const normC = (run.course || "").trim().toUpperCase();
          const numericValue = cleanNumeric(run.result);
          const pKey = normalizeName(pName);
          const athleteMeta = athleteMetadata[pKey];
          const pGender = athleteMeta?.gender || 'M';
          
          const courseRecords = (allTimeCourseLeaderboards[pGender] || {})[normC] || {};
          const sortedResults = Object.entries(courseRecords).sort((a, b) => a[1] - b[1]);
          const runRank = sortedResults.findIndex(entry => entry[1] === numericValue) + 1;
          const fireCount = getFireCountForRun(numericValue, pGender);
          
          return {
            id: `feed-${i}`,
            athleteName: pName,
            athlete: athleteMeta,
            courseName: run.course,
            course: { name: run.course, ...(courseSetMap[normC] || {}) },
            result: run.result,
            isCR: runRank === 1 && !isPlaceholderPlayer(pName),
            rank: runRank,
            fireCount: fireCount,
            timeString: run.date || 'LATEST'
          };
        });

        result.openRankings = Object.keys(athleteMetadata)
          .filter(k => !isPlaceholderPlayer(athleteMetadata[k].name))
          .map(pKey => {
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
      
      const allSetters = [...processSettersData(rM || ""), ...processSettersData(rF || "")] ;
      const nextState = {
        data: [...pM, ...pF], openData: processed.openRankings, atPerfs: processed.allTimePerformances,
        opPerfs: processed.openPerformances, lbAT: processed.allTimeLeaderboards, lbOpen: processed.openLeaderboards,
        atMet: processed.athleteMetadata, dnMap: processed.athleteDisplayNameMap, cMet: processed.courseMetadata,
        settersData: allSetters, atRawBest: processed.atRawBest, opRawBest: processed.opRawBest,
        recentFeed: processed.recentFeed,
        isLoading: false, hasError: hasTotalError, hasPartialError
      };
      
      setState(nextState);
      try {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(nextState));
      } catch (storageError) {
        console.warn("Could not write cache to localStorage (Quota exceeded?).", storageError);
      }
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
    if (sortConfig && sortConfig.key) {
      const dir = sortConfig.direction === 'ascending' ? 1 : -1;
      processed.sort((a, b) => robustSort(a, b, sortConfig.key, dir));
    }
    return processed;
  }, [source, searchTerm, sortConfig, predicate]);
};

const getAggregatedStats = (rawCourseList, groupBy, dnMap = {}) => {
    const map = {};
    (rawCourseList || []).forEach(c => {
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
        (c.athletesMAll || []).forEach(a => { if(!isPlaceholderPlayer(dnMap[a[0]] || a[0])) entry.playersSet.add(a[0]); });
        (c.athletesFAll || []).forEach(a => { if(!isPlaceholderPlayer(dnMap[a[0]] || a[0])) entry.playersSet.add(a[0]); });
    });
    return Object.values(map)
        .map(item => ({ ...item, players: item.playersSet.size }))
        .sort((a, b) => b.courses - a.courses);
};

const calculateHofStats = (data, atPerfs, lbAT, atMet, medalSort, settersWithImpact) => {
    try {
        if (!data || !data.length) return null;
        
        const qualifiedAthletes = data.filter(p => isQualifiedAthlete(p, true)).map(p => { 
            const performances = atPerfs?.[p.pKey] || []; 
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
            const filteredEntries = Object.entries(athletes).filter(([pKey]) => {
              const name = atMet[pKey]?.name || pKey;
              return !isPlaceholderPlayer(name);
            });
            const sorted = filteredEntries.sort((a,b) => a[1]-b[1]);
            
            sorted.slice(0, 3).forEach(([pKey, time], rankIdx) => {
              const athlete = atMet[pKey] || {};
              const names = String(athlete.countryName || "").split(/[,\/]/).map(s => s.trim().toUpperCase()).filter(Boolean);
              if (names.length === 0) names.push("UNKNOWN");
              const flags = String(athlete.region || "").match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g) || [athlete.region || '🏳️'];
              names.forEach((name, i) => {
                const fixed = fixCountryEntity(name, flags[i] || flags[0]);
                if (!medalsBase[fixed.name]) medalsBase[fixed.name] = { name: fixed.name, flag: fixed.flag, gold: 0, silver: 0, bronze: 0, total: 0 };
                if (rankIdx === 0) medalsBase[fixed.name].gold++; 
                else if (rankIdx === 1) medalsBase[fixed.name].silver++; 
                else medalsBase[fixed.name].bronze++;
                 medalsBase[fixed.name].total++;
              });
            });
          });
        };
        
        processMedals(lbAT?.M); processMedals(lbAT?.F);
        
        const sortedMedalCount = Object.values(medalsBase)
            .sort((a,b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze)
            .map((c, i) => ({ ...c, displayRank: i + 1 }));
        
        if (medalSort && medalSort.key) {
            const dir = medalSort.direction === 'ascending' ? 1 : -1;
            sortedMedalCount.sort((a, b) => robustSort(a, b, medalSort.key, dir));
        }

        return { 
            medalCount: sortedMedalCount, 
            topStats: { 
                rating: [...qualifiedAthletes].sort((a,b) => b.rating - a.rating).slice(0, 10), 
                runs: [...qualifiedAthletes].sort((a,b) => b.runs - a.runs).slice(0, 10), 
                winPercentage: [...qualifiedAthletes].sort((a,b) => b.winPercentage - a.winPercentage || b.runs - a.runs).slice(0, 10),
                wins: [...qualifiedAthletes].sort((a,b) => b.wins - a.wins).slice(0, 10), 
                impact: [...(settersWithImpact || [])].sort((a,b) => b.impact - a.impact).slice(0, 10),
                sets: [...(settersWithImpact || [])].sort((a,b) => b.sets - a.sets).slice(0, 10), 
                contributionScore: [...qualifiedAthletes].sort((a,b) => b.contributionScore - a.contributionScore).slice(0, 10), 
                totalFireCount: [...qualifiedAthletes].sort((a,b) => (b.allTimeFireCount || 0) - (a.allTimeFireCount || 0)).slice(0, 10)
            }
        };
    } catch (e) {
        console.error("HOF stats calculation failed", e);
        return null;
    }
};

const ASRGlobalMap = ({ courses, continents: conts, cities, countries, theme, onCourseClick, onCountryClick, onCityClick, onContinentClick }) => {
    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const clusterGroupRef = useRef(null);
    const tileLayerRef = useRef(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('continents');
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        let isMounted = true;
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
                if (isMounted) setIsScriptsLoaded(true);
            } catch (err) { console.error("Map scripts failed to load", err); }
        };
        loadAll();
        return () => { isMounted = false; };
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
                        className: 'asr-cluster', iconSize: window.L.point(40, 40)
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
        (courses || []).forEach(c => {
            if (!c.parsedCoords) return;
            const marker = window.L.marker(c.parsedCoords, {
                icon: window.L.divIcon({
                    html: `
                      <div class="asr-marker-pin-wrap">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#2563EB" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="2.2" fill="#fff"/></svg>
                      </div>
                    `,
                    className: '', iconSize: [24, 24], iconAnchor: [12, 24]
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
    
    const mapPillStyle = `px-6 py-3.5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all border-[2.5px] border-white shadow-2xl backdrop-blur-md ${theme === 'dark' ? 'bg-zinc-950/80 text-slate-100' : 'bg-white/90 text-slate-900'}`;

    if (!isScriptsLoaded) {
        return (
            <div className={`w-full h-[60vh] sm:h-[75vh] flex flex-col items-center justify-center rounded-3xl border shadow-premium ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900 text-white' : 'bg-slate-100 border-slate-200 text-black'}`}>
                <div className="animate-spin opacity-70 mb-4"><ChevronsRight className="w-6 h-6 text-blue-600" strokeWidth={2.5} style={{ transform: 'skewX(-18deg)' }} /></div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse opacity-70">ACCESSING ASR MAP SOURCE...</div>
            </div>
        );
    }

    return (
        <div id="asr-map-container" className={`relative w-full h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border ${theme === 'dark' ? 'border-zinc-900' : 'border-slate-200'}`}>
            <div ref={mapContainerRef} className="w-full h-full z-[10]" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40] pointer-events-none">
              <button onClick={handleFindMe} className={`${mapPillStyle} pointer-events-auto hover:bg-blue-600/10 hover:scale-105 active:scale-95 whitespace-nowrap`}>
                <Navigation size={12} className={`mr-2 inline ${isLocating ? 'animate-spin' : ''}`} /> FIND COURSE NEAR ME
              </button>
            </div>
            <div className="absolute top-4 left-4 z-[40] flex flex-col gap-2 items-start pointer-events-none w-full max-w-[280px] sm:max-w-xs">
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className={`${mapPillStyle} pointer-events-auto w-fit flex items-center gap-2 hover:bg-blue-600/10 active:scale-95 whitespace-nowrap`}>
                    <MapPin size={12} /> {isPanelOpen ? 'HIDE' : `COURSES (${courses.length})`}
                </button>
                <div className={`pointer-events-auto flex flex-col transition-all duration-300 origin-top-left overflow-hidden rounded-[2rem] border-[2.5px] border-white backdrop-blur-xl shadow-2xl w-[280px] sm:w-[320px] ${isPanelOpen ? 'scale-100 opacity-100 max-h-[70vh]' : 'scale-95 opacity-0 h-0 border-transparent'} ${theme === 'dark' ? 'bg-black/95 text-white' : 'bg-white/98 text-black'} ios-clip-fix`}>
                    <div className={`flex items-center p-2 border-b shrink-0 gap-1 bg-current/[0.03] ${theme === 'dark' ? 'border-zinc-800' : 'border-slate-200'}`}>
                        {['continents', 'countries', 'cities'].map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-tighter rounded-lg transition-all ${activeTab === t ? 'bg-blue-600 text-white' : 'opacity-50'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-0.5 p-3 overflow-y-auto scrollbar-hide h-[400px]">
                        {displayData.slice(0, 40).map((c, i) => (
                            <div key={i} onClick={() => { jumpToLocation(c); if(activeTab === 'cities') onCityClick(c); else if(activeTab === 'countries') onCountryClick(c); else onContinentClick(c); }} className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                                 <div className="flex items-center gap-3 min-w-0 pr-2 text-left">
                                    <div className="scale-90 origin-left shrink-0"><ASRRankBadge rank={i + 1} theme={theme} /></div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-tight whitespace-normal break-words transition-colors ${theme === 'dark' ? 'text-white' : 'text-black'} group-hover:text-blue-500`}>
                                          {c.name} <span className="emoji-slot opacity-80">{c.flag}</span>
                                        </span>
                                    </div>
                                 </div>
                                 <span className={`text-sm sm:text-[18px] tracking-tight font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-black'} tabular-nums`}>{c.courses}</span>
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
    const names = String(text).split(/[,&/]| and /i).map(n => n.trim()).filter(Boolean);
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {names.map((n, index) => (
                <React.Fragment key={index}>
                    <span 
                        onClick={() => onSetterClick && onSetterClick(n)} 
                        className={onSetterClick ? "cursor-pointer hover:text-blue-500 transition-colors underline decoration-blue-500/30 underline-offset-4" : ""}
                    >{n}</span>{index < names.length - 1 && <span className="opacity-40">,</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

const ASRRankList = ({ title, athletes, genderRecord, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick }) => {
    const displayAthletes = [...(athletes || []).slice(0, 10)];
    while (displayAthletes.length < 3) displayAthletes.push(null);
    return (
        <div className="space-y-4 overflow-visible text-left">
            <ASRSectionHeading theme={theme} className="!mb-0">{title}</ASRSectionHeading>
            <div className="grid grid-cols-1 gap-3 overflow-visible">
                {displayAthletes.map((athleteRow, i) => {
                    if (!athleteRow) {
                        return (
                            <div key={`empty-${i}`} className={`flex items-center justify-between p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border opacity-30 ${THEME.CARD(theme)} ios-clip-fix h-auto min-h-[72px] sm:min-h-[80px]`}>
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
                    const meta = (athleteMetadata || {})[pKey] || {};
                    const nameToDisplay = (athleteDisplayNameMap || {})[pKey] || pKey;
                    const isPlaceholder = isPlaceholderPlayer(nameToDisplay);
                    const points = genderRecord && typeof time === 'number' && time !== 0 ? (genderRecord / time) * 100 : 0;
                    
                    const fireCount = getFireCountForRun(time, meta.gender);
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    const fireArray = fireCount > 0 ? Array(fireCount).fill("🔥") : [];
                    
                    const emojiLine = (
                      <div className="flex items-center gap-0">
                        {meta.region && <span className="emoji-slot">{formatFlagsWithSpace(meta.region)}</span>}
                        {medal && <span className="emoji-slot">{medal}</span>}
                        {fireArray.map((f, idx) => <span key={idx} className="emoji-slot">{f}</span>)}
                      </div>
                    );

                    return (
                        <ASRListItem 
                          key={pKey} variant="card" theme={theme} rank={i + 1} title={nameToDisplay} subtitle={emojiLine}
                          stats={[{ value: typeof time === 'number' ? String(time.toFixed(2)) : '0.00' }, { value: typeof points === 'number' ? String(points.toFixed(2)) : '0.00' }]}
                          videoUrl={videoUrl}
                          onClick={isPlaceholder ? null : () => onPlayerClick?.({ ...meta, pKey, name: nameToDisplay })}
                        />
                    );
                })}
            </div>
        </div>
    );
};

const ASRSearchInput = ({ search, setSearch, gen, setGen, theme, view, mapMode, setMapMode }) => {
  return (
    <div className="w-full flex flex-col mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center gap-2 sm:gap-4 w-full">
            <div className="flex-1 relative group w-full">
                <div className={`absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'} group-focus-within:text-blue-600 shrink-0`}>
                    <Search size={18} strokeWidth={2.5} />
                </div>
                <input 
                  type="text" 
                  aria-label="Search" 
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={search || ''} 
                  onChange={e => setSearch(e.target.value)}
                  placeholder=""
                  className={`rounded-[1.5rem] sm:rounded-[2.2rem] pl-12 sm:pl-16 pr-10 sm:pr-12 py-3.5 sm:py-4 w-full font-black uppercase tracking-widest outline-none border-2 transition-all search-bubble ${THEME.INPUT(theme)} placeholder:text-zinc-500/50`}
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-inherit">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                )}
            </div>
            {view === 'players' && (
                <div className={`flex items-center p-1.5 rounded-[1.4rem] sm:rounded-[2.4rem] border-2 shrink-0 ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'} ios-clip-fix`}>
                    <div className="flex gap-1">
                        {[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (
                            <button key={g.id} onClick={() => setGen(g.id)} className={`px-4 sm:px-10 py-2 sm:py-3.5 rounded-lg sm:rounded-2xl text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all active:scale-90 ${gen === g.id ? 'btn-blue-gradient active shadow-lg' : 'opacity-40 hover:opacity-100 text-inherit hover:bg-current/[0.05]'}`}>
                              {g.l}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {view === 'map' && (
                <div className={`flex items-center p-1.5 rounded-[1.4rem] sm:rounded-[2.4rem] border-2 shrink-0 ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900 shadow-2xl' : 'bg-white border-slate-200 shadow-xl'} ios-clip-fix`}>
                    <div className="flex gap-1">
                        <button 
                          onClick={() => setMapMode('map')} 
                          className={`px-4 sm:px-10 py-2 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all active:scale-90 ${mapMode === 'map' ? 'btn-blue-gradient active shadow-lg' : 'opacity-40 hover:opacity-100 text-inherit hover:bg-current/[0.05]'}`}
                          title="View / Map Mode"
                        >
                          <MapIcon size={16} />
                        </button>
                        <button 
                          onClick={() => setMapMode('list')} 
                          className={`px-4 sm:px-10 py-2 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all active:scale-90 ${mapMode === 'list' ? 'btn-blue-gradient active shadow-lg' : 'opacity-40 hover:opacity-100 text-inherit hover:bg-current/[0.05]'}`}
                          title="List View"
                        >
                          <List size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

// --- HOF COMPONENT ---
const ASRHallOfFame = ({ stats, theme, onPlayerClick, onSetterClick, onRegionClick, medalSort, setMedalSort }) => {
  const highlightColor = theme === 'dark' ? 'text-white' : 'text-black';

  const MedalHeader = ({ l, k, a = 'left', w = "", sortable = true }) => {
    const isActive = medalSort.key === k;
    return (
      <th 
        className={`${w} px-2 sm:px-4 py-8 ${sortable ? 'group cursor-pointer' : 'cursor-default'} select-none transition-all ${sortable && isActive ? 'bg-current/[0.08]' : (sortable ? 'hover:bg-current/[0.05]' : '')} border-b-2 border-transparent`}
        onClick={() => sortable && setMedalSort(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}
      >
        <div className={`flex items-center gap-2.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
          <span className="uppercase text-[10px] sm:text-[12px] font-black">{l}</span>
          {sortable && (
            <div className={`transition-all duration-300 shrink-0 ${isActive ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-60'}`}>
              <ChevronDown size={16} strokeWidth={3} className={`${isActive && medalSort.direction === 'ascending' ? 'rotate-180' : ''}`} />
            </div>
          )}
        </div>
      </th>
    );
  };

  if (!stats || !stats.topStats) {
      return (
          <div className="flex flex-col items-center justify-center py-40 opacity-30 text-center animate-pulse">
              <Trophy size={56} className="mb-6" />
              <h3 className="text-xl font-black uppercase tracking-[0.3em]">SCANNING FOR RECORDS...</h3>
          </div>
      );
  }

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-32 text-left overflow-visible">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-visible">
        {[
          { l: 'TOP RATING', k: 'rating' },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'HIGHEST WIN %', k: 'winPercentage' },
          { l: 'MOST RECORDS', k: 'wins' },
          { l: 'MOST 🪙', k: 'contributionScore' },
          { l: 'MOST 🔥', k: 'totalFireCount' },
          { l: 'MOST IMPACT', k: 'impact' },
          { l: 'MOST SETS', k: 'sets' }
        ].map((sec, gridIdx) => (
            <div key={sec.k} className={`stat-card-container relative rounded-[2.2rem] border flex flex-col overflow-visible ${THEME.CARD(theme)} ios-clip-fix`}>
              <div className={`p-5 border-b border-inherit overflow-visible group h-14 sm:h-16 flex items-center`}>
                <ASRStatCard isHeader label={sec.l} theme={theme} index={gridIdx} />
              </div>
              <div className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-900/30' : 'divide-slate-200'} overflow-visible`}>
                {(stats.topStats[sec.k] || []).map((p, i) => (
                  <div 
                    key={i} 
                    className={`group flex items-center justify-between p-4 transition-colors cursor-pointer active:scale-95 ${theme === 'dark' ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.05]'}`} 
                    onClick={() => ['impact', 'sets'].includes(sec.k) ? onSetterClick(p) : onPlayerClick(p, 'all-time')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        ['impact', 'sets'].includes(sec.k) ? onSetterClick(p) : onPlayerClick(p, 'all-time');
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 text-left min-w-0 pr-2">
                      <ASRRankBadge rank={i + 1} theme={theme} />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="text-[11px] sm:text-[15px] font-black uppercase whitespace-normal break-words group-hover:text-blue-500 transition-colors leading-tight">{p.name}</span>
                        <span className="text-xs sm:text-sm mt-0.5 opacity-80">{formatFlagsWithSpace(p.region)}</span>
                      </div>
                    </div>
                    
                    <span className={`text-[13px] sm:text-[18px] tracking-tight ${highlightColor} ${THEME.VALUE} transition-colors shrink-0`}>
                      {sec.k === 'rating' ? (p.rating?.toFixed(2) || '0.00') : 
                      (sec.k === 'winPercentage' ? (p.winPercentage?.toFixed(2) || '0.00') : 
                      (sec.k === 'contributionScore' ? String(Math.round(p.contributionScore || 0)) :
                      (sec.k === 'totalFireCount' ? String(p.allTimeFireCount || 0) : (sec.k === 'impact' || sec.k === 'sets' ? String(Math.round(p[sec.k] || 0)) : String(p[sec.k] || 0)))))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>
      <div className={`rounded-[2.8rem] border border-subtle overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900' : 'bg-white shadow-premium border-slate-200'} ios-clip-fix`}>
        <div className={`p-8 border-b border-inherit ${THEME.HEADING_HOF} text-left`}>WORLDWIDE MEDAL COUNT</div>
        <div className="overflow-auto scrollbar-hide">
          <table className="min-w-full table-fixed border-collapse">
            <thead className={`sticky top-0 z-20 backdrop-blur-2xl border-b border-subtle ${theme === 'dark' ? 'bg-[#000000]/95 text-white border-zinc-900' : 'bg-white/95 text-black border-slate-200'}`}>
              <tr className="h-20">
                <th className="w-20 sm:w-24 pl-4 sm:pl-10 text-left select-none uppercase text-[10px] sm:text-[12px] font-black">RANK</th>
                <MedalHeader l="COUNTRY" k="name" a="left" sortable={false} />
                <MedalHeader l="🥇" k="gold" a="right" w="w-12 sm:w-24" />
                <MedalHeader l="🥈" k="silver" a="right" w="w-12 sm:w-24" />
                <MedalHeader l="🥉" k="bronze" a="right" w="w-12 sm:w-24" />
                <MedalHeader l="TOTAL" k="total" a="right" w="w-24 sm:w-36" />
              </tr>
            </thead>
            <tbody className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-900/30' : 'divide-slate-200'}`}>
              {(stats.medalCount || []).map((c) => (
                <tr key={c.name} onClick={() => onRegionClick({ ...c, type: 'country' })} className={`group active:bg-blue-600/10 transition-colors cursor-pointer text-inherit ${theme === 'dark' ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.05]'}`}>
                  <td className="w-20 sm:w-24 pl-4 sm:pl-10 py-6 text-left">
                    <ASRRankBadge rank={c.displayRank} theme={theme} />
                  </td>
                  <td className="px-2 sm:px-4 py-6 text-left">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-[11px] sm:text-[17px] font-black uppercase whitespace-normal leading-tight group-hover:text-blue-500 transition-colors">{c.name}</span>
                      <span className="emoji-slot text-xl sm:text-2xl shrink-0">{formatFlagsWithSpace(c.flag)}</span>
                    </div>
                  </td>
                  <td className={`w-12 sm:w-24 px-2 sm:px-4 text-right text-amber-500 text-sm sm:text-[20px] tracking-tight ${THEME.VALUE}`}>{String(c.gold)}</td>
                  <td className={`w-12 sm:w-24 px-2 sm:px-4 text-right text-sm sm:text-[20px] tracking-tight ${THEME.VALUE}`}>{String(c.silver)}</td>
                  <td className={`w-12 sm:w-24 px-2 sm:px-4 text-right text-sm sm:text-[20px] tracking-tight ${THEME.VALUE}`}>{String(c.bronze)}</td>
                  <td className={`w-24 sm:w-36 pl-2 sm:pl-4 pr-4 sm:pr-12 text-right text-sm sm:text-[20px] tracking-tight ${THEME.VALUE}`}>{String(c.total)}</td>
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

const ASRHeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler, paddingClass = "px-2", sortable = true }) => {
  const isActive = activeSort && activeSort.key === k;
  return (
    <div 
        className={`${w} ${paddingClass} py-8 ${sortable ? 'group cursor-pointer' : 'cursor-default'} select-none transition-all stat-card-container ${sortable && isActive ? 'bg-current/[0.08]' : (sortable ? 'hover:bg-current/[0.05]' : '')} text-inherit border-b-2 border-transparent`} 
        onClick={() => sortable && handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}
    >
      <div className={`flex items-center gap-2.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className="uppercase text-[10px] sm:text-[12px] font-black">{l}</span>
        {sortable && (
          <div className={`transition-all duration-300 shrink-0 ${isActive ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-60'}`}>
            <ChevronDown size={16} strokeWidth={3} className={`${isActive && activeSort.direction === 'ascending' ? 'rotate-180' : ''}`} />
          </div>
        )}
      </div>
    </div>
  );
};

const ASRDataTable = ({ columns, data, sort, onSort, theme, onRowClick, statKeys = [] }) => {
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
        const result = []; const baseData = (data || []).slice(0, visibleCount);
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

    const topOffset = "top-[calc(var(--safe-top)+var(--nav-height-mobile)+var(--announcement-height)+var(--ticker-height))] sm:top-[calc(var(--safe-top)+var(--nav-height-desktop)+var(--announcement-height)+var(--ticker-height))]";
    const dataColor = theme === 'dark' ? 'text-white' : 'text-black';

    return (
        <div className="min-w-full flex flex-col overflow-visible">
            <div className={`sticky ${topOffset} z-20 backdrop-blur-xl border-b flex items-center ${theme === 'dark' ? 'bg-[#000000]/95 text-white border-zinc-900' : 'bg-white/95 text-black border-slate-200'}`}>
                <div className="w-20 sm:w-24 pl-4 sm:pl-10 py-8 text-left font-black text-[10px] sm:text-[12px] uppercase tracking-widest shrink-0">RANK</div>
                <div className="flex-1 flex min-w-0 h-full">
                  {columns.filter(c => !c.isRank).map((col) => (
                    <ASRHeaderComp 
                      key={col.key} l={col.label} k={col.key} a={col.align} w={col.width} 
                      activeSort={sort} handler={onSort} 
                      paddingClass={col.type === 'profile' ? "pl-4 sm:pl-8 pr-2 flex-1" : "px-2 sm:px-4 shrink-0"}
                      sortable={col.sortable !== false}
                    />
                  ))}
                </div>
            </div>
            <div className={`divide-y-2 ${theme === 'dark' ? 'divide-zinc-900/30' : 'divide-slate-200'} overflow-visible`}>
                {visibleData.map((item, idx) => {
                    if (item.isDivider) return (
                      <div 
                        key={`divider-${idx}`} 
                        className={`py-14 mx-4 sm:mx-10 text-center opacity-40 hover:opacity-100 transition-all duration-300 text-[11px] font-black uppercase tracking-[0.5em] cursor-default border-y border-transparent ${theme === 'dark' ? 'hover:border-blue-500/10 hover:bg-blue-500/10' : 'hover:border-blue-600/10 hover:bg-blue-600/5'}`}
                      >
                        {item.label}
                      </div>
                    );
                    if (item.isUtility) return <div key={`utility-${idx}`} className="px-6 py-10"><ASRInlineValueCard type={item.type} theme={theme} /></div>;
                    
                    const rowStats = statKeys.map(k => {
                      const val = item[k];
                      const forceAlignment = ['rating', 'avgCR', 'pts'];
                      const forceRound = ['impact', 'avgLength', 'contributionScore', 'runs'];
                      const blueKeys = ['pts'];

                      if (forceRound.includes(k)) {
                        return { value: String(Math.round(parseFloat(val) || 0)) };
                      }
                      if (forceAlignment.includes(k) || (typeof val === 'number' && !Number.isInteger(val))) {
                        return { value: typeof val === 'number' ? val.toFixed(2) : (parseFloat(val) || 0).toFixed(2), color: blueKeys.includes(k) ? dataColor : '' };
                      }
                      return { value: val !== undefined && val !== null ? String(val) : "0", color: blueKeys.includes(k) ? dataColor : '' };
                    });

                    return (
                        <ASRListItem 
                          key={item.id || idx} variant="table" theme={theme} columns={columns}
                          rank={item.currentRank} title={item.name} subtitle={formatFlagsWithSpace(item.region || item.flag || item.gymFlag || '')} 
                          isUnranked={item.isQualified === false}
                          shouldFade={item.shouldFade}
                          stats={rowStats}
                          onClick={() => onRowClick?.(item)}
                        />
                    );
                })}
                <div ref={observerTarget} className="h-4" />
            </div>
        </div>
    );
};

const ASRNavBar = ({ theme, setTheme, view, eventType, setEventType }) => {
    return (
        <nav className={`fixed top-[calc(var(--safe-top)+var(--announcement-height)+var(--ticker-height))] w-full backdrop-blur-3xl border-b z-50 flex items-center justify-between px-6 sm:px-12 transition-all duration-500 ${theme === 'dark' ? 'bg-[#000000]/90 border-zinc-900 text-white shadow-xl' : 'bg-white/80 border-slate-200 text-black shadow-sm'} h-[var(--nav-height-mobile)] sm:h-[var(--nav-height-desktop)]`}>
            <div 
                className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer group active:scale-95 transition-transform" 
                onClick={() => {
                    window.location.hash = '#/players';
                    setEventType('open');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.location.hash = '#/players';
                    setEventType('open');
                  }
                }}
            >
                <div className="flex flex-col leading-none">
                    <span className="font-black text-sm sm:text-xl lg:text-2xl uppercase italic tracking-tighter">APEX SPEED RUN</span>
                </div>
            </div>

            {view !== 'hof' && view !== 'setters' && (
              <div className={`flex items-center p-1 rounded-[0.8rem] sm:rounded-[1.4rem] border-2 transition-all ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900' : 'bg-white/60 border-slate-300'} ios-clip-fix`}>
                <button 
                  onClick={() => setEventType('open')} 
                  className={`px-3 sm:px-10 py-1.5 sm:py-2 rounded-md sm:rounded-xl text-[8px] sm:text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 ${eventType === 'open' ? 'btn-blue-gradient active shadow-lg' : 'opacity-40 hover:opacity-100 text-inherit hover:bg-current/[0.05]'} whitespace-nowrap`}
                >
                  OPEN
                </button>
                <button 
                  onClick={() => setEventType('all-time')} 
                  className={`px-3 sm:px-10 py-1.5 sm:py-2 rounded-md sm:rounded-xl text-[8px] sm:text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 ${eventType === 'all-time' ? 'btn-blue-gradient active shadow-lg' : 'opacity-40 hover:opacity-100 text-inherit hover:bg-current/[0.05]'} whitespace-nowrap`}
                >
                  ALL-TIME
                </button>
              </div>
            )}

            <div className="shrink-0 flex items-center gap-1.5 sm:gap-3 h-full">
                <button 
                  onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
                  className={`w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg sm:rounded-xl transition-all border-2 active:scale-90 ${theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:border-blue-500 hover:text-blue-500' : 'bg-white border-slate-300 text-slate-500 hover:border-blue-600 hover:text-blue-600'}`}
                  title="Toggle Theme"
                >
                  {theme === 'dark' ? <Sun size={14} strokeWidth={2.5} /> : <Moon size={14} strokeWidth={2.5} />}
                </button>
            </div>
        </nav>
    );
};

const ASRBottomNav = ({ view, theme, onOpenIntro }) => {
  const items = [
    { id: 'players', label: 'PLAYERS', icon: <User size={22} strokeWidth={2.5} /> },
    { id: 'teams', label: 'TEAMS', icon: <Users size={22} strokeWidth={2.5} /> },
    { id: 'map', label: 'COURSES', icon: <MapPin size={22} strokeWidth={2.5} /> },
    { id: 'setters', label: 'SETTERS', icon: <Waypoints size={22} strokeWidth={2.5} /> },
    { id: 'hof', label: 'HOF', icon: <Trophy size={22} strokeWidth={2.5} /> }
  ];

  return (
    <div className="floating-nav-dock">
      <div className={`floating-nav-inner transition-all duration-500 ${theme === 'dark' ? 'bg-zinc-900/98 text-white' : 'bg-white/98 text-black'} backdrop-blur-3xl`}>
        {items.map(item => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                  window.location.hash = `#/${item.id}`;
              }}
              className={`flex flex-col items-center justify-center transition-all duration-300 active:scale-[0.8] w-full relative h-full ${isActive ? 'text-blue-600' : 'opacity-30 hover:opacity-100 text-inherit'}`}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : ''}`}>
                {item.icon}
              </div>
              {isActive && <div className="floating-nav-item-active-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ASRAnnouncementBar = ({ theme, onOpenIntro, eventType, stats }) => {
    const isAllTime = eventType === 'all-time';

    return (
      <div 
        onClick={onOpenIntro}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenIntro();
          }
        }}
        className={`fixed top-[calc(var(--safe-top)+var(--ticker-height))] left-0 w-full z-[60] h-[var(--announcement-height)] flex items-center justify-center px-4 overflow-hidden border-b transition-all duration-300 cursor-pointer group/bar active:scale-[0.98] ${theme === 'dark' ? 'bg-blue-800 border-blue-400/20 text-blue-50' : 'bg-blue-600 border-blue-700 text-white'}`}
      >
        <div className="flex items-center gap-3 animate-in fade-in duration-700 pointer-events-none w-full max-w-full justify-center font-sans font-black flex-nowrap text-inherit">
          {isAllTime ? (
            <div className="flex items-center gap-4 sm:gap-8 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap overflow-x-auto scrollbar-hide py-1 italic text-inherit">
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">PLAYERS:</span>
                <ASRCountUp end={stats.players} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">COURSES:</span>
                <ASRCountUp end={stats.courses} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">CITIES:</span>
                <ASRCountUp end={stats.cities} />
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="opacity-60">COUNTRIES:</span>
                <ASRCountUp end={stats.countries} />
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="opacity-60">RUNS:</span>
                <ASRCountUp end={stats.runs} />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-inherit">
              <span className="animate-pulse text-xs leading-none shrink-0">●</span>
              <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] whitespace-nowrap shrink-0">
                ASR OPEN CLIPS DUE IN:
              </span>
              <div className="shrink-0 flex items-center">
                <ASRCountdownTimer className="!text-[10px] sm:!text-[11px] tracking-[0.2em]" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
};

const ASRTopShield = ({ theme }) => {
    return (
        <div className={`fixed top-0 left-0 right-0 z-[100] pointer-events-none h-[var(--safe-top)] ${theme === 'dark' ? 'bg-black' : 'bg-white'}`} />
    );
};

const ASRControlBar = () => {
    return (
        <header className="relative pt-2 pb-0 sm:pt-4 sm:pb-1 px-6 sm:px-12 flex flex-col items-start justify-start text-left z-10">
            <div className="hero-glow" />
        </header>
    );
};

// --- MAIN APP ---
const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-full', sortable: false },
    { label: 'RATING', type: 'number', key: 'rating', decimals: 2, align: 'right', width: 'w-28 sm:w-48', sortable: false }
];

const TEAM_COLS = [
    { isRank: true },
    { label: 'TEAM', type: 'profile', key: 'name', subKey: 'location', width: 'w-full', sortable: false },
    { label: 'POINTS', type: 'number', key: 'pts', align: 'right', width: 'w-28 sm:w-48', sortable: false }
];

const SETTER_COLS = [
    { isRank: true },
    { label: 'SETTER', type: 'profile', key: 'name', subKey: 'region', width: 'w-full', sortable: false },
    { label: 'IMPACT', type: 'number', key: 'impact', align: 'right', width: 'w-28 sm:w-48', sortable: false }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-full', sortable: false },
    { label: 'PLAYERS', type: 'number', key: 'totalAllTimeAthletes', align: 'right', width: 'w-28 sm:w-48', sortable: false }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('open'); 
  const [view, setView] = useState('players'); 
  const [mapMode, setMapMode] = useState('map'); 
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showIntro, setShowIntro] = useState(false);
  
  const [modalHistory, setModalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isInternalNavRef = useRef(false);
  
  const histRef = useRef([]);
  const idxRef = useRef(-1);

  const { data, openData, atPerfs, opPerfs, lbAT, atMet, dnMap, cMet, settersData, atRawBest, recentFeed, isLoading } = useASRData();
  const isAllTimeContext = eventType === 'all-time';

  useEffect(() => {
    setSearch('');
  }, [view, eventType]);

  useEffect(() => {
    histRef.current = modalHistory;
    idxRef.current = historyIndex;
  }, [modalHistory, historyIndex]);

  // Handle global scroll to top on major transitions
  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    resetScroll();
    const timer = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(timer);
  }, [view, eventType]);

  const masterCourseList = useMemo(() => {
    const courseNames = Array.from(new Set([...Object.keys(cMet || {}), ...Object.keys(lbAT.M || {}), ...Object.keys(lbAT.F || {})])).filter(Boolean);
    return courseNames.map(name => {
      const athletesMAll = Object.entries((lbAT.M || {})[name] || {})
        .map(([pKey, time]) => [pKey, time, (atRawBest || {})[pKey]?.[name]?.videoUrl])
        .sort((a, b) => a[1] - b[1]);
      const athletesFAll = Object.entries((lbAT.F || {})[name] || {})
        .map(([pKey, time]) => [pKey, time, (atRawBest || {})[pKey]?.[name]?.videoUrl])
        .sort((a, b) => a[1] - b[1]);
      const meta = (cMet || {})[name] || {}; const contData = getContinentData(meta.country || 'UNKNOWN');
      const mRecs = athletesMAll.map(a => a[1]); const fRecs = athletesFAll.map(a => a[1]);
      const coordsMatch = String(meta.coordinates || "").match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

      const filteredM = athletesMAll.filter(a => !isPlaceholderPlayer(dnMap[a[0]] || a[0]));
      const filteredF = athletesFAll.filter(a => !isPlaceholderPlayer(dnMap[a[0]] || a[0]));

      return {
        name, city: meta.city || 'UNKNOWN', country: meta.country || 'UNKNOWN', flag: meta.flag || '🏳️', continent: contData.name, continentFlag: contData.flag,
        mRecord: mRecs.length ? Math.min(...mRecs) : null, fRecord: fRecs.length ? Math.min(...fRecs) : null,
        totalAthletes: new Set([...filteredM.map(a => a[0]), ...filteredF.map(a => a[0])]).size, 
        totalRuns: filteredM.length + filteredF.length,
        allTimeMRecord: mRecs.length ? Math.min(...mRecs) : null, allTimeFRecord: fRecs.length ? Math.min(...fRecs) : null,
        allTimeAthletesM: athletesMAll, allTimeAthletesF: athletesFAll,
        athletesMAll, athletesFAll, 
        totalAllTimeAthletes: new Set([...filteredM.map(a => a[0]), ...filteredF.map(a => a[0])]).size,
        totalAllTimeRuns: filteredM.length + filteredF.length, 
        parsedCoords: coordsMatch ? [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])] : null, ...meta
      };
    });
  }, [lbAT, cMet, atRawBest, dnMap]);

  const kpiStats = useMemo(() => {
    return {
      players: (data || []).filter(p => !isPlaceholderPlayer(p.name)).length,
      courses: masterCourseList.length,
      cities: new Set(masterCourseList.map(c => c.city).filter(v => v && v !== 'UNKNOWN')).size,
      countries: new Set(masterCourseList.map(c => c.country).filter(v => v && v !== 'UNKNOWN')).size,
      runs: masterCourseList.reduce((acc, c) => acc + (c.totalAllTimeRuns || 0), 0)
    };
  }, [data, masterCourseList]);

  const settersWithImpact = useMemo(() => {
    return (settersData || []).map(s => {
        const sName = s.name ? String(s.name).trim() : "";
        const leadCourses = masterCourseList.filter(c => isNameInList(sName, c.leadSetters));
        const assistCourses = masterCourseList.filter(c => isNameInList(sName, c.assistantsetters));
        const allSetCourses = Array.from(new Set([...leadCourses, ...assistCourses]));
        const athleteMeta = atMet[normalizeName(sName)];
        
        const totalCourses = allSetCourses.length;
        const totalLength = allSetCourses.reduce((sum, c) => sum + (cleanNumeric(c.length) || 0), 0);
        const totalDifficulty = allSetCourses.reduce((sum, c) => sum + (cleanNumeric(c.difficulty) || 0), 0);
        const citiesSet = new Set(allSetCourses.map(c => c.city).filter(Boolean));

        const totalCR = allSetCourses.reduce((sum, c) => {
            const crM = typeof c.allTimeMRecord === 'number' ? c.allTimeMRecord : Infinity;
            const crF = typeof c.allTimeFRecord === 'number' ? c.allTimeFRecord : Infinity;
            const fastest = Math.min(crM, crF);
            return sum + (fastest === Infinity ? 0 : fastest);
        }, 0);

        return { 
            ...s, leads: leadCourses.length, assists: assistCourses.length,
            sets: leadCourses.length + assistCourses.length,
            impact: allSetCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0),
            films: athleteMeta?.films || 0,
            avgLength: totalCourses > 0 ? (totalLength / totalCourses) : 0,
            avgDifficulty: totalCourses > 0 ? (totalDifficulty / totalCourses) : 0,
            avgCR: totalCourses > 0 ? (totalCR / totalCourses) : 0,
            citiesCount: citiesSet.size
        };
    }).filter(s => (s.sets || 0) > 0);
  }, [settersData, masterCourseList, atMet]);

  const teamsAggregated = useMemo(() => {
    const teams = {};
    const sourcePlayers = isAllTimeContext ? Object.values(atMet || {}) : openData;

    sourcePlayers.forEach(p => {
      // Delist anyone with 0 runs entirely from team calculations
      const playerRuns = p.runs !== undefined ? p.runs : (atPerfs[p.pKey]?.length || 0);
      if (playerRuns === 0) return;

      const gym = p.homeGym || "";
      if (!gym || isPlaceholderPlayer(p.name)) return;
      
      const key = gym.toUpperCase();
      if (!teams[key]) {
        teams[key] = { 
            name: gym, 
            players: [], 
            pts: 0, 
            runs: 0, 
            fires: 0,
            medals: { gold: 0, silver: 0, bronze: 0 },
            flag: p.gymFlag || '🏳️', 
            location: p.teamLocation || p.location || 'UNKNOWN', 
            searchKey: gym.toLowerCase() 
        };
      }
      
      teams[key].players.push(p);
      teams[key].pts += (p.pts || 0);
      teams[key].runs += playerRuns;
      
      // Aggregate fires
      const fires = isAllTimeContext ? (p.allTimeFireCount || 0) : (p.openFireCount || 0);
      teams[key].fires += fires;

      // Aggregate medals from performance source
      const perfSource = isAllTimeContext ? (atPerfs[p.pKey] || []) : (opPerfs[p.pKey] || []);
      perfSource.forEach(perf => {
          if (perf.rank === 1) teams[key].medals.gold++;
          else if (perf.rank === 2) teams[key].medals.silver++;
          else if (perf.rank === 3) teams[key].medals.bronze++;
      });
    });
    return Object.values(teams).sort((a, b) => b.pts - a.pts);
  }, [atMet, openData, isAllTimeContext, atPerfs, opPerfs]);

  const jumpToHistoryIndex = useCallback((idx) => {
    if (idx < 0 || idx >= histRef.current.length) return;
    isInternalNavRef.current = true;
    setHistoryIndex(idx);
    const item = histRef.current[idx];
    window.location.hash = `#/${item.type}/${normalizeName(item.data.name)}`;
  }, []);

  const navigateToEntity = useCallback((type, data, roleOverride = null) => {
    isInternalNavRef.current = true;
    
    const currentIdx = idxRef.current;
    
    const nextItem = { type, data, roleOverride };
    setModalHistory(prev => {
        const sliced = prev.slice(0, currentIdx + 1);
        return [...sliced, nextItem];
    });
    setHistoryIndex(currentIdx + 1);

    window.location.hash = `#/${type}/${normalizeName(data.name)}`;
  }, []);

  const closeModals = useCallback(() => {
    isInternalNavRef.current = true;
    setModalHistory([]);
    setHistoryIndex(-1);
    window.location.hash = `#/${view}`;
  }, [view]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
        jumpToHistoryIndex(historyIndex - 1);
    } else {
        closeModals();
    }
  }, [historyIndex, jumpToHistoryIndex, closeModals]);

  const goForward = useCallback(() => {
    if (historyIndex < modalHistory.length - 1) {
        jumpToHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, modalHistory.length, jumpToHistoryIndex]);

  useEffect(() => {
    const handleHashChange = () => {
        if (isInternalNavRef.current) {
            isInternalNavRef.current = false;
            return;
        }

        const hash = window.location.hash || '#/players';
        const cleanPath = hash.replace(/^#\/?/, '');
        const parts = cleanPath.split('/').filter(Boolean);
        const firstSegment = parts[0] || 'players';
        const entityTypes = ['player', 'course', 'setter', 'region', 'team'];

        if (entityTypes.includes(firstSegment) && parts.length >= 2) {
            const type = firstSegment;
            const slug = parts[1];
            
            const existingIdx = histRef.current.findIndex(h => h.type === type && normalizeName(h.data.name) === slug);
            
            if (existingIdx !== -1) {
                setHistoryIndex(existingIdx);
            } else {
                let foundData = null;
                if (type === 'player') foundData = Object.values(atMet).find(a => normalizeName(a.name) === slug);
                if (type === 'course') foundData = masterCourseList.find(c => normalizeName(c.name) === slug);
                if (type === 'setter') foundData = settersWithImpact.find(s => normalizeName(s.name) === slug);
                if (type === 'region') foundData = { name: slug.toUpperCase(), type: 'country' };
                if (type === 'team') foundData = teamsAggregated.find(t => normalizeName(t.name) === slug);

                if (foundData) {
                    const index = idxRef.current;
                    const nextItem = { type, data: foundData };
                    setModalHistory(prev => [...prev.slice(0, index + 1), nextItem]);
                    setHistoryIndex(index + 1);
                }
            }
        } else {
            setView(firstSegment);
            setModalHistory([]);
            setHistoryIndex(-1);
        }
    };

    window.addEventListener('hashchange', handleHashChange);
    if (!isLoading) handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isLoading, atMet, masterCourseList, settersWithImpact, teamsAggregated]);

  const canGoForward = historyIndex < modalHistory.length - 1;

  const [viewSorts, setViewSorts] = useState({
    players: { key: 'rating', direction: 'descending' },
    setters: { key: 'impact', direction: 'descending' },
    courses: { key: 'totalAllTimeRuns', direction: 'descending' }, 
    hof: { key: 'gold', direction: 'descending' },
    teams: { key: 'pts', direction: 'descending' }
  });

  const handleSort = (newSort) => {
    const key = view === 'map' ? 'courses' : (view === 'players' ? 'players' : view);
    handleSortFunc(key, newSort);
  };

  const handleSortFunc = (viewKey, newSort) => {
    setViewSorts(p => ({ ...p, [viewKey]: typeof newSort === 'function' ? newSort(p[viewKey]) : newSort }));
  };

  const [medalSort, setMedalSort] = useState({ key: 'gold', direction: 'descending' });

  const rawCourseList = useMemo(() => (masterCourseList || []).filter(c => isAllTimeContext || c.is2026), [masterCourseList, isAllTimeContext]);
  const filteredCourses = useFilteredData(rawCourseList, debouncedSearch, viewSorts.courses);
  const courseList = useMemo(() => filteredCourses.map((c, i) => ({ ...c, currentRank: i + 1 })), [filteredCourses]);
  
  const athletePool = isAllTimeContext ? data : openData;
  const filteredAthletes = useFilteredData(athletePool, debouncedSearch, viewSorts.players, useCallback(p => p && p.gender === gen && !isPlaceholderPlayer(p.name) && (p.runs || 0) > 0, [gen]));
  
  const filteredSetters = useFilteredData(settersWithImpact, debouncedSearch, viewSorts.setters);
  const settersList = useMemo(() => filteredSetters.map((s, i) => ({ ...s, currentRank: i + 1 })), [filteredSetters]);

  const filteredTeams = useFilteredData(teamsAggregated, debouncedSearch, viewSorts.teams);
  const teamsList = useMemo(() => filteredTeams.map((t, i) => ({ ...t, currentRank: i + 1 })), [filteredTeams]);

  const list = useMemo(() => {
    if (view === 'setters') return settersList;
    if (view === 'map') return courseList;
    if (view === 'teams') return teamsList;
    if (filteredAthletes.length === 0) return [];
    let qual = filteredAthletes.filter(p => isQualifiedAthlete(p, isAllTimeContext));
    let unranked = filteredAthletes.filter(p => !isQualifiedAthlete(p, isAllTimeContext));
    if (!isAllTimeContext) {
      const allTimeRankedKeys = new Set((data || []).map(p => p.pKey));
      unranked = unranked.filter(p => allTimeRankedKeys.has(p.pKey));
    }
    const fQual = qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true, shouldFade: false }));
    const fUnranked = unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false, shouldFade: isAllTimeContext ? true : ((p.runs || 0) === 0) }));
    let dividerLabel = isAllTimeContext ? (gen === 'M' ? "RUN 4+ COURSES TO GET RANKED" : "RUN 3+ COURSES TO GET RANKED") : "RUN 3+ COURSES TO GET RANKED";
    if (!isAllTimeContext && fQual.length === 0) return [{ isDivider: true, label: dividerLabel }, ...fUnranked];
    return fQual.length && fUnranked.length ? [...fQual, { isDivider: true, label: dividerLabel }, ...fUnranked] : [...fQual, ...fUnranked];
  }, [filteredAthletes, settersList, courseList, teamsList, isAllTimeContext, data, gen, view]);

  const hofStats = useMemo(() => {
    if (view !== 'hof' || !data || data.length === 0) return null; 
    try { return calculateHofStats(data, atPerfs, lbAT, atMet, medalSort, settersWithImpact); } catch (e) { return null; }
  }, [data, lbAT, atMet, atPerfs, medalSort, settersWithImpact, view]);

  const breadcrumbsArr = useMemo(() => {
    return modalHistory.map(h => String(h.data.name || 'Detail'));
  }, [modalHistory]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {});
    } else {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  }, []);

  const activeModal = historyIndex >= 0 ? modalHistory[historyIndex] : null;

  const getModalHeader = (modal) => {
    if (!modal) return null;
    const { type, data } = modal;
    if (type === 'course') {
        let cityProv = data.city && data.city !== 'UNKNOWN' ? String(data.city) : '';
        if ((data.country === 'USA' || data.country === 'CANADA') && data.stateProv) {
          cityProv += cityProv ? `, ${data.stateProv}` : String(data.stateProv);
        }
        
        return (
          <div className="flex flex-col gap-6 w-full text-left animate-in fade-in duration-300">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-zinc-900 bg-black/50' : 'border-slate-200 bg-white'} ios-clip-fix`}>
                <FallbackAvatar name={String(data.name)} sizeCls="text-xl sm:text-4xl" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-1.5 min-w-0">
                  <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-none text-inherit max-w-full break-words whitespace-normal">{String(data.name)}</h2>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <a 
                      href={data.coordinates ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.coordinates)}` : "#"} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 transition-all duration-300 shadow-md bg-blue-600/10 border-blue-600/30 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:scale-110 active:scale-95"
                      title="View Map"
                    >
                      <MapPin size={14} strokeWidth={3} />
                    </a>
                    <a 
                      href={data.demoVideo || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 transition-all duration-300 shadow-md ${!data.demoVideo ? 'opacity-20 grayscale cursor-not-allowed' : 'bg-rose-600/10 border-rose-600/30 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:scale-110 active:scale-95'}`}
                      onClick={(e) => !data.demoVideo && e.preventDefault()}
                      title="View Rules"
                    >
                      <Play size={14} strokeWidth={3} />
                    </a>
                  </div>
                </div>
                <div className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest min-w-0 opacity-70 text-inherit whitespace-normal break-words mt-0.5">
                  {formatLocationSubtitle(cityProv, String(data.country), String(data.flag))}
                </div>
              </div>
            </div>
            <ASRPatronPill course={data} theme={theme} />
          </div>
        );
    }
    if (type === 'player' || type === 'setter') {
        const htown = data.location || "";
        const gym = data.homeGym || "";
        const townFlag = formatFlagsWithSpace(String(data.townFlag || ""));
        const gymFlag = formatFlagsWithSpace(String(data.gymFlag || ""));

        const teamObj = gym ? teamsAggregated.find(t => t.name.toUpperCase() === gym.toUpperCase()) : null;

        return (
          <div className="flex flex-col gap-6 w-full text-left animate-in fade-in duration-300">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'bg-zinc-900/50 border-zinc-900' : 'border-slate-200 bg-white'} ios-clip-fix`}>
                <FallbackAvatar name={String(data.name)} />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center text-left">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-1.5 min-w-0">
                    <h2 className="text-xl sm:text-3xl font-black tracking-tighter uppercase leading-none text-inherit max-w-full break-words whitespace-normal">{String(data.name)}</h2>
                    {data.igHandle && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a 
                          href={`https://instagram.com/${data.igHandle}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 transition-all duration-300 shadow-md bg-[#E1306C]/10 border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C] hover:text-white hover:border-[#E1306C] hover:scale-110 active:scale-95" 
                          title={`@${data.igHandle}`}
                        >
                          <Instagram size={14} strokeWidth={3} />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-1 min-w-0 opacity-80 text-inherit font-black uppercase whitespace-normal break-words">
                    <div className="text-[9px] sm:text-[11px] leading-tight tracking-widest flex items-center gap-1.5 flex-wrap">
                        <span className="opacity-50 shrink-0">HOME TOWN:</span>
                        <span className="shrink-0">{htown || 'UNKNOWN'}</span>
                        {townFlag && <span className="flex items-center gap-0.5 ml-1">{townFlag}</span>}
                    </div>
                    {gym && (
                        <div className="text-[9px] sm:text-[11px] leading-tight tracking-widest flex items-center gap-1.5 flex-wrap">
                            <span className="opacity-50 shrink-0">HOME GYM:</span>
                            <span 
                                className={`shrink-0 ${teamObj ? 'cursor-pointer hover:text-blue-500 underline decoration-blue-500/30 underline-offset-4 transition-colors' : ''}`}
                                onClick={() => teamObj && navigateToEntity('team', teamObj)}
                            >
                                {gym}
                            </span>
                            {gymFlag && <span className="flex items-center gap-0.5 ml-1">{gymFlag}</span>}
                        </div>
                    )}
                  </div>
              </div>
            </div>
          </div>
        );
    }
    if (type === 'region') {
      return (
        <div className="flex items-start gap-4 sm:gap-6 min-w-0 w-full text-left animate-in fade-in duration-300">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-zinc-900 bg-black/50' : 'border-slate-200 bg-white'} ios-clip-fix`}><FallbackAvatar name={String(data.name)} initialsOverride={data.name === 'GLOBAL' ? 'GL' : ''} sizeCls="text-xl sm:text-4xl" /></div>
          <div className="flex flex-col min-w-0 flex-1 justify-center h-20 sm:h-24">
            <div className="mb-1 sm:mb-2"><h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none text-inherit">{String(data.name)}</h2></div>
            {data.flag && <div className="text-xl sm:text-2xl leading-none drop-shadow-sm"><span className="emoji-slot">{formatFlagsWithSpace(String(data.flag))}</span></div>}
          </div>
        </div>
      );
    }
    if (type === 'team') {
      return (
        <div className="flex items-start gap-4 sm:gap-6 min-w-0 w-full text-left animate-in fade-in duration-300">
          <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-zinc-900 bg-black/50' : 'border-slate-200 bg-white'} ios-clip-fix`}><FallbackAvatar name={String(data.name)} sizeCls="text-xl sm:text-4xl" /></div>
          <div className="flex flex-col min-w-0 flex-1 justify-center h-20 sm:h-24">
            <div className="mb-1 sm:mb-2"><h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none text-inherit">{String(data.name)}</h2></div>
              <div className="text-[10px] sm:text-[13px] font-black uppercase tracking-widest min-w-0 opacity-70 text-inherit whitespace-normal break-words mt-0.5">
                  {formatLocationSubtitle(data.location, "TEAM LOCATION", String(data.flag))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const currentTitle = useMemo(() => {
    const titles = {
      players: "PLAYERS",
      map: "COURSES",
      setters: "SETTERS",
      hof: "HALL OF FAME",
      teams: "TEAMS"
    };
    return titles[view] || "VAULT";
  }, [view]);

  const mapRegionStats = useMemo(() => ({
    continents: getAggregatedStats(filteredCourses, 'continent', dnMap),
    cities: getAggregatedStats(filteredCourses, 'city', dnMap),
    countries: getAggregatedStats(filteredCourses, 'country', dnMap)
  }), [filteredCourses, dnMap]);

  return (
    <div className={`min-h-[100dvh] transition-colors duration-500 font-sans flex flex-col antialiased ${theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-[#f8fafc] text-black'}`}>
      <CustomStyles />
      <ASRTopShield theme={theme} />
      
      <ASRLiveTicker 
        feed={recentFeed} 
        theme={theme} 
        onPlayerClick={(p) => p && navigateToEntity('player', p)} 
        onCourseClick={(c) => c && navigateToEntity('course', c)} 
      />
      <ASRAnnouncementBar theme={theme} onOpenIntro={() => setShowIntro(true)} eventType={eventType} stats={kpiStats} />

      <ASRNavBar theme={theme} setTheme={setTheme} view={view} setView={setView} eventType={eventType} setEventType={setEventType} />
      <ASRBottomNav view={view} theme={theme} onOpenIntro={() => setShowIntro(true)} />
      <ASROnboarding isOpen={showIntro} onClose={() => setShowIntro(false)} theme={theme} />
      
      <div className={`flex-1 flex flex-col pt-[calc(var(--safe-top)+var(--nav-height-mobile)+var(--announcement-height)+var(--ticker-height))] sm:pt-[calc(var(--safe-top)+var(--nav-height-desktop)+var(--announcement-height)+var(--ticker-height))] pb-32 overflow-visible`}>
        <ASRBaseModal 
          isOpen={historyIndex >= 0} 
          onClose={closeModals} 
          onBack={goBack} 
          onForward={goForward} 
          canGoForward={canGoForward} 
          onShare={handleShare}
          theme={theme} 
          header={getModalHeader(activeModal)} 
          breadcrumbs={breadcrumbsArr} 
          onBreadcrumbClick={jumpToHistoryIndex}
          currentIndex={historyIndex}
        >
          <InspectorBody 
             activeModal={activeModal} theme={theme} allCourses={masterCourseList} openRankings={openData} atPerfs={atPerfs} opPerfs={opPerfs} 
             atMet={atMet} dnMap={dnMap} settersWithImpact={settersWithImpact} openModal={navigateToEntity}
             onSetterClick={(setter) => { 
                const sName = typeof setter === 'string' ? setter : String(setter.name);
                const sObj = settersWithImpact.find(s => normalizeName(s.name) === normalizeName(sName)); 
                if (sObj) navigateToEntity('setter', sObj); 
             }}
          />
        </ASRBaseModal>

        <ASRControlBar />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-12 flex-grow w-full overflow-visible pb-10">
          <div className="w-full flex flex-col mb-4 animate-in fade-in duration-500">
             <h1 className="text-inherit text-3xl sm:text-[42px] leading-tight font-black uppercase tracking-[0.3em] text-left px-1 drop-shadow-md">
                {currentTitle}
             </h1>
          </div>

          {isLoading && data.length === 0 ? (
            <div className={`border-2 rounded-[3.5rem] h-96 animate-pulse flex flex-col items-center justify-center gap-8 ${theme === 'dark' ? 'bg-zinc-950 border-zinc-900' : 'bg-slate-200 border-slate-300'}`}>
              <ChevronsRight className="w-12 h-12 text-blue-600 animate-pulse" strokeWidth={3} style={{ transform: 'skewX(-18deg)' }} />
              <span className="text-xs font-black uppercase tracking-[0.4em] opacity-40">SCANNING LIVE STATS</span>
            </div>
          ) : view === 'hof' ? (
            <ASRHallOfFame stats={hofStats} theme={theme} onPlayerClick={p => navigateToEntity('player', p)} onSetterClick={s => navigateToEntity('setter', s)} onRegionClick={r => navigateToEntity('region', r)} medalSort={medalSort} setMedalSort={setMedalSort} />
          ) : (
            <div className="space-y-4 overflow-visible">
              <ASRSearchInput search={search} setSearch={setSearch} gen={gen} setGen={setGen} theme={theme} view={view} mapMode={mapMode} setMapMode={setMapMode} />

              {view === 'map' && mapMode === 'map' ? (
                <ASRGlobalMap courses={filteredCourses} continents={mapRegionStats.continents} cities={mapRegionStats.cities} countries={mapRegionStats.countries} theme={theme} onCourseClick={(t, item) => navigateToEntity('course', item)} onCountryClick={c => navigateToEntity('region', {...c, type: 'country'})} onCityClick={c => navigateToEntity('region', {...c, type: 'city'})} onContinentClick={c => navigateToEntity('region', {...c, type: 'continent'})} />
              ) : (
                <div className={`relative border rounded-[2rem] sm:rounded-[3.5rem] shadow-premium overflow-visible flex flex-col ${theme === 'dark' ? 'bg-zinc-950/40 border-zinc-900' : 'bg-white border-slate-200'}`}>
                  <div className="overflow-visible w-full text-left scrollbar-hide">
                    {list.length > 0 ? (
                       <ASRDataTable 
                        theme={theme} 
                        columns={view === 'setters' ? SETTER_COLS : (view === 'map' ? COURSE_COLS : (view === 'teams' ? TEAM_COLS : PLAYER_COLS))} 
                        sort={view === 'setters' ? viewSorts.setters : (view === 'map' ? viewSorts.courses : (view === 'teams' ? viewSorts.teams : viewSorts.players))} 
                        onSort={handleSort} 
                        data={list} 
                        onRowClick={item => navigateToEntity(view === 'setters' ? 'setter' : (view === 'map' ? 'course' : (view === 'teams' ? 'team' : 'player')), item, view === 'setters' ? 'setter' : null)} 
                        statKeys={view === 'setters' ? ['impact'] : (view === 'map' ? ['totalAllTimeAthletes'] : (view === 'teams' ? ['pts'] : ['rating']))}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-40 opacity-30">
                        <ChevronsRight className="w-8 h-8 text-blue-600 mb-20 scale-[4.5]" strokeWidth={2.5} style={{ transform: 'skewX(-18deg)' }} />
                        <h3 className="text-sm sm:text-2xl font-black uppercase tracking-[0.5em]">{search ? "NO RESULTS FOUND" : "SCANNING LIVE STATS"}</h3>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="animate-in fade-in duration-1000 slide-in-from-bottom-4 overflow-visible pt-8">
                {(view === 'map' || view === 'setters') && <ASRPromotionBanner type="setter" theme={theme} />}
                {(view === 'players' || view === 'teams') && <ASRPromotionBanner type="coach" theme={theme} />}
              </div>
            </div>
          )}
          <footer className="mt-20 text-center opacity-30 font-black uppercase tracking-[0.6em] text-[11px]">© 2026 APEX SPEED RUN</footer>
        </main>
      </div>
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
