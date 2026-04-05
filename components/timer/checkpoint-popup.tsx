"use client";

import { CheckCircle2, ArrowRight, Split, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckpointPopupProps {
  visible: boolean;
  minutesMark: number;
  unitLabel: string;
  onComplete: () => void;
  onContinue: () => void;
  onSplit: () => void;
}

export function CheckpointPopup({
  visible,
  minutesMark,
  unitLabel,
  onComplete,
  onContinue,
  onSplit,
}: CheckpointPopupProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto rounded-xl border border-border bg-card shadow-2xl p-6 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">
            {minutesMark}-Minute Checkpoint
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          You&apos;ve been working on <span className="font-medium text-foreground">{unitLabel}</span> for {minutesMark} minutes.
        </p>

        <div className="space-y-2">
          <Button onClick={onComplete} className="w-full gap-2" size="sm">
            <CheckCircle2 className="h-4 w-4" />
            Complete &amp; Next
          </Button>
          <Button onClick={onSplit} variant="secondary" className="w-full gap-2" size="sm">
            <Split className="h-4 w-4" />
            Split: Done + Follow-up
          </Button>
          <Button onClick={onContinue} variant="outline" className="w-full gap-2" size="sm">
            <ArrowRight className="h-4 w-4" />
            Continue Working
          </Button>
        </div>
      </div>
    </div>
  );
}
