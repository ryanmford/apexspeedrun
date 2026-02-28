import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronsRight, Search, X, CornerUpLeft, CornerUpRight, 
  ChevronDown, Sun, Moon, MapPin, Globe, Instagram, Play, Trophy,
  Compass, Info, ChevronRight, Navigation, ShieldCheck,
  Video, HelpCircle, Building2, Map as MapIcon, GraduationCap, 
  HeartHandshake, Rocket, ExternalLink, Sparkles, ShoppingBag, 
  Users, MessageSquare, TrendingUp, Fingerprint, Zap,
  Dna, Ruler, Mountain, Calendar
} from 'lucide-react';

// --- CONSTANTS ---
const SNAPSHOT_KEY = 'asr_data_vault_v1_integrated';
const REFRESH_INTERVAL = 300000; // 5 mins
const SKOOL_LINK = "https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93";

// --- UTILITIES & HELPERS ---

const normalizeName = (n) => n ? String(n).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '').trim() : "";

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
    if (n === "PUERTO RICO" || f === "🇵🇷") return { name: "PUERTO RICO", flag: "🇵🇷" };
    if (n === "USA" || n === "UNITED STATES" || n === "UNITED STATES OF AMERICA") return { name: "USA", flag: "🇺🇸" };
    return { name: name ? String(name).trim() : "UNKNOWN", flag: f || "🏳️" };
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

// --- DATA CONSTANTS ---

const continents = {
  "eu": ["ALBANIA", "ANDORRA", "ARMENIA", "AUSTRIA", "AZERBAIJAN", "BELARUS", "BELGIUM", "BOSNIA AND HERZEGOVINA", "BULGARIA", "CROATIA", "CYPRUS", "CZECHIA", "CZECH REPUBLIC", "DENMARK", "ESTONIA", "FINLAND", "FRANCE", "GEORGIA", "GERMANY", "GREECE", "HUNGARY", "ICELAND", "IRELAND", "ITALY", "KAZAKHSTAN", "KOSOVO", "LATVIA", "LIECHTENSTEIN", "LITHUANIA", "LUXEMBOURG", "MALTA", "MOLDOVA", "MONACO", "MONTENEGRO", "NETHERLANDS", "NORTH MACEDONIA", "NORWAY", "POLAND", "PORTUGAL", "ROMANIA", "RUSSIA", "SAN MARINO", "SERBIA", "SLOVAKIA", "SLOVENIA", "SPAIN", "SWEDEN", "SWITZERLAND", "TURKEY", "UKRAINE", "UK", "UNITED KINGDOM"],
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
    
    .glow-gold { text-shadow: 0 0 12px rgba(251, 191, 36, 0.6); }
    .glow-blue { text-shadow: 0 0 15px rgba(37, 99, 235, 0.7); }
    
    .num-col { font-variant-numeric: tabular-nums; }
    
    .asr-cluster {
      background: #2563eb;
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(37, 99, 235, 0.5);
      cursor: pointer;
    }

    .btn-blue-gradient {
      background: rgba(37, 99, 235, 0.05);
      border: 1.5px solid rgba(37, 99, 235, 0.2);
      color: #2563eb;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 1 !important;
    }
    .btn-blue-gradient:hover {
      background: rgba(37, 99, 235, 0.1);
      border-color: #2563eb;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
    }
    .btn-blue-gradient:active { transform: scale(0.96); }
    .btn-blue-gradient.active {
      background: linear-gradient(145deg, #3b82f6, #2563eb);
      color: white;
      border-color: #2563eb;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
    }

    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    .stat-card-tooltip {
      position: absolute;
      bottom: 110%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
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
      transform: translateX(-50%) translateY(-4px);
    }
    
    .textured-surface { position: relative; overflow: hidden; }
    .textured-surface::after {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0.15;
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
        border-radius: 1.25rem !important;
        padding: 0 !important;
        overflow: hidden !important;
    }
    .leaflet-popup-content {
        margin: 0 !important;
    }
    
    .shadow-premium {
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);
    }
    
    .border-subtle {
      border-color: rgba(0,0,0,0.06);
    }
    .dark .border-subtle {
      border-color: rgba(255,255,255,0.08);
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
    <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] px-1 sm:px-2 mb-4 opacity-50 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} ${className}`}>
        {children}
    </h3>
);

const IconVideoPlay = ({ size = 16, className = "" }) => (
  <Play 
    size={size} 
    strokeWidth={2.5} 
    className={`shrink-0 transition-colors ${className}`} 
  />
);

const FallbackAvatar = ({ name, sizeCls = "text-2xl sm:text-5xl", initialsOverride = "" }) => {
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
    const w = n.trim().split(/\s+/);
    return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : n.slice(0, 2)).toUpperCase();
  };

  const hash = stringToHash(name || "");
  const grad = GRADIENTS[hash % GRADIENTS.length];

  return (
    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black drop-shadow-md rounded-inherit ${sizeCls} textured-surface`}>
      <span className="relative z-10">{getInitials(name)}</span>
    </div>
  );
};

