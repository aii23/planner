import { BarChart3 } from "lucide-react";

export default function SummaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Weekly Summary
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your completed week
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Coming soon — weekly review with target vs actual analysis.
        </p>
      </div>
    </div>
  );
}
