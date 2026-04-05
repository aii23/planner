"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { isAIConfigured, callClaude, callClaudeJSON } from "@/lib/ai";
import { getMonday, addWeeks, toDateOnlyISO } from "@/lib/date-utils";

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
  suggestions: string[];
  summary: string;
}

export async function reviewWeeklyPlan(weekStartISO: string) {
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

  const history = await getRecentHistory(user.id, weekStartISO, 4);

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const planDescription = plan.dailyPlans.map((dp, i) => {
    const units = dp.scheduledUnits.map(
      (su) =>
        `  - [${su.unit.id.slice(0, 8)}] "${su.unit.label || su.unit.task.title}" (Project: ${su.unit.task.project.name}${su.unit.task.description ? `, Task desc: ${su.unit.task.description}` : ""})`
    );
    return `${dayNames[i]} (target: ${dp.targetUnits}, scheduled: ${dp.scheduledUnits.length}):\n${units.length > 0 ? units.join("\n") : "  (no units scheduled)"}`;
  }).join("\n\n");

  const featurePrompt = `You are reviewing the user's weekly plan. They created this plan themselves — your job is to review it, NOT create a new one.

Respond with a JSON block in this exact format:
\`\`\`json
{
  "issues": [
    { "unitId": "first-8-chars", "unitLabel": "the label", "issue": "unclear|too_large|misplaced", "suggestion": "brief suggestion" }
  ],
  "dayBalance": "One paragraph about day load distribution",
  "suggestions": ["suggestion 1", "suggestion 2"],
  "summary": "One paragraph overall assessment"
}
\`\`\`

Rules:
- Only flag units as "too_large" if they genuinely cannot be done in 20 min even with AI assistance
- Flag "unclear" only if the label is so vague it's hard to know what to do (e.g., "stuff", "work")
- Flag "misplaced" if a unit would make more sense on a different day (e.g., heavy tasks on an already overloaded day)
- Keep suggestions actionable and specific
- If the plan looks good, say so — don't manufacture problems`;

  const userMessage = `Weekly target: ${plan.targetUnits} units

${planDescription}

${history ? `Historical context (last ${history.weeksCount} weeks):\n${history.text}` : "No historical data available yet — this may be an early week."}`;

  return callClaudeJSON<WeeklyReviewResponse>(featurePrompt, userMessage);
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
  warnings: string[];
}

export async function getDailyCheckin() {
  const user = await getCurrentUser();
  const today = new Date();
  const monday = getMonday(today);
  const todayISO = toDateOnlyISO(today);
  const mondayISO = toDateOnlyISO(monday);

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

  const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });
  const history = await getDayOfWeekHistory(user.id, today.getDay());

  const unitList = activeUnits.map(
    (su, i) =>
      `${i + 1}. [${su.unit.id}] "${su.unit.label || su.unit.task.title}" — Project: ${su.unit.task.project.name}${su.unit.task.description ? ` (${su.unit.task.description})` : ""}`
  ).join("\n");

  const featurePrompt = `You are giving the user a daily briefing for today's work queue. Suggest an optimal order that batches related work together for better flow.

Respond with a JSON block in this exact format:
\`\`\`json
{
  "summary": "Brief overview of today (1-2 sentences)",
  "suggestedOrder": [
    { "unitId": "full-uuid", "label": "display label", "project": "project name" }
  ],
  "reasoning": "Why this order is better (1-2 sentences about batching logic)",
  "warnings": ["any concerns about today's load"]
}
\`\`\`

Rules:
- suggestedOrder MUST contain all the same unit IDs from the input — no additions, no removals
- Group units from the same project or related tasks together
- Put harder/creative work earlier when energy is higher
- Keep warnings practical — only mention if genuinely concerned`;

  const userMessage = `Today is ${dayOfWeek}. ${activeUnits.length} active units scheduled (target: ${dailyPlan.targetUnits}).

Current order:
${unitList}

${history ? `Historical ${dayOfWeek} data:\n${history}` : `No historical data for ${dayOfWeek}s yet.`}`;

  return callClaudeJSON<DailyCheckinResponse>(featurePrompt, userMessage);
}

export async function applyDailyReorder(orderedUnitIds: string[]) {
  const user = await getCurrentUser();
  const today = new Date();
  const monday = getMonday(today);
  const todayISO = toDateOnlyISO(today);
  const mondayISO = toDateOnlyISO(monday);

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
