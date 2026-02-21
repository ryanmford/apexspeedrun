import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';

/**
 * APEX SPEED RUN (ASR) - OFFICIAL DASHBOARD
 * Core Model: Gemini 3 Flash
 * Generation Date: 2026-02-20
 * * UPDATE: Phase 1 (Anti-Fragility & Debounce Optimization) applied.
 * * UPDATE: Phase 2 (Lazy Load Memory Optimization) applied.
 * * UPDATE: Phase 3 (Leaflet Singleton & Stability) applied.
 * * UPDATE: Phase 4 (Typography, Skeletons, & Sanitization) applied.
 * * UPDATE: Phase 5 (Virtualization, Gradient Avatars, & Tooltips) applied.
 * * UPDATE: Phase 6 (Persistence, PWA Tags, & Deep Tooltips) applied.
 * * UPDATE: Phase 7 (Map Clustering & Image Lazy Loading) applied.
 * * UPDATE: Phase 8 (Critical Crash Fixes & Safety Fallbacks) applied.
 */

// --- CUSTOM STYLES ---
const CustomStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap');

    @keyframes subtlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
    .animate-subtle-pulse { animation: subtlePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    .glow-gold { filter: drop-shadow(0 0 8px rgba(234, 179, 8, 0.6)); }
    .glow-silver { filter: drop-shadow(0 0 8px rgba(161, 161, 170, 0.5)); }
    .glow-bronze { filter: drop-shadow(0 0 8px rgba(206, 137, 70, 0.6)); }
    .glow-fire { filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.7)); }
    
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }

    /* Leaflet Overrides */
    .leaflet-container { font-family: inherit; z-index: 1; background: transparent; }
    .leaflet-tooltip { font-family: inherit; border-radius: 8px; border: none; box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.3); padding: 8px 12px; }
    .dark-tooltip { background: #121214; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1); }
    .light-tooltip { background: #ffffff; color: #0f172a; border: 1px solid rgba(0,0,0,0.1); }
    .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 10px -1px rgba(0,0,0,0.2) !important; border-radius: 12px !important; overflow: hidden; }
    .leaflet-control-zoom a { color: inherit !important; display: flex !important; align-items: center; justify-content: center; width: 36px !important; height: 36px !important; transition: all 0.2s; }
    .dark-zoom .leaflet-control-zoom a { background-color: #121214 !important; color: #f1f5f9 !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
    .dark-zoom .leaflet-control-zoom a:hover { background-color: #27272a !important; }
    .light-zoom .leaflet-control-zoom a { background-color: #ffffff !important; color: #0f172a !important; border-bottom: 1px solid rgba(0,0,0,0.1) !important; }
    .light-zoom .leaflet-control-zoom a:hover { background-color: #f1f5f9 !important; }
    
    /* Cluster Styles */
    .asr-cluster { border-radius: 50%; border: 3px solid; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .dark-zoom .asr-cluster { background-color: rgba(37, 99, 235, 0.9); border-color: rgba(255, 255, 255, 0.1); color: white; }
    .light-zoom .asr-cluster { background-color: rgba(37, 99, 235, 0.9); border-color: rgba(255, 255, 255, 0.8); color: white; }

    .leaflet-interactive { transition: fill-opacity 0.2s ease, stroke-opacity 0.2s ease, fill 0.2s ease, stroke 0.2s ease; }

    * { 
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
      box-sizing: border-box;
    }
    
    html, body { 
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      text-rendering: optimizeLegibility; 
      width: 100%; 
      margin: 0; 
      padding: 0; 
      overflow-x: hidden;
      overflow-y: auto;
      min-height: 100%;
    }

    .font-mono {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace !important;
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
const IconCornerUpLeft = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IconCornerUpRight = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>
  </svg>
);
const IconArrow = ({ direction }) => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-500 shrink-0 ${direction === 'ascending' ? 'rotate-180' : ''}`}><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>;
const IconSun = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v20M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/><path d="M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>;
const IconMoon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconCourse = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconMapPin = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const IconCity = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
    </svg>
);
const IconGlobe = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
);
const IconInstagram = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);
const IconVideoPlay = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

// --- UI COMPONENTS & UTILS ---
const ASRTooltip = ({ text, children }) => (
  <div className="relative group/tooltip inline-flex items-center justify-center cursor-help">
    {children}
    <div className="absolute bottom-full mb-2 z-[200] w-48 sm:w-56 p-2.5 text-[10px] sm:text-xs font-bold normal-case tracking-normal leading-relaxed rounded-xl bg-black/90 backdrop-blur-xl text-slate-200 border border-white/10 shadow-2xl left-1/2 -translate-x-1/2 pointer-events-none opacity-0 invisible translate-y-1 group-hover/tooltip:opacity-100 group-hover/tooltip:visible group-hover/tooltip:-translate-y-0 transition-all duration-300">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white/10">
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/90 translate-y-[3px]" />
      </div>
    </div>
  </div>
);

const stringToHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const GRADIENTS = [
  'from-rose-500 to-orange-400', 'from-blue-500 to-indigo-600', 'from-emerald-500 to-cyan-600',
  'from-amber-400 to-orange-600', 'from-fuchsia-600 to-pink-600', 'from-violet-600 to-purple-600',
  'from-cyan-500 to-blue-600', 'from-teal-500 to-emerald-600'
];

const FallbackAvatar = ({ name, sizeCls = "text-2xl sm:text-5xl" }) => {
  const hash = stringToHash(name || "");
  const grad = GRADIENTS[hash % GRADIENTS.length];
  return (
    <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black drop-shadow-md ${sizeCls}`}>
      {getInitials(name)}
    </div>
  );
};

const ASRSkeletonTable = ({ theme }) => (
    <div className={`relative border rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col w-full animate-in fade-in duration-500 ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
        <div className={`p-4 sm:p-5 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
             <div className={`h-3 w-12 rounded bg-current opacity-10 animate-pulse`} />
             <div className={`h-3 w-24 rounded bg-current opacity-10 animate-pulse`} />
             <div className="flex-1" />
             <div className={`h-3 w-16 rounded bg-current opacity-10 animate-pulse hidden sm:block`} />
             <div className={`h-3 w-16 rounded bg-current opacity-10 animate-pulse`} />
        </div>
        <div className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center p-3 sm:p-5 gap-3 sm:gap-6">
                    <div className={`h-7 w-7 sm:h-10 sm:w-10 rounded-full bg-current opacity-5 animate-pulse shrink-0`} />
                    <div className="flex-1 space-y-2">
                        <div className={`h-3 sm:h-4 w-32 sm:w-48 rounded bg-current opacity-10 animate-pulse`} />
                        <div className={`h-2 sm:h-3 w-16 sm:w-24 rounded bg-current opacity-5 animate-pulse`} />
                    </div>
                    <div className="flex gap-4 sm:gap-8 items-center shrink-0">
                        <div className={`h-4 w-12 sm:w-16 rounded bg-blue-500/20 animate-pulse`} />
                        <div className={`h-4 w-8 sm:w-12 rounded bg-current opacity-10 animate-pulse hidden sm:block`} />
                        <div className={`h-4 w-8 sm:w-12 rounded bg-current opacity-10 animate-pulse`} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const CountdownTimer = ({ targetDate, theme }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        let timer;
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
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                clearInterval(timer);
            }
        };

        timer = setInterval(calculate, 1000);
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
                    <span className={`text-[10px] sm:text-xs uppercase font-black tracking-[0.1em] sm:tracking-[0.2em] mt-0.5 ${textColor}`}>
                        {unit.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// --- LEAFLET HOOK ---
let isLeafletInjecting = false;

const useLeaflet = () => {
    const [loaded, setLoaded] = useState(!!(window.L && window.L.markerClusterGroup));

    useEffect(() => {
        if (window.L && window.L.markerClusterGroup) {
            setLoaded(true);
            return;
        }

        if (!isLeafletInjecting) {
            isLeafletInjecting = true;
            
            const loadCss = (href) => {
                if (!document.querySelector(`link[href*="${href}"]`)) {
                    const css = document.createElement('link');
                    css.rel = 'stylesheet';
                    css.href = href;
                    document.head.appendChild(css);
                }
            };
            
            // Inject CSS safely
            loadCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
            loadCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css');
            loadCss('https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css');

            // Inject JS safely & sequentially
            if (!document.querySelector('script[src*="leaflet.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = () => {
                    const clusterScript = document.createElement('script');
                    clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
                    clusterScript.onload = () => setLoaded(true);
                    document.head.appendChild(clusterScript);
                };
                document.head.appendChild(script);
            }
        } else {
            // If already injecting, poll gently until ready to prevent race conditions
            const checkLeaflet = setInterval(() => {
                if (window.L && window.L.markerClusterGroup) {
                    setLoaded(true);
                    clearInterval(checkLeaflet);
                }
            }, 100);
            return () => clearInterval(checkLeaflet);
        }
    }, []);

    return loaded;
};

// --- DEBOUNCE HOOK ---
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const useGeoJSON = () => {
    const [data, setData] = useState(null);
    useEffect(() => {
        // Fetch a lightweight open-source dataset of global borders
        fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
            .then(res => res.json())
            .then(setData)
            .catch(err => console.error("Failed to load map borders", err));
    }, []);
    return data;
};

const normalizeCountryName = (name) => {
    let n = String(name || "").toUpperCase().trim();
    // Remove accents for cleaner matching (e.g. MÉXICO -> MEXICO)
    n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const map = {
        'UNITED STATES OF AMERICA': 'USA',
        'UNITED STATES': 'USA',
        'US': 'USA',
        'UNITED KINGDOM': 'UK',
        'UNITED KINGDOM OF GREAT BRITAIN AND NORTHERN IRELAND': 'UK',
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

const getContinentData = (country) => {
    const c = normalizeCountryName(country);
    const eu = ['UK', 'NETHERLANDS', 'CZECHIA', 'SPAIN', 'FRANCE', 'GERMANY', 'ITALY', 'SWITZERLAND', 'AUSTRIA', 'SWEDEN', 'NORWAY', 'DENMARK', 'FINLAND', 'BELGIUM', 'POLAND', 'PORTUGAL', 'IRELAND', 'RUSSIA', 'GREECE', 'CROATIA', 'SERBIA', 'ROMANIA', 'BULGARIA', 'HUNGARY', 'SLOVAKIA', 'SLOVENIA', 'ICELAND', 'LITHUANIA', 'LATVIA', 'ESTONIA', 'UKRAINE', 'BELARUS', 'LUXEMBOURG', 'MALTA', 'CYPRUS', 'ANDORRA', 'MONACO', 'LIECHTENSTEIN', 'SAN MARINO', 'VATICAN CITY'];
    const na = ['USA', 'CANADA', 'MEXICO', 'PUERTO RICO', 'COSTA RICA', 'CUBA', 'PANAMA', 'GUATEMALA', 'BELIZE', 'HONDURAS', 'EL SALVADOR', 'NICARAGUA', 'JAMAICA', 'BAHAMAS', 'HAITI', 'DOMINICAN REPUBLIC', 'TRINIDAD AND TOBAGO', 'BARBADOS', 'CURACAO', 'ARUBA', 'CAYMAN ISLANDS', 'BERMUDA', 'GREENLAND'];
    const sa = ['BRAZIL', 'ARGENTINA', 'CHILE', 'COLOMBIA', 'PERU', 'ECUADOR', 'VENEZUELA', 'BOLIVIA', 'PARAGUAY', 'URUGUAY', 'GUYANA', 'SURINAME', 'FRENCH GUIANA'];
    const as = ['KOREA', 'JAPAN', 'CHINA', 'TAIWAN', 'MACAU', 'SINGAPORE', 'INDIA', 'MALAYSIA', 'THAILAND', 'VIETNAM', 'PHILIPPINES', 'INDONESIA', 'UAE', 'SAUDI ARABIA', 'ISRAEL', 'TURKEY', 'IRAN', 'IRAQ', 'SYRIA', 'JORDAN', 'LEBANON', 'OMAN', 'YEMEN', 'QATAR', 'KUWAIT', 'BAHRAIN', 'PAKISTAN', 'AFGHANISTAN', 'KAZAKHSTAN', 'UZBEKISTAN', 'TURKMENISTAN', 'KYRGYZSTAN', 'TAJIKISTAN', 'MONGOLIA', 'NEPAL', 'BHUTAN', 'BANGLADESH', 'SRI LANKA', 'MYANMAR', 'CAMBODIA', 'LAOS', 'BRUNEI', 'HONG KONG'];
    const oc = ['AUSTRALIA', 'NEW ZEALAND', 'FIJI', 'PAPUA NEW GUINEA', 'SOLOMON ISLANDS', 'VANUATU', 'SAMOA', 'KIRIBATI', 'TONGA', 'MICRONESIA', 'MARSHALL ISLANDS', 'PALAU', 'NAURU', 'TUVALU', 'GUAM'];
    const af = ['SOUTH AFRICA', 'EGYPT', 'MOROCCO', 'KENYA', 'NIGERIA', 'ALGERIA', 'TUNISIA', 'LIBYA', 'SUDAN', 'ETHIOPIA', 'TANZANIA', 'UGANDA', 'RWANDA', 'GHANA', 'SENEGAL', 'COTE D IVOIRE', 'CAMEROON', 'MALI', 'MADAGASCAR', 'ANGOLA', 'MOZAMBIQUE', 'ZAMBIA', 'ZIMBABWE', 'BOTSWANA', 'NAMIBIA'];

    if (eu.includes(c)) return { name: 'EUROPE', flag: '🌍' };
    if (na.includes(c)) return { name: 'NORTH AMERICA', flag: '🌎' };
    if (sa.includes(c)) return { name: 'SOUTH AMERICA', flag: '🌎' };
    if (as.includes(c)) return { name: 'ASIA', flag: '🌏' };
    if (oc.includes(c)) return { name: 'AUSTRALIA / OCEANIA', flag: '🌏' };
    if (af.includes(c)) return { name: 'AFRICA', flag: '🌍' };
    return { name: 'GLOBAL', flag: '🌐' };
};

// --- DATA HELPERS ---
const escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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

const fixCountryEntity = (name, flag) => {
    const n = (name || "").toUpperCase().trim();
    const f = (flag || "").trim();
    if (n === "PUERTO RICO" || f === "🇵🇷") return { name: "PUERTO RICO", flag: "🇵🇷" };
    if (n === "USA" || n === "UNITED STATES" || n === "UNITED STATES OF AMERICA") return { name: "USA", flag: "🇺🇸" };
    // Provide a strict fallback to ensure name is NEVER undefined, avoiding downstream .toLowerCase() crashes
    return { name: name ? String(name).trim() : "UNKNOWN", flag: f || "🏳️" };
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

const formatLocationSubtitle = (namesStr, flagsStr, prefix = '') => {
    if (!namesStr && !flagsStr) return <div className="truncate">{prefix}UNKNOWN 🏳️</div>;
    if (!namesStr) return <div className="truncate">{prefix}{flagsStr}</div>;
    const names = String(namesStr).split(/[,\/]/).map(s => s.trim()).filter(Boolean);
    const flagsMatch = String(flagsStr || '').match(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]|🏳️/g) || [];
    
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            {names.map((name, i) => {
                const flag = flagsMatch[i] || flagsMatch[0] || '';
                return <div key={i} className="truncate">{i === 0 ? prefix : ''}{name} {flag}</div>;
            })}
        </div>
    );
};

// --- DATA PROCESSORS ---
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

  return lines.slice(hIdx + 1).map((line, i) => {
    const vals = parseLine(line); 
    const pName = (vals[nameIdx] || "").trim();
    if (pName.length < 2) return null;
    const rawCountry = countryNameIdx !== -1 ? vals[countryNameIdx]?.trim() : "";
    const rawFlag = flagEmojiIdx !== -1 ? (vals[flagEmojiIdx]?.trim() || "🏳️") : "🏳️";
    const fixed = fixCountryEntity(rawCountry, rawFlag);
    
    let rawIg = igIdx !== -1 ? (vals[igIdx] || "") : "";
    rawIg = rawIg.replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\?.*/, '').replace(/@/g, '').replace(/\/$/, '').trim();
    if (rawIg.includes('/')) rawIg = rawIg.split('/')[0];

    return { 
      id: `${gender}-${normalizeName(pName)}-${i}`, 
      name: pName, pKey: normalizeName(pName), gender, 
      countryName: fixed.name, 
      region: fixed.flag, 
      igHandle: rawIg,
      rating: cleanNumeric(vals[ratingIdx]) || 0, runs: Math.floor(cleanNumeric(vals[runIdx]) || 0), 
      wins: Math.floor(cleanNumeric(vals[winIdx]) || 0), pts: cleanNumeric(vals[ptsIdx]) || 0, 
      sets: Math.floor(cleanNumeric(vals[setIdx]) || 0), 
      contributionScore: cleanNumeric(vals[cIdx]) || 0, totalFireCount: fireIdx !== -1 ? Math.floor(cleanNumeric(vals[fireIdx]) || 0) : 0
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
            
            let combinedSetter = leadSetters;
            if(assistantSetters) combinedSetter = combinedSetter ? `${combinedSetter}, ${assistantSetters}` : assistantSetters;

            const demoVideo = demoIdx !== -1 ? (vals[demoIdx] || "").trim() : "";
            const coordinates = coordsIdx !== -1 ? (vals[coordsIdx] || "").trim() : "";
            const stateProv = stateIdx !== -1 ? (vals[stateIdx] || "").trim().toUpperCase() : "";

            map[course] = { 
                is2026: (vals[dateIdx] || "").includes('2026'), 
                flag: fixed.flag || '🏳️',
                city: (vals[cityIdx] || "").trim().toUpperCase() || "UNKNOWN", 
                stateProv: stateProv,
                country: fixed.name.toUpperCase() || "UNKNOWN", 
                difficulty: (vals[ratingIdx] || "").trim(),
                length: (vals[lengthIdx] || "").trim(),
                elevation: (vals[elevIdx] || "").trim(),
                type: (vals[typeIdx] || "").trim(),
                dateSet: (vals[dateSetIdx] || "").trim(),
                setter: combinedSetter,
                leadSetters,
                assistantSetters,
                demoVideo,
                coordinates
            };
        }
    });
    return map;
};

const processSettersData = (csv) => {
    if (!csv) return [];
    const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 1) return [];
    const headers = parseLine(lines[0]);
    const findIdx = (keys) => headers.findIndex(h => keys.some(k => h.toLowerCase().trim() === k || h.toLowerCase().includes(k)));
    
    const nameIdx = findIdx(['setter', 'name']);
    const leadsIdx = findIdx(['lead', 'leads', 'lead sets']);
    const assistsIdx = findIdx(['assist', 'assists', 'assistant', 'assistant sets']);
    const setsIdx = findIdx(['sets', 'total sets']);

    const countryIdx = findIdx(['country', 'nation']);
    const flagIdx = findIdx(['flag', 'emoji', 'region']);
    const igIdx = findIdx(['ig', 'instagram', 'social']);

    return lines.slice(1).map((line, i) => {
        const vals = parseLine(line);
        const name = vals[nameIdx];
        if (!name) return null;

        const rawCountry = countryIdx !== -1 ? vals[countryIdx] : "";
        const rawFlag = flagIdx !== -1 ? vals[flagIdx] : "";
        const fixed = fixCountryEntity(rawCountry, rawFlag);

        let rawIg = igIdx !== -1 ? (vals[igIdx] || "") : "";
        rawIg = rawIg.replace(/(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/\?.*/, '').replace(/@/g, '').replace(/\/$/, '').trim();
        if (rawIg.includes('/')) rawIg = rawIg.split('/')[0];

        return {
            id: `setter-${normalizeName(name)}-${i}`,
            name: name.trim(),
            region: fixed.flag || '🏳️',
            countryName: fixed.name,
            igHandle: rawIg,
            sets: setsIdx !== -1 ? (cleanNumeric(vals[setsIdx]) || 0) : 0,
            leads: leadsIdx !== -1 ? (cleanNumeric(vals[leadsIdx]) || 0) : 0,
            assists: assistsIdx !== -1 ? (cleanNumeric(vals[assistsIdx]) || 0) : 0
        };
    }).filter(p => p !== null);
};

const processLiveFeedData = (csv, athleteMetadata = {}, courseSetMap = {}) => {
  if (!csv) return { allTimePerformances: {}, openPerformances: {}, openRankings: [], allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, atRawBest: {}, opRawBest: {} };
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return { allTimePerformances: {}, openPerformances: {}, openRankings: [], allTimeLeaderboards: {M:{},F:{}}, openLeaderboards: {M:{},F:{}}, athleteMetadata, athleteDisplayNameMap: {}, courseMetadata: courseSetMap, atRawBest: {}, opRawBest: {} };
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
    
    // dynamically populate metadata for runners who exist in open but not all-time
    // Guard against undefined gender index strings crashing .toUpperCase()
    const pGender = athleteMetadata[pKey]?.gender || ((vals[genderIdx] || "").toUpperCase().startsWith('F') ? 'F' : 'M');
    if (!athleteMetadata[pKey]) {
        athleteMetadata[pKey] = { pKey, name: pName, gender: pGender, region: '🏳️', countryName: '' };
    }
    
    if (!allTimeAthleteBestTimes[pKey]) allTimeAthleteBestTimes[pKey] = {};
    if (!allTimeAthleteBestTimes[pKey][normalizedCourseName] || numericValue < allTimeAthleteBestTimes[pKey][normalizedCourseName].num) {
      allTimeAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue, videoUrl: rawVideo };
    }
    
    if (!allTimeCourseLeaderboards[pGender][normalizedCourseName]) allTimeCourseLeaderboards[pGender][normalizedCourseName] = {};
    if (!allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] || numericValue < allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey]) {
        allTimeCourseLeaderboards[pGender][normalizedCourseName][pKey] = numericValue;
    }
    
    // Validate runDate correctly to avoid Invalid Date breaking the boolean logic
    const isValidDate = runDate && !isNaN(runDate);
    if (rawTag.toUpperCase().includes("ASR OPEN") && (!isValidDate || runDate >= OPEN_THRESHOLD)) {
      if (!openAthleteBestTimes[pKey]) openAthleteBestTimes[pKey] = {};
      if (!openAthleteBestTimes[pKey][normalizedCourseName] || numericValue < openAthleteBestTimes[pKey][normalizedCourseName].num) {
        openAthleteBestTimes[pKey][normalizedCourseName] = { label: rawCourse, value: vals[resultIdx], num: numericValue, videoUrl: rawVideo };
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
        const boardValues = Object.values((allTimeCourseLeaderboards[pGender] || {})[normL] || {});
        const record = boardValues.length > 0 ? Math.min(...boardValues) : data.num;
        const board = (allTimeCourseLeaderboards[pGender] || {})[normL] || {};
        const sorted = Object.entries(board).sort((a, b) => a[1] - b[1]);
        const rank = sorted.findIndex(e => e[0] === pKey) + 1;
        return { label: data.label, value: data.value, num: data.num, rank, points: (record / data.num) * 100, videoUrl: data.videoUrl };
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
      countryName: athleteMetadata[pKey]?.countryName || "",
      igHandle: athleteMetadata[pKey]?.igHandle || ""
    };
  });
  
  return { 
    allTimePerformances: buildPerfs(allTimeAthleteBestTimes), 
    openPerformances: buildPerfs(openAthleteBestTimes), 
    openRankings: openRankingArray,
    allTimeLeaderboards: allTimeCourseLeaderboards, 
    openLeaderboards: openCourseLeaderboards,
    athleteMetadata: athleteMetadata, athleteDisplayNameMap: athleteDisplayNameMap,
    courseMetadata: courseSetMap,
    atRawBest: allTimeAthleteBestTimes,
    opRawBest: openAthleteBestTimes
  };
};

