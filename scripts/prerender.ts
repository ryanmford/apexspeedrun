import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { normalizeName, createSlug, CONFIG, getCombinedFlags, formatOgLocation } from '../src/lib/asr-utils.ts';
import { computeAllState } from '../src/lib/asr-data-compute.ts';
import type { CourseData, PlayerProfile } from '../src/types.ts';

const MAPBOX_OG_ZOOM = 13;
const MAPBOX_OG_WIDTH = 1200;
const MAPBOX_OG_HEIGHT = 630;
let loggedMissingMapboxToken = false;
let loggedMapboxAuthError = false;

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

const SPREADSHEET_ID = CONFIG.SPREADSHEET_ID;
const GIDS = CONFIG.SHEET_GIDS;

async function fetchWithRetry(url: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
      return await res.text();
    } catch (err) {
      if (attempt === retries) throw err;
    }
  }
  return '';
}

async function fetchSheets() {
  const getUrl = (gid: string) => `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;
  
  console.log('Fetching Google Sheets data...');
  const [mensCsv, womensCsv, liveCsv, setsCsv] = await Promise.all([
    fetchWithRetry(getUrl(GIDS.MENS)),
    fetchWithRetry(getUrl(GIDS.WOMENS)),
    fetchWithRetry(getUrl(GIDS.LIVE)),
    fetchWithRetry(getUrl(GIDS.SETS)),
  ]);

  return computeAllState({
    rM: mensCsv,
    rF: womensCsv,
    rLive: liveCsv,
    rSet: setsCsv,
    hasTotalError: false,
    hasPartialError: false
  });
}

function getOgImageSvg(title: string, desc: string, _type?: 'player' | 'course', stats?: {value: string, label: string}[], mapImageDataUri?: string | null) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
        backgroundColor: '#09090b',
        color: '#ffffff',
        fontFamily: 'Inter',
        padding: '60px 80px',
        border: '12px solid #27272a',
        position: 'relative',
        overflow: 'hidden',
      },
      children: [
        ...(mapImageDataUri ? [
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                opacity: 0.9,
              },
              children: [
                {
                  type: 'img',
                  props: {
                    src: mapImageDataUri,
                    width: MAPBOX_OG_WIDTH,
                    height: MAPBOX_OG_HEIGHT,
                    style: {
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }
                  }
                }
              ]
            }
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(to right, rgba(9, 9, 11, 0.94) 0%, rgba(9, 9, 11, 0.62) 44%, rgba(9, 9, 11, 0.28) 72%, rgba(9, 9, 11, 0.68) 100%)',
              }
            }
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: 'linear-gradient(to bottom, rgba(9, 9, 11, 0.35) 0%, rgba(9, 9, 11, 0) 30%, rgba(9, 9, 11, 0) 65%, rgba(9, 9, 11, 0.55) 100%)',
              }
            }
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 16,
                right: 24,
                fontSize: 13,
                fontWeight: 700,
                color: 'rgba(161, 161, 170, 0.55)',
                letterSpacing: '0.02em',
              },
              children: '© Mapbox © OpenStreetMap',
            }
          }
        ] : []),
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 36,
                          fontWeight: 700,
                          color: '#ffffff',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        },
                        children: 'APEX SPEED RUN',
                      },
                    },
                  ],
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: '32px',
                    width: '100%',
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: 'column',
                          maxWidth: (stats && stats.length > 2) ? '580px' : (stats && stats.length > 0) ? '680px' : '1050px',
                        },
                        children: [
                          {
                            type: 'div',
                            props: {
                              style: {
                                fontSize: (stats && stats.length > 0) ? 72 : 96,
                                fontWeight: 700,
                                marginBottom: '24px',
                                lineHeight: 1.08,
                                color: '#ffffff',
                                letterSpacing: '-0.04em',
                                textTransform: 'uppercase',
                              },
                              children: title,
                            },
                          },
                          {
                            type: 'div',
                            props: {
                              style: {
                                display: 'flex',
                                alignItems: 'center',
                              },
                              children: [
                                {
                                  type: 'div',
                                  props: {
                                    style: {
                                      fontSize: (stats && stats.length > 0) ? 32 : 40,
                                      color: '#d4d4d8',
                                      lineHeight: 1.2,
                                      letterSpacing: '-0.02em',
                                      fontWeight: 700,
                                    },
                                    children: desc,
                                  },
                                }
                              ]
                            }
                          },
                        ],
                      },
                    },
                    (stats && stats.length > 0) ? {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          flexDirection: (stats.length > 2) ? 'row' : 'column',
                          flexWrap: (stats.length > 2) ? 'wrap' : 'nowrap',
                          alignItems: 'flex-end',
                          justifyContent: 'flex-end',
                          gap: (stats.length > 2) ? '0px' : '40px',
                          width: (stats.length > 2) ? '400px' : 'auto',
                        },
                        children: stats.map((stat, i) => ({
                           type: 'div',
                           props: {
                             style: {
                               display: 'flex',
                               flexDirection: 'column',
                               alignItems: (stats.length > 2) ? 'flex-start' : 'flex-end',
                               textAlign: (stats.length > 2) ? 'left' : 'right',
                               width: (stats.length > 2) ? '50%' : 'auto',
                               marginBottom: (stats.length > 2 && i < 2) ? '32px' : '0px',
                             },
                             children: [
                               {
                                 type: 'div',
                                 props: {
                                   style: {
                                     fontSize: (stats.length > 2) ? 64 : 100,
                                     fontWeight: 700,
                                     color: '#ffffff',
                                     lineHeight: 1,
                                     letterSpacing: '-0.05em',
                                   },
                                   children: stat.value,
                                 }
                               },
                               {
                                 type: 'div',
                                 props: {
                                   style: {
                                     fontSize: (stats.length > 2) ? 20 : 24,
                                     fontWeight: 700,
                                     color: '#d4d4d8',
                                     textTransform: 'uppercase',
                                     letterSpacing: '0.05em',
                                     marginTop: (stats.length > 2) ? '8px' : '16px',
                                   },
                                   children: stat.label,
                                 }
                               }
                             ]
                           }
                        }))
                      }
                    } : null
                  ].filter(Boolean),
                },
              },
            ],
          },
        },
      ],
    },
  } as Parameters<typeof satori>[0];
}

function toCodePoint(unicodeSurrogates: string) {
  const r = [];
  let c = 0, p = 0, i = 0;
  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++);
    if (p) {
      r.push((65536 + ((p - 55296) << 10) + (c - 56320)).toString(16));
      p = 0;
    } else if (55296 <= c && c <= 56319) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.filter(cp => cp !== 'fe0f').join('-');
}

const emojiCache = new Map<string, string>();
const emojiInflight = new Map<string, Promise<string>>();

async function fetchEmojiDataUri(segment: string): Promise<string> {
  const cp = toCodePoint(segment);
  if (!cp) return '';
  if (emojiCache.has(cp)) return emojiCache.get(cp)!;
  if (emojiInflight.has(cp)) return emojiInflight.get(cp)!;

  const promise = (async () => {
    const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const text = await res.text();
        const uri = `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
        emojiCache.set(cp, uri);
        return uri;
      }
    } catch {
      // Ignore failed or timed-out emoji fetch
    }
    emojiCache.set(cp, '');
    return '';
  })();

  emojiInflight.set(cp, promise);
  try {
    return await promise;
  } finally {
    emojiInflight.delete(cp);
  }
}