const formatLocationSubtitle = (namesStr, flagsStr, prefix = '') => {
    if (!namesStr && !flagsStr) return <div className="whitespace-normal break-words text-inherit">UNKNOWN 🏳️</div>;
    if (!namesStr) return <div className="whitespace-normal break-words text-inherit">{flagsStr}</div>;
    const names = String(namesStr).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    const flagsMatch = String(flagsStr || '').match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]|🏳️/g) || [];
    
    return (
        <div className="flex flex-col gap-0.5 min-w-0 text-inherit">
            {names.map((name, i) => {
                const flag = flagsMatch[i] || flagsMatch[0] || '';
                return <div key={i} className="whitespace-normal break-words text-inherit">{i === 0 ? prefix : ''}{name} {flag}</div>;
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
    1: { border: theme === 'dark' ? 'border-amber-500' : 'border-amber-600', text: theme === 'dark' ? 'text-amber-500' : 'text-amber-700', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
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

const ASRPerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-blue" };
    return <span className={`inline-flex items-center gap-0.5 text-xs select-none shrink-0 ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const ASRStatCard = ({ label, value, theme, colorClass, glowClass, tooltip, icon }) => {
  return (
    <div className={`stat-card-container relative flex flex-col border p-4 sm:p-5 rounded-3xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200 shadow-sm'} ${tooltip ? 'cursor-help' : ''}`}>
        {tooltip && (
          <div className={`stat-card-tooltip ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-xl'}`}>
            {tooltip}
          </div>
        )}
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 opacity-40`}>
            {label}
            {tooltip && <HelpCircle size={10} className="opacity-40" />}
        </span>
        <div className="flex items-baseline gap-2">
          {icon && <span className="text-sm">{icon}</span>}
          <span className={`text-sm sm:text-xl font-mono font-black num-col ${colorClass || ''} ${glowClass || ''}`}>{value}</span>
        </div>
    </div>
  );
};

const ASRRecordsBlock = ({ mRecord, fRecord, theme }) => {
  const timeColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const labelColor = theme === 'dark' ? 'text-white/30' : 'text-slate-400';
  return (
    <div className="flex flex-col items-end font-mono leading-tight tabular-nums min-w-[65px] sm:min-w-[85px]">
        <div className="flex items-center gap-1">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${labelColor}`}>M:</span>
            <span className={`text-xs sm:text-[14px] font-bold ${timeColor}`}>
                {mRecord !== null && mRecord !== undefined ? mRecord.toFixed(2) : '-'}
            </span>
        </div>
        <div className="flex items-center gap-1">
            <span className={`text-[9px] font-black uppercase tracking-tighter ${labelColor}`}>W:</span>
            <span className={`text-xs sm:text-[14px] font-bold ${timeColor}`}>
                {fRecord !== null && fRecord !== undefined ? fRecord.toFixed(2) : '-'}
            </span>
        </div>
    </div>
  );
};

// --- PROMOTIONAL & CTA COMPONENTS ---

const ASRPromotionBanner = ({ type, theme, minimalist = false }) => {
  const configs = {
    setter: {
      title: "COURSE SETTER CERTIFICATION",
      subtitle: "Become a certified course setter.",
      icon: <GraduationCap className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET CERTIFIED",
      highlight: ""
    },
    coach: {
      title: "STUDY SPEED PARKOUR",
      subtitle: "Become a certified speed parkour coach.",
      icon: <ShieldCheck className="text-white" size={24} />,
      link: SKOOL_LINK,
      btnText: "GET STARTED",
      highlight: ""
    },
    masterclass: {
        title: "VERIFY YOUR RUN",
        subtitle: "Get your runs verified in our community app.",
        icon: <Zap className="text-white" size={24} />,
        link: SKOOL_LINK,
        btnText: "GET VERIFIED",
        highlight: ""
    },
    community: {
        title: "JOIN THE COMMUNITY",
        subtitle: "Join the Apex worldwide community.",
        icon: <Users className="text-white" size={24} />,
        link: SKOOL_LINK,
        btnText: "JOIN NOW",
        highlight: ""
    }
  };

  const config = configs[type];
  if (!config) return null;

  return (
    <a 
      href={config.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="group block w-full my-4 px-6 py-8 sm:py-10 rounded-[2.5rem] sm:rounded-[3rem] promo-card textured-surface shadow-xl hover:scale-[0.99] transition-transform"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
            {config.icon}
          </div>
          <div className="flex flex-col text-left">
            <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tighter leading-none mb-2">{config.title}</h3>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-80">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg group-hover:bg-blue-50 transition-colors">
          {config.btnText} <ChevronRight size={14} strokeWidth={3} />
        </div>
      </div>
    </a>
  );
};

const ASRPatronPill = ({ course, theme, compact = false }) => {
    const isMillennium = course.name?.toUpperCase() === 'MILLENNIUM';
    
    if (!compact) {
      if (isMillennium) {
        return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] border backdrop-blur-2xl animate-in fade-in slide-in-from-top-4 duration-700 shadow-md shrink-0 transition-all hover:scale-[1.01] active:scale-[0.99] group ${theme === 'dark' ? 'bg-blue-600/20 border-blue-400/40' : 'bg-blue-50 border-blue-200'}`}>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-[12px] text-white font-black italic shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:rotate-12 transition-transform">JB</div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white dark:border-blue-900 rounded-full flex items-center justify-center shadow-sm">
                   <ShieldCheck size={9} className="text-blue-900" />
                </div>
              </div>
              <div className="flex flex-col flex-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-500 dark:text-blue-400 opacity-90 leading-none">This course is sponsored by</span>
                  <span className="text-[15px] font-black uppercase tracking-tighter text-blue-700 dark:text-white mt-1">Juicebox.money | Fund Your Thing</span>
              </div>
          </a>
        );
      }
      
      return (
        <a href={SKOOL_LINK} target="_blank" rel="noopener noreferrer" className={`w-full flex items-center justify-between gap-4 px-6 py-4 rounded-[1.5rem] border border-dashed transition-all hover:border-blue-500 hover:bg-blue-500/5 group ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-300 bg-slate-50'}`}>
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:text-blue-500 transition-colors">
                <Building2 size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Partnership Opportunity</span>
                <span className="text-[13px] font-black uppercase tracking-tighter group-hover:text-blue-600 transition-colors">Support the ASR project by adopting a course.</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-current text-[9px] font-black uppercase tracking-widest opacity-30 group-hover:opacity-100 group-hover:text-blue-500 group-hover:border-blue-500 transition-all">
              GET IN TOUCH
            </div>
        </a>
      );
    }

    if (isMillennium) {
      return (
          <a href="https://juicebox.money" target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.05] active:scale-95 group shadow-sm ${theme === 'dark' ? 'bg-blue-600/20 border-blue-400/40' : 'bg-blue-50 border-blue-200'}`}>
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] text-white font-black italic">JB</div>
              <div className="flex flex-col">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-60 leading-none">Sponsored By</span>
                  <span className="text-[10px] font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">Juicebox.money</span>
              </div>
          </a>
      );
    }
    return null;
};

const ASRActionHub = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { icon: <Users size={18} />, label: 'Community (Skool)', desc: 'Join the discussion', link: SKOOL_LINK },
    { icon: <ShoppingBag size={18} />, label: 'Apex Shop', desc: 'Get the official gear', link: SKOOL_LINK },
    { icon: <MessageSquare size={18} />, label: 'Contact Support', desc: 'Need help?', link: SKOOL_LINK },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      {isOpen && (
        <div className={`absolute bottom-full right-0 mb-4 w-72 p-2 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-black/90 border-white/10' : 'bg-white/95 border-slate-200'}`}>
          <div className="p-4 border-b border-current/5 mb-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Apex Action Center</div>
          </div>
          <div className="flex flex-col gap-1">
            {actions.map((act, i) => (
              <a 
                key={i} 
                href={act.link} 
                target="_blank" 
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
              >
                <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl">{act.icon}</div>
                <div>
                  <div className="text-xs font-black uppercase tracking-tight">{act.label}</div>
                  <div className="text-[9px] font-bold opacity-40 uppercase">{act.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 btn-blue-gradient active ${isOpen ? 'rotate-90' : ''}`}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>
    </div>
  );
};

const ASRInlineValueCard = ({ theme, type }) => {
  const cards = {
    skool_training: {
      title: "ASR GLOBAL NETWORK",
      desc: "Join the largest speed parkour network on Skool.",
      icon: <Users size={18} className="text-blue-600" />,
      link: SKOOL_LINK,
      btn: "JOIN NOW"
    },
    shop_gear: {
      title: "Verify Your Run",
      desc: "Submit your video proof via Skool for validation.",
      icon: <Video size={18} className="text-blue-600" />,
      link: SKOOL_LINK,
      btn: "SUBMIT"
    },
    pro_setter: {
        title: "Course Setter Cert",
        desc: "Architecture certification pathway on Skool app.",
        icon: <GraduationCap size={18} className="text-blue-600" />,
        link: SKOOL_LINK,
        btn: "LEARN MORE"
    }
  };
  const c = cards[type];
  if (!c) return null;
  return (
    <div className={`flex items-center justify-between p-6 rounded-3xl border textured-surface ${theme === 'dark' ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200 shadow-sm'}`}>
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white dark:bg-black/40 rounded-2xl shadow-sm text-blue-600">{c.icon}</div>
        <div className="text-left">
          <h5 className="text-xs font-black uppercase tracking-tight">{c.title}</h5>
          <p className="text-[10px] font-bold opacity-60 uppercase">{c.desc}</p>
        </div>
      </div>
      <a href={c.link} target="_blank" className="shrink-0 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 transition-transform">
        {c.btn}
      </a>
    </div>
  );
};

// --- MODALS ---

const ASROnboarding = ({ isOpen, onClose, theme }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      title: "1. Gather Intel",
      desc: "Use the ASR world map to find ASR courses near you. Join our community app to connect with others and access our latest ASR guides and analytics.",
      icon: <Compass size={44} className="text-blue-500" />
    },
    {
      title: "2. Film Your Run",
      desc: "Video proof is everything. Check our community app for filming requirements, official course rules, and live ASR news to ensure that your best performances get verified.",
      icon: <Video size={44} className="text-blue-600" />
    },
    {
      title: "3. Get Verified",
      desc: "Share your fastest clips in the community app for official verification. Once approved, your stats will be updated and broadcast live on the ASR website.",
      icon: <ShieldCheck size={44} className="text-blue-600" />,
      action: "JOIN THE COMMUNITY"
    }
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
      <div className={`w-full max-w-xl rounded-[3rem] p-8 sm:p-14 border ${theme === 'dark' ? 'bg-[#09090b] border-white/10' : 'bg-white border-slate-200'} shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        {step > 0 && (
          <button onClick={prevStep} className="absolute top-8 left-8 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20" title="Go Back">
            <IconCornerUpLeft size={24} />
          </button>
        )}

        <button onClick={onClose} className="absolute top-8 right-8 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20">
          <IconX size={24} />
        </button>
        
        <div className="flex flex-col items-start text-left space-y-10 relative z-10">
          <div className={`p-7 rounded-[2.5rem] textured-surface bg-blue-500/10 animate-subtle-pulse`}>
            {React.cloneElement(steps[step].icon, { className: "relative z-10" })}
          </div>
          
          <div className="space-y-5">
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter leading-[0.9]">
              {steps[step].title}
            </h2>
            <p className="text-lg sm:text-xl font-bold opacity-60 leading-relaxed max-w-md">
              {steps[step].desc}
            </p>
          </div>
          
          <div className="flex gap-2.5 py-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-2.5 rounded-full transition-all duration-500 ${i === step ? 'w-14 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'w-4 bg-current opacity-10'}`} />
            ))}
          </div>

          <div className="w-full flex flex-col items-start gap-4">
            <div className="flex gap-4 w-full">
              {steps[step].action ? (
                <a 
                  href={SKOOL_LINK} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 text-xs sm:text-sm"
                >
                  {steps[step].action} <CornerUpRight size={20} />
                </a>
              ) : (
                <button 
                  onClick={nextStep} 
                  className="flex-1 py-5 btn-blue-gradient active rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 text-xs sm:text-sm"
                >
                  Next <ChevronRight size={20} />
                </button>
              )}
            </div>
            
            <button onClick={onClose} className="text-[11px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity tracking-widest py-2 px-1">
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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-300" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#0a0a0b] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in-[0.98] duration-300 ease-out flex flex-col max-h-[92vh]`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 flex flex-col p-6 sm:p-8 lg:p-10 gap-6 bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/40' : 'from-slate-400/40'} to-transparent`}>
          <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button aria-label="Go Back" onClick={onBack} className={`group p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all shrink-0`} title="Go Back">
                      <IconCornerUpLeft size={16} className={`text-slate-400 group-hover:text-white transition-colors`} />
                  </button>
                  {canGoForward && (
                      <button aria-label="Go Forward" onClick={onForward} className={`group p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all shrink-0`} title="Go Forward">
                          <IconCornerUpRight size={16} className={`text-slate-400 group-hover:text-white transition-colors`} />
                      </button>
                  )}
                  {breadcrumbs && breadcrumbs.length > 0 && (
                      <div className="ml-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] text-white whitespace-nowrap bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg shrink min-w-0">
                          {breadcrumbs.map((b, i) => (
                              <React.Fragment key={i}>
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); onBreadcrumbClick(i); }}
                                      disabled={i === breadcrumbs.length - 1}
                                      className={`transition-colors outline-none whitespace-nowrap ${i === breadcrumbs.length - 1 ? 'opacity-100' : 'opacity-50 cursor-pointer hover:opacity-100 active:opacity-75'}`}
                                  >
                                      {String(b).toUpperCase()}
                                  </button>
                                  {i < breadcrumbs.length - 1 && <span className="opacity-30 shrink-0">/</span>}
                              </React.Fragment>
                          ))}
                      </div>
                  )}
              </div>
              <button aria-label="Close Modal" onClick={onClose} className="p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all shrink-0" title="Close">
                  <IconX size={16} />
              </button>
          </div>
          <div className="w-full">
            {header}
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-6 sm:p-10 space-y-10 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
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
    } catch (e) { console.warn("Cache fail-safe triggered."); }

    const cacheBucket = Math.floor(Date.now() / REFRESH_INTERVAL); 
    const getCsv = (q) => encodeURI(`https://docs.google.com/spreadsheets/d/1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4/gviz/tq?tqx=out:csv&${q}&cb=${cacheBucket}`);

    const safeFetch = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) { return ""; }
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
      
      const hasTotalError = !rM && !rF && !rLive;
      const hasPartialError = !hasTotalError && (!rM || !rF || !rLive || !rSet || !rSettersM || !rSettersF);

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
          const dateIdx = findIdx(['date', 'year']);
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
                  const valDate = dateIdx !== -1 ? String(vals[dateIdx] || "").toUpperCase().trim() : "";
                  const is2026 = valAG === 'YES' || valAG === 'TRUE' || valAG.includes('OPEN') || valDate.includes('2026');

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
                      assistantSetters,
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
          const leadsIdx = headers.findIndex(h => h === 'lead' || h === 'leads');
          const assistsIdx = headers.findIndex(h => h === 'assist' || h === 'assists' || h === 'assistant');
          const setsIdx = headers.findIndex(h => h === 'sets' || h === 'total sets');
          const countryIdx = headers.findIndex(h => h === 'country' || h === 'nation');
          const flagIdx = headers.findIndex(h => h === 'flag' || h === 'emoji' || h === 'region');
          const igIdx = headers.findIndex(h => h === 'ig' || h === 'instagram');

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
                  assists: assistsIdx !== -1 ? (cleanNumeric(vals[assistsIdx]) || 0) : 0
              };
          }).filter(p => p !== null);
      };

      const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
        const result = { allTimePerformances: {}, openPerformances: {}, openRankings: [], allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, atRawBest: {}, opRawBest: {} };
        if (!csv) return result;
        const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 1) return result;
        const OPEN_THRESHOLD = new Date('2026-01-01');
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
        const videoIdx = findIdx(['video', 'proof', 'link', 'url']);
        const tagIdx = findIdx(['tag', 'event', 'category', 'season']);
        
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
          
          const pGender = athleteMetadata[pKey]?.gender || ((genderIdx !== -1 && vals[genderIdx] || "").toUpperCase().startsWith('F') ? 'F' : 'M');
          if (!athleteMetadata[pKey]) {
              athleteMetadata[pKey] = { pKey, name: pName, gender: pGender, region: '🏳️', countryName: '', searchKey: pName.toLowerCase() };
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
          if (isASROpenTag && (!isValidDate || runDate >= OPEN_THRESHOLD)) {
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
            }).sort((a, b) => a.label.localeCompare(b.label));
            
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

        result.openRankings = Object.keys(openAthleteBestTimes).map(pKey => {
          const pGender = athleteMetadata[pKey]?.gender || 'M';
          const perfs = result.openPerformances[pKey] || [];
          const totalPts = perfs.reduce((sum, p) => sum + p.points, 0);
          const totalFires = perfs.reduce((sum, p) => sum + (p.fireCount || 0), 0);
          const meta = athleteMetadata[pKey];
          return {
            id: `open-${pKey}`, name: athleteDisplayNameMap[pKey] || pKey, pKey, gender: pGender,
            rating: perfs.length > 0 ? (totalPts / perfs.length) : 0, runs: perfs.length,
            wins: perfs.filter(p => p.rank === 1).length, pts: totalPts, 
            sets: openAthleteSetCount[pKey] || 0,
            region: meta?.region || '🏳️',
            allTimeRank: meta?.allTimeRank || 9999,
            countryName: meta?.countryName || "",
            igHandle: meta?.igHandle || "",
            avgTime: meta?.avgTime || 0,
            contributionScore: meta?.contributionScore || 0,
            totalFireCount: totalFires,
            searchKey: meta?.searchKey || pKey.toLowerCase()
          };
        });

        return result;
      };

      const pM = processRankingData(rM, 'M'); 
      const pF = processRankingData(rF, 'F');
      const initialMetadata = {};
      pM.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'M', allTimeRank: i + 1 });
      pF.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'F', allTimeRank: i + 1 });
      const processed = processLiveFeedData(rLive, initialMetadata, processSetListData(rSet));
      
      const settersM = processSettersData(rSettersM);
      const settersF = processSettersData(rSettersF);
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
        if (!cityMap[c.city]) cityMap[c.city] = { name: c.city, flag: c.flag, countryName: c.country, continent: c.continent, courses: 0, runs: 0, playersSet: new Set(), coords: c.parsedCoords };
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
        if (!countryMap[fixed.name]) countryMap[fixed.name] = { name: fixed.name, flag: fixed.flag, continent: c.continent, courses: 0, runs: 0, playersSet: new Set(), coords: c.parsedCoords };
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
        if (!map[contName]) map[contName] = { name: contName, flag: c.continentFlag || '🌐', courses: 0, runs: 0, playersSet: new Set(), coords: c.parsedCoords };
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

