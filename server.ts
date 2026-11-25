import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { getPageMeta, getSnapshotBundle } from "./src/meta-injector.ts";
import { escapeHtml, getSafeHostFromHeaders, isValidSheetGid } from "./src/lib/server-utils.ts";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import crypto from "crypto";

const MAPBOX_OG_ZOOM = 13;
const MAPBOX_OG_WIDTH = 1200;
const MAPBOX_OG_HEIGHT = 630;
let loggedMissingMapboxToken = false;
let loggedMapboxAuthError = false;

class OgImageCache {
  private cache = new Map<string, Buffer>();
  private readonly maxKeys = 500;

  get(title: string, desc: string): Buffer | null {
    const key = this.hash(title, desc);
    if (this.cache.has(key)) {
      const buffer = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, buffer);
      return buffer;
    }
    return null;
  }

  set(title: string, desc: string, buffer: Buffer): void {
    const key = this.hash(title, desc);
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxKeys) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, buffer);
  }

  private hash(title: string, desc: string): string {
    return crypto
      .createHash("sha256")
      .update(`${title}||${desc}`)
      .digest("hex");
  }
}

const ogCache = new OgImageCache();
let cachedFontData: Buffer | null = null;

async function getFontData(): Promise<Buffer> {
  if (!cachedFontData) {
    cachedFontData = await fs.readFile(
      path.join(process.cwd(), "node_modules", "@fontsource", "inter", "files", "inter-latin-700-normal.woff"),
    );
  }
  return cachedFontData;
}

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1DcLZyAO2QZij_176vsC7_rWWTVbxwt8X9Jw7YWM_7j4";