async function generateOgImage(title: string, desc: string, outputPath: string, fontData: Buffer, type?: 'player' | 'course', stats?: {value: string, label: string}[], mapImageDataUri?: string | null) {
  const svg = await satori(getOgImageSvg(title, desc, type, stats, mapImageDataUri), {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: 'Inter',
        data: fontData,
        weight: 700,
        style: 'normal',
      },
    ],
    loadAdditionalAsset: async (code, segment) => {
      if (code === 'emoji') {
        return fetchEmojiDataUri(segment);
      }
      return '';
    }
  });

  const resvg = new Resvg(svg, {
    background: '#09090b',
    fitTo: { mode: 'width', value: 1200 },
  });
  
  const pngBuffer = resvg.render().asPng();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, pngBuffer);
}

function injectMeta(html: string, title: string, desc: string, ogImageUrl: string, pageUrl: string) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(desc);
  const safeOgImageUrl = escapeHtml(ogImageUrl);
  const safePageUrl = escapeHtml(pageUrl);
  const ogImageTags = `<meta property="og:image" content="${safeOgImageUrl}">\n    <meta property="og:image:type" content="image/png">\n    <meta property="og:image:width" content="${MAPBOX_OG_WIDTH}">\n    <meta property="og:image:height" content="${MAPBOX_OG_HEIGHT}">`;
  return html
    .replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(/<meta name="title"[^>]*>/i, `<meta name="title" content="${safeTitle}">`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${safeDesc}">`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${safePageUrl}">`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${safePageUrl}">`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${safeTitle}">`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${safeDesc}">`)
    .replace(/<meta property="og:image"[^>]*>/i, ogImageTags)
    .replace(/<meta property="og:image:alt"[^>]*>/i, `<meta property="og:image:alt" content="${safeTitle}">`)
    .replace(/<meta (?:name|property)="twitter:url"[^>]*>/i, `<meta name="twitter:url" content="${safePageUrl}">`)
    .replace(/<meta (?:name|property)="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${safeTitle}">`)
    .replace(/<meta (?:name|property)="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${safeDesc}">`)
    .replace(/<meta (?:name|property)="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${safeOgImageUrl}">`)
    .replace(/<meta (?:name|property)="twitter:image:alt"[^>]*>/i, `<meta name="twitter:image:alt" content="${safeTitle}">`);
}

