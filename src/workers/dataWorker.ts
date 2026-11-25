import { computeAllState, computeLiveLadderWindow } from "../lib/asr-data-compute";

self.onmessage = (e: MessageEvent) => {
  const { type, payload, requestId } = e.data || {};

  if (type === "PROCESS_AND_COMPUTE") {
    try {
      const finalState = computeAllState(payload);
      self.postMessage({
        type: "COMPUTE_ALL_READY",
        requestId,
        payload: finalState,
      });
    } catch (err) {
      self.postMessage({
        type: "COMPUTE_ERROR",
        requestId,
        error: err instanceof Error ? err.message : "Worker compute failed",
      });
    }
  } else if (type === "COMPUTE_LIVE_LADDER") {
    try {
      const {
        requestId: ladderRequestId,
        records,
        myKey,
        myName,
        deferredTargetTime,
        simulatedPts,
        athletePool,
        courseRecord,
      } = payload;
      const result = computeLiveLadderWindow(
        records,
        myKey,
        myName,
        deferredTargetTime,
        simulatedPts,
        athletePool,
        courseRecord,
      );
      self.postMessage({
        type: "LIVE_LADDER_READY",
        payload: { requestId: ladderRequestId, result },
      });
    } catch (err) {
      self.postMessage({
        type: "LIVE_LADDER_ERROR",
        payload: {
          requestId: payload?.requestId,
          error: err instanceof Error ? err.message : "Live ladder compute failed",
        },
      });
    }
  }
};
