export interface FreezeFrameTiming {
  id: string;
  time: number;
  duration: number;
}

export function formatAnnotatorTimer(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalHundredths = Math.floor(clamped * 100 + 1e-9);
  const mins = Math.floor(totalHundredths / 6000);
  const secs = Math.floor((totalHundredths % 6000) / 100);
  const hundredths = totalHundredths % 100;
  if (mins > 0) {
    return `${mins}:${String(secs).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
  }
  return `${secs}.${String(hundredths).padStart(2, "0")}`;
}

export function stepFrameTime(
  currentTime: number,
  deltaFrames: number,
  fps: number,
  duration: number,
): number {
  const safeFps = fps > 0 ? fps : 30;
  const next = currentTime + deltaFrames / safeFps;
  const maxDur = duration > 0 ? duration : Infinity;
  return Math.max(0, Math.min(maxDur, Number(next.toFixed(6))));
}

export function findActiveFreeze<T extends FreezeFrameTiming>(
  freezes: T[],
  currentTime: number,
  toleranceSec = 0.04,
): T | undefined {
  return freezes.find((f) => Math.abs(f.time - currentTime) <= toleranceSec);
}
