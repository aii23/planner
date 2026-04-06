import { create } from "zustand";

// ─── Shared types ────────────────────────────────────────────────────

export interface ProjectInfo {
  id: string;
  name: string;
  color: string;
}

export interface TaskInfo {
  id: string;
  title: string;
  project: ProjectInfo;
}

export interface UnitInfo {
  id: string;
  label: string | null;
  status: string;
  task: TaskInfo | null;
}

// ─── Weekly Plan slice ───────────────────────────────────────────────

export interface ScheduledUnitInfo {
  id: string;
  sortOrder: number;
  unit: UnitInfo;
}

export interface DailyPlanData {
  id: string;
  date: Date;
  targetUnits: number;
  scheduledUnits: ScheduledUnitInfo[];
}

export interface WeeklyPlanData {
  id: string;
  targetUnits: number;
  status: string;
  dailyPlans: DailyPlanData[];
}

export interface BacklogUnitItem {
  id: string;
  label: string | null;
  task: TaskInfo | null;
}

export interface CarryForwardItem {
  id: string;
  label: string | null;
  status: string;
  task: TaskInfo | null;
}

// ─── Today slice ─────────────────────────────────────────────────────

export interface QueueItem {
  scheduledUnitId: string;
  sortOrder: number;
  unit: UnitInfo;
}

// ─── Store definition ────────────────────────────────────────────────

interface PlannerStore {
  // Weekly plan
  weeklyPlan: WeeklyPlanData | null;
  weeklyMonday: string | null;
  backlog: BacklogUnitItem[];
  carryForward: CarryForwardItem[];

  setWeeklyData: (
    plan: WeeklyPlanData,
    monday: string,
    backlog: BacklogUnitItem[],
    carryForward: CarryForwardItem[]
  ) => void;
  setWeeklyPlan: (plan: WeeklyPlanData) => void;
  setWeeklyMonday: (monday: string) => void;
  setBacklog: (backlog: BacklogUnitItem[]) => void;
  setCarryForward: (carryForward: CarryForwardItem[]) => void;

  // Optimistic weekly mutations
  optimisticScheduleUnit: (unit: BacklogUnitItem, dailyPlanId: string) => void;
  optimisticUnscheduleUnit: (scheduledUnitId: string, unitId: string) => void;
  optimisticReorderDay: (dailyPlanId: string, orderedIds: string[]) => void;
  optimisticSetDailyTarget: (dailyPlanId: string, target: number) => void;
  optimisticSetWeeklyTarget: (target: number) => void;
  optimisticAddBacklogUnit: (unit: BacklogUnitItem) => void;
  optimisticMarkUnitStatus: (unitId: string, status: string) => void;
  optimisticMoveUnitToWeek: (scheduledUnitId: string, unitId: string) => void;

  // Today queue
  todayQueue: QueueItem[];
  tomorrowQueue: QueueItem[];
  setTodayQueue: (queue: QueueItem[]) => void;
  setTomorrowQueue: (queue: QueueItem[]) => void;
}

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  // ─── Weekly plan ──────────────────────────────────────────────────
  weeklyPlan: null,
  weeklyMonday: null,
  backlog: [],
  carryForward: [],

  setWeeklyData: (plan, monday, backlog, carryForward) =>
    set({ weeklyPlan: plan, weeklyMonday: monday, backlog, carryForward }),

  setWeeklyPlan: (plan) => set({ weeklyPlan: plan }),
  setWeeklyMonday: (monday) => set({ weeklyMonday: monday }),
  setBacklog: (backlog) => set({ backlog }),
  setCarryForward: (carryForward) => set({ carryForward }),

  optimisticScheduleUnit: (unit, dailyPlanId) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      const newScheduledUnit: ScheduledUnitInfo = {
        id: `opt-${Date.now()}`,
        sortOrder: 9999,
        unit: { ...unit, status: "scheduled" },
      };
      const updatedPlan = {
        ...state.weeklyPlan,
        dailyPlans: state.weeklyPlan.dailyPlans.map((dp) =>
          dp.id === dailyPlanId
            ? { ...dp, scheduledUnits: [...dp.scheduledUnits, newScheduledUnit] }
            : dp
        ),
      };
      return {
        weeklyPlan: updatedPlan,
        backlog: state.backlog.filter((u) => u.id !== unit.id),
      };
    }),

  optimisticUnscheduleUnit: (scheduledUnitId, unitId) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      let removedUnit: BacklogUnitItem | null = null;
      const updatedPlan = {
        ...state.weeklyPlan,
        dailyPlans: state.weeklyPlan.dailyPlans.map((dp) => {
          const su = dp.scheduledUnits.find((s) => s.id === scheduledUnitId);
          if (su) {
            removedUnit = { id: su.unit.id, label: su.unit.label, task: su.unit.task };
          }
          return {
            ...dp,
            scheduledUnits: dp.scheduledUnits.filter((s) => s.id !== scheduledUnitId),
          };
        }),
      };
      return {
        weeklyPlan: updatedPlan,
        backlog: removedUnit
          ? [...state.backlog, removedUnit]
          : state.backlog,
      };
    }),

  optimisticReorderDay: (dailyPlanId, orderedIds) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      return {
        weeklyPlan: {
          ...state.weeklyPlan,
          dailyPlans: state.weeklyPlan.dailyPlans.map((dp) => {
            if (dp.id !== dailyPlanId) return dp;
            const reordered = orderedIds
              .map((id) => dp.scheduledUnits.find((s) => s.id === id))
              .filter((s): s is ScheduledUnitInfo => s != null)
              .map((s, i) => ({ ...s, sortOrder: i }));
            return { ...dp, scheduledUnits: reordered };
          }),
        },
      };
    }),

  optimisticSetDailyTarget: (dailyPlanId, target) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      return {
        weeklyPlan: {
          ...state.weeklyPlan,
          dailyPlans: state.weeklyPlan.dailyPlans.map((dp) =>
            dp.id === dailyPlanId ? { ...dp, targetUnits: target } : dp
          ),
        },
      };
    }),

  optimisticSetWeeklyTarget: (target) =>
    set((state) => ({
      weeklyPlan: state.weeklyPlan ? { ...state.weeklyPlan, targetUnits: target } : null,
    })),

  optimisticAddBacklogUnit: (unit) =>
    set((state) => ({ backlog: [...state.backlog, unit] })),

  optimisticMarkUnitStatus: (unitId, status) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      return {
        weeklyPlan: {
          ...state.weeklyPlan,
          dailyPlans: state.weeklyPlan.dailyPlans.map((dp) => ({
            ...dp,
            scheduledUnits: dp.scheduledUnits.map((su) =>
              su.unit.id === unitId ? { ...su, unit: { ...su.unit, status } } : su
            ),
          })),
        },
      };
    }),

  optimisticMoveUnitToWeek: (scheduledUnitId, unitId) =>
    set((state) => {
      if (!state.weeklyPlan) return state;
      return {
        weeklyPlan: {
          ...state.weeklyPlan,
          dailyPlans: state.weeklyPlan.dailyPlans.map((dp) => ({
            ...dp,
            scheduledUnits: dp.scheduledUnits.filter((s) => s.id !== scheduledUnitId),
          })),
        },
      };
    }),

  // ─── Today queue ─────────────────────────────────────────────────
  todayQueue: [],
  tomorrowQueue: [],
  setTodayQueue: (queue) => set({ todayQueue: queue }),
  setTomorrowQueue: (queue) => set({ tomorrowQueue: queue }),
}));
