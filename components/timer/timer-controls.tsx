"use client";

import { Play, Pause, SkipForward, RotateCcw, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimerState } from "@/hooks/use-timer";

interface TimerControlsProps {
  state: TimerState;
  hasQueue: boolean;
  hasCurrentUnit: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipRest: () => void;
  onReset: () => void;
  onEndWork: () => void;
  onCompleteUnit: () => void;
}

export function TimerControls({
  state,
  hasQueue,
  hasCurrentUnit,
  onStart,
  onPause,
  onResume,
  onSkipRest,
  onReset,
  onEndWork,
  onCompleteUnit,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {state === "IDLE" && (
        <Button size="lg" onClick={onStart} disabled={!hasQueue} className="gap-2 px-8">
          <Play className="h-5 w-5" />
          Start Work
        </Button>
      )}

      {state === "WORK_RUNNING" && (
        <>
          {hasCurrentUnit && (
            <Button size="lg" onClick={onCompleteUnit} className="gap-2 px-6 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Complete Unit
            </Button>
          )}
          <Button variant="outline" size="lg" onClick={onPause} className="gap-2">
            <Pause className="h-5 w-5" />
            Pause
          </Button>
          <Button variant="ghost" size="lg" onClick={onEndWork} className="gap-2">
            <ArrowRight className="h-5 w-5" />
            End Early
          </Button>
        </>
      )}

      {state === "WORK_PAUSED" && (
        <>
          <Button size="lg" onClick={onResume} className="gap-2 px-8">
            <Play className="h-5 w-5" />
            Resume
          </Button>
          {hasCurrentUnit && (
            <Button variant="outline" size="lg" onClick={onCompleteUnit} className="gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Complete
            </Button>
          )}
          <Button variant="ghost" size="lg" onClick={onReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </>
      )}

      {state === "WORK_ENDED" && (
        <>
          <Button size="lg" onClick={onEndWork} className="gap-2 px-8">
            <Play className="h-5 w-5" />
            Start Rest
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkipRest} className="gap-2">
            <SkipForward className="h-5 w-5" />
            Skip Rest
          </Button>
        </>
      )}

      {state === "REST_RUNNING" && (
        <>
          <Button variant="outline" size="lg" onClick={onPause} className="gap-2">
            <Pause className="h-5 w-5" />
            Pause
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkipRest} className="gap-2">
            <SkipForward className="h-5 w-5" />
            Skip Rest
          </Button>
        </>
      )}

      {state === "REST_PAUSED" && (
        <>
          <Button size="lg" onClick={onResume} className="gap-2 px-8">
            <Play className="h-5 w-5" />
            Resume
          </Button>
          <Button variant="ghost" size="lg" onClick={onSkipRest} className="gap-2">
            <SkipForward className="h-5 w-5" />
            Skip
          </Button>
        </>
      )}

      {state === "REST_ENDED" && (
        <Button size="lg" onClick={onSkipRest} className="gap-2 px-8">
          <Play className="h-5 w-5" />
          Ready
        </Button>
      )}
    </div>
  );
}
