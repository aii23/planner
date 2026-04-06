"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, RefreshCw } from "lucide-react";
import { AISection, AITriggerButton } from "./ai-section";
import { reviewWeeklyPlan } from "@/app/actions/ai";

interface WeeklyPlanReviewProps {
  weekStartISO: string;
}

interface ReviewData {
  issues: Array<{
    unitId: string;
    unitLabel: string;
    issue: "unclear" | "too_large" | "misplaced" | "overloaded_day";
    suggestion: string;
  }>;
  dayBalance: string;
  riskLevel?: "low" | "medium" | "high";
  suggestions: string[];
  summary: string;
}

const issueBadgeStyle: Record<string, string> = {
  unclear: "text-amber-700 bg-amber-100",
  too_large: "text-red-700 bg-red-100",
  misplaced: "text-blue-700 bg-blue-100",
  overloaded_day: "text-orange-700 bg-orange-100",
};

const issueBadgeLabel: Record<string, string> = {
  unclear: "Unclear",
  too_large: "Too Large",
  misplaced: "Misplaced",
  overloaded_day: "Overloaded",
};

const riskColors: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-100",
  medium: "text-amber-700 bg-amber-100",
  high: "text-red-700 bg-red-100",
};

export function WeeklyPlanReview({ weekStartISO }: WeeklyPlanReviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [visible, setVisible] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  async function load(force = false) {
    setLoading(true);
    setError(null);
    setVisible(true);

    const result = await reviewWeeklyPlan(weekStartISO, force);

    if (result.ok) {
      const { ok: _, ...data } = result;
      setReview(data as ReviewData);
      setFromCache(!force);
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

  return (
    <div className="space-y-3">
      <AITriggerButton onClick={() => load(false)} loading={loading} label="Review my plan" />

      <AISection loading={loading} error={error} visible={visible} onDismiss={handleDismiss}>
        {review && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-gray-700 flex-1">{review.summary}</p>
              <div className="flex items-center gap-2 shrink-0">
                {review.riskLevel && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${riskColors[review.riskLevel] ?? ""}`}>
                    {review.riskLevel.toUpperCase()} RISK
                  </span>
                )}
                {fromCache && (
                  <button
                    onClick={() => load(true)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    title="Regenerate review"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Re-run
                  </button>
                )}
              </div>
            </div>

            {review.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700">
                  Flagged Units
                </h4>
                {review.issues.map((issue, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-gray-200 bg-white p-2.5"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{issue.unitLabel}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${issueBadgeStyle[issue.issue] ?? ""}`}>
                          {issueBadgeLabel[issue.issue] ?? issue.issue}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">{issue.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {review.issues.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                No problematic units — all look good for 20-minute execution.
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
