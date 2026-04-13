"use client";

import { useState, useEffect, useRef } from "react";
import type { TimerState } from "./use-timer";

interface UseIntervalTimerOptions {
  intervalSec: number;
  timerState: TimerState;
  onInterval?: () => void;
}

interface IntervalTimerReturn {
  remainingSeconds: number;
  cycleCount: number;
}

/**
 * A secondary timer that counts fixed-duration intervals and auto-restarts.
 * Stays in sync with the main timer's work phase:
 *   - Ticks only when timerState === "WORK_RUNNING"
 *   - Preserves elapsed on pause/rest
 *   - Fully resets when timerState === "IDLE"
 */
export function useIntervalTimer({
  intervalSec,
  timerState,
  onInterval,
}: UseIntervalTimerOptions): IntervalTimerReturn {
  const [displayElapsedInCycle, setDisplayElapsedInCycle] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  // Mutable refs to avoid stale closures inside the tick interval
  const startRef = useRef<number | null>(null);
  const accRef = useRef(0); // total seconds accumulated before the last resume
  const lastCycleCountRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onIntervalRef = useRef(onInterval);

  useEffect(() => {
    onIntervalRef.current = onInterval;
  });

  useEffect(() => {
    function stopTick() {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }

    function captureElapsed() {
      if (startRef.current !== null) {
        accRef.current += Math.floor((Date.now() - startRef.current) / 1000);
        startRef.current = null;
      }
    }

    if (timerState === "IDLE") {
      stopTick();
      startRef.current = null;
      accRef.current = 0;
      lastCycleCountRef.current = 0;
      setDisplayElapsedInCycle(0);
      setCycleCount(0);
      return;
    }

    if (timerState === "WORK_RUNNING") {
      startRef.current = Date.now();

      const tick = () => {
        const totalElapsed =
          accRef.current +
          Math.floor((Date.now() - startRef.current!) / 1000);
        const newCycleCount = Math.floor(totalElapsed / intervalSec);
        const elapsedInCycle = totalElapsed % intervalSec;

        setDisplayElapsedInCycle(elapsedInCycle);

        if (newCycleCount > lastCycleCountRef.current) {
          lastCycleCountRef.current = newCycleCount;
          setCycleCount(newCycleCount);
          onIntervalRef.current?.();
        }
      };

      tick();
      tickRef.current = setInterval(tick, 250);

      return () => {
        stopTick();
        captureElapsed();
      };
    }

    // WORK_PAUSED, WORK_ENDED, REST_* — pause without losing progress
    stopTick();
    captureElapsed();
  }, [timerState, intervalSec]);

  return {
    remainingSeconds: Math.max(0, intervalSec - displayElapsedInCycle),
    cycleCount,
  };
}
