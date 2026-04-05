import { Timer } from "lucide-react";

export default function TodayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Focus timer and today&apos;s unit queue
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <Timer className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Schedule units for today to start your work session.
        </p>
      </div>
    </div>
  );
}
