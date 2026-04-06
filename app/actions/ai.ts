"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser, getUserTimezone } from "@/lib/user";
import { isAIConfigured, callClaude, callClaudeJSON } from "@/lib/ai";
import { addWeeks, toDateOnlyISO, toDateOnlyISOInTz, getMondayInTz } from "@/lib/date-utils";

export async function checkAIAvailability() {
  return { configured: isAIConfigured() };
}

// ─── Weekly Plan Review ─────────────────────────────────────────────

interface WeeklyReviewIssue {
  unitId: string;
  unitLabel: string;
  issue: "unclear" | "too_large" | "misplaced";
  suggestion: string;
}

interface WeeklyReviewResponse {
  issues: WeeklyReviewIssue[];
  dayBalance: string;
  riskLevel?: "low" | "medium" | "high";
  suggestions: string[];
  summary: string;
}

export async function reviewWeeklyPlan(weekStartISO: string, forceRefresh = false) {
  const user = await getCurrentUser();
  const weekStart = new Date(weekStartISO + "T00:00:00.000Z");

  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: { userId: user.id, weekStartDate: weekStart },
    },
    include: {
      dailyPlans: {
        orderBy: { date: "asc" },
        include: {
          scheduledUnits: {
            orderBy: { sortOrder: "asc" },
            include: {
              unit: {
                include: {
                  task: {
                    select: {
                      title: true,
                      description: true,
                      project: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) return { ok: false as const, error: "No weekly plan found." };

  // Return cached result if available and not forcing refresh
  if (!forceRefresh && plan.weeklyReview) {
    return { ok: true as const, ...(plan.weeklyReview as unknown as WeeklyReviewResponse) };
  }

  const history = await getRecentHistory(user.id, weekStartISO, 4);

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const totalScheduled = plan.dailyPlans.reduce((s, dp) => s + dp.scheduledUnits.length, 0);
  const completedCount = plan.dailyPlans
    .flatMap((dp) => dp.scheduledUnits)
    .filter((su) => su.unit.status === "completed").length;

  const planDescription = plan.dailyPlans.map((dp, i) => {
    const completedToday = dp.scheduledUnits.filter((su) => su.unit.status === "completed").length;
    const units = dp.scheduledUnits.map(
      (su) =>
        `  - [${su.unit.id.slice(0, 8)}] "${su.unit.label || su.unit.task?.title || "Untitled"}" [${su.unit.status}]` +
        ` (${su.unit.task ? `Project: ${su.unit.task.project.name}${su.unit.task.description ? `, desc: ${su.unit.task.description}` : ""}` : "Standalone unit"})`
    );
    return `${dayNames[i]} (target: ${dp.targetUnits}, scheduled: ${dp.scheduledUnits.length}, done: ${completedToday}):\n${units.length > 0 ? units.join("\n") : "  (no units scheduled)"}`;
  }).join("\n\n");

  const featurePrompt = `You are an experienced productivity coach reviewing the user's weekly plan. They created this plan themselves — your job is to give specific, actionable feedback, NOT to create a new plan.

You have access to each unit's status (pending/scheduled/completed/skipped) and historical completion rates.

Respond with a JSON block in this exact format:
\`\`\`json
{
  "issues": [
    { "unitId": "first-8-chars", "unitLabel": "the label", "issue": "unclear|too_large|misplaced|overloaded_day", "suggestion": "specific actionable fix" }
  ],
  "dayBalance": "Assessment of load distribution across the week — which days are heavy, which are light, risk of burnout or under-utilization",
  "riskLevel": "low|medium|high",
  "suggestions": ["specific suggestion 1", "specific suggestion 2", "specific suggestion 3"],
  "summary": "2-3 sentence honest assessment: what's working, what's risky, one concrete next step"
}
\`\`\`

Scoring rules:
- "too_large": flag only if the unit label suggests multi-hour work (e.g., "build entire auth system", "redesign database")
- "unclear": flag only if truly ambiguous (e.g., "stuff", "things", "work") — not just short labels
- "misplaced": flag if a heavy cognitive task sits on an already overloaded day or Friday afternoon
- "overloaded_day": flag the day-level issue when >20% over target
- riskLevel: "high" if >30% over weekly target OR 2+ days severely overloaded; "medium" if borderline; "low" otherwise
- Focus suggestions on the biggest leverage points, not cosmetic fixes
- Celebrate genuine wins — if a day looks well-balanced, say so explicitly`;

  const userMessage = `Week of ${weekStartISO}
Weekly target: ${plan.targetUnits} units
Total scheduled: ${totalScheduled} (${completedCount} already completed)

${planDescription}

${history ? `Historical performance (last ${history.weeksCount} weeks):\n${history.text}` : "No historical data yet."}`;

  const result = await callClaudeJSON<WeeklyReviewResponse>(featurePrompt, userMessage);

  // Cache result in DB
  if (result.ok) {
    const { ok: _, ...data } = result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.weeklyPlan.update({ where: { id: plan.id }, data: { weeklyReview: data as any } });
  }

  return result;
}

// ─── Daily Check-in ─────────────────────────────────────────────────

interface DailyCheckinUnit {
  unitId: string;
  label: string;
  project: string;
}

interface DailyCheckinResponse {
  summary: string;
  suggestedOrder: DailyCheckinUnit[];
  reasoning: string;
  skipRecommendation?: string;
  warnings: string[];
}

export async function getDailyCheckin(forceRefresh = false) {
  const user = await getCurrentUser();
  const tz = await getUserTimezone();
  const now = new Date();
  const todayISO = toDateOnlyISOInTz(now, tz);
  const monday = getMondayInTz(now, tz);
  const mondayISO = monday.toISOString().slice(0, 10);

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: {
      userId: user.id,
      date: new Date(todayISO + "T00:00:00.000Z"),
      weeklyPlan: { weekStartDate: new Date(mondayISO + "T00:00:00.000Z") },
    },
    include: {
      scheduledUnits: {
        orderBy: { sortOrder: "asc" },
        include: {
          unit: {
            include: {
              task: {
                select: {
                  title: true,
                  description: true,
                  project: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      weeklyPlan: true,
    },
  });

  if (!dailyPlan || dailyPlan.scheduledUnits.length === 0) {
    return { ok: false as const, error: "No units scheduled for today." };
  }

  const activeUnits = dailyPlan.scheduledUnits.filter(
    (su) => su.unit.status !== "completed" && su.unit.status !== "skipped"
  );

  if (activeUnits.length === 0) {
    return { ok: false as const, error: "All units for today are already completed or skipped." };
  }

  // Return cached result if available and not forcing refresh
  if (!forceRefresh && dailyPlan.dailyBriefing) {
    return { ok: true as const, ...(dailyPlan.dailyBriefing as unknown as DailyCheckinResponse) };
  }

  const todayDate = new Date(todayISO + "T12:00:00.000Z");
  const dayOfWeek = todayDate.toLocaleDateString("en-US", { weekday: "long" });
  const hourOfDay = now.getHours();
  const timeOfDay = hourOfDay < 10 ? "morning" : hourOfDay < 14 ? "midday" : hourOfDay < 18 ? "afternoon" : "evening";
  const history = await getDayOfWeekHistory(user.id, todayDate.getUTCDay());
  const completedCount = dailyPlan.scheduledUnits.filter((su) => su.unit.status === "completed").length;
  const skippedCount = dailyPlan.scheduledUnits.filter((su) => su.unit.status === "skipped").length;

  const unitList = activeUnits.map(
    (su, i) =>
      `${i + 1}. [${su.unit.id}] "${su.unit.label || su.unit.task?.title || "Untitled"}" — ` +
      `${su.unit.task ? `Project: ${su.unit.task.project.name}${su.unit.task.description ? ` (context: ${su.unit.task.description})` : ""}` : "Standalone unit"}`
  ).join("\n");

  const featurePrompt = `You are a sharp productivity coach giving a ${timeOfDay} briefing. The user has ${activeUnits.length} active units. Your job: suggest the best execution order and give one clear focus narrative.

Respond with a JSON block in this exact format:
\`\`\`json
{
  "summary": "3-sentence focus narrative: what kind of day this is, the dominant theme across projects, and one concrete mindset tip for today",
  "suggestedOrder": [
    { "unitId": "full-uuid", "label": "display label", "project": "project name" }
  ],
  "reasoning": "2-3 sentences: specific batching logic used (context switching cost, energy curve for ${timeOfDay}, project dependencies)",
  "skipRecommendation": "If short on time: which ONE unit to defer and why (be specific)",
  "warnings": ["practical concern about load, dependency risk, or burnout — only if genuine"]
}
\`\`\`

Hard rules:
- suggestedOrder MUST contain ALL the same unit IDs from the input — zero additions, zero removals
- Prioritise deep/creative work for morning, administrative/routine for afternoon
- Batch units from the same project or task to minimise context-switching
- The skipRecommendation must name a specific unit by label, not just say "deprioritise something"`;

  const userMessage = `Today is ${dayOfWeek} ${timeOfDay}.
Target: ${dailyPlan.targetUnits} units | Active: ${activeUnits.length} | Done already: ${completedCount} | Skipped: ${skippedCount}

Active units (current order):
${unitList}

${history ? `Historical ${dayOfWeek} performance:\n${history}` : `No historical data for ${dayOfWeek}s yet.`}`;

  const result = await callClaudeJSON<DailyCheckinResponse>(featurePrompt, userMessage);

  // Cache result in DB
  if (result.ok) {
    const { ok: _, ...data } = result;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.dailyPlan.update({ where: { id: dailyPlan.id }, data: { dailyBriefing: data as any } });
  }

  return result;
}

export async function applyDailyReorder(orderedUnitIds: string[]) {
  const user = await getCurrentUser();
  const tz = await getUserTimezone();
  const now = new Date();
  const todayISO = toDateOnlyISOInTz(now, tz);
  const monday = getMondayInTz(now, tz);
  const mondayISO = monday.toISOString().slice(0, 10);

  const dailyPlan = await prisma.dailyPlan.findFirst({
    where: {
      userId: user.id,
      date: new Date(todayISO + "T00:00:00.000Z"),
      weeklyPlan: { weekStartDate: new Date(mondayISO + "T00:00:00.000Z") },
    },
    include: { scheduledUnits: true },
  });

  if (!dailyPlan) return { error: "No daily plan found for today." };

  const updates = orderedUnitIds.map((unitId, index) => {
    const su = dailyPlan.scheduledUnits.find((s) => s.unitId === unitId);
    if (!su) return null;
    return prisma.scheduledUnit.update({
      where: { id: su.id },
      data: { sortOrder: index },
    });
  }).filter(Boolean);

  await prisma.$transaction(updates as NonNullable<(typeof updates)[number]>[]);

  return { success: true };
}

// ─── End-of-Week Review ─────────────────────────────────────────────

export async function generateWeeklyReview(weekStartISO: string) {
  const user = await getCurrentUser();
  const weekStart = new Date(weekStartISO + "T00:00:00.000Z");

  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: { userId: user.id, weekStartDate: weekStart },
    },
    include: {
      dailyPlans: {
        orderBy: { date: "asc" },
        include: {
          scheduledUnits: {
            include: {
              unit: {
                include: {
                  task: {
                    select: {
                      title: true,
                      status: true,
                      project: { select: { name: true, color: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) return { ok: false as const, error: "No weekly plan found for this week." };

  const allUnits = plan.dailyPlans.flatMap((dp) => dp.scheduledUnits);
  const completed = allUnits.filter((su) => su.unit.status === "completed");
  const skipped = allUnits.filter((su) => su.unit.status === "skipped");
  const unfinished = allUnits.filter(
    (su) => su.unit.status !== "completed" && su.unit.status !== "skipped"
  );
  const totalActualSlots = completed.reduce(
    (sum, su) => sum + (su.unit.actualUnitsConsumed ?? 1), 0
  );

  const projectMap = new Map<string, { name: string; completed: number; scheduled: number }>();
  for (const su of allUnits) {
    if (!su.unit.task) continue;
    const p = su.unit.task.project;
    const entry = projectMap.get(p.name) ?? { name: p.name, completed: 0, scheduled: 0 };
    entry.scheduled++;
    if (su.unit.status === "completed") entry.completed++;
    projectMap.set(p.name, entry);
  }

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dailySummary = plan.dailyPlans.map((dp, i) => {
    const done = dp.scheduledUnits.filter((su) => su.unit.status === "completed").length;
    return `${dayNames[i]}: ${done}/${dp.targetUnits} target, ${dp.scheduledUnits.length} scheduled`;
  }).join("\n");

  const projectSummary = Array.from(projectMap.values())
    .map((p) => `${p.name}: ${p.completed}/${p.scheduled} completed`)
    .join("\n");

  const history = await getRecentHistory(user.id, weekStartISO, 4);

  const featurePrompt = `You are writing an end-of-week review for the user. Use a coach-like tone — supportive, direct, and actionable.

Format your response with these exact markdown headers:
## Performance Summary
(1-2 paragraphs assessing the week)

## Projects Breakdown
(What progressed well, what fell behind)

## Estimation Accuracy
(How well planned units matched actual effort)

## Advice for Next Week
(2-3 specific, actionable recommendations)

Keep it concise. Celebrate wins. Be honest about gaps without being harsh.`;

  const userMessage = `Week of ${weekStartISO}
Target: ${plan.targetUnits} units
Completed: ${completed.length}/${allUnits.length} scheduled (${skipped.length} skipped, ${unfinished.length} unfinished)
Actual unit-slots consumed: ${totalActualSlots} (vs ${completed.length} planned)
Estimation accuracy: ${completed.length > 0 ? Math.round((completed.length / totalActualSlots) * 100) : 100}%

Daily breakdown:
${dailySummary}

Project breakdown:
${projectSummary}

${history ? `Previous weeks context:\n${history.text}` : "No previous weeks data available."}`;

  return callClaude(featurePrompt, userMessage);
}

// ─── Helpers ────────────────────────────────────────────────────────

async function getRecentHistory(userId: string, currentWeekISO: string, weeksBack: number) {
  const currentMonday = new Date(currentWeekISO + "T00:00:00.000Z");
  const pastMondays = Array.from({ length: weeksBack }, (_, i) =>
    addWeeks(currentMonday, -(i + 1))
  );

  const plans = await prisma.weeklyPlan.findMany({
    where: {
      userId,
      weekStartDate: { in: pastMondays },
    },
    orderBy: { weekStartDate: "desc" },
    include: {
      dailyPlans: {
        include: {
          scheduledUnits: {
            include: {
              unit: { select: { status: true, actualUnitsConsumed: true } },
            },
          },
        },
      },
    },
  });

  if (plans.length === 0) return null;

  const text = plans.map((p) => {
    const all = p.dailyPlans.flatMap((dp) => dp.scheduledUnits);
    const done = all.filter((su) => su.unit.status === "completed");
    const actualSlots = done.reduce((s, su) => s + (su.unit.actualUnitsConsumed ?? 1), 0);
    return `Week of ${toDateOnlyISO(p.weekStartDate)}: ${done.length}/${all.length} completed (target: ${p.targetUnits}), estimation accuracy: ${done.length > 0 ? Math.round((done.length / actualSlots) * 100) : 100}%`;
  }).join("\n");

  return { weeksCount: plans.length, text };
}

async function getDayOfWeekHistory(userId: string, dayOfWeek: number) {
  const plans = await prisma.weeklyPlan.findMany({
    where: { userId },
    orderBy: { weekStartDate: "desc" },
    take: 8,
    include: {
      dailyPlans: {
        include: {
          scheduledUnits: {
            include: {
              unit: { select: { status: true } },
            },
          },
        },
      },
    },
  });

  if (plans.length === 0) return null;

  const dayEntries = plans.flatMap((p) =>
    p.dailyPlans.filter((dp) => new Date(dp.date).getDay() === dayOfWeek)
  );

  if (dayEntries.length === 0) return null;

  const completedCounts = dayEntries.map(
    (dp) => dp.scheduledUnits.filter((su) => su.unit.status === "completed").length
  );
  const avg = Math.round((completedCounts.reduce((a, b) => a + b, 0) / completedCounts.length) * 10) / 10;
  const scheduledCounts = dayEntries.map((dp) => dp.scheduledUnits.length);
  const avgScheduled = Math.round((scheduledCounts.reduce((a, b) => a + b, 0) / scheduledCounts.length) * 10) / 10;

  return `Average completed: ${avg} units, average scheduled: ${avgScheduled} units (over ${dayEntries.length} weeks)`;
}
