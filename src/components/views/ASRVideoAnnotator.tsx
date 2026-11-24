import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Square,
  Download,
  Video,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "../../lib/asr-utils";
import { stepFrameTime } from "../../lib/annotator-utils";

interface Annotation {
  id: string;
  type: "laser" | "start-block" | "stop-block";
  points: { x: number; y: number }[]; // Normalized coordinates 0-1
  time: number;
  freezeDuration: number;
  color: string;
  lineWidth: number;
}

interface CapturableVideoElement extends HTMLVideoElement {
  captureStream?(fps?: number): MediaStream;
  mozCaptureStream?(fps?: number): MediaStream;
}

interface DecimalInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  className?: string;
}

const ASRDecimalInput = ({
  value,
  min = 0,
  max,
  step: _step,
  onChange,
  className,
}: DecimalInputProps) => {
  const [localVal, setLocalVal] = useState(value.toFixed(2));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(value.toFixed(2));
    }
  }, [value, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setLocalVal(rawVal);
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;

      setLocalVal(clamped.toFixed(2));
      onChange(clamped);
    } else {
      setLocalVal(value.toFixed(2));
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localVal}
      onChange={handleInputChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      className={cn("text-base", className)}
    />
  );
};

function buildNodeRenderScript(
  annotations: Annotation[],
  sourceFilename: string,
  fps: number,
): string {
  const safeName = sourceFilename.replace(/[^a-zA-Z0-9._-]/g, "_") || "input.mp4";
  const serialized = JSON.stringify(annotations, null, 2);

  return `#!/usr/bin/env node
/**
 * APEX SPEED RUN — Offline 4K/60fps HD Annotation Render Pipeline
 *
 * Prerequisites:
 *   1. FFmpeg & ffprobe installed on PATH (brew install ffmpeg / apt install ffmpeg)
 *   2. Place this script next to your raw video file: "${safeName}"
 *   3. Run:
 *        npm install @resvg/resvg-js
 *        node asr_hd_render.mjs "${safeName}" "asr_annotated_output.mp4"
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { Resvg } from "@resvg/resvg-js";

const TARGET_FPS = ${fps};
const ANNOTATIONS = ${serialized};

const inputPath = path.resolve(process.argv[2] || ${JSON.stringify(safeName)});
const outputPath = path.resolve(process.argv[3] || "asr_annotated_output.mp4");

if (!fs.existsSync(inputPath)) {
  console.error("Input video not found:", inputPath);
  process.exit(1);
}

function run(cmd, args) {
  return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "inherit"] }).toString("utf8");
}

function probeVideo(file) {
  const raw = run("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
    "-of", "json",
    file,
  ]);
  const info = JSON.parse(raw);
  const vStream = (info.streams || []).find((s) => s.codec_type === "video");
  const hasAudio = (info.streams || []).some((s) => s.codec_type === "audio");
  if (!vStream) throw new Error("No video stream detected in " + file);
  return {
    width: Number(vStream.width),
    height: Number(vStream.height),
    duration: Number(info.format?.duration || 0),
    hasAudio,
  };
}

function renderOverlayPng(ann, width, height, outFile) {
  const pts = ann.points.map((p) => \`\${(p.x * width).toFixed(2)},\${(p.y * height).toFixed(2)}\`).join(" ");
  const scaleFactor = Math.max(1, width / 1280);
  const strokeWidth = ((ann.lineWidth || 4) * scaleFactor).toFixed(2);
  const isPolygon = ann.type !== "laser" && ann.points.length >= 3;
  const shapeSvg = isPolygon
    ? \`<polygon points="\${pts}" fill="\${ann.color}" fill-opacity="0.25" stroke="\${ann.color}" stroke-width="\${strokeWidth}" stroke-linejoin="round" filter="url(#glow)" />\`
    : \`<polyline points="\${pts}" fill="none" stroke="\${ann.color}" stroke-width="\${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" />\`;

  const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="\${(6 * scaleFactor).toFixed(1)}" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  \${shapeSvg}
</svg>\`;

  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  fs.writeFileSync(outFile, resvg.render().asPng());
}

const meta = probeVideo(inputPath);
const sorted = [...ANNOTATIONS]
  .filter((a) => a.points && a.points.length >= 2 && a.time >= 0 && a.time <= meta.duration)
  .sort((a, b) => a.time - b.time);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "asr-render-"));
const segmentFiles = [];

console.log(\`Probed \${meta.width}x\${meta.height}, duration \${meta.duration.toFixed(2)}s, \${sorted.length} freeze layers.\`);

try {
  let cursor = 0;
  let segIdx = 0;

  const encodeSlice = (start, end) => {
    if (end - start <= 0.01) return;
    const out = path.join(tmpDir, \`seg_\${String(segIdx++).padStart(3, "0")}.mp4\`);
    const args = [
      "-y",
      "-ss", start.toFixed(4),
      "-to", end.toFixed(4),
      "-i", inputPath,
      "-r", String(TARGET_FPS),
      "-c:v", "libx264",
      "-crf", "16",
      "-preset", "slow",
      "-pix_fmt", "yuv420p",
    ];
    if (meta.hasAudio) {
      args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2");
    } else {
      args.push("-an");
    }
    args.push(out);
    run("ffmpeg", args);
    segmentFiles.push(out);
  };

  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];
    encodeSlice(cursor, ann.time);

    if (ann.freezeDuration > 0.01) {
      const framePng = path.join(tmpDir, \`frame_\${i}.png\`);
      const overlayPng = path.join(tmpDir, \`overlay_\${i}.png\`);
      const freezeOut = path.join(tmpDir, \`seg_\${String(segIdx++).padStart(3, "0")}.mp4\`);

      run("ffmpeg", [
        "-y",
        "-ss", ann.time.toFixed(4),
        "-i", inputPath,
        "-frames:v", "1",
        framePng,
      ]);

      renderOverlayPng(ann, meta.width, meta.height, overlayPng);

      const freezeArgs = [
        "-y",
        "-loop", "1",
        "-t", ann.freezeDuration.toFixed(4),
        "-i", framePng,
        "-i", overlayPng,
      ];
      if (meta.hasAudio) {
        freezeArgs.push(
          "-f", "lavfi",
          "-t", ann.freezeDuration.toFixed(4),
          "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
        );
      }
      freezeArgs.push(
        "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]",
        "-map", "[v]",
      );
      if (meta.hasAudio) {
        freezeArgs.push("-map", "2:a", "-c:a", "aac", "-b:a", "192k", "-shortest");
      } else {
        freezeArgs.push("-an");
      }
      freezeArgs.push(
        "-r", String(TARGET_FPS),
        "-c:v", "libx264",
        "-crf", "16",
        "-preset", "slow",
        "-pix_fmt", "yuv420p",
        freezeOut,
      );
      run("ffmpeg", freezeArgs);
      segmentFiles.push(freezeOut);
    }

    cursor = ann.time;
  }

  encodeSlice(cursor, meta.duration);

  const concatList = path.join(tmpDir, "concat.txt");
  fs.writeFileSync(
    concatList,
    segmentFiles.map((f) => \`file '\${f.replace(/'/g, "'\\\\''")}'\`).join("\\n"),
  );

  run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatList,
    "-c", "copy",
    "-movflags", "+faststart",
    outputPath,
  ]);

  console.log("HD render complete:", outputPath);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
`;
}

