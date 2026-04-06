import { connection } from "next/server";
import { getTodayAndTomorrowQueues, getUserPreferences } from "@/app/actions/timer";
import { TimerView } from "@/components/timer/timer-view";

export default async function TodayPage() {
  await connection();

  const [{ todayQueue, tomorrowQueue }, prefs] = await Promise.all([
    getTodayAndTomorrowQueues(),
    getUserPreferences(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Focus timer and today&apos;s unit queue
        </p>
      </div>

      <TimerView
        initialQueue={todayQueue}
        initialTomorrowQueue={tomorrowQueue}
        workDurationMin={prefs.workDurationMin}
        restDurationMin={prefs.restDurationMin}
        notificationSound={prefs.notificationSound}
      />
    </div>
  );
}
