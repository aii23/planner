"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type TimerState =
  | "IDLE"
  | "WORK_RUNNING"
  | "WORK_PAUSED"
  | "WORK_ENDED"
  | "REST_RUNNING"
  | "REST_PAUSED"
  | "REST_ENDED";

interface TimerConfig {
  workDurationSec: number;
  restDurationSec: number;
}

interface TimerReturn {
  state: TimerState;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalDurationSec: number;
  isWork: boolean;
  isRest: boolean;
  isRunning: boolean;
  isPaused: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skipRest: () => void;
  reset: () => void;
  endWork: () => void;
}

export function useTimer(config: TimerConfig): TimerReturn {
  const [state, setState] = useState<TimerState>("IDLE");
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [elapsedBeforePause, setElapsedBeforePause] = useState(0);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isWork = state === "WORK_RUNNING" || state === "WORK_PAUSED" || state === "WORK_ENDED";
  const isRest = state === "REST_RUNNING" || state === "REST_PAUSED" || state === "REST_ENDED";
  const isRunning = state === "WORK_RUNNING" || state === "REST_RUNNING";
  const isPaused = state === "WORK_PAUSED" || state === "REST_PAUSED";

  const totalDurationSec = isWork || state === "IDLE"
    ? config.workDurationSec
    : config.restDurationSec;

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const calcElapsed = useCallback(() => {
    if (!startTimestamp) return elapsedBeforePause;
    return elapsedBeforePause + Math.floor((Date.now() - startTimestamp) / 1000);
  }, [startTimestamp, elapsedBeforePause]);

  useEffect(() => {
    if (!isRunning) {
      clearTick();
      return;
    }

    const tick = () => {
      const elapsed = calcElapsed();
      setDisplayElapsed(elapsed);

      const duration = state === "WORK_RUNNING"
        ? config.workDurationSec
        : config.restDurationSec;

      if (elapsed >= duration) {
        clearTick();
        setDisplayElapsed(duration);
        if (state === "WORK_RUNNING") {
          setState("WORK_ENDED");
        } else {
          setState("REST_ENDED");
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 250);

    return clearTick;
  }, [isRunning, state, calcElapsed, clearTick, config.workDurationSec, config.restDurationSec]);

  const start = useCallback(() => {
    if (state !== "IDLE") return;
    setState("WORK_RUNNING");
    setStartTimestamp(Date.now());
    setElapsedBeforePause(0);
    setDisplayElapsed(0);
  }, [state]);

  const pause = useCallback(() => {
    if (state === "WORK_RUNNING") {
      setElapsedBeforePause(calcElapsed());
      setStartTimestamp(null);
      setState("WORK_PAUSED");
    } else if (state === "REST_RUNNING") {
      setElapsedBeforePause(calcElapsed());
      setStartTimestamp(null);
      setState("REST_PAUSED");
    }
  }, [state, calcElapsed]);

  const resume = useCallback(() => {
    if (state === "WORK_PAUSED") {
      setStartTimestamp(Date.now());
      setState("WORK_RUNNING");
    } else if (state === "REST_PAUSED") {
      setStartTimestamp(Date.now());
      setState("REST_RUNNING");
    }
  }, [state]);

  const endWork = useCallback(() => {
    clearTick();
    setState("REST_RUNNING");
    setStartTimestamp(Date.now());
    setElapsedBeforePause(0);
    setDisplayElapsed(0);
  }, [clearTick]);

  const skipRest = useCallback(() => {
    if (state === "REST_RUNNING" || state === "REST_PAUSED" || state === "REST_ENDED" || state === "WORK_ENDED") {
      clearTick();
      setState("IDLE");
      setStartTimestamp(null);
      setElapsedBeforePause(0);
      setDisplayElapsed(0);
    }
  }, [state, clearTick]);

  const reset = useCallback(() => {
    clearTick();
    setState("IDLE");
    setStartTimestamp(null);
    setElapsedBeforePause(0);
    setDisplayElapsed(0);
  }, [clearTick]);

  const remainingSeconds = Math.max(0, totalDurationSec - displayElapsed);

  return {
    state,
    remainingSeconds,
    elapsedSeconds: displayElapsed,
    totalDurationSec,
    isWork,
    isRest,
    isRunning,
    isPaused,
    start,
    pause,
    resume,
    skipRest,
    reset,
    endWork,
  };
}