export function ASRVideoAnnotator({ theme }: { theme: "light" | "dark" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string>("video.mp4");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState<30 | 60>(60);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [drawingState, setDrawingState] = useState<{
    active: boolean;
    tool: "laser" | "start-block" | "stop-block";
    currentPoints: { x: number; y: number }[];
    color: string;
    lineWidth: number;
  }>({
    active: false,
    tool: "laser",
    currentPoints: [],
    color: "#3ae374",
    lineWidth: 4,
  });
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null,
  );

  const lastFrozenIdRef = useRef<string | null>(null);
  const freezeTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);

  // Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const requestRef = useRef<number | undefined>(undefined);

  const clearFreezeTimer = useCallback(() => {
    if (freezeTimerRef.current !== null) {
      window.clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      clearFreezeTimer();
    };
  }, [clearFreezeTimer]);

  // Prevent memory leak on videoSrc upload/cleanup
  useEffect(() => {
    return () => {
      if (videoSrc) {
        try {
          URL.revokeObjectURL(videoSrc);
        } catch (e) {
          console.warn("Failed to revoke video object URL:", e);
        }
      }
    };
  }, [videoSrc]);

  // Prevent memory leak on recordingUrl cleanup
  useEffect(() => {
    return () => {
      if (recordingUrl) {
        try {
          URL.revokeObjectURL(recordingUrl);
        } catch (e) {
          console.warn("Failed to revoke recording URL:", e);
        }
      }
    };
  }, [recordingUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      clearFreezeTimer();
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFilename(file.name || "video.mp4");
      setAnnotations([]);
      setRecordingUrl(null);
      setIsPlaying(false);
      lastFrozenIdRef.current = null;
    }
  };

  const drawAnnotation = (
    ctx: CanvasRenderingContext2D,
    ann: Annotation,
    w: number,
    h: number,
  ) => {
    if (ann.points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(ann.points[0].x * w, ann.points[0].y * h);
    for (let i = 1; i < ann.points.length; i++) {
      ctx.lineTo(ann.points[i].x * w, ann.points[i].y * h);
    }

    if (ann.type === "laser" || ann.points.length < 3) {
      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.lineWidth || 4;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ann.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.closePath();
      ctx.fillStyle = ann.color + "40";
      ctx.fill();

      ctx.strokeStyle = ann.color;
      ctx.lineWidth = ann.lineWidth || 3;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ann.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawActiveShape = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    w: number,
    h: number,
    toolType: "laser" | "start-block" | "stop-block",
    color: string,
    lineWidth: number,
  ) => {
    if (points.length === 0) return;

    ctx.fillStyle = color;
    points.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 6, 0, 2 * Math.PI);
      ctx.fill();
    });

    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x * w, points[0].y * h);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * w, points[i].y * h);
      }

      if (
        (toolType === "start-block" || toolType === "stop-block") &&
        points.length > 2
      ) {
        ctx.lineTo(points[0].x * w, points[0].y * h);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Renders a single frame to the canvas (no rAF scheduling here)
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    if (canvas.width > 0 && canvas.height > 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const time = video.currentTime;

      if (lastFrozenIdRef.current) {
        const lastFrozenAnn = annotations.find(
          (a) => a.id === lastFrozenIdRef.current,
        );
        if (!lastFrozenAnn || Math.abs(time - lastFrozenAnn.time) > 0.2) {
          lastFrozenIdRef.current = null;
        }
      }

      if (!video.paused && !video.seeking) {
        const toFreeze = annotations.find(
          (a) =>
            time >= a.time &&
            time < a.time + 0.1 &&
            lastFrozenIdRef.current !== a.id,
        );

        if (toFreeze) {
          video.pause();
          lastFrozenIdRef.current = toFreeze.id;
          clearFreezeTimer();

          freezeTimerRef.current = window.setTimeout(() => {
            freezeTimerRef.current = null;
            if (isPlayingRef.current && videoRef.current) {
              videoRef.current.play().catch(() => {});
            }
          }, toFreeze.freezeDuration * 1000);
        }
      }

      annotations.forEach((ann) => {
        const isCurrentFreeze =
          lastFrozenIdRef.current === ann.id && video.paused;
        const isNearTime = video.paused && Math.abs(time - ann.time) <= 0.05;

        if (isCurrentFreeze || isNearTime) {
          drawAnnotation(ctx, ann, canvas.width, canvas.height);
        }
      });

      if (drawingState.active && drawingState.currentPoints.length > 0) {
        drawActiveShape(
          ctx,
          drawingState.currentPoints,
          canvas.width,
          canvas.height,
          drawingState.tool,
          drawingState.color,
          drawingState.lineWidth,
        );
      }
    }
  }, [annotations, drawingState, clearFreezeTimer]);

  // Run rAF loop ONLY while actively playing or recording; zero idle GPU/CPU drain when paused
  useEffect(() => {
    if (!videoSrc) return;

    if (!isPlaying && !isRecording) {
      renderFrame();
      return;
    }

    let active = true;
    const tick = () => {
      if (!active) return;
      renderFrame();
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [renderFrame, videoSrc, isPlaying, isRecording]);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      clearFreezeTimer();
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, clearFreezeTimer]);

  const stepFrames = useCallback(
    (deltaFrames: number) => {
      const video = videoRef.current;
      if (!video) return;
      clearFreezeTimer();
      if (!video.paused) {
        video.pause();
        setIsPlaying(false);
      }
      const nextTime = stepFrameTime(
        video.currentTime,
        deltaFrames,
        fps,
        duration || video.duration || 0,
      );
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [fps, duration, clearFreezeTimer],
  );

  const finalizeShape = useCallback(() => {
    if (!drawingState.active || drawingState.currentPoints.length < 2) return;

    const newAnn: Annotation = {
      id: Math.random().toString(36).substring(2, 9),
      type: drawingState.tool,
      points: drawingState.currentPoints,
      time: videoRef.current ? videoRef.current.currentTime : 0,
      freezeDuration: 0.66,
      color: drawingState.color,
      lineWidth: drawingState.lineWidth,
    };
    setAnnotations((prev) => [...prev, newAnn].sort((a, b) => a.time - b.time));
    setDrawingState((prev) => ({ ...prev, active: false, currentPoints: [] }));
    setActiveAnnotationId(newAnn.id);
  }, [drawingState]);

  // Keyboard shortcuts for fast frame-accurate scrubbing & annotation workflow
  useEffect(() => {
    if (!videoSrc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepFrames(e.shiftKey ? -10 : -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepFrames(e.shiftKey ? 10 : 1);
      } else if (e.key === "Enter" && drawingState.active && drawingState.currentPoints.length >= 2) {
        e.preventDefault();
        finalizeShape();
      } else if (e.key === "Escape" && drawingState.active) {
        e.preventDefault();
        setDrawingState((prev) => ({ ...prev, active: false, currentPoints: [] }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [videoSrc, handlePlayPause, stepFrames, drawingState.active, drawingState.currentPoints.length, finalizeShape]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.active || !canvasRef.current || !videoRef.current) return;

    if (isPlaying) {
      clearFreezeTimer();
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = canvasRef.current.getBoundingClientRect();
    if (canvasRef.current.width === 0 || canvasRef.current.height === 0) return;

    const canvasAsp = canvasRef.current.width / canvasRef.current.height;
    const rectAsp = rect.width / rect.height;

    const rawX = e.nativeEvent.offsetX;
    const rawY = e.nativeEvent.offsetY;

    const cw = rect.width;
    const ch = rect.height;

    let renderedW = cw;
    let renderedH = ch;
    let imgOffsetX = 0;
    let imgOffsetY = 0;

    if (canvasAsp > rectAsp) {
      renderedH = cw / canvasAsp;
      imgOffsetY = (ch - renderedH) / 2;
    } else {
      renderedW = ch * canvasAsp;
      imgOffsetX = (cw - renderedW) / 2;
    }

    const x = (rawX - imgOffsetX) / renderedW;
    const y = (rawY - imgOffsetY) / renderedH;

    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    setDrawingState((prev) => ({
      ...prev,
      currentPoints: [...prev.currentPoints, { x, y }],
    }));
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ fps, source: videoFilename, annotations }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asr_course_rules_metadata.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartRecording = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;

    clearFreezeTimer();
    videoRef.current.currentTime = 0;
    lastFrozenIdRef.current = null;

    const stream = canvas.captureStream(30);

    const capturableVid = videoRef.current as CapturableVideoElement;
    const audioTrack = capturableVid.mozCaptureStream
      ? capturableVid.mozCaptureStream().getAudioTracks()[0]
      : null;
    if (!audioTrack && capturableVid.captureStream) {
      const vidStream = capturableVid.captureStream();
      if (vidStream && vidStream.getAudioTracks().length > 0) {
        stream.addTrack(vidStream.getAudioTracks()[0]);
      }
    }

    try {
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm; codecs=vp9",
        videoBitsPerSecond: 8000000,
      });
    } catch {
      mediaRecorderRef.current = new MediaRecorder(stream, {
        videoBitsPerSecond: 8000000,
      });
    }
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordingUrl(url);
      recordedChunksRef.current = [];
    };

    recordedChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);

    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearFreezeTimer();
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleNodescriptGen = () => {
    const scriptContent = buildNodeRenderScript(annotations, videoFilename, fps);
    const blob = new Blob([scriptContent], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asr_hd_render.mjs";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "w-full h-full overflow-hidden flex flex-col",
        theme === "dark"
          ? "text-zinc-100 bg-zinc-950"
          : "text-zinc-900 bg-white",
      )}
    >
      <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-current/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest leading-none">
            ASR Video Annotator
          </h1>
          <p className="text-[10px] font-medium tracking-widest opacity-60 mt-1">
            INTERNAL TOOL: FRAME-ACCURATE ANNOTATIONS, WEBM & FFMPEG PIPELINE
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {videoSrc && annotations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-200 transition-colors font-black text-[10px] tracking-widest uppercase border border-white"
            >
              <Download size={14} />{" "}
              <span className="hidden lg:inline">EXPORT MENU</span>
            </button>
          )}
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-none font-black text-[10px] tracking-widest uppercase transition-colors inline-flex items-center gap-2">
            <Video size={16} />
            <span className="hidden sm:inline">Load Video</span>
            <span className="sm:hidden">Load</span>
            <input
              type="file"
              accept="video/mp4,video/mov,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-[3] flex flex-col min-h-0 min-w-0 bg-black relative border-r border-current/10 overflow-hidden">
          <div className="flex-1 relative min-h-0">
            {!videoSrc && (
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-widest uppercase opacity-30 text-white">
                NO VIDEO LOADED
              </div>
            )}

            <video
              ref={videoRef}
              src={videoSrc || undefined}
              className="hidden"
              loop={!isRecording}
              playsInline
              muted
              controls={false}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onLoadedData={() => renderFrame()}
              onSeeked={(e) => {
                setCurrentTime(e.currentTarget.currentTime);
                renderFrame();
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={() => {
                setIsPlaying(false);
                if (isRecording) handleStopRecording();
              }}
            />

            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-contain cursor-crosshair"
              onClick={handleCanvasClick}
            />
          </div>

          {/* Transport Controls permanently beneath the video */}
          {videoSrc && (
            <div className="bg-zinc-950 border-t border-white/5 p-4 flex-shrink-0 z-10 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  className="w-12 h-12 flex items-center justify-center bg-white text-black hover:bg-white/80 rounded-full transition-colors flex-shrink-0 shadow-lg"
                >
                  {isPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} className="ml-1" />
                  )}
                </button>
                <div className="flex flex-col flex-1 gap-1">
                  <div className="flex justify-between text-[10px] font-mono tracking-widest uppercase opacity-80 text-white tabular-nums">
                    <span>
                      {currentTime.toFixed(2)}s (F{Math.round(currentTime * fps)})
                    </span>
                    <span>{duration.toFixed(2)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={Number((1 / fps).toFixed(4))}
                    value={currentTime}
                    onChange={(e) => {
                      if (videoRef.current) {
                        clearFreezeTimer();
                        const next = parseFloat(e.target.value);
                        videoRef.current.currentTime = next;
                        setCurrentTime(next);
                      }
                    }}
                    className="w-full h-2 cursor-pointer appearance-none bg-white/30 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>

              {/* Frame-step & FPS bar */}
              <div className="flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepFrames(-10)}
                    title="Back 10 frames (Shift+Left)"
                    className="px-2.5 py-1.5 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    <ChevronsLeft size={12} /> 10F
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrames(-1)}
                    title="Back 1 frame (Left Arrow)"
                    className="px-2.5 py-1.5 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    <ChevronLeft size={12} /> 1F
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrames(1)}
                    title="Forward 1 frame (Right Arrow)"
                    className="px-2.5 py-1.5 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    1F <ChevronRight size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepFrames(10)}
                    title="Forward 10 frames (Shift+Right)"
                    className="px-2.5 py-1.5 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase tracking-wider flex items-center gap-1"
                  >
                    10F <ChevronsRight size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[9px] font-mono uppercase tracking-widest opacity-40">
                    SPACE PLAY • ARROWS STEP
                  </span>
                  <div className="flex border border-white/15 text-[10px] font-mono uppercase">
                    {([30, 60] as const).map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFps(rate)}
                        className={cn(
                          "px-2.5 py-1 transition-colors",
                          fps === rate
                            ? "bg-white text-black font-black"
                            : "text-white/60 hover:text-white",
                        )}
                      >
                        {rate}FPS
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tools Area */}
        <div className="w-full lg:w-[400px] flex-shrink-0 flex flex-col min-h-0 bg-current/5">
          {/* Right Sidebar - Tools & Layers */}
          <div className="p-4 flex flex-col gap-4 flex-shrink-0 border-b border-current/10">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">
              DRAWING TOOLS
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setDrawingState((prev) => ({
                    ...prev,
                    active: true,
                    tool: "start-block",
                    currentPoints: [],
                    color: "#3ae374",
                    lineWidth: prev.lineWidth,
                  }))
                }
                className={cn(
                  "px-2 py-3 border font-black text-[10px] tracking-widest uppercase transition-all whitespace-nowrap",
                  drawingState.active && drawingState.tool === "start-block"
                    ? "border-green-400 text-green-400 bg-green-400/10 shadow-[0_0_15px_rgba(74,227,116,0.2)]"
                    : "border-current/20 hover:border-current/50 hover:bg-current/5",
                )}
              >
                START BLOCK
              </button>
              <button
                type="button"
                onClick={() =>
                  setDrawingState((prev) => ({
                    ...prev,
                    active: true,
                    tool: "stop-block",
                    currentPoints: [],
                    color: "#ff3838",
                    lineWidth: prev.lineWidth,
                  }))
                }
                className={cn(
                  "px-2 py-3 border font-black text-[10px] tracking-widest uppercase transition-all whitespace-nowrap",
                  drawingState.active && drawingState.tool === "stop-block"
                    ? "border-red-400 text-red-400 bg-red-400/10 shadow-[0_0_15px_rgba(255,56,56,0.2)]"
                    : "border-current/20 hover:border-current/50 hover:bg-current/5",
                )}
              >
                STOP BLOCK
              </button>
              <button
                type="button"
                onClick={() =>
                  setDrawingState((prev) => ({
                    ...prev,
                    active: true,
                    tool: "laser",
                    currentPoints: [],
                    color: prev.color,
                    lineWidth: prev.lineWidth,
                  }))
                }
                className={cn(
                  "px-2 py-3 border font-black text-[10px] tracking-widest uppercase transition-all col-span-2",
                  drawingState.active && drawingState.tool === "laser"
                    ? "border-blue-400 text-blue-400 bg-blue-400/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    : "border-current/20 hover:border-current/50 hover:bg-current/5",
                )}
              >
                LASER LINE
              </button>
            </div>

            {drawingState.active && (
              <div className="flex flex-col gap-3 border-t border-current/10 pt-3 mt-1">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <label className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase opacity-60">
                      Color:
                    </span>
                    <input
                      type="color"
                      value={drawingState.color}
                      onChange={(e) =>
                        setDrawingState((prev) => ({
                          ...prev,
                          color: e.target.value,
                        }))
                      }
                      className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent text-base"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase opacity-60">
                        Width:
                      </span>
                      <span className="text-[10px] font-mono">
                        {drawingState.lineWidth}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      value={drawingState.lineWidth}
                      onChange={(e) =>
                        setDrawingState((prev) => ({
                          ...prev,
                          lineWidth: parseInt(e.target.value, 10),
                        }))
                      }
                      className="w-full accent-current h-1 text-base"
                    />
                  </label>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={finalizeShape}
                    disabled={drawingState.currentPoints.length < 2}
                    className="flex-1 px-2 py-3 border border-white bg-white text-black font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_10px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    FINISH ({drawingState.currentPoints.length} PTS)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDrawingState((prev) => ({
                        ...prev,
                        active: false,
                        currentPoints: [],
                      }))
                    }
                    className="px-4 py-3 border border-current bg-current/5 hover:bg-current/10 font-black text-[10px] tracking-widest uppercase transition-all"
                  >
                    CANCEL
                  </button>
                </div>
                <p className="text-[10px] uppercase font-bold opacity-70 mt-1">
                  Click on video to plot points. Press Enter to finish or Esc to cancel.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-4 py-3 border-b flex-shrink-0 border-current/10 flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-60">
                FREEZE FRAME LAYERS
              </h3>
              <span className="text-[10px] font-mono opacity-50">
                {annotations.length} TOTAL
              </span>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto">
              {annotations.length === 0 && (
                <div className="text-[10px] opacity-50 uppercase tracking-widest py-8 text-center font-mono">
                  NO CHECKPOINTS YET
                </div>
              )}
              {annotations.map((ann) => (
                <div
                  key={ann.id}
                  className={cn(
                    "px-4 py-3 border-b text-xs flex flex-col gap-3 transition-colors hover:bg-current/5",
                    activeAnnotationId === ann.id
                      ? "border-current/50 bg-current/5"
                      : "border-current/10",
                  )}
                  onClick={() => setActiveAnnotationId(ann.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shadow-lg"
                        style={{
                          backgroundColor: ann.color,
                          boxShadow: `0 0 8px ${ann.color}`,
                        }}
                      />
                      <span className="font-bold tracking-widest uppercase">
                        {ann.type.replace("-", " ")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnnotations(
                          annotations.filter((a) => a.id !== ann.id),
                        );
                      }}
                      className="text-red-500 hover:text-red-400 opacity-60 hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                    <label className="flex flex-col gap-1">
                      <span className="uppercase opacity-50 flex items-center justify-between">
                        AT (s)
                        <button
                          type="button"
                          title="Jump to time"
                          className="px-1 py-0.5 bg-current/10 active:bg-current/20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (videoRef.current) {
                              clearFreezeTimer();
                              videoRef.current.currentTime = ann.time;
                              videoRef.current.pause();
                              setIsPlaying(false);
                            }
                          }}
                        >
                          JUMP
                        </button>
                      </span>
                      <ASRDecimalInput
                        value={ann.time}
                        step={0.1}
                        min={0}
                        onChange={(val) => {
                          setAnnotations((prev) =>
                            prev
                              .map((a) =>
                                a.id === ann.id ? { ...a, time: val } : a,
                              )
                              .sort((a, b) => a.time - b.time),
                          );
                        }}
                        className="bg-current/5 border border-current/20 outline-none focus:border-current p-1.5 w-full text-base"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="uppercase opacity-50">
                        FREEZE TIME (s)
                      </span>
                      <ASRDecimalInput
                        value={ann.freezeDuration}
                        step={0.1}
                        min={0}
                        max={10}
                        onChange={(val) => {
                          setAnnotations((prev) =>
                            prev.map((a) =>
                              a.id === ann.id
                                ? { ...a, freezeDuration: val }
                                : a,
                            ),
                          );
                        }}
                        className="bg-current/5 border border-current/20 outline-none focus:border-current p-1.5 w-full text-base"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-sm font-black uppercase tracking-widest text-white">
                Export Options
              </h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-white hover:text-red-400 opacity-60 hover:opacity-100 transition-colors"
              >
                <Square size={20} className="rounded-full" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-8 text-white">
              {/* WEBM */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white text-black flex items-center justify-center shrink-0 shadow-lg shadow-white/10">
                    <Video size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black uppercase text-sm tracking-widest">
                      Fast WebM Render
                    </h3>
                    <p className="text-[10px] text-white/50 leading-tight mt-1 font-medium tracking-wide uppercase">
                      Natively recorded in-browser. Medium quality. Good for
                      quick internal review.
                    </p>
                  </div>
                </div>
                {isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex items-center justify-center gap-2 px-4 py-4 bg-red-500/20 text-red-500 border border-red-500 font-black text-[10px] tracking-widest uppercase hover:bg-red-500/30 transition-colors animate-pulse w-full"
                  >
                    <Square size={14} /> STOP RECORDING
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="flex items-center justify-center gap-2 px-4 py-4 bg-white text-black border border-white font-black text-[10px] tracking-widest uppercase hover:bg-gray-200 transition-colors w-full shadow-lg"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />{" "}
                    START WEBM RECORDING
                  </button>
                )}
                {recordingUrl && (
                  <a
                    href={recordingUrl}
                    download="asr_course_rules.webm"
                    className="flex justify-center flex-col items-center gap-2 px-4 py-4 bg-blue-500/20 text-blue-400 border border-blue-500 font-black text-[10px] tracking-widest uppercase hover:bg-blue-500/30 transition-colors w-full"
                  >
                    <span className="flex items-center gap-2">
                      <Download size={14} /> SAVE RECORDED WEBM
                    </span>
                    <span className="text-[9px] opacity-70">
                      Depending on canvas layers, it may be choppy on slower
                      devices.
                    </span>
                  </a>
                )}
              </div>

              <div className="h-px bg-white/10 w-full" />

              {/* HQ MP4 */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-blue-500 text-blue-400 bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Download size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black whitespace-nowrap uppercase text-sm tracking-widest flex items-center gap-3">
                      HD FFmpeg Render{" "}
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 border border-blue-500/30 tracking-widest">
                        {fps}FPS MP4
                      </span>
                    </h3>
                    <p className="text-[10px] text-white/50 leading-tight mt-1 font-medium tracking-wide uppercase">
                      Downloads runnable Node.js + FFmpeg script with embedded
                      SVG overlays & freeze timings. Outputs lossless-grade 4K
                      H.264 MP4.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleNodescriptGen}
                  className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-blue-600 text-white font-black text-[10px] tracking-widest uppercase hover:bg-blue-500 transition-colors shadow-lg"
                >
                  <Download size={14} /> DOWNLOAD RENDER PIPELINE (.MJS)
                </button>
              </div>

              <div className="h-px bg-white/10 w-full" />

              {/* JSON Metadata */}
              <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-black uppercase text-[10px] tracking-widest text-white">
                      Raw Payload JSON
                    </h3>
                    <p className="text-[10px] text-white/50 leading-tight mt-1 font-medium tracking-wide">
                      Export checkpoint data array manually.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 px-4 py-3 border border-white/20 hover:border-white text-white font-black text-[10px] tracking-widest uppercase transition-colors bg-white/5"
                  >
                    EXPORT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