const staticMapCache = new Map<string, string | null>();
const staticMapInflight = new Map<string, Promise<string | null>>();

function getMapboxConfig() {
  const token = (process.env.MAPBOX_SERVER_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || '').trim();
  const style = (process.env.MAPBOX_OG_STYLE || process.env.VITE_MAPBOX_DARK_STYLE || 'mapbox/dark-v11').trim().replace(/^\/+|\/+$/g, '');
  return { token, style };
}

async function getMapBackground(coords: [number, number] | null): Promise<string | null> {
  if (!coords) return null;
  const [lat, lon] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85.0511 || Math.abs(lon) > 180) {
    return null;
  }

  const { token, style } = getMapboxConfig();
  if (!token) {
    if (!loggedMissingMapboxToken) {
      loggedMissingMapboxToken = true;
      console.warn('Mapbox token missing (MAPBOX_SERVER_TOKEN / VITE_MAPBOX_ACCESS_TOKEN); generating OG images without map background.');
    }
    return null;
  }

  const key = `${style}:${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (staticMapCache.has(key)) return staticMapCache.get(key) ?? null;
  if (staticMapInflight.has(key)) return staticMapInflight.get(key)!;

  const promise = (async () => {
    // Mapbox Static Images API expects longitude first, latitude second.
    // Disable default bright corner pill/logo and render dark-themed attribution directly inside the card frame.
    const url = `https://api.mapbox.com/styles/v1/${style}/static/${lon.toFixed(5)},${lat.toFixed(5)},${MAPBOX_OG_ZOOM},0/${MAPBOX_OG_WIDTH}x${MAPBOX_OG_HEIGHT}?attribution=false&logo=false&access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if ((res.status === 401 || res.status === 403) && !loggedMapboxAuthError) {
          loggedMapboxAuthError = true;
          console.warn(`Mapbox Static Images API returned HTTP ${res.status}. If VITE_MAPBOX_ACCESS_TOKEN is URL-restricted, set an unrestricted MAPBOX_SERVER_TOKEN secret.`);
        }
        staticMapCache.set(key, null);
        return null;
      }
      const contentType = (res.headers.get('content-type') || 'image/png').split(';')[0].trim().toLowerCase();
      if (!contentType.startsWith('image/')) {
        staticMapCache.set(key, null);
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
      staticMapCache.set(key, dataUri);
      return dataUri;
    } catch {
      staticMapCache.set(key, null);
      return null;
    }
  })();

  staticMapInflight.set(key, promise);
  try {
    return await promise;
  } finally {
    staticMapInflight.delete(key);
  }
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await worker(current);
    }
  });
  await Promise.all(runners);
}