function injectMetaTags(
  template: string,
  title: string,
  description: string,
  currentUrl: string,
  ogImageUrl: string,
): string {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeCurrentUrl = escapeHtml(currentUrl);
  const safeOgImageUrl = escapeHtml(ogImageUrl);

  return template
    .replace(/<title>.*?<\/title>/s, `<title>${safeTitle}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${safeDesc}">`)
    .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${safeTitle}">`)
    .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${safeDesc}">`)
    .replace(/<meta property="og:url"[^>]*>/i, `<meta property="og:url" content="${safeCurrentUrl}">`)
    .replace(/<meta property="og:image"[^>]*>/i, `<meta property="og:image" content="${safeOgImageUrl}">`)
    .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${safeTitle}">`)
    .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${safeDesc}">`)
    .replace(/<meta name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${safeOgImageUrl}">`);
}

function toCodePoint(unicodeSurrogates: string) {
  const r: string[] = [];
  let c: number;
  let p = 0;
  let i = 0;
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
  return r.filter((cp) => cp !== "fe0f").join("-");
}

const staticMapCache = new Map<string, string | null>();
const staticMapInflight = new Map<string, Promise<string | null>>();
const MAX_STATIC_MAP_CACHE_ENTRIES = 200;

function setBoundedStaticMapCache(key: string, value: string | null) {
  if (staticMapCache.has(key)) {
    staticMapCache.delete(key);
  } else if (staticMapCache.size >= MAX_STATIC_MAP_CACHE_ENTRIES) {
    const oldestKey = staticMapCache.keys().next().value;
    if (oldestKey !== undefined) {
      staticMapCache.delete(oldestKey);
    }
  }
  staticMapCache.set(key, value);
}

async function getMapBackground(coords: [number, number] | null): Promise<string | null> {
  if (!coords) return null;
  const [lat, lon] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 85.0511 || Math.abs(lon) > 180) {
    return null;
  }

  const token = (process.env.MAPBOX_SERVER_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || "").trim();
  if (!token) {
    if (!loggedMissingMapboxToken) {
      loggedMissingMapboxToken = true;
      console.warn(
        "Mapbox token missing (MAPBOX_SERVER_TOKEN / VITE_MAPBOX_ACCESS_TOKEN); generating OG images without map background.",
      );
    }
    return null;
  }

  const style = (process.env.MAPBOX_OG_STYLE || process.env.VITE_MAPBOX_DARK_STYLE || "mapbox/dark-v11")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  const key = `${style}:${lat.toFixed(4)},${lon.toFixed(4)}`;

  if (staticMapCache.has(key)) {
    const cached = staticMapCache.get(key) ?? null;
    staticMapCache.delete(key);
    staticMapCache.set(key, cached);
    return cached;
  }
  if (staticMapInflight.has(key)) {
    return staticMapInflight.get(key)!;
  }

  const promise = (async () => {
    // Mapbox Static Images API expects longitude first, latitude second.
    const url = `https://api.mapbox.com/styles/v1/${style}/static/${lon.toFixed(5)},${lat.toFixed(5)},${MAPBOX_OG_ZOOM},0/${MAPBOX_OG_WIDTH}x${MAPBOX_OG_HEIGHT}?access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        if ((res.status === 401 || res.status === 403) && !loggedMapboxAuthError) {
          loggedMapboxAuthError = true;
          console.warn(
            `Mapbox Static Images API returned HTTP ${res.status}. If VITE_MAPBOX_ACCESS_TOKEN is URL-restricted, set MAPBOX_SERVER_TOKEN.`,
          );
        }
        setBoundedStaticMapCache(key, null);
        return null;
      }
      const contentType = (res.headers.get("content-type") || "image/png").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) {
        setBoundedStaticMapCache(key, null);
        return null;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;
      setBoundedStaticMapCache(key, dataUri);
      return dataUri;
    } catch {
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

function getOgImageSvg(
  title: string,
  desc: string,
  _type?: "player" | "course",
  stats?: { value: string; label: string }[],
  mapImageDataUri?: string | null,
) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        height: "100%",
        width: "100%",
        flexDirection: "column",
        backgroundColor: "#09090b",
        color: "#ffffff",
        fontFamily: "Inter",
        padding: "60px 80px",
        border: "12px solid #27272a",
        position: "relative",
        overflow: "hidden",
      },
      children: [
        ...(mapImageDataUri
          ? [
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    opacity: 0.9,
                  },
                  children: [
                    {
                      type: "img",
                      props: {
                        src: mapImageDataUri,
                        width: MAPBOX_OG_WIDTH,
                        height: MAPBOX_OG_HEIGHT,
                        style: {
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        },
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundImage:
                      "linear-gradient(to right, rgba(9, 9, 11, 0.95) 0%, rgba(9, 9, 11, 0.7) 40%, rgba(9, 9, 11, 0.1) 100%)",
                  },
                },
              },
            ]
          : []),
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: 36,
                          fontWeight: 700,
                          color: "#ffffff",
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                        },
                        children: "APEX SPEED RUN",
                      },
                    },
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    width: "100%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          maxWidth: stats && stats.length > 0 ? "650px" : "1050px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: stats && stats.length > 0 ? 72 : 96,
                                fontWeight: 700,
                                marginBottom: "32px",
                                lineHeight: 1.1,
                                color: "#ffffff",
                                letterSpacing: "-0.04em",
                                textTransform: "uppercase",
                              },
                              children: title,
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                              },
                              children: [
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontSize: stats && stats.length > 0 ? 32 : 40,
                                      color: "#a1a1aa",
                                      lineHeight: 1.2,
                                      letterSpacing: "-0.02em",
                                      fontWeight: 700,
                                      textTransform: "uppercase",
                                    },
                                    children: desc,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    stats && stats.length > 0
                      ? {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              flexDirection: stats.length > 2 ? "row" : "column",
                              flexWrap: stats.length > 2 ? "wrap" : "nowrap",
                              alignItems: "flex-end",
                              justifyContent: "flex-end",
                              gap: stats.length > 2 ? "0px" : "40px",
                              width: stats.length > 2 ? "400px" : "auto",
                            },
                            children: stats.map((stat, i) => ({
                              type: "div",
                              props: {
                                style: {
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: stats.length > 2 ? "flex-start" : "flex-end",
                                  textAlign: stats.length > 2 ? "left" : "right",
                                  width: stats.length > 2 ? "50%" : "auto",
                                  marginBottom: stats.length > 2 && i < 2 ? "32px" : "0px",
                                },
                                children: [
                                  {
                                    type: "div",
                                    props: {
                                      style: {
                                        fontSize: stats.length > 2 ? 64 : 100,
                                        fontWeight: 700,
                                        color: "#ffffff",
                                        lineHeight: 1,
                                        letterSpacing: "-0.05em",
                                      },
                                      children: stat.value,
                                    },
                                  },
                                  {
                                    type: "div",
                                    props: {
                                      style: {
                                        fontSize: stats.length > 2 ? 20 : 24,
                                        fontWeight: 700,
                                        color: "#a1a1aa",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        marginTop: stats.length > 2 ? "8px" : "16px",
                                      },
                                      children: stat.label,
                                    },
                                  },
                                ],
                              },
                            })),
                          },
                        }
                      : null,
                  ].filter(Boolean),
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function getRequestSearchParams(query: express.Request["query"]): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (typeof v === "string") params.set(k, v);
    else if (Array.isArray(v) && typeof v[0] === "string") params.set(k, v[0]);
  });
  return params;
}

function getSafeHost(req: express.Request): string {
  return getSafeHostFromHeaders(req.headers["x-forwarded-host"], req.headers.host);
}

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path.endsWith("service-worker.js") || req.path.endsWith("sw.js")) {
      res.setHeader("Service-Worker-Allowed", "/");
    }
    next();
  });

  // Precomputed compressed snapshot endpoint with ETag & SWR caching
  app.get("/api/snapshot", async (req, res) => {
    try {
      const bundle = await getSnapshotBundle();
      if (!bundle) {
        return res.status(503).json({ error: "Snapshot temporarily unavailable" });
      }

      res.setHeader("ETag", bundle.etag);
      res.setHeader("Cache-Control", "public, no-cache");
      res.setHeader("Vary", "Accept-Encoding");

      if (req.headers["if-none-match"] === bundle.etag) {
        return res.status(304).end();
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const acceptEncoding = String(req.headers["accept-encoding"] || "");
      if (acceptEncoding.includes("gzip")) {
        res.setHeader("Content-Encoding", "gzip");
        return res.status(200).send(bundle.gzipBuffer);
      }
      return res.status(200).send(bundle.json);
    } catch (error) {
      console.error("Snapshot endpoint error:", error);
      return res.status(500).json({ error: "Failed to load snapshot" });
    }
  });

  // Proxy route for Google Sheets to avoid CORS
  app.get("/api/proxy-sheet", async (req, res) => {
    const gid = typeof req.query.gid === "string" ? req.query.gid.trim() : "";
    const cb = typeof req.query.cb === "string" ? req.query.cb.replace(/[^\d]/g, "") : "";
    if (!isValidSheetGid(gid)) {
      return res.status(400).send("Invalid gid");
    }

    try {
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&cb=${cb || Date.now()}`;

      let response: Response | undefined;
      let retries = 3;
      while (retries > 0) {
        response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) break;
        retries--;
        if (retries > 0) await new Promise((r) => setTimeout(r, 1000));
      }

      if (!response || !response.ok) {
        const status = response ? response.status : "Unknown";
        console.error(`Google Sheets final response: ${status}`);
        throw new Error(`Google Sheets responded with ${status}`);
      }

      const data = await response.text();
      res.header("Content-Type", "text/csv; charset=utf-8");
      res.send(data);
    } catch (error) {
      console.error("Proxy Fetch Error:", error);
      res.status(500).send("Failed to fetch sheet data");
    }
  });

  // Generate Dynamic OG Images
  app.get("/api/og.png", async (req, res) => {
    try {
      let title = (typeof req.query.title === "string" && req.query.title) || "Apex Speed Run";
      let desc =
        (typeof req.query.desc === "string" && req.query.desc) ||
        "Global Parkour Leaderboards and Course Directory";

      const reqPath = typeof req.query.path === "string" ? req.query.path : "";
      const reqQuery = typeof req.query.query === "string" ? req.query.query : "";

      let type: "player" | "course" | undefined;
      let stats: { value: string; label: string }[] | undefined;
      let mapCoords: [number, number] | null = null;
      let mapImageDataUri: string | null = null;

      if (reqPath) {
        const searchParams = new URLSearchParams(reqQuery || "");
        const meta = await getPageMeta(reqPath, searchParams);
        title = meta.title?.toUpperCase() || title;
        desc = meta.description?.toUpperCase() || desc;
        type = meta.ogType;
        stats = meta.ogStats?.map((s) => ({
          value: s.value?.toUpperCase(),
          label: s.label?.toUpperCase(),
        }));
        if (meta.ogMapCoords) {
          mapCoords = meta.ogMapCoords;
          mapImageDataUri = await getMapBackground(meta.ogMapCoords);
        }
      }

      const coordsKey = mapCoords ? `${mapCoords[0].toFixed(4)},${mapCoords[1].toFixed(4)}` : "none";
      const cacheKeyDesc = `${desc}${JSON.stringify(stats || [])}${coordsKey}:${mapImageDataUri ? "1" : "0"}`;
      const cachedBuffer = ogCache.get(title, cacheKeyDesc);
      if (cachedBuffer) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(cachedBuffer);
      }

      const fontData = await getFontData();

      const svg = await satori(
        getOgImageSvg(title, desc, type, stats, mapImageDataUri) as Parameters<typeof satori>[0],
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: "Inter",
              data: fontData,
              weight: 700,
              style: "normal",
            },
          ],
          loadAdditionalAsset: async (code, segment) => {
            if (code === "emoji") {
              const cp = toCodePoint(segment);
              const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${cp}.svg`;
              try {
                const emojiRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
                if (emojiRes.ok) {
                  const text = await emojiRes.text();
                  return `data:image/svg+xml;base64,${Buffer.from(text).toString("base64")}`;
                }
              } catch {
                // ignore
              }
            }
            return "";
          },
        },
      );

      const resvg = new Resvg(svg, {
        background: "#09090b",
        fitTo: { mode: "width", value: 1200 },
      });

      const pngBuffer = Buffer.from(resvg.render().asPng());
      ogCache.set(title, cacheKeyDesc, pngBuffer);

      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(pngBuffer);
    } catch (error) {
      console.error("OG Image Error:", error);
      res.status(500).send("Failed to generate OG image");
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      if (req.path.match(/\.(png|jpe?g|gif|svg|ico|css|js|map|woff2?|ttf|eot)$/i)) {
        return res.status(404).end();
      }
      try {
        const url = req.originalUrl;
        let template = await fs.readFile(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);

        const searchParams = getRequestSearchParams(req.query);
        const meta = await getPageMeta(req.path, searchParams);

        const hostHeader = getSafeHost(req);
        const baseUrl = hostHeader.includes("localhost")
          ? "http://localhost:3000"
          : `https://${hostHeader}`;
        const currentUrl = `${baseUrl}${req.originalUrl}`;
        const ogImageUrl = `${baseUrl}/api/og.png?path=${encodeURIComponent(req.path)}&query=${encodeURIComponent(searchParams.toString())}`;

        template = injectMetaTags(template, meta.title, meta.description, currentUrl, ogImageUrl);
        res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(template);
      } catch (e: unknown) {
        if (e instanceof Error) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const cachedIndexHtml = await fs.readFile(path.join(distPath, "index.html"), "utf-8");

    // Immutable long-term cache for content-hashed Vite bundles
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        index: false,
        maxAge: "1y",
        immutable: true,
      }),
    );
    app.use(express.static(distPath, { index: false, maxAge: "1h" }));

    app.get("*", async (req, res, next) => {
      if (req.path.match(/\.(png|jpe?g|gif|svg|ico|css|js|map|woff2?|ttf|eot)$/i)) {
        return res.status(404).end();
      }
      try {
        const searchParams = getRequestSearchParams(req.query);
        const meta = await getPageMeta(req.path, searchParams);

        const hostHeader = getSafeHost(req);
        const baseUrl = hostHeader.includes("localhost")
          ? "http://localhost:3000"
          : `https://${hostHeader}`;
        const currentUrl = `${baseUrl}${req.originalUrl}`;
        const ogImageUrl = `${baseUrl}/api/og.png?path=${encodeURIComponent(req.path)}&query=${encodeURIComponent(searchParams.toString())}`;

        const template = injectMetaTags(cachedIndexHtml, meta.title, meta.description, currentUrl, ogImageUrl);
        res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
