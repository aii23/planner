"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatWeekRange,
  isCurrentWeek,
} from "@/lib/date-utils";

interface WeekSelectorProps {
  monday: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekSelector({
  monday,
  onPrev,
  onNext,
  onToday,
}: WeekSelectorProps) {
  const isCurrent = isCurrentWeek(monday);

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon-sm" onClick={onPrev} title="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[200px] justify-center">
        <span className="text-sm font-medium">{formatWeekRange(monday)}</span>
        {isCurrent && (
          <Badge variant="secondary" className="text-[10px]">
            This week
          </Badge>
        )}
      </div>

      <Button variant="outline" size="icon-sm" onClick={onNext} title="Next week">
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onToday} className="text-xs">
          Today
        </Button>
      )}
    </div>
  );
}
