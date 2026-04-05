import { connection } from "next/server";
import { getTodayQueue, getUserPreferences } from "@/app/actions/timer";
import { TimerView } from "@/components/timer/timer-view";

export default async function TodayPage() {
  await connection();

  const [queue, prefs] = await Promise.all([
    getTodayQueue(),
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
        initialQueue={queue}
        workDurationMin={prefs.workDurationMin}
        restDurationMin={prefs.restDurationMin}
        notificationSound={prefs.notificationSound}
      />
    </div>
  );
}
