"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ArrowRight, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AISection, AITriggerButton } from "./ai-section";
import { reviewWeeklyPlan } from "@/app/actions/ai";

interface WeeklyPlanReviewProps {
  weekStartISO: string;
}

interface ReviewData {
  issues: Array<{
    unitId: string;
    unitLabel: string;
    issue: "unclear" | "too_large" | "misplaced";
    suggestion: string;
  }>;
  dayBalance: string;
  suggestions: string[];
  summary: string;
}

export function WeeklyPlanReview({ weekStartISO }: WeeklyPlanReviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [visible, setVisible] = useState(false);

  async function handleReview() {
    setLoading(true);
    setError(null);
    setVisible(true);

    const result = await reviewWeeklyPlan(weekStartISO);

    if (result.ok) {
      setReview(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  function handleDismiss() {
    setVisible(false);
    setReview(null);
    setError(null);
  }

  const issueBadge = {
    unclear: { label: "Unclear", variant: "secondary" as const, color: "text-amber-700 bg-amber-100" },
    too_large: { label: "Too Large", variant: "destructive" as const, color: "text-red-700 bg-red-100" },
    misplaced: { label: "Misplaced", variant: "outline" as const, color: "text-blue-700 bg-blue-100" },
  };

  return (
    <div className="space-y-3">
      <AITriggerButton
        onClick={handleReview}
        loading={loading}
        label="Review my plan"
      />

      <AISection
        loading={loading}
        error={error}
        visible={visible}
        onDismiss={handleDismiss}
      >
        {review && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">{review.summary}</p>

            {review.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Flagged Units
                </h4>
                {review.issues.map((issue, i) => {
                  const badge = issueBadge[issue.issue];
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2.5"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {issue.unitLabel}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {issue.suggestion}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {review.issues.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                No problematic units found — all look good for 20-minute execution.
              </div>
            )}

            {review.dayBalance && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-1">
                  Day Balance
                </h4>
                <p className="text-sm text-gray-700">{review.dayBalance}</p>
              </div>
            )}

            {review.suggestions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-1.5">
                  Suggestions
                </h4>
                <ul className="space-y-1.5">
                  {review.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <Lightbulb className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </AISection>
    </div>
  );
}