async function run() {
  const startTime = Date.now();
  console.log('Starting prerender...');
  
  const fontData = await fs.readFile(
    path.join(ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-700-normal.woff')
  );

  const baseHtmlUrl = path.join(ROOT, 'dist', 'index.html');
  const baseHtml = await fs.readFile(baseHtmlUrl, 'utf8');
  
  const data = await fetchSheets();
  
  const ogDir = path.join(ROOT, 'dist', 'og');
  await fs.mkdir(ogDir, { recursive: true });

  const BASE_URL = 'https://apexspeedrun.com';
  const allCourses = Object.keys(data.cMet || {});

  console.log(`Pre-warming Mapbox static map backgrounds for ${allCourses.length} courses...`);
  await runWithConcurrency(allCourses, 12, async (courseStr) => {
    const coords = data.cMet[courseStr]?.parsedCoords || null;
    await getMapBackground(coords);
  });
  
  const players = [...(data.openData || []), ...(data.data || [])];
  const uniquePlayers = new Map<string, PlayerProfile>();
  players.forEach(p => {
    if (p.name) uniquePlayers.set(createSlug(p.name), p);
  });
  
  const playerEntries = Array.from(uniquePlayers.entries());
  console.log(`Pre-rendering ${playerEntries.length} players...`);
  
  await runWithConcurrency(playerEntries, 12, async ([slug, player]) => {
    const flags = getCombinedFlags(player).trim();
    const titlePrefix = flags ? `${flags} ` : '';
    const title = `${titlePrefix}${player.name.toUpperCase()}`;
    const rating = player.rating ? player.rating.toFixed(2) : '0.00';
    const rank = player.allTimeRank || player.openRank || 'UR';
    
    const coursesCount = player.courses || 0;
    const runsCount = player.runs || 0;
    const winsCount = player.wins || 0;
    const firesCount = player.allTimeFireCount || 0;
    
    let desc = `Courses: ${coursesCount} | Runs: ${runsCount}`;
    if (winsCount > 0) desc += ` | Wins: ${winsCount}`;
    if (firesCount > 0) desc += ` | 🔥 ${firesCount}`;
    
    const ogTitle = `${titlePrefix}${player.name.toUpperCase()}`;
    const ogFileName = `player-${slug}.png`;
    const ogFilePath = path.join(ogDir, ogFileName);
    
    const stats = [
      { value: rating, label: 'LQ' },
      { value: rank === 'UR' ? 'UR' : `#${rank}`, label: 'RANK' }
    ];
    
    const pKey = player.pKey || normalizeName(player.name);
    const completedCourses: string[] = [];
    for (const c of allCourses) {
      if (data.lbAT?.M?.[c]?.[pKey] || data.lbAT?.F?.[c]?.[pKey] || data.lbSeason26?.M?.[c]?.[pKey] || data.lbSeason26?.F?.[c]?.[pKey]) {
        completedCourses.push(c);
      }
    }
    const representativeCourse =
      completedCourses.find(c => data.cMet[c]?.parsedCoords) ||
      (completedCourses.length > 0 ? completedCourses[0] : null);
    const mapImageDataUri = await getMapBackground(representativeCourse && data.cMet[representativeCourse] ? data.cMet[representativeCourse].parsedCoords || null : null);
    
    await generateOgImage(ogTitle, desc, ogFilePath, fontData, 'player', stats, mapImageDataUri);
    
    const ogImageUrl = `${BASE_URL}/og/${ogFileName}`;
    const pageUrl = `${BASE_URL}/players/${slug}`;
    const pageHtml = injectMeta(baseHtml, title, desc, ogImageUrl, pageUrl);
    
    const playerDir = path.join(ROOT, 'dist', 'players', slug);
    await fs.mkdir(playerDir, { recursive: true });
    await fs.writeFile(path.join(playerDir, 'index.html'), pageHtml);
  });
  
  console.log(`Pre-rendering ${allCourses.length} courses...`);
  
  await runWithConcurrency(allCourses, 12, async (courseStr) => {
    const slug = createSlug(courseStr);
    const courseInfo: CourseData = data.cMet[courseStr] || { name: courseStr };
    const flags = getCombinedFlags(courseInfo).trim();
    const titlePrefix = flags ? `${flags} ` : '';
    const title = `${titlePrefix}${courseStr.toUpperCase()} SPEED RUN`;
    
    let mBest = Infinity;
    let fBest = Infinity;
    
    if (data.lbAT) {
      const mData = data.lbAT.M?.[courseStr] || {};
      const fData = data.lbAT.F?.[courseStr] || {};
      const mTimes = Object.values(mData) as number[];
      const fTimes = Object.values(fData) as number[];
      if (mTimes.length) mBest = Math.min(...mTimes);
      if (fTimes.length) fBest = Math.min(...fTimes);
    }
    
    const locStr = formatOgLocation(courseInfo);
    const desc = `📍 ${locStr}`;
    
    const ogTitle = `${titlePrefix}${courseStr.toUpperCase()} SPEED RUN`;
    const ogFileName = `course-${slug}.png`;
    const ogFilePath = path.join(ogDir, ogFileName);
    
    const stats = [
      { value: mBest !== Infinity ? mBest.toFixed(2) : '--', label: "MEN'S WR" },
      { value: fBest !== Infinity ? fBest.toFixed(2) : '--', label: "WOMEN'S WR" }
    ];
    
    const mapImageDataUri = await getMapBackground(courseInfo.parsedCoords || null);
    
    await generateOgImage(ogTitle, desc, ogFilePath, fontData, 'course', stats, mapImageDataUri);
    
    const ogImageUrl = `${BASE_URL}/og/${ogFileName}`;
    const pageUrl = `${BASE_URL}/courses/${slug}`;
    const pageHtml = injectMeta(baseHtml, title, desc, ogImageUrl, pageUrl);
    
    const courseDir = path.join(ROOT, 'dist', 'courses', slug);
    await fs.mkdir(courseDir, { recursive: true });
    await fs.writeFile(path.join(courseDir, 'index.html'), pageHtml);
  });

  console.log(`Prerendering completed in ${((Date.now() - startTime) / 1000).toFixed(2)}s!`);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