const CountdownTimer = ({ targetDate, theme }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        let timer;
        const calculate = () => {
            const now = new Date();
            const difference = targetDate.getTime() - now.getTime();
            
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                if (timer) clearInterval(timer);
            }
        };

        timer = setInterval(calculate, 1000);
        calculate();
        return () => { if (timer) clearInterval(timer); };
    }, [targetDate]);

    // Force white color for Brno section pops
    const textColor = 'text-white';

    return (
        <div className="flex justify-between items-center w-full max-w-4xl mx-auto px-2">
            {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
            ].map((unit, index, arr) => (
                <React.Fragment key={unit.label}>
                  <div className="flex flex-col items-center flex-1">
                      <span className={`text-3xl xs:text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter tabular-nums drop-shadow-lg ${textColor}`}>
                          {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className={`text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] mt-1 opacity-70 ${textColor}`}>
                          {unit.label}
                      </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div className={`text-2xl sm:text-4xl font-black mb-4 opacity-40 ${textColor}`}>:</div>
                  )}
                </React.Fragment>
            ))}
        </div>
    );
};

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
        const loadLeaflet = async () => {
          if (!window.L) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
              document.head.appendChild(link);
              
              const script = document.createElement('script');
              script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
              script.onload = () => {
                const clusterCss = document.createElement('link');
                clusterCss.rel = 'stylesheet';
                clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
                document.head.appendChild(clusterCss);
                
                const clusterDefaultCss = document.createElement('link');
                clusterDefaultCss.rel = 'stylesheet';
                clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
                document.head.appendChild(clusterDefaultCss);

                const clusterScript = document.createElement('script');
                clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                clusterScript.onload = () => setIsScriptsLoaded(true);
                document.head.appendChild(clusterScript);
              };
              document.head.appendChild(script);
          } else {
              setIsScriptsLoaded(true);
          }
        };
        loadLeaflet();
    }, []);

    useEffect(() => {
        if (!isScriptsLoaded || !window.L || !mapContainerRef.current || mapRef.current) return;

        const map = window.L.map(mapContainerRef.current, {
            zoomControl: false,
            minZoom: 2,
            maxZoom: 18,
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0,
            worldCopyJump: true,
            preferCanvas: true 
        }).setView([20, 0], 2);
        
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        const initialUrl = theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        tileLayerRef.current = window.L.tileLayer(initialUrl, {
            attribution: '&copy; OSM &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        if (window.L.markerClusterGroup) {
            clusterGroupRef.current = window.L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50,
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                zoomToBoundsOnClick: true,
                iconCreateFunction: (cluster) => {
                    const count = cluster.getChildCount();
                    return window.L.divIcon({ 
                        html: `<div class="flex items-center justify-center w-full h-full font-black text-xs sm:text-sm drop-shadow-md">${count}</div>`,
                        className: 'asr-cluster', 
                        iconSize: window.L.point(36, 36) 
                    });
                }
            });
            map.addLayer(clusterGroupRef.current);
        }
        
        mapRef.current = map;
        setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 100);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isScriptsLoaded, theme]);

    useEffect(() => {
        if (!mapRef.current || !clusterGroupRef.current || !courses.length) return;
        
        clusterGroupRef.current.clearLayers();
        
        courses.forEach(c => {
            if (!c.parsedCoords) return;
            
            const marker = window.L.marker(c.parsedCoords, {
                icon: window.L.divIcon({
                    html: `
                      <div class="w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white shadow-xl transform transition-transform hover:scale-110">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                    `,
                    className: '',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                })
            });

            const popupContent = `
                <div class="p-4 min-w-[140px]">
                    <div class="font-black text-xs uppercase mb-1 text-slate-900">${c.name}</div>
                    <div class="text-[10px] font-bold opacity-60 uppercase text-slate-500">${c.city} ${c.flag}</div>
                    <button class="mt-3 w-full py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">VIEW COURSE</button>
                </div>
            `;

            marker.bindPopup(popupContent, { closeButton: false });
            
            marker.on('click', (e) => {
                onCourseClick('course', c);
            });

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
            <div className={`w-full h-[60vh] sm:h-[75vh] flex flex-col items-center justify-center rounded-3xl border shadow-premium ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                <div className="animate-spin opacity-50 mb-4"><IconSpeed className="text-blue-600" /></div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse opacity-50">Calibrating Satellites...</div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-2xl border border-subtle`}>
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[40]">
              <button 
                onClick={handleFindMe}
                className={`flex items-center gap-2 px-6 py-3.5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all bg-blue-600 border-2 border-blue-600 text-white shadow-xl hover:bg-blue-700 hover:scale-105 active:scale-95`}
              >
                <Navigation size={14} className={isLocating ? 'animate-spin' : ''} />
                Find Courses Near Me
              </button>
            </div>

            <div className="absolute top-4 right-4 z-[40] flex flex-col items-end gap-1.5 pointer-events-none w-[65%] sm:w-auto">
                <div className={`px-4 py-2.5 rounded-2xl border backdrop-blur-xl shadow-lg text-[10px] sm:text-xs font-black uppercase tracking-widest flex items-center justify-between gap-3 sm:gap-4 w-fit ${theme === 'dark' ? 'bg-black/80 border-white/10 text-slate-200' : 'bg-white/90 border-slate-300 text-slate-800'}`}>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`text-blue-600 animate-pulse`}>●</span>
                        <span className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
                            {eventType === 'open' ? 'ASR OPEN' : 'ALL-TIME'} ({courses.length})
                        </span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 left-4 z-[40] flex flex-col gap-2.5 pointer-events-none w-[calc(100%-2rem)] max-w-xs h-[calc(100%-5rem)] sm:h-auto">
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className={`pointer-events-auto w-fit px-6 py-4 rounded-[1.5rem] border backdrop-blur-xl shadow-xl transition-all flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-black/80 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-slate-300 text-slate-900 hover:bg-white'}`}>
                    <Globe size={14} className="shrink-0" />
                    {isPanelOpen ? 'HIDE' : 'COURSES'}
                </button>
                <div className={`pointer-events-auto flex flex-col transition-all duration-300 origin-top-left overflow-hidden rounded-[2rem] border backdrop-blur-xl shadow-2xl ${isPanelOpen ? 'scale-100 opacity-100 flex-1 sm:max-h-[60vh]' : 'scale-95 opacity-0 h-0 border-transparent'} ${theme === 'dark' ? 'bg-black/90 border-white/10 text-white' : 'bg-white/95 border-slate-300 text-slate-900'}`}>
                    <div className={`flex items-center p-2 border-b shrink-0 gap-1 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                        <button onClick={() => setActiveTab('continents')} className={`flex-1 py-2.5 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'continents' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900 shadow-sm') : 'opacity-100'}`}>CONTINENTS</button>
                        <button onClick={() => setActiveTab('countries')} className={`flex-1 py-2.5 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'countries' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900 shadow-sm') : 'opacity-100'}`}>COUNTRIES</button>
                        <button onClick={() => setActiveTab('cities')} className={`flex-1 py-2.5 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors ${activeTab === 'cities' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-900 shadow-sm') : 'opacity-100'}`}>CITIES</button>
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
                                 className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl border border-transparent transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}`}>
                                <div className="flex items-center gap-3 min-w-0 pr-2">
                                    <div className="scale-90 origin-left shrink-0"><ASRRankBadge rank={i + 1} theme={theme} /></div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-[11px] sm:text-[13px] font-black uppercase tracking-tight whitespace-normal break-words leading-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-500`}>{c.name}</span>
                                        <span className="text-xs sm:text-sm mt-0.5">{c.flag}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className={`text-[9px] font-black opacity-30`}>COURSES</span>
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
    const names = text.split(/,|&| and /i).map(n => n.trim()).filter(Boolean);
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {names.map((n, index) => (
                <React.Fragment key={index}>
                    <span 
                        onClick={() => onSetterClick && onSetterClick(n)} 
                        className={onSetterClick ? "cursor-pointer hover:text-current transition-colors underline decoration-current/30 underline-offset-4" : ""}
                    >{n}</span>{index < names.length - 1 && <span className="opacity-40">,</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

const ASRRankList = ({ title, athletes, genderRecord, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, isAllTime }) => {
    const accentColor = 'text-blue-600';
    
    const displayAthletes = [...athletes.slice(0, 10)];
    while (displayAthletes.length < 3) {
      displayAthletes.push(null);
    }

    return (
        <div className="space-y-1">
            <ASRSectionHeading theme={theme}>{title}</ASRSectionHeading>
            <div className="grid grid-cols-1 gap-2">
                {displayAthletes.map((athleteRow, i) => {
                    if (!athleteRow) {
                        return (
                            <div key={`empty-${i}`} className={`flex items-center justify-between p-4 rounded-3xl border opacity-30 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <ASRRankBadge rank={i + 1} theme={theme} />
                                    <span className="text-xs sm:text-[15px] font-black uppercase tracking-widest opacity-40">---</span>
                                </div>
                                <div className="text-xs sm:text-sm font-mono font-black opacity-40">--.--</div>
                            </div>
                        );
                    }
                    
                    const [pKey, time, videoUrl] = athleteRow;
                    const meta = athleteMetadata[pKey] || {};
                    const points = genderRecord ? (genderRecord / time) * 100 : 0;
                    return (
                        <div key={pKey} onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                <ASRRankBadge rank={i + 1} theme={theme} />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-600`}>{athleteDisplayNameMap[pKey]}</span>
                                  <span className="text-[10px] sm:text-xs uppercase font-black opacity-60">{meta.region || '🏳️'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                                <div className="flex flex-col items-end min-w-[65px] sm:min-w-[85px]">
                                    <span className={`text-xs sm:text-sm font-mono font-black num-col ${accentColor}`}>{time.toFixed(2)}</span>
                                    <span className={`text-[10px] font-mono font-black num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{points.toFixed(2)}</span>
                                </div>
                                <div className="w-8 sm:w-10 flex justify-center shrink-0">
                                    {videoUrl && (
                                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="group/play p-2 rounded-full">
                                            <IconVideoPlay size={20} className={`group-hover/play:${accentColor} text-slate-400/50`} />
                                        </a>
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

const ASRSearchInput = ({ search, setSearch, theme, view }) => {
  return (
    <div className="w-full relative group animate-in fade-in slide-in-from-top-2 duration-500 my-6 sm:my-10">
        <div className={`absolute left-6 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-600`}><IconSearch size={18} /></div>
        <input 
          type="text" 
          aria-label="Search" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className={`rounded-[1.5rem] sm:rounded-[2rem] pl-16 pr-12 py-5 sm:py-6 w-full text-base sm:text-sm font-black uppercase tracking-widest outline-none transition-all border border-subtle ${theme === 'dark' ? 'bg-white/[0.03] text-white focus:bg-white/[0.07] shadow-xl' : 'bg-white text-slate-900 shadow-md'} focus:border-blue-600/40`} 
          placeholder={`SEARCH ${view.toUpperCase()}...`} 
        />
        {search && (
          <button 
            onClick={() => setSearch('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
          >
            <IconX size={18} />
          </button>
        )}
    </div>
  );
};

const ASRCourseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, onSetterClick, breadcrumbs, onBreadcrumbClick }) => {
    if (!isOpen || !course) return null;
    
    const stats = [
        { label: 'CR (M)', value: course.allTimeMRecord?.toFixed(2) || '-', icon: <Zap size={14} />, color: 'text-blue-600' },
        { label: 'CR (W)', value: course.allTimeFRecord?.toFixed(2) || '-', icon: <Zap size={14} />, color: 'text-blue-600' },
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
            <div className="flex items-center gap-5 min-w-0 w-full">
                <div className={`w-16 h-16 sm:w-24 sm:h-24 rounded-[1.5rem] border shadow-md shrink-0 overflow-hidden relative ${theme === 'dark' ? 'border-white/10' : 'border-slate-300'} `}>
                  <FallbackAvatar name={course.name} sizeCls="text-xl sm:text-3xl" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <h2 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tighter uppercase whitespace-normal break-words leading-none mb-2">{course.name}</h2>
                    <div className="text-[10px] sm:text-xs font-black uppercase tracking-widest min-w-0 opacity-60">
                        {formatLocationSubtitle(course.country, course.flag, locStr ? locStr + ', ' : '')}
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <a 
                      href={course.demoVideo || "#"} 
                      target={course.demoVideo ? "_blank" : "_self"} 
                      rel="noopener noreferrer" 
                      className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 shadow-sm ${course.demoVideo ? 'border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white active:scale-95' : 'border-slate-400/30 text-slate-400/50 grayscale opacity-60 pointer-events-none'}`}
                  >
                      <Play size={10} className="fill-current" />
                      RULES {course.demoVideo ? '' : '(PENDING)'}
                  </a>
                  {course.coordinates && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.coordinates)}`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white active:scale-95 shadow-sm`}>
                          <MapPin size={10} />
                          PIN
                      </a>
                  )}
                </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <ASRPatronPill course={course} theme={theme} compact={false} />
              <div className="flex sm:hidden items-center gap-2 w-full">
                  <a 
                      href={course.demoVideo || "#"} 
                      target={course.demoVideo ? "_blank" : "_self"} 
                      rel="noopener noreferrer" 
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all border-2 shadow-sm ${course.demoVideo ? 'border-rose-600 text-rose-600 active:scale-95' : 'border-slate-400/30 text-slate-400/50 grayscale opacity-60 pointer-events-none'}`}
                  >
                      <Play size={10} className="fill-current" />
                      RULES {course.demoVideo ? '' : '(TBD)'}
                  </a>
                  {course.coordinates && (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.coordinates)}`} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all border-2 border-blue-600 text-blue-600 active:scale-95 shadow-sm`}>
                          <MapPin size={10} />
                          PIN
                      </a>
                  )}
              </div>
            </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
            <div className="grid grid-cols-1 gap-12 sm:gap-16">
                <ASRRankList title="MEN'S TOP 10" athletes={course.allTimeAthletesM || []} genderRecord={course.allTimeMRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} isAllTime={true} />
                <ASRRankList title="WOMEN'S TOP 10" athletes={course.allTimeAthletesF || []} genderRecord={course.allTimeFRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} isAllTime={true} />
            </div>

            <div className="space-y-6">
                <ASRSectionHeading theme={theme}>COURSE STATS</ASRSectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <div key={i} className={`p-4 rounded-[1.5rem] border text-left flex flex-col gap-1 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between opacity-40">
                                <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                {s.icon}
                            </div>
                            <span className={`text-sm sm:text-base font-mono font-black ${s.color || ''}`}>{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {(course.leadSetters || course.assistantSetters) && (
                <div className="space-y-6 text-left">
                    <ASRSectionHeading theme={theme}>COURSE SETTERS</ASRSectionHeading>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {course.leadSetters && (
                            <div className={`p-6 rounded-3xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300/50 shadow-sm'} group`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Lead Setter</span>
                                <div className={`text-sm sm:text-base font-mono font-black text-blue-600`}>
                                    <SetterDisplay text={course.leadSetters} onSetterClick={onSetterClick} />
                                </div>
                            </div>
                        )}
                        {course.assistantSetters && (
                            <div className={`p-6 rounded-3xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300/50 shadow-sm'} group`}>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">Assistants</span>
                                <div className={`text-sm sm:text-base font-mono font-black text-blue-600`}>
                                    <SetterDisplay text={course.assistantSetters} onSetterClick={onSetterClick} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="pt-4">
              <ASRPromotionBanner type="masterclass" theme={theme} />
            </div>
        </ASRBaseModal>
    );
};

const ASRProfileModal = ({ isOpen, onClose, onBack, onForward, canGoForward, identity, initialRole, theme, allCourses, playerPerformances, openModal, breadcrumbs, jumpToHistory }) => {
    const [activeRole, setActiveRole] = useState(initialRole || 'player');
    const accentColor = 'text-blue-600';

    useEffect(() => { 
        if (isOpen && initialRole) setActiveRole(initialRole);
    }, [identity?.name, isOpen, initialRole]);

    if (!isOpen || !identity) return null;

    const pKey = identity.pKey || normalizeName(identity.name);
    const hasPlayer = !!playerPerformances[pKey];
    const hasSetter = allCourses.some(c => (c.setter || "").toLowerCase().includes(identity.name.toLowerCase()));
    
    const Header = (
        <div className="flex items-center gap-5 sm:gap-8 min-w-0 w-full pr-2 text-left">
            <div className={`w-16 h-16 sm:w-32 sm:h-32 rounded-[2rem] sm:rounded-[2.5rem] border flex items-center justify-center text-2xl sm:text-5xl font-black shadow-xl shrink-0 uppercase overflow-hidden relative ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/5 border-slate-300 text-slate-500'}`}>
                <FallbackAvatar name={identity.name} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 sm:gap-4 mb-1.5 sm:mb-2 min-w-0 flex-wrap sm:flex-nowrap">
                    <h2 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight whitespace-normal break-words leading-tight uppercase">{identity.name}</h2>
                    {identity.igHandle && (
                        <a href={`https://instagram.com/${identity.igHandle}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`w-fit shrink-0 flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full transition-all hover:-translate-y-0.5 shadow-sm border ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-black/5 hover:bg-black/10 text-slate-900 border-slate-200'}`} title={`@${identity.igHandle} on Instagram`}>
                            <div className="text-[#E1306C]"><Instagram size={14} /></div>
                            <span className="text-[9px] sm:text-[11px] font-black tracking-widest uppercase mt-0.5 hidden xs:inline">@{identity.igHandle}</span>
                        </a>
                    )}
                </div>
                <div className="text-[10px] sm:text-base font-black uppercase tracking-widest mt-1.5 sm:mt-0 min-w-0 opacity-60">
                    {formatLocationSubtitle(identity.countryName, identity.region)}
                </div>
            </div>
        </div>
    );

    const renderPlayerContent = () => {
        const courseDataRaw = [...(playerPerformances[pKey] || [])];
        const courseData = courseDataRaw.map(cd => {
          const matched = allCourses.find(c => c.name.toUpperCase() === cd.label.toUpperCase());
          return { 
            ...cd, 
            coordinates: matched?.coordinates, 
            flag: matched?.flag, 
            country: matched?.country,
            city: matched?.city, 
            stateProv: matched?.stateProv, 
            mRecord: matched?.allTimeMRecord, 
            fRecord: matched?.allTimeFRecord 
          };
        }).sort((a, b) => {
            const aIsRecord = a.rank === 1; const bIsRecord = b.rank === 1;
            if (aIsRecord && !bIsRecord) return -1;
            if (!aIsRecord && bIsRecord) return 1;
            if (aIsRecord && bIsRecord) return a.num - b.num;
            return b.points - a.points;
        });

        const totalFires = courseData.reduce((sum, run) => sum + (run.fireCount || 0), 0);
        const countriesSet = new Set(courseData.map(c => normalizeCountryName(c.country)).filter(Boolean));

        const playerStats = [
            { l: 'RATING', v: (identity.rating || 0).toFixed(2), c: accentColor }, 
            { l: 'AVG TIME', v: (identity.avgTime || 0).toFixed(2) },
            { l: 'POINTS', v: (identity.pts || 0).toFixed(2) }, 
            { l: 'RUNS', v: identity.runs || 0 }, 
            { l: 'WINS', v: identity.wins || 0 }, 
            { l: 'WIN %', v: ((identity.wins / (identity.runs || 1)) * 100).toFixed(1) + '%' }, 
            { l: 'CITIES', v: new Set(courseData.map(c => c.city).filter(Boolean)).size || 0 },
            { l: 'COUNTRIES', v: countriesSet.size || 0 },
            { l: '🔥', v: totalFires, g: 'glow-blue', t: 'Fire awards based on speed thresholds' }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-12">
                    {playerStats.map((s, i) => (
                      <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} colorClass={s.c} glowClass={s.g} tooltip={s.t} />
                    ))}
                </div>
                
                <ASRSectionHeading theme={theme} className="text-left">VERIFIED RUNS</ASRSectionHeading>
                <div className="grid grid-cols-1 gap-3 text-left">
                    {courseData.map((c, i) => {
                        const target = allCourses.find(x => x.name.toUpperCase() === c.label.toUpperCase());
                        return (
                          <div key={i} onClick={() => { if(target) openModal('course', target); }} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3 pr-3 min-w-0">
                                  <div 
                                      onClick={(e) => { 
                                          if (c.coordinates) {
                                              e.stopPropagation();
                                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.coordinates)}`, '_blank');
                                          }
                                      }}
                                      className={`p-2.5 rounded-xl transition-all ${c.coordinates ? 'text-slate-400/50 hover:text-blue-600 hover:scale-110' : 'text-slate-400/20'}`}
                                  >
                                    <MapPin size={20} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                      <span 
                                          className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} hover:text-blue-600 leading-none`}
                                      >
                                          {c.label}
                                      </span>
                                      <div className="flex items-center gap-1 mt-1.5">
                                          <span className="text-[10px] sm:text-xs font-black uppercase opacity-40 whitespace-normal break-words">{c.city || 'Unknown'}</span>
                                          <span className="text-[10px] sm:text-sm opacity-100 shrink-0 ml-1">{c.flag || '🏳️'}</span>
                                          <div className="flex items-center gap-1.5 ml-1.5 shrink-0">
                                            {c.rank > 0 && c.rank <= 3 && <ASRPerformanceBadge type={c.rank} />}
                                            {c.fireCount > 0 && <ASRPerformanceBadge type="fire" count={c.fireCount} />}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                                  <div className="flex flex-col items-end min-w-[65px] sm:min-w-[85px]">
                                      <span className={`text-xs sm:text-lg font-mono font-black num-col ${accentColor}`}>{c.points.toFixed(2)}</span>
                                      <span className={`text-[10px] font-mono font-bold -mt-0.5 opacity-60 num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{c.num.toFixed(2)}</span>
                                  </div>
                                  <div className="w-8 flex justify-center shrink-0">
                                    {c.videoUrl && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); window.open(c.videoUrl, '_blank'); }}
                                            className="p-1 transition-all text-slate-400/50 hover:text-blue-600 hover:scale-110"
                                        >
                                          <IconVideoPlay size={20} />
                                        </div>
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

    const renderSetterContent = () => {
        const setterData = identity.setterData || identity;
        const setterCourses = allCourses
            .filter(c => (c.setter || "").toLowerCase().includes(identity.name.toLowerCase()))
            .sort((a, b) => (b.totalAllTimeRuns || 0) - (a.totalAllTimeRuns || 0)); 
        
        const setterStatsGrid = [
            { l: 'IMPACT', v: setterData.impact || 0, c: accentColor, t: 'Total runs completed by players on your courses.' },
            { l: 'SETS', v: setterData.sets || 0 },
            { l: 'LEADS', v: setterData.leads || 0 },
            { l: 'ASSISTS', v: setterData.assists || 0 },
            { l: 'CITIES', v: new Set(setterCourses.map(c => c.city).filter(Boolean)).size || 0 },
            { l: 'COUNTRIES', v: new Set(setterCourses.map(c => normalizeCountryName(c.country)).filter(Boolean)).size || 0 },
            { l: '🪙', v: identity.contributionScore || 0 }
        ];

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-12">
                    {setterStatsGrid.map((s, i) => (
                      <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} colorClass={s.c} tooltip={s.t} />
                    ))}
                </div>

                <ASRSectionHeading theme={theme} className="text-left">VERIFIED SETS</ASRSectionHeading>
                {setterCourses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 text-left">
                        {setterCourses.map((c, i) => (
                          <div key={i} onClick={() => openModal('course', c)} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3 pr-3 min-w-0">
                                  <div 
                                      onClick={(e) => {
                                          if (c.coordinates) {
                                              e.stopPropagation();
                                              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.coordinates)}`, '_blank');
                                          }
                                      }}
                                      className={`p-2.5 rounded-xl transition-all ${c.coordinates ? 'text-slate-400/50 hover:text-blue-600 hover:scale-110' : 'text-slate-400/20'}`}
                                  >
                                    <MapPin size={20} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                      <span 
                                          className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'} hover:text-blue-600 leading-none`}
                                      >
                                          {c.name}
                                      </span>
                                      <div className="flex items-center gap-1 mt-1.5">
                                          <span className="text-[10px] sm:text-xs font-black uppercase opacity-40 whitespace-normal break-words">{c.city || ''}</span>
                                          <span className="text-[10px] sm:text-xs opacity-100 shrink-0 ml-1">{c.flag || '🏳️'}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                                  <div className="flex flex-col items-end min-w-[65px] sm:min-w-[85px]">
                                      <span className={`text-[9px] font-black opacity-40 leading-none mb-1`}>RUNS</span>
                                      <span className={`text-xs sm:text-lg font-mono font-black text-blue-600`}>{c.totalAllTimeRuns || 0}</span>
                                  </div>
                                  <div className="w-8 flex justify-center shrink-0">
                                    {c.demoVideo && (
                                        <div 
                                            onClick={(e) => { e.stopPropagation(); window.open(c.demoVideo, '_blank'); }}
                                            className="p-1 transition-all text-slate-400/50 hover:text-blue-600 hover:scale-110"
                                        >
                                          <IconVideoPlay size={20} />
                                        </div>
                                    )}
                                  </div>
                              </div>
                          </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 opacity-40 text-xs italic text-center rounded-3xl border border-dashed border-current">No linked courses found in database.</div>
                )}
                
                <div className="pt-8">
                  <ASRPromotionBanner type="setter" theme={theme} />
                </div>
            </div>
        );
    };

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={jumpToHistory}>
            <div className={`flex p-1.5 rounded-2xl mb-10 border w-fit mx-auto sm:mx-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-200 border-slate-300'}`}>
                <button onClick={() => setActiveRole('player')} className={`px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeRole === 'player' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}>PLAYER STATS</button>
                <button onClick={() => setActiveRole('setter')} className={`px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeRole === 'setter' ? 'bg-blue-600 text-white shadow-lg' : 'opacity-60 hover:opacity-100'}`}>SETTER STATS</button>
            </div>
            {activeRole === 'player' ? renderPlayerContent() : renderSetterContent()}
            {activeRole === 'player' && (
                <div className="pt-8">
                    <ASRPromotionBanner type="community" theme={theme} />
                </div>
            )}
        </ASRBaseModal>
    );
};

const ASRRegionModal = ({ isOpen, onClose, onBack, onForward, canGoForward, region, theme, athleteMetadata, athleteDisplayNameMap, allCourses, allPlayers, openModal, breadcrumbs, jumpToHistory }) => {
    if (!isOpen || !region) return null;
    const accentColor = 'text-blue-600';

    const regionalCourses = allCourses.filter(c => 
        (region.type === 'city' && c.city === region.name) ||
        (region.type === 'country' && c.country === region.name) ||
        (region.type === 'continent' && c.continent === region.name)
    ).sort((a, b) => (b.totalRuns || 0) - (a.totalRuns || 0));

    const regionalPlayers = allPlayers.filter(p => {
        const countryTerm = normalizeCountryName(region.name);
        const playerCountries = p.countryName.split(/[,\/]/).map(c => normalizeCountryName(c));
        
        const isPuertoRican = playerCountries.includes("PUERTO RICO");
        const matchFound = playerCountries.includes(countryTerm) || 
                          (isPuertoRican && (countryTerm === "USA" || countryTerm === "NORTH AMERICA"));

        const inRegion = (region.type === 'city' && p.city === region.name) ||
                        (region.type === 'country' && matchFound) ||
                        (region.type === 'continent' && getContinentData(p.countryName).name === region.name);
        return inRegion && isQualifiedAthlete(p);
    }).sort((a, b) => (b.rating - a.rating) || (b.runs - a.runs));

    const Header = (
        <div className="flex items-center gap-6 sm:gap-8 min-w-0 w-full pr-2 text-left">
            <div className={`w-16 h-16 sm:w-32 sm:h-32 rounded-[2rem] border shadow-xl shrink-0 overflow-hidden relative ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/5 border-slate-300'}`}>
              <FallbackAvatar name={region.name} initialsOverride={region.name === 'GLOBAL' ? 'GL' : ''} />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
                <h2 className="text-xl sm:text-4xl lg:text-5xl font-black tracking-tight uppercase whitespace-normal break-words leading-tight">{region.name}</h2>
                <div className="text-2xl sm:text-3xl mt-2">{region.flag}</div>
            </div>
        </div>
    );

    const stats = [
        { l: 'COURSES', v: regionalCourses.length },
        { l: 'PLAYERS', v: regionalPlayers.length }
    ];

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={jumpToHistory}>
            <div className="grid grid-cols-2 gap-4 mb-12">
                {stats.map((s, i) => (
                    <ASRStatCard key={i} label={s.l} value={s.v} theme={theme} />
                ))}
            </div>

            <div className="space-y-12 text-left">
                <div>
                    <ASRSectionHeading theme={theme}>TOP LOCAL PLAYERS</ASRSectionHeading>
                    {regionalPlayers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {regionalPlayers.slice(0, 10).map((p, i) => (
                                <div key={p.pKey || i} onClick={() => openModal('player', p)} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-3 pr-3 min-w-0">
                                        <ASRRankBadge rank={i + 1} theme={theme} />
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words transition-colors group-hover:${accentColor}`}>{p.name}</span>
                                            <span className="text-[10px] sm:text-xs uppercase font-black opacity-40">{p.region || '🏳️'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className={`text-xs sm:text-sm font-mono font-black ${accentColor}`}>{p.rating.toFixed(2)}</span>
                                        <span className="text-[9px] uppercase font-black opacity-30">{p.runs} RUNS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 opacity-40 text-xs italic text-center rounded-3xl border border-dashed border-current">No verified local players found.</div>
                    )}
                </div>

                <div>
                    <ASRSectionHeading theme={theme}>REGIONAL COURSES</ASRSectionHeading>
                    <div className="grid grid-cols-1 gap-3">
                        {regionalCourses.map((c, i) => (
                            <div key={i} onClick={() => openModal('course', c)} className={`group flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3 pr-3 min-w-0">
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words transition-colors group-hover:text-blue-600`}>{c.name}</span>
                                        <div className="flex items-center gap-1 mt-1">
                                            <span className="text-[10px] sm:text-xs font-black opacity-40 whitespace-normal break-words">{c.city || ''}</span>
                                            <span className="text-[10px] sm:text-xs ml-1">{c.flag || '🏳️'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 sm:gap-10 shrink-0">
                                    <div className="flex flex-col items-end min-w-[65px] sm:min-w-[85px]">
                                        <span className={`text-[9px] font-black opacity-40`}>RUNS</span>
                                        <span className={`text-xs sm:text-sm font-mono font-black text-blue-600`}>{c.totalRuns || 0}</span>
                                    </div>
                                    <div className="hidden xs:block">
                                      <ASRRecordsBlock mRecord={c.allTimeMRecord} fRecord={c.allTimeFRecord} theme={theme} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="pt-8">
                <ASRPromotionBanner type="coach" theme={theme} />
            </div>
        </ASRBaseModal>
    );
};

const ASRHallOfFame = ({ stats, theme, onPlayerClick, onSetterClick, onRegionClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const tColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const highlightColor = 'text-blue-600';

  return (
    <div className="space-y-12 sm:space-y-20 animate-in fade-in duration-700 pb-32 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[
          { l: 'TOP RATED', k: 'rating' },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'HIGHEST WIN %', k: 'winPercentage' },
          { l: 'MOST COURSE RECORDS', k: 'wins' },
          { l: 'MOST 🪙', k: 'contributionScore' },
          { l: 'MOST 🔥', k: 'totalFireCount' },
          { l: 'MOST IMPACT', k: 'impact' },
          { l: 'MOST SETS', k: 'sets' }
        ].map((sec) => {
          return (
            <div key={sec.k} className={`relative rounded-[2rem] border flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-slate-300 shadow-premium'}`}>
              <div className={`p-5 border-b border-inherit bg-inherit flex items-center justify-between`}>
                  <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 flex-wrap">
                    {sec.l.split(' ').map((word, wi) => (
                        <span key={wi} className={word === '🔥' || word === '🪙' ? 'text-blue-600' : 'opacity-60'}>{word}</span>
                    ))}
                  </h4>
              </div>
              <div className="flex-1">
                  <div className={`divide-y ${theme === 'dark' ? 'divide-white/[0.03]' : 'divide-slate-100'} flex-1`}>
                    {(stats.topStats[sec.k] || []).map((p, i) => (
                      <div key={`${sec.k}-${i}-${p.name}`} className={`group flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors gap-2 cursor-pointer active:scale-[0.98]`} onClick={() => {
                          if (['impact', 'sets'].includes(sec.k)) onSetterClick(p);
                          else onPlayerClick(p);
                      }}>
                        <div className="flex items-center gap-3 min-w-0 pr-1">
                          <ASRRankBadge rank={i + 1} theme={theme} />
                          <div className="flex flex-col">
                            <span className={`text-xs sm:text-[15px] font-black uppercase whitespace-normal break-words group-hover:text-blue-600 transition-colors`}>{p.name}</span>
                            <span className="text-sm sm:text-xl mt-1 leading-none">{p.region || '🏳️'}</span>
                          </div>
                        </div>
                        <span className={`font-mono font-black ${highlightColor} text-xs sm:text-sm shrink-0 tabular-nums`}>{sec.k === 'rating' ? (p.rating || 0).toFixed(2) : (sec.k === 'winPercentage' ? (p.winPercentage || 0).toFixed(1)+'%' : p[sec.k])}</span>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`relative rounded-[2.5rem] sm:rounded-[3.5rem] border border-subtle overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-black/40' : 'bg-white shadow-premium'}`}>
        <div className="p-6 sm:p-10 border-b border-inherit bg-inherit shrink-0">
            <h3 className="text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] opacity-60">WORLDWIDE MEDAL COUNT</h3>
        </div>
        <div className="overflow-auto scrollbar-hide max-h-[60vh] relative w-full">
          <table className="min-w-full relative">
            <thead className={`sticky top-0 z-20 backdrop-blur-xl shadow-sm ${theme === 'dark' ? 'bg-[#121214]/95 text-slate-400' : 'bg-white/95 text-slate-500'}`}>
              <tr className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest`}>
                <ASRHeaderComp l="RANK" k="rank" a="left" w="w-12 sm:w-28 pl-6 sm:pl-10" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="COUNTRY" k="name" a="left" w="w-full px-4" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥇" k="gold" a="right" w="w-12 sm:w-28" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥈" k="silver" a="right" w="w-12 sm:w-28" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥉" k="bronze" a="right" w="w-12 sm:w-28" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="TOTAL" k="total" a="right" w="w-12 sm:w-28 pr-6 sm:pr-10" activeSort={medalSort} handler={setMedalSort} theme={theme} />
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={`medal-row-${c.name}`} onClick={() => onRegionClick({ ...c, type: 'country' })} className="group hover:bg-black/[0.02] transition-colors cursor-pointer">
                  <td className="pl-6 sm:pl-10 py-5 sm:py-8"><ASRRankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="px-4 py-5 sm:py-8">
                    <div className="flex flex-col">
                      <span className={`text-xs sm:text-[15px] font-black uppercase block whitespace-normal break-words ${tColor} group-hover:text-blue-600 transition-colors`}>{c.name}</span>
                      <span className="text-base sm:text-2xl mt-1.5">{c.flag}</span>
                    </div>
                  </td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] text-amber-500`}>{c.gold}</td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] ${tColor}`}>{c.silver}</td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] ${tColor}`}>{c.bronze}</td>
                  <td className={`pr-6 sm:pr-10 text-right font-mono font-black ${tColor} text-xs sm:text-[15px]`}>{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ASRPromotionBanner type="setter" theme={theme} />
    </div>
  );
};

// --- DATA TABLE COMPONENTS ---

const ASRHeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler, theme }) => {
  const accentColor = 'text-blue-600';
  
  return (
    <th className={`${w} px-2 py-5 sm:py-6 cursor-pointer group select-none transition-all border-b border-subtle ${activeSort.key === k ? 'bg-current/[0.03]' : 'hover:bg-current/[0.03]'}`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      <div className={`flex items-center gap-1.5 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className={`uppercase tracking-tighter text-[10px] sm:text-[11px] font-black leading-none`}>{l}</span>
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? accentColor : 'opacity-0 group-hover:opacity-40'}`}>
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
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount(prev => Math.min(prev + 50, data.length));
                }
            },
            { threshold: 0.1, rootMargin: '200px' }
        );
        const target = observerTarget.current;
        const currentTarget = target;
        if (currentTarget) observer.observe(currentTarget);
        return () => { if (currentTarget) observer.unobserve(currentTarget); };
    }, [data.length]);

    const visibleData = useMemo(() => {
        const result = [];
        const baseData = data.slice(0, visibleCount);
        const promoTypes = ['skool_training', 'shop_gear', 'pro_setter'];
        
        let rankedIdx = 0;
        let isUnrankedSection = false;

        baseData.forEach((item, idx) => {
          if (item.isDivider || item.isQualified === false) {
            isUnrankedSection = true;
          }
          
          result.push(item);

          if (!isUnrankedSection && !item.isDivider) {
            rankedIdx++;
            if (rankedIdx > 0 && rankedIdx % 15 === 0) {
              result.push({ 
                isUtility: true, 
                type: promoTypes[Math.floor(rankedIdx / 15) % promoTypes.length] 
              });
            }
          }
        });
        return result;
    }, [data, visibleCount]);

    const renderCell = (col, item) => {
        const val = item[col.key];
        if (col.isRank) return <ASRRankBadge rank={item.currentRank} theme={theme} />;
        
        if (col.type === 'profile') {
            const sub = col.subKey ? item[col.subKey] : null;
            const city = item.city && item.city !== 'UNKNOWN' ? item.city : null;
            return (
                <div className="flex flex-col min-w-0 text-left">
                  <span className={`text-xs sm:text-[15px] font-black uppercase block whitespace-normal break-words transition-colors group-hover:${accentColor}`}>{val}</span>
                  <div className="flex items-center gap-1 mt-1">
                      {city && <span className="text-[10px] sm:text-xs font-black uppercase opacity-40 whitespace-normal break-words">{city}</span>}
                      <span className="text-[10px] sm:text-sm leading-none opacity-100">{sub || '🏳️'}</span>
                  </div>
                </div>
            );
        }
        
        if (col.type === 'number' || col.type === 'highlight') {
            const display = (val === null || val === undefined) ? '-' : (typeof val === 'number' && col.decimals !== undefined ? val.toFixed(col.decimals) : val);
            const colorClass = col.type === 'highlight' ? `${accentColor} font-black` : (col.opacity ? 'opacity-60' : '');
            return <span className={`font-mono font-bold text-xs sm:text-[15px] tabular-nums num-col ${colorClass}`}>{display}</span>;
        }

        if (col.type === 'records') {
            return <ASRRecordsBlock mRecord={item.mRecord} fRecord={item.fRecord} theme={theme} />;
        }
        
        return <span className="text-xs sm:text-[15px] font-bold">{val}</span>;
    };

    return (
        <table className={`min-w-full relative`}>
            <thead className={`sticky top-0 z-20 backdrop-blur-xl shadow-sm border-b border-subtle ${theme === 'dark' ? 'bg-[#18181b]/95 text-slate-400' : 'bg-[#f8fafc]/95 text-slate-500'}`}>
                <tr className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest`}>
                    {columns.map((col, i) => (
                        col.isRank ? 
                            <th key={i} className={`pl-6 sm:pl-10 py-5 sm:py-6 text-left w-12 sm:w-28 whitespace-nowrap border-b border-subtle`}>RANK</th> :
                            <ASRHeaderComp key={col.key} l={col.label} k={col.key} a={col.align} w={col.width} activeSort={sort} handler={onSort} theme={theme} />
                    ))}
                </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                {visibleData.map((item, idx) => {
                    if (item.isDivider) {
                        return (
                            <tr key={`divider-${idx}`} className="bg-transparent pointer-events-none">
                                <td colSpan={columns.length} className="py-6 sm:py-10 text-center px-6">
                                    <div className={`flex items-center gap-6 opacity-30 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                        <div className="h-px bg-current flex-1" />
                                        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] whitespace-nowrap">{item.label}</span>
                                        <div className="h-px bg-current flex-1" />
                                    </div>
                                </td>
                            </tr>
                        );
                    }
                    if (item.isUtility) {
                      return (
                        <tr key={`util-${idx}`} className="bg-transparent">
                          <td colSpan={columns.length} className="px-6 py-4 sm:px-10">
                            <ASRInlineValueCard type={item.type} theme={theme} />
                          </td>
                        </tr>
                      );
                    }
                    return (
                        <tr key={item.id || item.name} onClick={() => onRowClick && onRowClick(item)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${item.isQualified === false ? 'opacity-40' : ''}`}>
                            {columns.map((col, i) => (
                                <td key={i} className={`${col.isRank ? 'pl-6 sm:pl-10 py-4 sm:py-10' : (col.cellClass || `px-2 py-4 sm:py-10 ${col.align === 'right' ? 'text-right' : 'text-left'}`)}`}>
                                    {renderCell(col, item)}
                                </td>
                            ))}
                        </tr>
                    );
                })}
                <tr ref={observerTarget} className="h-1" />
            </tbody>
        </table>
    );
};

// --- NAVIGATION & CONTROLS ---

const ASRNavBar = ({ theme, setTheme, view, setView, onOpenIntro, showIntro }) => {
    const navItems = [{id:'map',l:'MAP'}, {id:'players',l:'PLAYERS'}];
    return (
        <nav className={`fixed top-0 w-full backdrop-blur-2xl border-b z-50 flex items-center justify-between px-4 sm:px-12 transition-all duration-500 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-slate-200/85 border-slate-400/30'} h-auto min-h-[4.5rem] sm:min-h-[6.5rem]`}>
            <div className="group flex items-center gap-3 shrink-0 cursor-default py-3">
                <div className={`text-slate-400 group-hover:text-blue-600 animate-pulse`}><IconSpeed size={28} /></div>
                <span className="font-black tracking-tighter text-sm sm:text-2xl uppercase italic leading-none whitespace-nowrap hidden xs:block">
                    ASR <span className="hidden sm:inline">APEX SPEED RUN</span>
                </span>
            </div>

            <div className="flex-1 flex justify-center items-center px-4">
                <div className="flex items-center gap-2 sm:gap-6 w-full justify-center">
                    {navItems.map(v => (
                        <button key={v.id} onClick={() => setView(v.id)} className={`flex-1 sm:flex-none px-4 sm:px-12 py-2.5 sm:py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${view === v.id ? 'btn-blue-gradient active' : 'btn-blue-gradient'}`}>
                            {v.l}
                        </button>
                    ))}
                    <button onClick={onOpenIntro} className={`hidden sm:flex items-center gap-2 px-8 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] transition-all btn-blue-gradient ${showIntro ? 'active' : ''}`}>
                      <Info size={14} /> GET STARTED
                    </button>
                </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
                <button aria-label="Toggle Theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center border rounded-2xl transition-all border-subtle ${theme === 'dark' ? 'bg-black/40 text-slate-400 hover:text-white' : 'bg-slate-300/50 text-slate-600 hover:text-black'}`}>
                    {theme === 'dark' ? <IconSun /> : <IconMoon />}
                </button>
            </div>
        </nav>
    );
};

const ASRControlBar = ({ view, setView, eventType, setEventType, gen, setGen, theme, onOpenIntro, showIntro, lastNonHofView }) => {
    const titles = { players: 'PLAYERS', map: 'MAP', hof: 'HALL OF FAME' };
    const accentText = 'text-blue-600';

    return (
        <header className={`pt-32 sm:pt-48 pb-8 sm:pb-16 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col gap-8 sm:gap-16`}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 text-left">
              <div className="group flex items-center gap-6">
                <div className={`text-slate-400 group-hover:text-blue-600 transition-colors hidden sm:block`}><IconSpeed size={64} /></div>
                <h1 className={`text-5xl sm:text-8xl font-black uppercase tracking-tighter leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{titles[view] || 'ASR'}</h1>
              </div>
              <button onClick={onOpenIntro} className={`sm:hidden w-fit px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 btn-blue-gradient ${showIntro ? 'active' : ''}`}>
                <Info size={14} /> GET STARTED
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className={`flex items-center p-1.5 rounded-[2rem] border border-subtle w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40' : 'bg-slate-300/50'}`}>
                    <div className="flex flex-wrap gap-1">
                        <button onClick={() => { setEventType('open'); if(view === 'hof') setView(lastNonHofView); }} className={`px-6 sm:px-12 py-3.5 rounded-2xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all ${view !== 'hof' && eventType === 'open' ? 'btn-blue-gradient active' : 'btn-blue-gradient border-transparent'}`}>ASR OPEN</button>
                        <button onClick={() => { setEventType('all-time'); if(view === 'hof') setView(lastNonHofView); }} className={`px-6 sm:px-12 py-3.5 rounded-2xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all ${view !== 'hof' && eventType === 'all-time' ? 'btn-blue-gradient active' : 'btn-blue-gradient border-transparent'}`}>ALL-TIME</button>
                        <button onClick={() => setView('hof')} className={`px-6 sm:px-12 py-3.5 rounded-2xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all ${view === 'hof' ? 'btn-blue-gradient active' : 'btn-blue-gradient border-transparent'}`}>HOF</button>
                    </div>
                </div>
                {view === 'players' && (
                    <div className={`flex items-center p-1.5 rounded-[2rem] border border-subtle w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40' : 'bg-slate-300/50'}`}>
                        <div className="flex gap-1">
                            {[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (
                                <button key={g.id} onClick={() => setGen(g.id)} className={`px-10 py-3.5 rounded-2xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all ${gen === g.id ? 'btn-blue-gradient active' : 'btn-blue-gradient border-transparent'}`}>{g.l}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {eventType === 'open' && view !== 'hof' && (
                <div className={`flex flex-col gap-8 w-full animate-in fade-in slide-in-from-top-4 duration-700 mb-8 sm:mb-12`}>
                    <div className={`flex flex-col items-center justify-center py-20 sm:py-40 px-6 sm:px-12 rounded-[4rem] sm:rounded-[6rem] border border-subtle relative overflow-hidden bg-gradient-to-br from-slate-900 to-blue-900 shadow-2xl`}>
                        <h4 className={`mb-16 text-[10px] sm:text-xs font-black uppercase tracking-[0.8em] text-center opacity-70 text-white`}>THE ASR OPEN STARTS IN</h4>
                        <div className="w-full mb-24 px-4 sm:px-12">
                          <CountdownTimer targetDate={new Date('2026-03-03T00:00:00Z')} theme={theme} />
                        </div>
                        <div className={`flex flex-col items-center gap-8 p-12 sm:p-20 rounded-[4rem] border backdrop-blur-md max-w-2xl w-full text-center relative textured-surface bg-white/10 border-white/20 shadow-2xl`}>
                          <div className="flex flex-col items-center gap-3">
                             <div className={`flex items-center gap-4 text-white`}>
                                <Trophy size={44} className="animate-bounce shrink-0" />
                                <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter leading-none drop-shadow-md">PKE WORLD CHAMPIONSHIPS</h3>
                             </div>
                             <div className={`h-2 w-20 rounded-full bg-white opacity-40 mt-4`} />
                          </div>
                          <p className={`text-base sm:text-2xl font-bold leading-relaxed max-w-md text-white drop-shadow-md`}>
                            Official wildcard pathway for the <span className="underline decoration-blue-400 underline-offset-8">Parkour Earth World Championships</span> this October in Brno, Czechia 🇨🇿
                          </p>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

// --- MAIN APP COMPONENT ---

const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-auto px-4 py-5 min-w-[140px] sm:min-w-[200px]' },
    { label: 'RATING', type: 'highlight', key: 'rating', decimals: 2, align: 'right', width: 'w-16 sm:w-36' },
    { label: 'RUNS', type: 'number', key: 'runs', align: 'right', width: 'w-12 sm:w-24' },
    { label: 'SETS', type: 'number', key: 'sets', align: 'right', width: 'w-12 sm:w-24 pr-6 sm:pr-12' }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-auto px-4 py-5 min-w-[140px] sm:min-w-[200px]' },
    { label: 'PLAYERS', type: 'highlight', key: 'totalAthletes', align: 'right', width: 'w-10 sm:w-28' },
    { label: 'RECORDS', type: 'records', key: 'mRecord', align: 'right', width: 'w-16 sm:w-44 pr-6 sm:pr-12' }
];

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('open'); 
  const [view, setView] = useState('map'); 
  const [lastNonHofView, setLastNonHofView] = useState('map');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showIntro, setShowIntro] = useState(false);
  
  const [modalHistory, setModalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const { data, openData, atPerfs, opPerfs, lbAT, atMet, dnMap, cMet, settersData, atRawBest, isLoading, hasError } = useASRData();
  const isAllTimeContext = view === 'hof' || eventType === 'all-time';

  useEffect(() => {
    if (view !== 'hof') setLastNonHofView(view);
  }, [view]);

  const openModal = useCallback((type, data, roleOverride = null) => {
    setModalHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, { type, data, roleOverride }];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const closeAllModals = useCallback(() => {
    setHistoryIndex(-1);
    setModalHistory([]);
  }, []);

  const goBackModal = useCallback(() => setHistoryIndex(currIdx => Math.max(-1, currIdx - 1)), []);
  const goForwardModal = useCallback(() => setHistoryIndex(currIdx => Math.min(modalHistory.length - 1, currIdx + 1)), [modalHistory.length]);
  const jumpToHistory = useCallback((index) => setHistoryIndex(index), []);

  const activeModal = historyIndex >= 0 ? modalHistory[historyIndex] : null;
  const canGoForward = historyIndex < modalHistory.length - 1;

  const [viewSorts, setViewSorts] = useState({
    players: { key: 'rating', direction: 'descending' },
    courses: { key: 'totalAllTimeRuns', direction: 'descending' }, 
    hof: { key: 'gold', direction: 'descending' }
  });

  const handleSort = (newSort) => {
    const currentViewKey = view === 'map' ? 'courses' : (view === 'players' ? 'players' : view);
    const updated = typeof newSort === 'function' ? newSort(viewSorts[currentViewKey]) : newSort;
    setViewSorts(prev => ({ ...prev, [currentViewKey]: updated }));
  };

  const list = useMemo(() => {
    if (view !== 'players') return []; 
    const src = isAllTimeContext ? data : openData;
    const term = debouncedSearch.toLowerCase();
    const filtered = (src || []).filter(p => p && p.gender === gen && (p.searchKey || "").includes(term));
    if (filtered.length === 0) return [];

    let qual = filtered.filter(isQualifiedAthlete), unranked = filtered.filter(p => !isQualifiedAthlete(p));
    const sort = viewSorts.players;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    
    qual.sort((a, b) => robustSort(a, b, sort.key, dir));
    unranked.sort((a, b) => b.runs - a.runs);

    const finalQual = qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true }));
    const finalUnranked = unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }));
    if (finalQual.length > 0 && finalUnranked.length > 0) {
        return [...finalQual, { isDivider: true, label: "INCOMPLETE VERIFICATION" }, ...finalUnranked];
    }
    return [...finalQual, ...finalUnranked];
  }, [debouncedSearch, viewSorts.players, gen, isAllTimeContext, data, openData, view]);

  const rawCourseList = useMemo(() => {
    const allSetCourses = Object.keys(cMet || {});
    const courseNames = Array.from(new Set([...allSetCourses, ...Object.keys(lbAT.M || {}), ...Object.keys(lbAT.F || {})])).filter(Boolean);
    
    return courseNames.map(name => {
      const athletesMAll = Object.entries((lbAT.M || {})[name] || {}).map(([pKey, time]) => [pKey, time, atRawBest?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const athletesFAll = Object.entries((lbAT.F || {})[name] || {}).map(([pKey, time]) => [pKey, time, atRawBest?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const meta = cMet[name] || {};
      const coordsMatch = meta.coordinates ? String(meta.coordinates).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) : null;
      const continentData = getContinentData(meta.country || 'UNKNOWN');
      const mRecAll = Object.values((lbAT.M || {})[name] || {});
      const fRecAll = Object.values((lbAT.F || {})[name] || {});

      return {
        name, 
        city: meta.city || 'UNKNOWN', 
        country: meta.country || 'UNKNOWN', 
        flag: meta.flag || '🏳️',
        continent: continentData.name, 
        continentFlag: continentData.flag,
        mRecord: mRecAll.length > 0 ? Math.min(...mRecAll) : null,
        fRecord: fRecAll.length > 0 ? Math.min(...fRecAll) : null,
        totalAthletes: new Set([...athletesMAll.map(a => a[0]), ...athletesFAll.map(a => a[0])]).size,
        totalRuns: athletesMAll.length + athletesFAll.length,
        allTimeMRecord: mRecAll.length > 0 ? Math.min(...mRecAll) : null,
        allTimeFRecord: fRecAll.length > 0 ? Math.min(...fRecAll) : null,
        allTimeAthletesM: athletesMAll,
        allTimeAthletesF: athletesFAll,
        totalAllTimeAthletes: new Set([...athletesMAll.map(a => a[0]), ...athletesFAll.map(a => a[0])]).size,
        totalAllTimeRuns: athletesMAll.length + athletesFAll.length,
        parsedCoords: coordsMatch ? [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])] : null, 
        ...meta
      };
    }).filter(c => isAllTimeContext || c.is2026);
  }, [lbAT, isAllTimeContext, cMet, atRawBest]);

  const courseList = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    const filtered = (rawCourseList || []).filter(c => c && (c.searchKey || "").includes(term));
    const sort = viewSorts.courses;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    filtered.sort((a, b) => robustSort(a, b, sort.key, dir));
    return filtered.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, debouncedSearch, viewSorts.courses]);

  const settersWithImpact = useMemo(() => {
    return (settersData || []).map(s => {
        const sNameLower = s.name.toLowerCase();
        const sCourses = rawCourseList.filter(c => (c.setter || "").toLowerCase().includes(sNameLower));
        return { 
            ...s, impact: sCourses.reduce((sum, c) => sum + (c.totalAllTimeRuns || 0), 0),
            sets: sCourses.length
        };
    }).filter(s => isAllTimeContext || s.sets > 0);
  }, [settersData, rawCourseList, isAllTimeContext]);

  const cityList = useMemo(() => calculateCityStats(rawCourseList), [rawCourseList]);
  const countryList = useMemo(() => calculateCountryStats(rawCourseList), [rawCourseList]);
  const continentList = useMemo(() => calculateContinentStats(rawCourseList), [rawCourseList]);

  const hofStats = useMemo(() => {
    if (view !== 'hof' || !data || data.length === 0) return null; 
    return calculateHofStats(data, atPerfs, lbAT, atMet, viewSorts.hof, settersWithImpact);
  }, [data, lbAT, atMet, atPerfs, viewSorts.hof, settersWithImpact, view]);

  const breadcrumbsArr = useMemo(() => (historyIndex < 0) ? [] : modalHistory.slice(0, historyIndex + 1).map(h => h.data.name || 'Detail'), [modalHistory, historyIndex]);

  const renderActiveModal = () => {
    if (!activeModal) return null;
    const modalProps = { 
        isOpen: true, onClose: closeAllModals, onBack: goBackModal, onForward: goForwardModal, 
        canGoForward, theme, breadcrumbs: breadcrumbsArr, onBreadcrumbClick: jumpToHistory,
        jumpToHistory, isAllTime: isAllTimeContext, allCourses: rawCourseList, allPlayers: data
    };
    switch (activeModal.type) {
        case 'player': 
        case 'setter': {
            const pKey = activeModal.data.pKey || normalizeName(activeModal.data.name);
            const athleteData = atMet[pKey] || activeModal.data;
            const setterData = settersWithImpact.find(s => normalizeName(s.name) === pKey);
            return <ASRProfileModal 
                      {...modalProps} 
                      identity={{ ...athleteData, setterData }} 
                      initialRole={activeModal.roleOverride || activeModal.type} 
                      playerPerformances={isAllTimeContext ? atPerfs : opPerfs}
                      openModal={openModal}
                   />;
        }
        case 'course': return <ASRCourseModal {...modalProps} course={activeModal.data} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => openModal('player', p)} onSetterClick={(sName) => { const sObj = settersWithImpact.find(s => s.name.toLowerCase() === sName.toLowerCase()); if (sObj) openModal('setter', sObj); }} />;
        case 'region': return <ASRRegionModal {...modalProps} region={activeModal.data} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} openModal={openModal} />;
        default: return null;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-32 flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#f8fafc] text-slate-900'}`}>
      <CustomStyles />
      <ASRNavBar theme={theme} setTheme={setTheme} view={view} setView={setView} onOpenIntro={() => setShowIntro(true)} showIntro={showIntro} />
      <ASROnboarding isOpen={showIntro} onClose={() => setShowIntro(false)} theme={theme} />
      
      {renderActiveModal()}
      
      <ASRControlBar 
        view={view} 
        setView={setView} 
        eventType={eventType} 
        setEventType={setEventType} 
        gen={gen} 
        setGen={setGen} 
        theme={theme} 
        onOpenIntro={() => setShowIntro(true)}
        showIntro={showIntro}
        lastNonHofView={lastNonHofView}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-12 flex-grow w-full">
        {isLoading && data.length === 0 ? (
            <div className={`border border-subtle rounded-[3.5rem] h-96 animate-pulse ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />
        ) : hasError && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
                <IconX size={48} className="text-blue-600 mb-6 opacity-40" />
                <div className="text-sm font-black uppercase tracking-[0.3em] text-center opacity-40">COMMUNICATIONS OFFLINE</div>
            </div>
        ) : view === 'hof' ? (
            <ASRHallOfFame stats={hofStats} theme={theme} onPlayerClick={p => openModal('player', p)} onSetterClick={s => openModal('setter', s)} onRegionClick={r => openModal('region', r)} medalSort={viewSorts.hof} setMedalSort={handleSort} />
        ) : (
          <div className="space-y-10">
            {view === 'map' && (
                <ASRGlobalMap 
                  courses={rawCourseList} 
                  continents={continentList} 
                  cities={cityList} 
                  countries={countryList} 
                  theme={theme} 
                  eventType={eventType} 
                  onCourseClick={openModal} 
                  onCountryClick={(c) => openModal('region', {...c, type: 'country'})} 
                  onCityClick={(c) => openModal('region', {...c, type: 'city'})} 
                  onContinentClick={(c) => openModal('region', {...c, type: 'continent'})} 
                />
            )}

            <ASRSearchInput search={search} setSearch={setSearch} theme={theme} view={view} />
            
            <div className={`relative border border-subtle rounded-[3rem] sm:rounded-[4rem] shadow-premium overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-black/20' : 'bg-white'}`}>
              <div className="overflow-auto scrollbar-hide max-h-[75vh] relative w-full">
                {(view === 'map' ? courseList.length : list.length) > 0 ? (
                  <ASRDataTable 
                      theme={theme}
                      columns={view === 'map' ? COURSE_COLS : PLAYER_COLS}
                      sort={viewSorts[view === 'map' ? 'courses' : 'players']}
                      onSort={handleSort}
                      data={view === 'map' ? courseList : list}
                      onRowClick={(item) => openModal(view === 'map' ? 'course' : 'player', item)}
                  />
                ) : (
                  <div className={`flex flex-col items-center justify-center py-32 text-center opacity-20`}>
                      <IconSpeed className="text-blue-600 mb-16 scale-[3.5]" />
                      <h3 className="text-sm sm:text-xl font-black uppercase tracking-[0.4em]">SYNC IN PROGRESS</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <ASRActionHub theme={theme} />
      <footer className="mt-32 text-center pb-20 opacity-20 font-black uppercase tracking-[0.5em] text-[10px] sm:text-xs">© 2026 APEX SPEED RUN</footer>
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
