"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AISection, AITriggerButton } from "./ai-section";
import { getDailyCheckin, applyDailyReorder } from "@/app/actions/ai";

interface QueueItem {
  scheduledUnitId: string;
  sortOrder: number;
  unit: {
    id: string;
    label: string | null;
    status: string;
    task: {
      id: string;
      title: string;
      project: { id: string; name: string; color: string };
    } | null;
  };
}

interface CheckinData {
  summary: string;
  suggestedOrder: Array<{
    unitId: string;
    label: string;
    project: string;
  }>;
  reasoning: string;
  warnings: string[];
}

interface DailyCheckinProps {
  queue: QueueItem[];
  onReorderApplied: () => void;
}

export function DailyCheckin({ queue, onReorderApplied }: DailyCheckinProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkin, setCheckin] = useState<CheckinData | null>(null);
  const [visible, setVisible] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const activeUnits = queue.filter(
    (q) => q.unit.status !== "completed" && q.unit.status !== "skipped"
  );

  async function handleCheckin() {
    setLoading(true);
    setError(null);
    setVisible(true);
    setApplied(false);

    const result = await getDailyCheckin();

    if (result.ok) {
      setCheckin(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleApplyOrder() {
    if (!checkin) return;
    setApplying(true);

    const orderedIds = checkin.suggestedOrder.map((u) => u.unitId);
    await applyDailyReorder(orderedIds);
    setApplied(true);
    setApplying(false);
    onReorderApplied();
  }

  function handleDismiss() {
    setVisible(false);
    setCheckin(null);
    setError(null);
    setApplied(false);
  }

  const currentOrder = activeUnits.map((q) => q.unit.id);
  const suggestedOrder = checkin?.suggestedOrder.map((u) => u.unitId) ?? [];
  const orderChanged =
    suggestedOrder.length > 0 &&
    JSON.stringify(currentOrder) !== JSON.stringify(suggestedOrder);

  return (
    <div className="space-y-3">
      <AITriggerButton
        onClick={handleCheckin}
        loading={loading}
        label="Get daily briefing"
        disabled={activeUnits.length === 0}
      />

      <AISection
        loading={loading}
        error={error}
        visible={visible}
        onDismiss={handleDismiss}
      >
        {checkin && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">{checkin.summary}</p>

            {checkin.warnings.length > 0 && (
              <div className="space-y-1">
                {checkin.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}

            {orderChanged && !applied && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-700 mb-2">
                  Suggested Order
                </h4>
                <p className="text-xs text-gray-600 mb-2">{checkin.reasoning}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">
                      Current
                    </p>
                    <div className="space-y-1">
                      {activeUnits.map((q, i) => (
                        <div
                          key={q.unit.id}
                          className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1.5"
                        >
                          <span className="text-[10px] text-gray-400 w-4 tabular-nums">
                            {i + 1}
                          </span>
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: q.unit.task?.project.color ?? "#94a3b8" }}
                          />
                          <span className="text-xs truncate">
                            {q.unit.label || q.unit.task?.title || "Untitled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium text-purple-600 uppercase mb-1.5">
                      Suggested
                    </p>
                    <div className="space-y-1">
                      {checkin.suggestedOrder.map((u, i) => {
                        const original = activeUnits.find((q) => q.unit.id === u.unitId);
                        const originalIdx = activeUnits.findIndex((q) => q.unit.id === u.unitId);
                        const moved = originalIdx !== i;
                        return (
                          <div
                            key={u.unitId}
                            className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
                              moved
                                ? "border-purple-200 bg-purple-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <span className="text-[10px] text-gray-400 w-4 tabular-nums">
                              {i + 1}
                            </span>
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  original?.unit.task?.project.color ?? "#888",
                              }}
                            />
                            <span className="text-xs truncate flex-1">{u.label}</span>
                            {moved && originalIdx > i && (
                              <ArrowUp className="h-3 w-3 text-emerald-500" />
                            )}
                            {moved && originalIdx < i && (
                              <ArrowDown className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleApplyOrder}
                    disabled={applying}
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {applying ? "Applying..." : "Apply suggested order"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
                    className="text-gray-600"
                  >
                    Keep my order
                  </Button>
                </div>
              </div>
            )}

            {!orderChanged && (
              <p className="text-xs text-emerald-700">
                ✓ Your current order already looks optimal — no changes suggested.
              </p>
            )}

            {applied && (
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <Check className="h-4 w-4" />
                Order applied successfully.
              </div>
            )}
          </div>
        )}
      </AISection>
    </div>
  );
}
