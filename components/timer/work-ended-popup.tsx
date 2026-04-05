"use client";

import { Coffee, SkipForward, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkEndedPopupProps {
  visible: boolean;
  unitLabel: string;
  onStartRest: () => void;
  onSkipRest: () => void;
}

export function WorkEndedPopup({
  visible,
  unitLabel,
  onStartRest,
  onSkipRest,
}: WorkEndedPopupProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-auto">
      <div className="rounded-xl border border-border bg-card shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Work Period Over</span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          50 minutes complete
          {unitLabel !== "this unit" && (
            <> while working on <span className="font-medium text-foreground">{unitLabel}</span></>
          )}
          . Time for a break!
        </p>

        <div className="space-y-2">
          <Button onClick={onStartRest} className="w-full gap-2" size="sm">
            <Coffee className="h-4 w-4" />
            Start Rest
          </Button>
          <Button onClick={onSkipRest} variant="outline" className="w-full gap-2" size="sm">
            <SkipForward className="h-4 w-4" />
            Skip Rest
          </Button>
        </div>
      </div>
    </div>
  );
}