const calculateCityStats = (rawCourseList) => {
    const cityMap = {};
    rawCourseList.forEach(c => {
        if (!cityMap[c.city]) cityMap[c.city] = { name: c.city, flag: c.flag, countryName: c.country, continent: c.continent, courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, playersSet: new Set() };
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
        if (!countryMap[fixed.name]) countryMap[fixed.name] = { name: fixed.name, flag: fixed.flag, continent: c.continent, courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, citiesSet: new Set(), playersSet: new Set() };
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

const calculateContinentStats = (rawCourseList) => {
    const map = {
        'NORTH AMERICA': { name: 'NORTH AMERICA', flag: '🌎', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'SOUTH AMERICA': { name: 'SOUTH AMERICA', flag: '🌎', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'EUROPE': { name: 'EUROPE', flag: '🌍', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'ASIA': { name: 'ASIA', flag: '🌏', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'AUSTRALIA / OCEANIA': { name: 'AUSTRALIA / OCEANIA', flag: '🌏', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'AFRICA': { name: 'AFRICA', flag: '🌍', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() },
        'ANTARCTICA': { name: 'ANTARCTICA', flag: '❄️', courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() }
    };
    
    rawCourseList.forEach(c => {
        const contName = c.continent || 'GLOBAL';
        const contFlag = c.continentFlag || '🌐';
        
        if (!map[contName]) {
            map[contName] = { name: contName, flag: contFlag, courses: 0, runs: 0, totalElevation: 0, elevationCount: 0, countriesSet: new Set(), citiesSet: new Set(), playersSet: new Set() };
        }
        
        map[contName].courses++;
        map[contName].runs += c.totalRuns;
        const elev = cleanNumeric(c.elevation);
        if (elev !== null) { map[contName].totalElevation += elev; map[contName].elevationCount++; }
        map[contName].countriesSet.add(c.country);
        map[contName].citiesSet.add(c.city);
        c.athletesM.forEach(a => map[contName].playersSet.add(a[0]));
        c.athletesF.forEach(a => map[contName].playersSet.add(a[0]));
    });
    
    return Object.values(map).map(cont => ({
        ...cont,
        players: cont.playersSet.size,
        countries: Array.from(cont.countriesSet).filter(cn => cn !== 'UNKNOWN').length,
        cities: Array.from(cont.citiesSet).filter(cn => cn !== 'UNKNOWN').length,
        avgElevation: cont.elevationCount > 0 ? (cont.totalElevation / cont.elevationCount) : 0
    }));
};

const calculateHofStats = (data, atPerfs, lbAT, atMet, cityList, countryList, medalSort, settersWithImpact) => {
    if (!data.length) return null;
    const getFires = (t, g) => g === 'M' ? (t < 7 ? 3 : t < 8 ? 2 : t < 9 ? 1 : 0) : (t < 9 ? 3 : t < 10 ? 2 : t < 11 ? 1 : 0);
    const qualifiedAthletes = data.filter(p => (p.gender === 'M' && p.runs >= 4) || (p.gender === 'F' && p.runs >= 2)).map(p => { 
        const performances = atPerfs[p.pKey] || []; 
        return { 
            ...p, 
            totalFireCount: performances.reduce((sum, perf) => sum + getFires(perf.num, p.gender), 0),
            winPercentage: p.runs > 0 ? (p.wins / p.runs) * 100 : 0
        }; 
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
        runs: [...qualifiedAthletes].sort((a,b) => b.runs - a.runs).slice(0, 10), 
        winPercentage: [...qualifiedAthletes].sort((a,b) => b.winPercentage - a.winPercentage || b.runs - a.runs).slice(0, 10),
        wins: [...qualifiedAthletes].sort((a,b) => b.wins - a.wins).slice(0, 10), 
        impact: [...(settersWithImpact || [])].sort((a,b) => b.impact - a.impact).slice(0, 10),
        sets: [...(settersWithImpact || [])].sort((a,b) => b.sets - a.sets).slice(0, 10), 
        contributionScore: [...qualifiedAthletes].sort((a,b) => b.contributionScore - a.contributionScore).slice(0, 10), 
        totalFireCount: [...qualifiedAthletes].sort((a,b) => b.totalFireCount - a.totalFireCount).slice(0, 10), 
        cityStats: [...cityList].sort((a,b) => b.courses - a.courses).slice(0, 10).map(c => ({ name: c.name, cityStats: c.courses, region: c.flag })), 
        countryStats: [...countryList].sort((a,b) => b.courses - a.courses).slice(0, 10).map(c => ({ name: c.name, countryStats: c.courses, region: c.flag })) 
    }};
};

const ASRPerformanceBadge = ({ type, count = 1 }) => {
    const badges = { 1: "🥇", 2: "🥈", 3: "🥉", fire: "🔥" };
    const glows = { 1: "glow-gold", 2: "glow-silver", 3: "glow-bronze", fire: "glow-fire" };
    return <span className={`inline-flex items-center gap-1 text-xs select-none shrink-0 ${glows[type]}`}>
        {Array.from({ length: count }).map((_, i) => <span key={i}>{badges[type]}</span>)}
    </span>;
};

const ASRProfileCourseList = ({ courses, theme, onCourseClick, filterKey, filterValue, preFiltered }) => {
    const list = preFiltered ? courses : courses.filter(c => c[filterKey] === filterValue);
    const sorted = [...list].sort((a, b) => (b.totalAthletes || 0) - (a.totalAthletes || 0));

    return (
        <div className="grid grid-cols-1 gap-2">
            {sorted.map(c => {
                let locText = '';
                if (c.city && c.city !== 'UNKNOWN') {
                    locText = c.city;
                    if ((c.country === 'USA' || c.country === 'CANADA') && c.stateProv) {
                        locText += `, ${c.stateProv}`;
                    }
                } else {
                    locText = c.country || 'UNKNOWN';
                }

                return (
                    <div key={c.name} onClick={() => onCourseClick(c)} className={`group flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-3 pr-4 min-w-0">
                            <IconCourse />
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs sm:text-base font-black uppercase truncate transition-colors group-hover:text-blue-500">{c.name}</span>
                                <div className="text-[10px] sm:text-xs font-black uppercase flex items-center gap-1 mt-0.5">
                                    <span className="opacity-40 truncate">{locText}</span>
                                    <span className="opacity-100 shrink-0 text-[10px] sm:text-xs">{c.flag}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 sm:gap-6 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] sm:text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} opacity-40`}>RUNS</span>
                                <span className="text-xs sm:text-sm font-mono font-bold text-blue-500">{c.totalRuns || c.totalAthletes}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] sm:text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <span className="opacity-40">M</span> <span className="opacity-100">🥇</span>
                                </span>
                                <span className={`text-xs sm:text-sm font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{c.mRecord?.toFixed(2) || '-'}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] sm:text-[10px] font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <span className="opacity-40">W</span> <span className="opacity-100">🥇</span>
                                </span>
                                <span className={`text-xs sm:text-sm font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{c.fRecord?.toFixed(2) || '-'}</span>
                            </div>
                        </div>
                    </div>
                );
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

const ASRBaseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, theme, header, breadcrumbs, onBreadcrumbClick, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-md bg-black/85 animate-in fade-in duration-300 cursor-pointer" onClick={onClose}>
      <div className={`${theme === 'dark' ? 'bg-[#121214] border-white/10 text-slate-100' : 'bg-[#f1f5f9] border-slate-400/40 text-slate-900'} border w-full max-w-2xl rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl scale-100 animate-in fade-in zoom-in-[0.98] duration-300 ease-out flex flex-col cursor-default max-h-[90vh]`} onClick={e => e.stopPropagation()}>
        <div className={`shrink-0 relative h-fit min-h-[120px] sm:min-h-[160px] p-5 sm:p-10 flex flex-col justify-end bg-gradient-to-b ${theme === 'dark' ? 'from-slate-800/40' : 'from-slate-400/40'} to-transparent`}>
          <div className="absolute top-4 left-4 right-14 flex items-center gap-1.5 z-10 min-w-0">
              <button aria-label="Go Back" onClick={onBack} className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all cursor-pointer shrink-0" title="Go Back">
                  <IconCornerUpLeft size={16} />
              </button>
              {canGoForward && (
                  <button aria-label="Go Forward" onClick={onForward} className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all cursor-pointer shrink-0" title="Go Forward">
                      <IconCornerUpRight size={16} />
                  </button>
              )}
              {breadcrumbs && breadcrumbs.length > 0 && (
                  <div className="ml-1 sm:ml-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white whitespace-nowrap bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-lg shrink min-w-0 pointer-events-auto">
                      {breadcrumbs.map((b, i) => (
                          <React.Fragment key={i}>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); onBreadcrumbClick(i); }}
                                  disabled={i === breadcrumbs.length - 1}
                                  className={`transition-colors outline-none whitespace-nowrap ${i === breadcrumbs.length - 1 ? 'opacity-100' : 'opacity-50 cursor-pointer hover:opacity-100 active:opacity-75'}`}
                              >
                                  {String(b).toUpperCase()}
                              </button>
                              {i < breadcrumbs.length - 1 && <span className="opacity-30 shrink-0 pointer-events-none">/</span>}
                          </React.Fragment>
                      ))}
                  </div>
              )}
          </div>
          <div className="absolute top-4 right-4 z-10 shrink-0">
              <button aria-label="Close Modal" onClick={onClose} className="p-2 sm:p-2.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all cursor-pointer" title="Close">
                  <IconX size={16} />
              </button>
          </div>
          <div className="pt-12 sm:pt-4 w-full">
            {header}
          </div>
        </div>
        <div className={`flex-grow overflow-y-auto p-4 sm:p-10 space-y-6 scrollbar-hide ${theme === 'dark' ? 'bg-[#09090b]' : 'bg-slate-100'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const ASRLocationModal = ({ isOpen, onClose, onBack, onForward, canGoForward, data, type, theme, courses, onCourseClick, breadcrumbs, onBreadcrumbClick }) => {
    if (!isOpen || !data) return null;
    const isCity = type === 'city';
    const isContinent = type === 'continent';
    
    const stats = isCity ? [
        { l: 'RUNS', v: data.runs, c: 'text-blue-500' },
        { l: 'COURSES', v: data.courses },
        { l: 'AVG ELEVATION', v: data.avgElevation ? `${data.avgElevation.toFixed(0)}m` : '-' },
        { l: 'PLAYERS', v: data.players }
    ] : isContinent ? [
        { l: 'RUNS', v: data.runs, c: 'text-blue-500' },
        { l: 'COUNTRIES', v: data.countries },
        { l: 'COURSES', v: data.courses },
        { l: 'PLAYERS', v: data.players }
    ] : [
        { l: 'RUNS', v: data.runs, c: 'text-blue-500' },
        { l: 'CITIES', v: data.cities },
        { l: 'COURSES', v: data.courses },
        { l: 'PLAYERS', v: data.players }
    ];

    const Header = (
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full pr-2">
            <div className={`w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] border flex items-center justify-center text-blue-500 shrink-0 shadow-xl ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'}`}>
                {isCity ? <IconCity size={32} /> : <IconGlobe size={32} />}
            </div>
            <div className="flex flex-col min-w-0 justify-center">
                <h2 className="text-xl sm:text-4xl font-black tracking-tight uppercase truncate leading-none">{data.name}</h2>
                <div className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] mt-1.5 sm:mt-3 min-w-0">
                    {type === 'continent' || type === 'country' ? (
                        <span className="text-base sm:text-xl leading-none truncate block">{data.flag}</span>
                    ) : (
                        formatLocationSubtitle(data.countryName || data.name, data.flag)
                    )}
                </div>
                </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                    {type === 'city' ? 'CITY STATS' : type === 'continent' ? 'CONTINENT STATS' : 'COUNTRY STATS'}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {stats.map((s, i) => (
                        <div key={i} className={`flex flex-col border p-2.5 sm:p-5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-50 whitespace-nowrap">{s.l}</span>
                            <span className={`text-xs sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
                <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                    COURSES
                </h3>
                <ASRProfileCourseList courses={courses} theme={theme} onCourseClick={onCourseClick} filterKey={type} filterValue={data.name} />
            </div>
        </ASRBaseModal>
    );
};

const ASRSetterModal = ({ isOpen, onClose, onBack, onForward, canGoForward, setter, theme, courses, onCourseClick, breadcrumbs, onBreadcrumbClick }) => {
    const [imgError, setImgError] = useState(false);
    
    useEffect(() => { 
        if (isOpen) setImgError(false); 
    }, [setter?.name, isOpen]);

    if (!isOpen || !setter) return null;

    const setterCourses = courses.filter(c => 
        (c.setter || "").toLowerCase().includes(setter.name.toLowerCase())
    );

    const stats = [
        { l: 'IMPACT', v: setter.impact, c: 'text-blue-500', tip: 'Total athlete runs on courses you have set.' },
        { l: 'SETS', v: setter.sets },
        { l: 'LEADS', v: setter.leads },
        { l: 'ASSISTS', v: setter.assists }
    ];

    const avatarUrl = `./avatars/${normalizeName(setter.name)}.jpg`;

    const Header = (
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full pr-2">
            <div className={`w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] border flex items-center justify-center text-2xl sm:text-5xl font-black shadow-xl shrink-0 uppercase overflow-hidden relative ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>
                {!imgError ? (
                    <img loading="lazy" src={avatarUrl} alt={setter.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
                ) : (
                    <FallbackAvatar name={setter.name} />
                )}
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
                    <h2 className="text-xl sm:text-4xl font-black tracking-tight leading-none truncate uppercase">{setter.name}</h2>
                    {setter.igHandle && (
                        <a href={`https://instagram.com/${setter.igHandle}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`w-fit shrink-0 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md border ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-black/5 hover:bg-black/10 text-slate-900 border-slate-200'}`} title={`@${setter.igHandle} on Instagram`}>
                            <div className="text-[#E1306C]"><IconInstagram size={14} className="sm:w-4 sm:h-4" /></div>
                            <span className="text-[9px] sm:text-[11px] font-black tracking-widest uppercase mt-0.5 hidden xs:inline">@{setter.igHandle}</span>
                        </a>
                    )}
                </div>
                <div className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] mt-1.5 sm:mt-0 min-w-0">
                    {formatLocationSubtitle(setter.countryName, setter.region)}
                </div>
            </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
                <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                    SETTER STATS
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {stats.map((s, i) => (
                        <div key={i} className={`flex flex-col border p-2.5 sm:p-5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-50 whitespace-nowrap flex items-center">
                                {s.tip ? <ASRTooltip text={s.tip}><span className="cursor-help border-b border-dashed border-current">{s.l}</span></ASRTooltip> : s.l}
                            </span>
                            <span className={`text-xs sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
                <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                    COURSES SET
                </h3>
                {setterCourses.length > 0 ? (
                    <ASRProfileCourseList 
                        courses={setterCourses} 
                        theme={theme} 
                        onCourseClick={onCourseClick} 
                        preFiltered={true}
                    />
                ) : (
                    <div className="p-4 opacity-50 text-xs italic">No linked courses found in database.</div>
                )}
            </div>
        </ASRBaseModal>
    );
};

const ASRPlayerModal = ({ isOpen, onClose, onBack, onForward, canGoForward, player: p, theme, performanceData, onCourseClick, breadcrumbs, onBreadcrumbClick }) => {
  const [imgError, setImgError] = useState(false);
  
  useEffect(() => { 
    if (isOpen) setImgError(false); 
  }, [p?.pKey, isOpen]);

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

  const tooltipMap = { 
      '🔥': "Fire Tokens: Awarded for elite sub-7 (M) / sub-9 (W) times.", 
      '🪙': "Contribution Score: Earned by setting runs, adding courses, and community activity." 
  };

  const avatarUrl = `./avatars/${pKey}.jpg`;

  const Header = (
    <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full pr-2">
        <div className={`w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] border flex items-center justify-center text-2xl sm:text-5xl font-black shadow-xl shrink-0 uppercase overflow-hidden relative ${theme === 'dark' ? 'bg-black/30 border-white/10 text-slate-500' : 'bg-white/50 border-slate-300 text-slate-500'}`}>
            {!imgError ? (
                <img loading="lazy" src={avatarUrl} alt={p.name} onError={() => setImgError(true)} className="w-full h-full object-cover" />
            ) : (
                <FallbackAvatar name={p.name} />
            )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 min-w-0">
                <h2 className="text-xl sm:text-4xl font-black tracking-tight leading-none truncate uppercase">{p.name}</h2>
                {p.igHandle && (
                    <a href={`https://instagram.com/${p.igHandle}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`w-fit shrink-0 flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full transition-all hover:-translate-y-0.5 shadow-sm hover:shadow-md border ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white border-white/10' : 'bg-black/5 hover:bg-black/10 text-slate-900 border-slate-200'}`} title={`@${p.igHandle} on Instagram`}>
                        <div className="text-[#E1306C]"><IconInstagram size={14} className="sm:w-4 sm:h-4" /></div>
                        <span className="text-[9px] sm:text-[11px] font-black tracking-widest uppercase mt-0.5 hidden xs:inline">@{p.igHandle}</span>
                    </a>
                )}
            </div>
            <div className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] mt-1.5 sm:mt-0 min-w-0">
                {formatLocationSubtitle(p.countryName, p.region)}
            </div>
        </div>
    </div>
  );

  return (
    <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                PLAYER STATS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {stats.map((s, i) => (
                <div key={i} className={`flex flex-col border p-2 sm:p-5 rounded-xl sm:rounded-2xl transition-all ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] mb-1 sm:mb-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} flex items-center`}>
                    {tooltipMap[s.l] ? <ASRTooltip text={tooltipMap[s.l]}><span className="cursor-help border-b border-dashed border-current">{s.l}</span></ASRTooltip> : s.l}
                </span>
                <span className={`text-xs sm:text-xl font-mono font-black num-col ${s.c || ''} ${s.g || ''}`}>{s.v}</span>
                </div>
            ))}
            </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                COURSES RUN
            </h3>
            <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
            {courseData.map((c, i) => (
                <div key={i} onClick={() => onCourseClick?.(c.label)} className={`group flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                    <div className="flex flex-col min-w-0 pr-3">
                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider transition-colors group-hover:text-blue-500 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.label}</span>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {c.rank > 0 && c.rank <= 3 && <ASRPerformanceBadge type={c.rank} />}
                        {c.rank >= 4 && <span className="text-[10px] font-mono font-black italic opacity-40">{c.rank}</span>}
                        {getFires(c.num, p.gender) > 0 && <ASRPerformanceBadge type="fire" count={getFires(c.num, p.gender)} />}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="text-xs sm:text-lg font-mono font-black text-blue-500 num-col">{c.points.toFixed(2)}</span>
                            <span className={`text-[10px] sm:text-[10px] font-mono font-bold -mt-0.5 sm:-mt-1 opacity-70 num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{c.num.toFixed(2)}</span>
                        </div>
                        <div className="w-8 flex justify-end shrink-0">
                            {c.videoUrl && (
                                <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`p-1.5 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                                    <IconVideoPlay size={16} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>
    </ASRBaseModal>
  );
};

const ASRRankList = ({ title, athletes, genderRecord, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick }) => (
    <div className="space-y-2 sm:space-y-3">
        <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>{title}</h3>
        <div className="grid grid-cols-1 gap-1.5 sm:gap-2">
            {athletes.slice(0, 10).map(([pKey, time, videoUrl], i) => {
                const meta = athleteMetadata[pKey] || {};
                const points = genderRecord ? (genderRecord / time) * 100 : 0;
                return (
                    <div key={pKey} onClick={() => onPlayerClick?.({ ...meta, pKey, name: athleteDisplayNameMap[pKey] || pKey })} className={`group flex items-center justify-between p-2.5 sm:p-4 rounded-lg sm:rounded-xl border transition-all cursor-pointer active:scale-[0.98] ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-white border-slate-300/50 shadow-sm hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-3">
                            <ASRRankBadge rank={i + 1} theme={theme} />
                            <div className="flex flex-col min-w-0">
                              <span className={`text-xs sm:text-sm font-black uppercase transition-colors group-hover:text-blue-500 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{athleteDisplayNameMap[pKey]}</span>
                              <span className="text-[10px] sm:text-xs uppercase font-black">{meta.region || '🏳️'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <div className="flex flex-col items-end">
                                <span className="text-xs sm:text-sm font-mono font-black text-blue-500 num-col">{time.toFixed(2)}</span>
                                <span className={`text-[10px] sm:text-[10px] font-mono font-black num-col ${theme === 'dark' ? 'text-white/60' : 'text-slate-400'}`}>{points.toFixed(2)}</span>
                            </div>
                            <div className="w-8 flex justify-end shrink-0">
                                {videoUrl && (
                                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`p-1.5 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`}>
                                        <IconVideoPlay size={16} />
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

const SetterDisplay = ({ text, onSetterClick }) => {
    if (!text) return null;
    const names = text.split(/,|&| and /i).map(n => n.trim()).filter(Boolean);
    return (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {names.map((n, idx) => (
                <React.Fragment key={idx}>
                    <span 
                        onClick={() => onSetterClick && onSetterClick(n)} 
                        className={onSetterClick ? "cursor-pointer hover:text-blue-500 transition-colors underline decoration-blue-500/30 underline-offset-4" : ""}
                    >
                        {n}
                    </span>
                    {idx < names.length - 1 && <span className="opacity-40">,</span>}
                </React.Fragment>
            ))}
        </div>
    );
};

const ASRCourseModal = ({ isOpen, onClose, onBack, onForward, canGoForward, course, theme, athleteMetadata, athleteDisplayNameMap, onPlayerClick, onSetterClick, breadcrumbs, onBreadcrumbClick }) => {
    if (!isOpen || !course) return null;
    const displayDifficulty = course.difficulty ? Array.from(course.difficulty).join(' ') : '-';
    const isPlural = (str) => String(str).includes(',') || String(str).includes('&') || String(str).toLowerCase().includes(' and ');
    
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

    let locStr = '';
    if (course.city && course.city !== 'UNKNOWN') {
        locStr = course.city;
        if ((course.country === 'USA' || course.country === 'CANADA') && course.stateProv) {
            locStr += `, ${course.stateProv}`;
        }
        locStr += ', ';
    }

    const Header = (
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full pr-2">
            <div className={`w-16 h-16 sm:w-28 sm:h-28 rounded-2xl sm:rounded-[2rem] border flex items-center justify-center text-blue-500 shrink-0 shadow-xl ${theme === 'dark' ? 'bg-black/30 border-white/10' : 'bg-white/50 border-slate-300'} `}><IconCourse size={32} /></div>
            <div className="flex flex-col min-w-0 justify-center">
                <h2 className="text-xl sm:text-4xl font-black tracking-tight uppercase truncate leading-none">{course.name}</h2>
                <div className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] mt-1.5 sm:mt-3 min-w-0">
                    {formatLocationSubtitle(course.country, course.flag, locStr)}
                </div>
            </div>
        </div>
    );

    return (
        <ASRBaseModal isOpen={isOpen} onClose={onClose} onBack={onBack} onForward={onForward} canGoForward={canGoForward} theme={theme} header={Header} breadcrumbs={breadcrumbs} onBreadcrumbClick={onBreadcrumbClick}>
            {(course.demoVideo || course.coordinates) && (
                <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6">
                    {course.demoVideo && (
                        <a 
                            href={course.demoVideo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex-1 flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.25rem] border-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${theme === 'dark' ? 'bg-[#cc0000]/10 border-[#cc0000]/30 text-[#ff4444] hover:bg-[#cc0000]/20 hover:border-[#cc0000]/50' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300'}`}
                        >
                            <IconVideoPlay size={18} />
                            <span className="font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs">RULES VIDEO</span>
                        </a>
                    )}
                    {course.coordinates && (
                        <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(course.coordinates)}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex-1 flex items-center justify-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-[1rem] sm:rounded-[1.25rem] border-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'}`}
                        >
                            <IconMapPin size={18} />
                            <span className="font-black uppercase tracking-[0.15em] text-[10px] sm:text-xs">MAP PIN</span>
                        </a>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6">
                <ASRRankList title="MEN'S TOP 10" athletes={course.athletesM} genderRecord={course.mRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
                <ASRRankList title="WOMEN'S TOP 10" athletes={course.athletesF} genderRecord={course.fRecord} theme={theme} athleteMetadata={athleteMetadata} athleteDisplayNameMap={athleteDisplayNameMap} onPlayerClick={onPlayerClick} />
            </div>

            <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-6">
                <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>COURSE STATS</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {stats.map((s, i) => (
                        <div key={i} className={`flex flex-col border p-2.5 sm:p-5 rounded-xl ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1 opacity-50 whitespace-nowrap">{s.l}</span>
                            <span className={`text-xs sm:text-base font-mono font-black num-col ${s.c || ''}`}>{s.v}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            {(course.leadSetters || course.assistantSetters) && (
                <div className="space-y-2 sm:space-y-3 mt-6 sm:mt-8">
                    <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] px-1 sm:px-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>COURSE SETTERS</h3>
                    <div className="space-y-2">
                         {course.leadSetters && (
                            <div className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider opacity-50 mb-1">{isPlural(course.leadSetters) ? 'LEADS' : 'LEAD'}</span>
                                <span className={`text-xs sm:text-base font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <SetterDisplay text={course.leadSetters} onSetterClick={onSetterClick} />
                                </span>
                            </div>
                        )}
                         {course.assistantSetters && (
                            <div className={`p-3 sm:p-4 rounded-xl border flex flex-col justify-center ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300/50 shadow-sm'}`}>
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider opacity-50 mb-1">{isPlural(course.assistantSetters) ? 'ASSISTANTS' : 'ASSISTANT'}</span>
                                <span className={`text-xs sm:text-base font-mono font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    <SetterDisplay text={course.assistantSetters} onSetterClick={onSetterClick} />
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ASRBaseModal>
    );
};

const ASRHeaderComp = ({ l, k, a = 'left', w = "", activeSort, handler, theme, tooltip }) => {
  const content = (
      <div className={`flex items-center gap-1 ${a === 'right' ? 'justify-end' : 'justify-start'}`}>
        <span className={`uppercase tracking-tighter text-[10px] sm:text-xs font-black leading-none ${tooltip ? 'cursor-help border-b border-dashed border-current' : ''}`}>{l}</span>
        <div className={`transition-opacity shrink-0 ${activeSort.key === k ? 'text-blue-500' : 'opacity-0 group-hover:opacity-40'}`}>
          <IconArrow direction={activeSort.key === k ? activeSort.direction : 'descending'} />
        </div>
      </div>
  );
  return (
    <th className={`${w} px-2 py-4 sm:py-5 cursor-pointer group select-none transition-colors border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} ${activeSort.key === k ? 'bg-blue-600/10' : ''} hover:bg-blue-600/5`} onClick={() => handler(p => ({ key: k, direction: p.key === k && p.direction === 'descending' ? 'ascending' : 'descending' }))}>
      {tooltip ? <ASRTooltip text={tooltip}>{content}</ASRTooltip> : content}
    </th>
  );
};

const ASRDataTable = ({ columns, data, sort, onSort, theme, onRowClick }) => {
    const [visibleCount, setVisibleCount] = useState(50);
    const observerTarget = useRef(null);

    // Reset pagination when data changes (e.g. searching or changing tabs/sorts)
    useEffect(() => {
        setVisibleCount(50);
    }, [data, sort]);

    // Progressive rendering intersection observer
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
        observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [data.length]);

    const visibleData = useMemo(() => data.slice(0, visibleCount), [data, visibleCount]);

    const renderCell = (col, item) => {
        const val = item[col.key];
        if (col.isRank) return <ASRRankBadge rank={item.currentRank} theme={theme} />;
        
        if (col.type === 'profile') {
            const sub = col.subKey ? item[col.subKey] : null;
            return (
                <div className="flex flex-col">
                    <span className="text-xs sm:text-[15px] font-black uppercase tracking-tight block leading-tight">{val}</span>
                    {sub && <span className="text-base sm:text-2xl mt-0.5 sm:mt-1 leading-none drop-shadow-sm">{sub || '🏳️'}</span>}
                </div>
            );
        }
        
        if (col.type === 'number' || col.type === 'highlight') {
            const display = (val === null || val === undefined) ? '-' : (typeof val === 'number' && col.decimals !== undefined ? val.toFixed(col.decimals) : val);
            const colorClass = col.type === 'highlight' ? 'text-blue-500' : (col.opacity ? 'opacity-60' : '');
            return <span className={`font-mono font-bold text-xs sm:text-[15px] tabular-nums num-col ${colorClass}`}>{display}</span>;
        }
        
        return <span className="text-xs sm:text-[15px] font-bold">{val}</span>;
    };

    return (
        <table className={`data-table min-w-full relative`}>
            <thead className={`sticky top-0 z-20 backdrop-blur-xl shadow-sm ${theme === 'dark' ? 'bg-[#18181b]/95 text-slate-400' : 'bg-[#f8fafc]/95 text-slate-500'}`}>
                <tr className={`text-[10px] sm:text-xs font-black uppercase tracking-widest`}>
                    {columns.map((col, i) => (
                        col.isRank ? 
                            <th key={i} className={`pl-3 sm:pl-10 py-4 sm:py-5 text-left w-12 sm:w-28 whitespace-nowrap border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>RANK</th> :
                            <ASRHeaderComp key={col.key} l={col.label} k={col.key} a={col.align} w={col.width} activeSort={sort} handler={onSort} theme={theme} tooltip={col.tooltip} />
                    ))}
                </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
                {visibleData.map((item, idx) => {
                    if (item.isDivider) {
                        return (
                            <tr key={`divider-${idx}`} className="bg-transparent pointer-events-none">
                                <td colSpan={columns.length} className="py-4 sm:py-6 text-center">
                                    <div className={`flex items-center gap-4 opacity-40 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                        <div className="h-px bg-current flex-1" />
                                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap">{item.label}</span>
                                        <div className="h-px bg-current flex-1" />
                                    </div>
                                </td>
                            </tr>
                        );
                    }
                    return (
                        <tr key={item.id || item.name} onClick={() => onRowClick && onRowClick(item)} className={`group transition-all duration-300 cursor-pointer active:scale-[0.99] origin-center ${theme === 'dark' ? 'hover:bg-white/[0.08]' : 'hover:bg-slate-50'} ${item.isQualified === false ? 'opacity-40' : ''}`}>
                            {columns.map((col, i) => (
                                <td key={i} className={`${col.isRank ? 'pl-3 sm:pl-10 py-3 sm:py-8' : (col.cellClass || `px-2 py-3 sm:py-8 ${col.align === 'right' ? 'text-right' : 'text-left'}`)}`}>
                                    {renderCell(col, item)}
                                </td>
                            ))}
                        </tr>
                    );
                })}
                {/* Virtualization trigger element */}
                {visibleCount < data.length && (
                    <tr ref={observerTarget} className="h-16 pointer-events-none">
                        <td colSpan={columns.length} className="text-center opacity-0">Loading...</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const ASRGlobalMap = ({ courses, continents, cities, countries, theme, onCourseClick, onCountryClick, onCityClick, onContinentClick }) => {
    const loaded = useLeaflet();
    const geoData = useGeoJSON();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const tileLayerRef = useRef(null);
    const dataLayersRef = useRef(null);
    const clusterGroupRef = useRef(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('continents');

    const displayData = useMemo(() => {
        const data = activeTab === 'cities' ? cities : activeTab === 'countries' ? countries : continents;
        // Explicitly sort by number of courses for this specific view
        return [...data].sort((a, b) => b.courses - a.courses);
    }, [activeTab, cities, countries, continents]);

    // 1. Initialize and Cleanup Map
    useEffect(() => {
        if (!loaded || !window.L || !mapContainerRef.current) return;

        if (!mapRef.current) {
            const map = window.L.map(mapContainerRef.current, {
                zoomControl: false,
                minZoom: 2,
                maxZoom: 18,
                maxBounds: [
                    [-90, -180],
                    [90, 180]
                ],
                maxBoundsViscosity: 1.0,
                worldCopyJump: false
            }).setView([20, 0], 2);
            
            window.L.control.zoom({ position: 'bottomright' }).addTo(map);
            
            // Custom pane for pins so they always stay on top of highlighted countries
            map.createPane('asr-pins');
            map.getPane('asr-pins').style.zIndex = 650;
            
            dataLayersRef.current = window.L.layerGroup().addTo(map);

            // Initialize Cluster Group
            clusterGroupRef.current = window.L.markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 40,
                showCoverageOnHover: false,
                spiderfyOnMaxZoom: true,
                iconCreateFunction: function(cluster) {
                    const count = cluster.getChildCount();
                    return window.L.divIcon({ 
                        html: `<div class="flex items-center justify-center w-full h-full font-black text-xs sm:text-sm drop-shadow-md">${count}</div>`,
                        className: `asr-cluster`, 
                        iconSize: window.L.point(36, 36) 
                    });
                }
            });
            map.addLayer(clusterGroupRef.current);

            mapRef.current = map;

            // Fix for partial map loading bug (forces Leaflet to recalculate size after CSS animations finish)
            setTimeout(() => map.invalidateSize(), 100);
            setTimeout(() => map.invalidateSize(), 500);
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [loaded]);

    // 2. Handle Tiles (Theme Changes)
    useEffect(() => {
        if (!loaded || !window.L || !mapRef.current) return;
        
        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }

        tileLayerRef.current = window.L.tileLayer(
            theme === 'dark' 
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
            {
                attribution: '&copy; OSM &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20,
                noWrap: true
            }
        ).addTo(mapRef.current);
    }, [theme, loaded]);

    // 3. Handle GeoJSON and Markers
    useEffect(() => {
        if (!loaded || !window.L || !mapRef.current || !dataLayersRef.current || !clusterGroupRef.current) return;

        const layerGroup = dataLayersRef.current;
        layerGroup.clearLayers(); // Safely clears overlays without touching base tiles
        clusterGroupRef.current.clearLayers();

        let geoJsonLayer;
        if (geoData) {
            geoJsonLayer = window.L.geoJSON(geoData, {
                style: {
                    fillColor: 'transparent',
                    color: 'transparent',
                    weight: 1
                },
                onEachFeature: (feature, layer) => {
                    const props = feature.properties || {};
                    const possibleGeoNames = [
                        props.ADMIN, 
                        props.name, 
                        props.SOVEREIGNT, 
                        props.BRK_NAME, 
                        props.NAME, 
                        props.FORMAL_EN
                    ].filter(Boolean);

                    let countryData = null;
                    
                    for (let gName of possibleGeoNames) {
                        const normalizedGeo = normalizeCountryName(gName);
                        // Normalize BOTH the GeoJSON name and the ASR CSV name to ensure a perfect match
                        countryData = countries.find(c => normalizeCountryName(c.name) === normalizedGeo);
                        if (countryData) break;
                    }

                    // Only add hover/click interactions if we have ASR courses in this country
                    if (countryData) {
                        layer.on({
                            mouseover: (e) => {
                                const l = e.target;
                                l.setStyle({
                                    fillColor: '#3b82f6',
                                    fillOpacity: 0.15,
                                    color: '#3b82f6',
                                    opacity: 0.6,
                                    weight: 2
                                });
                                if (!window.L.Browser.ie && !window.L.Browser.opera && !window.L.Browser.edge) {
                                    l.bringToFront();
                                }
                            },
                            mouseout: (e) => {
                                if (geoJsonLayer) geoJsonLayer.resetStyle(e.target);
                            },
                            click: () => {
                                if (onCountryClick) onCountryClick(countryData);
                            }
                        });
                    }
                }
            }).addTo(layerGroup);
        }

        const markers = [];
        courses.forEach(c => {
            if (c.parsedCoords) {
                const marker = window.L.circleMarker(c.parsedCoords, {
                    pane: 'asr-pins',
                    radius: 5,
                    fillColor: '#3b82f6',
                    color: theme === 'dark' ? '#09090b' : '#ffffff',
                    weight: 1.5,
                    opacity: 1,
                    fillOpacity: 0.9
                });

                marker.bindTooltip(`
                    <div class="text-[10px] font-black uppercase tracking-wider mb-0.5 opacity-60 flex items-center gap-1">${escapeHTML(c.city !== 'UNKNOWN' ? c.city : c.country)} <span>${escapeHTML(c.flag)}</span></div>
                    <div class="text-xs sm:text-sm font-black uppercase">${escapeHTML(c.name)}</div>
                `, { 
                    className: theme === 'dark' ? 'dark-tooltip' : 'light-tooltip',
                    direction: 'top',
                    offset: [0, -10]
                });

                marker.on('click', () => onCourseClick && onCourseClick(c));
                markers.push(marker);
            }
        });
        
        clusterGroupRef.current.addLayers(markers);
        
    }, [courses, geoData, countries, theme, loaded, onCourseClick, onCountryClick]);

    if (!loaded) {
        return (
            <div className={`w-full h-[60vh] sm:h-[75vh] flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl border shadow-xl ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                <div className="animate-spin opacity-50 mb-4">
                    <IconSpeed />
                </div>
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse opacity-50">Loading Geographic Modules...</div>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-[60vh] sm:h-[75vh] min-h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border ${theme === 'dark' ? 'dark-zoom border-white/10' : 'light-zoom border-slate-300'}`}>
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            {/* Lower z-[40] ensures modals on z-[100] cleanly cover this */}
            <div className="absolute top-4 left-4 z-[40] flex flex-col gap-2.5 pointer-events-none w-[calc(100%-2rem)] max-w-xs h-[calc(100%-5rem)] sm:h-auto">
                
                {/* Collapsible Toggle Button */}
                <button 
                    onClick={() => setIsPanelOpen(!isPanelOpen)}
                    className={`pointer-events-auto w-fit px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl border backdrop-blur-xl shadow-xl transition-all flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-black/80 border-white/10 text-white hover:bg-black' : 'bg-white/90 border-slate-300 text-slate-900 hover:bg-white'}`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                    {isPanelOpen ? 'HIDE STATS' : 'REGIONAL STATS'}
                </button>

                {/* Tabbed Stats Panel */}
                <div className={`pointer-events-auto flex flex-col transition-all duration-300 origin-top-left overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl ${isPanelOpen ? 'scale-100 opacity-100 flex-1 sm:max-h-[60vh]' : 'scale-95 opacity-0 h-0 border-transparent'} ${theme === 'dark' ? 'bg-black/80 border-white/10 text-white' : 'bg-white/90 border-slate-300 text-slate-900'}`}>
                    
                    {/* Panel Tabs */}
                    <div className={`flex items-center p-1 sm:p-1.5 border-b shrink-0 gap-1 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                        <button onClick={() => setActiveTab('continents')} className={`flex-1 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-md sm:rounded-lg transition-colors ${activeTab === 'continents' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200/80 text-slate-900 shadow-sm') : 'opacity-40 hover:opacity-100'}`}>CONTINENTS</button>
                        <button onClick={() => setActiveTab('countries')} className={`flex-1 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-md sm:rounded-lg transition-colors ${activeTab === 'countries' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200/80 text-slate-900 shadow-sm') : 'opacity-40 hover:opacity-100'}`}>COUNTRIES</button>
                        <button onClick={() => setActiveTab('cities')} className={`flex-1 py-1.5 sm:py-2 text-[9px] sm:text-[11px] font-black uppercase tracking-widest rounded-md sm:rounded-lg transition-colors ${activeTab === 'cities' ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-slate-200/80 text-slate-900 shadow-sm') : 'opacity-40 hover:opacity-100'}`}>CITIES</button>
                    </div>

                    {/* Scrollable Data List */}
                    <div className="flex flex-col gap-0.5 p-2 sm:p-3 overflow-y-auto scrollbar-hide flex-1">
                        {displayData.slice(0, 15).map((c, i) => {
                            const handleClick = () => {
                                if (activeTab === 'cities') onCityClick && onCityClick(c);
                                else if (activeTab === 'countries') onCountryClick && onCountryClick(c);
                                else onContinentClick && onContinentClick(c);
                            };
                            return (
                                <div key={i} onClick={handleClick} className={`cursor-pointer flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-transparent transition-all ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-200/50'}`}>
                                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
                                        <div className="scale-75 sm:scale-90 origin-left shrink-0">
                                            <ASRRankBadge rank={i + 1} theme={theme} />
                                        </div>
                                        <div className="flex flex-col min-w-0 -ml-1 sm:ml-0">
                                            <span className={`text-[10px] sm:text-[13px] font-black uppercase tracking-tight truncate leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                                            <span className="text-xs sm:text-sm leading-none mt-0.5 drop-shadow-sm">{c.flag}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center shrink-0 pl-2 justify-center">
                                        <span className="text-sm sm:text-base font-mono font-black text-blue-500 tabular-nums num-col">{c.courses}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ASRHallOfFame = ({ stats, theme, onPlayerClick, onSetterClick, medalSort, setMedalSort }) => {
  if (!stats) return null;
  const tColor = theme === 'dark' ? 'text-white' : 'text-slate-900';

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {[
          { l: 'TOP RATED', k: 'rating' },
          { l: 'MOST RUNS', k: 'runs' },
          { l: 'HIGHEST WIN %', k: 'winPercentage' },
          { l: 'MOST COURSE RECORDS', k: 'wins' },
          { l: 'MOST 🪙', k: 'contributionScore' },
          { l: 'MOST 🔥', k: 'totalFireCount' },
          { l: 'MOST IMPACT', k: 'impact' },
          { l: 'MOST SETS', k: 'sets' }
        ].map((sec) => (
          <div key={sec.k} className={`rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
            <div className="p-3 sm:p-4 border-b border-inherit bg-inherit flex items-center justify-between">
                <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                    {sec.l.split(' ').map((word, wi) => {
                        const isFire = word === '🔥';
                        const isGold = word === '🪙';
                        const isImpact = word === 'IMPACT';
                        
                        const highlight = isFire || isGold ? 'opacity-100 brightness-150 glow-fire cursor-help' : isImpact ? 'opacity-60 cursor-help border-b border-dashed border-current' : 'opacity-60';
                        const text = isFire ? "Fire Tokens: Awarded for elite sub-7 (M) / sub-9 (W) times." : isGold ? "Contribution Score: Earned by setting runs, adding courses, and community activity." : isImpact ? "Total athlete runs on courses you've set." : "";
                        
                        const content = <span key={wi} className={highlight}>{word}</span>;
                        return text ? <ASRTooltip key={wi} text={text}>{content}</ASRTooltip> : content;
                    })}
                </h4>
            </div>
            <div className={`divide-y ${theme === 'dark' ? 'divide-white/[0.03]' : 'divide-slate-100'} flex-1`}>
              {stats.topStats[sec.k].map((p, i) => {
                let displayVal;
                if (sec.k === 'rating') displayVal = (p.rating || 0).toFixed(2);
                else if (sec.k === 'winPercentage') displayVal = `${(p.winPercentage || 0).toFixed(1)}%`;
                else displayVal = (p[sec.k] !== undefined ? String(p[sec.k]) : String(p.value || 0));
                return (
                  <div key={`${sec.k}-${i}-${p.name}`} className={`group flex items-center justify-between p-2.5 sm:p-4 hover:bg-white/[0.03] transition-colors gap-2 ${['cityStats', 'countryStats'].includes(sec.k) ? '' : 'cursor-pointer active:scale-[0.98]'}`} onClick={() => {
                      if (['impact', 'sets'].includes(sec.k)) onSetterClick(p);
                      else if (!['cityStats', 'countryStats'].includes(sec.k)) onPlayerClick(p);
                  }}>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 pr-1">
                      <ASRRankBadge rank={i + 1} theme={theme} />
                      <div className="flex flex-col ml-0.5">
                        <span className={`text-xs sm:text-sm font-black uppercase leading-tight ${!['cityStats', 'countryStats'].includes(sec.k) ? 'group-hover:text-blue-500' : ''} transition-colors`}>{p.name}</span>
                        <span className="text-sm sm:text-xl mt-0.5 leading-none">{p.region || '🏳️'}</span>
                      </div>
                    </div>
                    <span className={`font-mono font-black text-blue-500 text-xs sm:text-sm shrink-0 tabular-nums num-col ${sec.k === 'totalFireCount' ? 'glow-fire' : ''} ${sec.k === 'contributionScore' ? 'glow-gold' : ''}`}>{displayVal}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={`relative rounded-2xl sm:rounded-3xl border overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-slate-300 shadow-sm'}`}>
        <div className="p-4 sm:p-6 border-b border-inherit bg-inherit shrink-0"><h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">WORLDWIDE MEDAL COUNT</h3></div>
        
        <div className={`absolute top-[52px] sm:top-[68px] right-0 bottom-0 w-12 sm:hidden pointer-events-none z-30 bg-gradient-to-l to-transparent ${theme === 'dark' ? 'from-[#151517]' : 'from-white'}`} />

        <div className="overflow-auto scrollbar-hide max-h-[60vh] relative w-full">
          <table className="hof-table min-w-full relative">
            <thead className={`sticky top-0 z-20 backdrop-blur-xl shadow-sm ${theme === 'dark' ? 'bg-[#121214]/95 text-slate-400' : 'bg-white/95 text-slate-500'}`}>
              <tr className={`text-[10px] sm:text-xs font-black uppercase tracking-widest`}>
                <ASRHeaderComp l="RANK" k="rank" a="left" w="w-12 sm:w-28 lg:w-36 pl-2 sm:pl-10" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="COUNTRY" k="name" a="left" w="w-full px-2" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥇" k="gold" a="right" w="w-10 sm:w-24 lg:w-32" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥈" k="silver" a="right" w="w-10 sm:w-24 lg:w-32" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="🥉" k="bronze" a="right" w="w-10 sm:w-24 lg:w-32" activeSort={medalSort} handler={setMedalSort} theme={theme} />
                <ASRHeaderComp l="TOTAL" k="total" a="right" w="w-14 sm:w-28 lg:w-40 pr-4 sm:pr-10 lg:pr-16" activeSort={medalSort} handler={setMedalSort} theme={theme} />
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-200'}`}>
              {stats.medalCount.map((c) => (
                <tr key={`medal-row-${c.name}-${c.flag}`} className="group hover:bg-black/[0.02] transition-colors">
                  <td className="pl-2 sm:pl-10 py-3 sm:py-8 text-center sm:text-left"><ASRRankBadge rank={c.displayRank} theme={theme} /></td>
                  <td className="px-2 py-3 sm:py-8 w-full min-w-[100px]">
                    <div className="flex flex-col">
                      <span className={`text-xs sm:text-[15px] font-black uppercase tracking-tight leading-tight block ${tColor}`}>{c.name}</span>
                      <span className="text-base sm:text-2xl mt-0.5 leading-none drop-shadow-sm shrink-0">{c.flag}</span>
                    </div>
                  </td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] glow-gold tabular-nums num-col text-blue-500`}>{c.gold}</td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] glow-silver tabular-nums num-col ${tColor}`}>{c.silver}</td>
                  <td className={`text-right font-mono font-black text-xs sm:text-[15px] glow-bronze tabular-nums num-col ${tColor}`}>{c.bronze}</td>
                  <td className={`pr-4 sm:pr-10 lg:pr-16 text-right font-mono font-black ${tColor} text-xs sm:text-[15px] tabular-nums num-col`}>{c.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ASRNavBar = ({ theme, setTheme, view, setView, eventType, setEventType }) => {
    const navItems = [
        {id:'players',l:'PLAYERS'},
        {id:'setters',l:'SETTERS'},
        {id:'courses',l:'COURSES'},
        {id:'map',l:'MAP'}
    ];

    return (
        <nav className={`fixed top-0 w-full backdrop-blur-xl border-b z-50 h-14 sm:h-20 flex items-center justify-between px-2 sm:px-8 gap-2 sm:gap-6 transition-all duration-500 ${theme === 'dark' ? 'bg-[#09090b]/90 border-white/5' : 'bg-[#cbd5e1]/85 border-slate-400/30'}`}>
            <div className="flex items-center gap-1.5 shrink-0">
                <div className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} animate-pulse flex-shrink-0`}>
                    <IconSpeed />
                </div>
                <span className="font-black tracking-tighter text-xs sm:text-2xl uppercase italic leading-none transition-all whitespace-nowrap">
                    ASR <span className="hidden xs:inline">APEX SPEED RUN</span>
                </span>
            </div>
            
            <div className="flex-1 flex justify-center min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto scrollbar-hide py-1 px-1 w-full sm:w-auto justify-start sm:justify-center">
                    {navItems.map(v => (
                        <button 
                            key={v.id} 
                            onClick={() => {
                                setView(v.id);
                                if (v.id === 'map' && eventType === 'open') {
                                    setEventType('all-time');
                                }
                            }} 
                            className={`
                                shrink-0 border px-3 sm:px-5 py-1.5 sm:py-2 rounded-full 
                                text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300
                                whitespace-nowrap select-none
                                ${view === v.id 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] scale-105' 
                                    : (theme === 'dark' ? 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white' : 'border-slate-400/30 text-slate-500 hover:border-slate-400 hover:text-slate-700 bg-white/20')
                                }
                            `}
                        >
                            {v.l}
                        </button>
                    ))}
                </div>
            </div>
            
            <button aria-label="Toggle Theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className={`w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center border rounded-full transition-all shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-300/50 border-slate-400/20 text-slate-600 hover:text-black'}`}>
                {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
        </nav>
    );
};

const ASRControlBar = ({ view, setView, eventType, setEventType, gen, setGen, search, setSearch, theme }) => {
    const titles = {
        players: 'PLAYERS',
        setters: 'SETTERS',
        courses: 'COURSES',
        map: 'MAP',
        hof: 'HALL OF FAME'
    };

    return (
        <header className={`pt-20 sm:pt-24 pb-6 sm:pb-8 px-4 sm:px-8 max-w-7xl mx-auto w-full flex flex-col gap-4 sm:gap-10 bg-gradient-to-b ${theme === 'dark' ? 'from-blue-600/10' : 'from-blue-500/5'} to-transparent`}>
            <h1 className={`text-4xl sm:text-6xl font-black uppercase tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {titles[view]}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className={`flex items-center p-0.5 sm:p-1 rounded-xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                    <div className="flex flex-wrap gap-0.5">
                        <button 
                            onClick={() => { 
                                setEventType('open'); 
                                if(view === 'hof' || view === 'map') setView('players'); 
                            }} 
                            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${view !== 'hof' && eventType === 'open' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:text-slate-300 dark:hover:bg-white/5'}`}
                        >
                            2026 OPEN
                        </button>
                        <button 
                            onClick={() => { 
                                setEventType('all-time'); 
                                if(view === 'hof') setView('players'); 
                            }} 
                            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${view !== 'hof' && eventType === 'all-time' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:text-slate-300 dark:hover:bg-white/5'}`}
                        >
                            ALL-TIME
                        </button>
                        <button 
                            onClick={() => setView('hof')} 
                            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${view === 'hof' ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:text-slate-300 dark:hover:bg-white/5'}`}
                        >
                            HOF
                        </button>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                    {view === 'players' && (
                        <div className={`flex items-center p-0.5 sm:p-1 rounded-lg sm:rounded-xl border w-fit h-fit shrink-0 ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-slate-300/50 border-slate-400/20'}`}>
                            <div className="flex">
                                {[{id:'M',l:'M'},{id:'F',l:'W'}].map(g => (
                                    <button key={g.id} onClick={() => setGen(g.id)} className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${gen === g.id ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-black/5 dark:hover:text-slate-300 dark:hover:bg-white/5'}`}>{g.l}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {eventType === 'open' && view !== 'hof' && (
                <div className={`flex flex-col gap-4 sm:gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-700 mb-2 sm:mb-4`}>
                    <div className={`flex flex-col items-center justify-center py-10 sm:py-16 px-4 rounded-2xl sm:rounded-[2rem] border relative overflow-hidden ${theme === 'dark' ? 'bg-blue-600/10 border-blue-500/20 shadow-[0_0_40px_rgba(37,99,235,0.15)]' : 'bg-blue-50 border-blue-200 shadow-xl'}`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
                        <h4 className={`mb-6 sm:mb-8 text-xs sm:text-sm font-black uppercase tracking-[0.3em] sm:tracking-[0.5em] animate-subtle-pulse drop-shadow-lg ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                            THE 2026 ASR OPEN STARTS IN
                        </h4>
                        <div className="scale-90 sm:scale-100 drop-shadow-xl">
                            <CountdownTimer targetDate={new Date('2026-03-01T00:00:00-10:00')} theme={theme} />
                        </div>
                    </div>

                    <div className={`p-6 sm:p-8 rounded-2xl sm:rounded-[2rem] border flex flex-col md:flex-row gap-6 items-center justify-between ${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-white border-slate-300'} shadow-lg`}>
                        <div className="flex-1 space-y-1.5 text-center md:text-left">
                            <h3 className={`text-sm sm:text-lg font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                GET ON BOARD
                            </h3>
                            <p className={`text-xs sm:text-sm font-bold leading-relaxed opacity-80 max-w-2xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                Join the free community to get official course drops, submit your runs, and claim your rank. Zero entry fees. Just proof of work.
                            </p>
                        </div>
                        <a 
                            href="https://www.skool.com/apexmovement/about?ref=cdbeb6ddf53f452ab40ac16f6a8deb93" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="shrink-0 flex items-center justify-center gap-2.5 px-6 py-3.5 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:-translate-y-1 active:translate-y-0 w-full md:w-auto"
                        >
                            JOIN THE OPEN
                            <IconCornerUpRight size={16} />
                        </a>
                    </div>
                </div>
            )}
            
            {view !== 'hof' && eventType !== 'open' && view !== 'map' && (
                <div className="w-full relative group">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-opacity ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} group-focus-within:text-blue-500`}>
                        <IconSearch size={12} />
                    </div>
                    <input type="text" aria-label="Search" placeholder="" value={search} onChange={e => setSearch(e.target.value)} className={`rounded-xl sm:rounded-2xl pl-10 pr-10 py-2.5 sm:py-4 w-full text-xs sm:text-sm font-medium outline-none transition-all border ${theme === 'dark' ? 'bg-white/[0.03] border-white/5 text-white focus:bg-white/[0.07] focus:border-white/10 shadow-xl' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500/30 shadow-md'}`} />
                    {search && (
                        <button aria-label="Clear Search" onClick={() => setSearch('')} className={`absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-black/10 transition-colors ${theme === 'dark' ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                            <IconX size={14} />
                        </button>
                    )}
                </div>
            )}
        </header>
    );
};

const ASRFooter = () => (
    <footer className="mt-16 sm:mt-24 text-center pb-12 sm:pb-24 opacity-20 font-black uppercase tracking-[0.2em] sm:tracking-[0.4em] text-[10px] sm:text-xs whitespace-nowrap shrink-0">© 2026 APEX SPEED RUN</footer>
);

// --- STATIC DATA & CONFIGURATION ---

const PLAYER_COLS = [
    { isRank: true },
    { label: 'PLAYER', type: 'profile', key: 'name', subKey: 'region', width: 'w-auto px-2 py-4 sm:py-5 min-w-[120px] sm:min-w-[160px]' },
    { label: 'RATING', type: 'highlight', key: 'rating', decimals: 2, align: 'right', width: 'w-16 sm:w-36' },
    { label: 'RUNS', type: 'number', key: 'runs', align: 'right', width: 'w-12 sm:w-28' },
    { label: 'WINS', type: 'number', key: 'wins', align: 'right', width: 'w-12 sm:w-28 pr-4 sm:pr-10' }
];

const SETTERS_COLS = [
    { isRank: true },
    { label: 'SETTER', type: 'profile', key: 'name', subKey: 'region', width: 'w-auto px-2 py-4 sm:py-5 min-w-[120px] sm:min-w-[160px]' },
    { label: 'IMPACT', type: 'highlight', key: 'impact', align: 'right', width: 'w-14 sm:w-32', tooltip: 'Total athlete runs on courses you\'ve set.' },
    { label: 'SETS', type: 'number', key: 'sets', align: 'right', width: 'w-12 sm:w-24' },
    { label: 'LEADS', type: 'number', key: 'leads', align: 'right', width: 'w-12 sm:w-24' },
    { label: 'ASSISTS', type: 'number', key: 'assists', align: 'right', width: 'w-12 sm:w-24 pr-4 sm:pr-10' }
];

const COURSE_COLS = [
    { isRank: true },
    { label: 'COURSE', type: 'profile', key: 'name', subKey: 'flag', width: 'w-auto px-2 py-4 sm:py-5 min-w-[120px] sm:min-w-[160px]' },
    { label: 'PLAYERS', type: 'highlight', key: 'totalAthletes', align: 'right', width: 'w-10 sm:w-28' },
    { label: 'CR (MEN)', type: 'number', key: 'mRecord', decimals: 2, align: 'right', width: 'w-14 sm:w-36' },
    { label: 'CR (WOMEN)', type: 'number', key: 'fRecord', decimals: 2, opacity: false, align: 'right', width: 'w-14 sm:w-36 pr-4 sm:pr-10' }
];

// --- CUSTOM HOOKS ---
const useASRData = () => {
  const [state, setState] = useState({
    data: [], openData: [], atPerfs: {}, opPerfs: {},
    lbAT: {M:{},F:{}}, lbOpen: {M:{},F:{}}, atMet: {}, dnMap: {}, cMet: {}, settersData: [],
    atRawBest: {}, opRawBest: {},
    isLoading: true, hasError: false, hasPartialError: false
  });

  const fetchData = useCallback(async () => {
    const cacheBucket = Math.floor(Date.now() / 300000); 
    const getCsv = (q) => `https://docs.google.com/spreadsheets/d/1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4/gviz/tq?tqx=out:csv&${q}&cb=${cacheBucket}`;

    const safeFetch = async (url) => {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.text();
        } catch (e) {
            console.error(`Fetch failed for ${url}:`, e);
            return ""; 
        }
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

      const pM = processRankingData(rM, 'M'); 
      const pF = processRankingData(rF, 'F');
      const initialMetadata = {};
      pM.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'M', allTimeRank: i + 1 });
      pF.forEach((p, i) => initialMetadata[p.pKey] = { ...p, gender: 'F', allTimeRank: i + 1 });
      const processed = processLiveFeedData(rLive, initialMetadata, processSetListData(rSet));
      
      const settersM = processSettersData(rSettersM);
      const settersF = processSettersData(rSettersF);
      const allSetters = [...settersM, ...settersF];
      
      setState({
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
      });
    } catch(e) { 
        console.error("Critical Processing failed:", e); 
        setState(prev => ({ ...prev, isLoading: false, hasError: true, hasPartialError: false }));
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return state;
};

// --- MAIN APPLICATION COMPONENT ---
function App() {
  const [theme, setTheme] = useState(() => {
    try {
        const saved = window.localStorage.getItem('asr-theme');
        if (saved) return saved;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch(e) {
        return 'dark'; // Fallback for strict iframes
    }
  });

  useEffect(() => {
    try {
        window.localStorage.setItem('asr-theme', theme);
    } catch(e) {}

    // PWA & Status Bar theme colors
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
    }
    metaTheme.content = theme === 'dark' ? '#09090b' : '#cbd5e1';

    // iOS PWA capability tags
    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
        const metaApple = document.createElement('meta');
        metaApple.name = 'apple-mobile-web-app-capable';
        metaApple.content = 'yes';
        document.head.appendChild(metaApple);
        
        const metaStatus = document.createElement('meta');
        metaStatus.name = 'apple-mobile-web-app-status-bar-style';
        metaStatus.content = 'black-translucent';
        document.head.appendChild(metaStatus);
    }
  }, [theme]);

  const [gen, setGen] = useState('M');
  const [eventType, setEventType] = useState('open'); 
  const [view, setView] = useState('players'); 
  const [search, setSearch] = useState('');
  
  // Appling Debounce Hook
  const debouncedSearch = useDebounce(search, 300);
  
  const [modalHistory, setModalHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    const titleMap = {
        players: 'Players',
        setters: 'Setters',
        courses: 'Courses',
        map: 'Map',
        hof: 'Hall of Fame'
    };
    document.title = `ASR | ${titleMap[view] || 'Apex Speed Run'}`;
  }, [view]);
  
  const openModal = useCallback((type, data) => {
    setHistoryIndex(currIdx => {
        setModalHistory(prev => {
            const newHistory = prev.slice(0, currIdx < 0 ? 0 : currIdx + 1);
            return [...newHistory, { type, data }];
        });
        return currIdx < 0 ? 0 : currIdx + 1;
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setHistoryIndex(-1);
  }, []);

  const goBackModal = useCallback(() => {
    setHistoryIndex(currIdx => Math.max(-1, currIdx - 1));
  }, []);

  const goForwardModal = useCallback(() => {
    setHistoryIndex(currIdx => Math.min(modalHistory.length - 1, currIdx + 1));
  }, [modalHistory.length]);

  const activeModal = historyIndex >= 0 ? modalHistory[historyIndex] : null;
  const canGoForward = historyIndex < modalHistory.length - 1;
  
  const [viewSorts, setViewSorts] = useState({
    players: { key: 'rating', direction: 'descending' },
    setters: { key: 'impact', direction: 'descending' },
    courses: { key: 'totalAthletes', direction: 'descending' },
    cities: { key: 'players', direction: 'descending' },
    countries: { key: 'players', direction: 'descending' },
    hof: { key: 'gold', direction: 'descending' }
  });

  const handleSort = (newSort) => {
    const updated = typeof newSort === 'function' ? newSort(viewSorts[view]) : newSort;
    setViewSorts(prev => ({ ...prev, [view]: updated }));
  };

  const { data, openData, atPerfs, opPerfs, lbAT, lbOpen, atMet, dnMap, cMet, settersData, atRawBest, opRawBest, isLoading, hasError, hasPartialError } = useASRData();

  const isAllTimeContext = view === 'hof' || eventType === 'all-time';

  const list = useMemo(() => {
    if (view !== 'players') return []; // Phase 2: Lazy Load
    const src = isAllTimeContext ? data : openData;
    const filtered = src.filter(p => p.gender === gen && (p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || (p.countryName || "").toLowerCase().includes(debouncedSearch.toLowerCase())));
    if (filtered.length === 0) return [];

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

    const finalQual = qual.map((p, i) => ({ ...p, currentRank: i + 1, isQualified: true }));
    const finalUnranked = unranked.map(p => ({ ...p, currentRank: "UR", isQualified: false }));

    if (finalQual.length > 0 && finalUnranked.length > 0) {
        const thresholdText = gen === 'M' ? "RUN 4+ COURSES TO GET RANKED" : "RUN 2+ COURSES TO GET RANKED";
        return [...finalQual, { isDivider: true, label: thresholdText }, ...finalUnranked];
    }

    return [...finalQual, ...finalUnranked];
  }, [debouncedSearch, viewSorts.players, gen, isAllTimeContext, data, openData, view]);

  const rawCourseList = useMemo(() => {
    const contextM = isAllTimeContext ? lbAT.M : lbOpen.M;
    const contextF = isAllTimeContext ? lbAT.F : lbOpen.F;
    const contextRaw = isAllTimeContext ? atRawBest : opRawBest;
    const courseNames = Array.from(new Set([...Object.keys(contextM || {}), ...Object.keys(contextF || {})])).filter(Boolean);
    if (courseNames.length === 0) return [];
    
    return courseNames.map(name => {
      const athletesMAll = Object.entries((contextM || {})[name] || {}).map(([pKey, time]) => [pKey, time, contextRaw?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const athletesFAll = Object.entries((contextF || {})[name] || {}).map(([pKey, time]) => [pKey, time, contextRaw?.[pKey]?.[name]?.videoUrl]).sort((a, b) => a[1] - b[1]);
      const ctxM = Object.entries((contextM || {})[name] || {});
      const ctxF = Object.entries((contextF || {})[name] || {});
      const meta = cMet[name] || {};
      
      const coordsMatch = meta.coordinates ? String(meta.coordinates).match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) : null;
      const parsedCoords = coordsMatch ? [parseFloat(coordsMatch[1]), parseFloat(coordsMatch[2])] : null;

      const resolvedCountry = meta.country || 'UNKNOWN';
      const continentData = getContinentData(resolvedCountry);

      return {
        name, city: meta.city || 'UNKNOWN', country: resolvedCountry, flag: meta.flag || '🏳️',
        continent: continentData.name, continentFlag: continentData.flag,
        mRecord: athletesMAll[0]?.[1] || null, fRecord: athletesFAll[0]?.[1] || null,
        totalAthletes: new Set([...ctxM.map(a => a[0]), ...ctxF.map(a => a[0])]).size,
        totalRuns: ctxM.length + ctxF.length,
        athletesM: athletesMAll, athletesF: athletesFAll,
        parsedCoords,
        ...meta
      };
    });
  }, [lbAT, lbOpen, isAllTimeContext, cMet, atRawBest, opRawBest]);

  const courseList = useMemo(() => {
    if (view !== 'courses') return []; // Phase 2: Lazy Load
    const filtered = rawCourseList.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.city.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.country.toLowerCase().includes(debouncedSearch.toLowerCase()));
    if (filtered.length === 0) return [];

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
  }, [rawCourseList, debouncedSearch, viewSorts.courses, view]);

  // Extract core setter mathematical data securely without visual dividers
  const settersWithImpact = useMemo(() => {
    return settersData.map(s => {
        const sCourses = rawCourseList.filter(c => (c.setter || "").toLowerCase().includes(s.name.toLowerCase()));
        return { ...s, impact: sCourses.reduce((sum, c) => sum + (c.totalRuns || 0), 0) };
    });
  }, [settersData, rawCourseList]);

  // Construct UI list containing dividers for the "SETTERS" view specifically
  const settersList = useMemo(() => {
    if (view !== 'setters') return []; // Phase 2: Lazy Load
    const filtered = settersWithImpact.filter(s => s.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    if (filtered.length === 0) return [];

    const threshold = 3;
    const qualified = filtered.filter(s => s.sets >= threshold);
    const unranked = filtered.filter(s => s.sets < threshold);

    const sort = viewSorts.setters;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const sortFn = (a, b) => robustSort(a, b, sort.key, dir);

    qualified.sort(sortFn);
    unranked.sort((a, b) => (b.impact - a.impact) || (b.sets - a.sets));

    const finalQual = qualified.map((s, i) => ({ ...s, currentRank: i + 1, isQualified: true }));
    const finalUnranked = unranked.map(s => ({ ...s, currentRank: "UR", isQualified: false }));

    if (finalQual.length > 0 && finalUnranked.length > 0) {
        return [...finalQual, { isDivider: true, label: "SET 3+ COURSES TO GET RANKED" }, ...finalUnranked];
    }
    
    return [...finalQual, ...finalUnranked];
  }, [settersWithImpact, debouncedSearch, viewSorts.setters, view]);

  const cityList = useMemo(() => {
    if (view !== 'map' && view !== 'hof') return []; // Phase 2: Lazy Load
    const base = calculateCityStats(rawCourseList);
    const sort = viewSorts.cities;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const result = base.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || c.countryName.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .sort((a, b) => robustSort(a, b, sort.key, dir));
    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, viewSorts.cities, debouncedSearch, view]);

  const countryList = useMemo(() => {
    if (view !== 'map' && view !== 'hof') return []; // Phase 2: Lazy Load
    const base = calculateCountryStats(rawCourseList);
    const sort = viewSorts.countries;
    const dir = sort.direction === 'ascending' ? 1 : -1;
    const result = base.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      .sort((a, b) => robustSort(a, b, sort.key, dir));
    return result.map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, viewSorts.countries, debouncedSearch, view]);

  const continentList = useMemo(() => {
    if (view !== 'map') return []; // Phase 2: Lazy Load
    const base = calculateContinentStats(rawCourseList);
    const result = base.filter(c => c.name.toLowerCase().includes(debouncedSearch.toLowerCase()));
    return result.sort((a, b) => b.courses - a.courses).map((c, i) => ({ ...c, currentRank: i + 1 }));
  }, [rawCourseList, debouncedSearch, view]);

  const hofStats = useMemo(() => {
    if (view !== 'hof') return null; // Phase 2: Lazy Load
    // We pass settersWithImpact directly to avoid mathematical sorting bugs involving invisible dividers
    return calculateHofStats(data, atPerfs, lbAT, atMet, cityList, countryList, viewSorts.hof, settersWithImpact);
  }, [data, lbAT, cityList, countryList, atMet, atPerfs, viewSorts.hof, settersWithImpact, view]);

  // --- DEEP LINKING (SHAREABILITY) ---
  const initialHashRead = useRef(false);

  // Read Hash on Load
  useEffect(() => {
      if (!isLoading && !hasError && !initialHashRead.current) {
          initialHashRead.current = true;
          try {
              const hash = window.location.hash;
              if (hash) {
                  const [typeRaw, valRaw] = hash.substring(1).split('=');
                  if (typeRaw && valRaw) {
                      const val = decodeURIComponent(valRaw);
                      if (typeRaw === 'player') {
                          const p = data.find(x => x.pKey === val) || openData.find(x => x.pKey === val);
                          if (p) openModal('player', p);
                      } else if (typeRaw === 'course') {
                          const c = rawCourseList.find(x => x.name.toUpperCase() === val.toUpperCase());
                          if (c) openModal('course', c);
                      } else if (typeRaw === 'setter') {
                          const s = settersWithImpact.find(x => x.name.toLowerCase() === val.toLowerCase());
                          if (s) openModal('setter', s);
                      }
                  }
              }
          } catch(e) {
              // Silently catch hash read errors in strict sandboxes
          }
      }
  }, [isLoading, hasError, data, openData, rawCourseList, settersWithImpact, openModal]);

  // Write Hash on Modal Change
  useEffect(() => {
      try {
          if (historyIndex >= 0 && modalHistory[historyIndex]) {
              const { type, data } = modalHistory[historyIndex];
              if (type === 'player') window.history.replaceState(null, null, `#player=${data.pKey}`);
              else if (type === 'course') window.history.replaceState(null, null, `#course=${encodeURIComponent(data.name)}`);
              else if (type === 'setter') window.history.replaceState(null, null, `#setter=${encodeURIComponent(data.name)}`);
          } else if (initialHashRead.current) {
              // Clear hash when closing all modals
              window.history.replaceState(null, null, window.location.pathname + window.location.search);
          }
      } catch(e) {
          // Silently catch replaceState security errors in iframe blobs
      }
  }, [historyIndex, modalHistory]);

  const currentView = useMemo(() => {
    if (view === 'hof' || view === 'map') return null;
    const isEmpty = eventType === 'open' && openData.length === 0;
    const config = {
      players: { columns: PLAYER_COLS, data: isEmpty ? [] : list, onClick: (p) => openModal('player', p) },
      setters: { columns: SETTERS_COLS, data: isEmpty ? [] : settersList, onClick: (s) => openModal('setter', s) },
      courses: { columns: COURSE_COLS, data: isEmpty ? [] : courseList, onClick: (c) => openModal('course', c) }
    }[view];
    return config ? { ...config, sort: viewSorts[view] } : null;
  }, [view, eventType, viewSorts, list, settersList, courseList, openData.length, openModal]);

  const jumpToHistory = useCallback((index) => {
    setHistoryIndex(index);
  }, []);
  
  const breadcrumbs = useMemo(() => {
    if (historyIndex < 0) return [];
    return modalHistory.slice(0, historyIndex + 1).map(h => h.data.name || 'Detail');
  }, [modalHistory, historyIndex]);

  const renderActiveModal = () => {
    if (!activeModal) return null;
    
    const props = {
        isOpen: true,
        onClose: closeAllModals,
        onBack: goBackModal,
        onForward: goForwardModal,
        canGoForward: canGoForward,
        theme: theme,
        breadcrumbs: breadcrumbs,
        onBreadcrumbClick: jumpToHistory
    };

    switch (activeModal.type) {
        case 'player':
            return <ASRPlayerModal {...props} player={activeModal.data} performanceData={isAllTimeContext ? atPerfs : opPerfs} onCourseClick={(name) => { const c = rawCourseList.find(x => x.name === name); if(c) openModal('course', c); }} />;
        case 'setter':
            return <ASRSetterModal {...props} setter={activeModal.data} courses={rawCourseList} onCourseClick={(c) => openModal('course', c)} />;
        case 'course':
            return <ASRCourseModal {...props} course={activeModal.data} athleteMetadata={atMet} athleteDisplayNameMap={dnMap} onPlayerClick={(p) => openModal('player', p)} onSetterClick={(sName) => {
                const sObj = settersWithImpact.find(s => s.name.toLowerCase() === sName.toLowerCase());
                if (sObj) openModal('setter', sObj);
            }} />;
        case 'city':
            return <ASRLocationModal {...props} data={activeModal.data} type='city' courses={rawCourseList} onCourseClick={(c) => openModal('course', c)} />;
        case 'country':
            return <ASRLocationModal {...props} data={activeModal.data} type='country' courses={rawCourseList} onCourseClick={(c) => openModal('course', c)} />;
        case 'continent':
            return <ASRLocationModal {...props} data={activeModal.data} type='continent' courses={rawCourseList} onCourseClick={(c) => openModal('course', c)} />;
        default:
            return null;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 font-sans pb-24 select-none flex flex-col antialiased ${theme === 'dark' ? 'bg-[#09090b] text-slate-200' : 'bg-[#cbd5e1] text-slate-900'}`}>
      <CustomStyles />
      <ASRNavBar theme={theme} setTheme={setTheme} view={view} setView={setView} eventType={eventType} setEventType={setEventType} />
      
      {renderActiveModal()}
      
      <ASRControlBar view={view} setView={setView} eventType={eventType} setEventType={setEventType} gen={gen} setGen={setGen} search={search} setSearch={setSearch} theme={theme} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 flex-grow w-full relative">
        {hasPartialError && !isLoading && !hasError && (
            <div className={`mb-6 p-3 rounded-xl flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest animate-subtle-pulse shadow-sm ${theme === 'dark' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
                ⚠️ Partial Data Load — Live Feed Syncing...
            </div>
        )}

        {isLoading ? (
            <ASRSkeletonTable theme={theme} />
        ) : hasError && data.length === 0 && settersData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-32 space-y-6">
                <div className="p-6 rounded-full bg-red-500/10 text-red-500 mb-4">
                    <IconX size={32} />
                    </div>
                <div className={`text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-center px-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    CONNECTION TO ASR SERVERS FAILED
                    <span className={`block mt-3 text-[10px] sm:text-xs normal-case tracking-normal font-bold opacity-60`}>Google Sheets API might be temporarily rate-limited.<br/>Please wait a moment and try again.</span>
                </div>
                <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shadow-lg">
                    RETRY CONNECTION
                </button>
            </div>
        ) : view === 'hof' ? (
            <ASRHallOfFame stats={hofStats} theme={theme} onPlayerClick={p => openModal('player', p)} onSetterClick={s => openModal('setter', s)} medalSort={viewSorts.hof} setMedalSort={handleSort} />
        ) : view === 'map' ? (
            <ASRGlobalMap courses={rawCourseList} continents={continentList} cities={cityList} countries={countryList} theme={theme} onCourseClick={(c) => openModal('course', c)} onCountryClick={(c) => openModal('country', c)} onCityClick={(c) => openModal('city', c)} onContinentClick={(c) => openModal('continent', c)} />
        ) : (
          <div className={`relative border rounded-xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-slate-300'}`}>
            <div className={`absolute top-0 right-0 bottom-0 w-12 sm:hidden pointer-events-none z-30 bg-gradient-to-l to-transparent ${theme === 'dark' ? 'from-[#09090b]' : 'from-white'}`} />
            
            <div className="overflow-auto scrollbar-hide max-h-[75vh] relative w-full">
              {currentView && currentView.data && currentView.data.length > 0 ? (
                <ASRDataTable 
                    theme={theme}
                    columns={currentView.columns}
                    sort={currentView.sort}
                    onSort={handleSort}
                    data={currentView.data}
                    onRowClick={currentView.onClick}
                />
              ) : (
                <div className={`flex flex-col items-center justify-center py-24 sm:py-32 text-center px-4 ${theme === 'dark' ? 'text-white/40' : 'text-slate-900/40'}`}>
                    <div className="scale-[2] sm:scale-[2.5] mb-8 sm:mb-12 animate-pulse opacity-40">
                        <IconSpeed />
                    </div>
                    <h3 className="text-sm sm:text-xl font-black uppercase tracking-widest mb-1.5 sm:mb-2 text-current">
                        A FRESH, NEW SEASON
                    </h3>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] opacity-60">
                        LEADERBOARDS GO LIVE AT LAUNCH
                    </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <ASRFooter />
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
