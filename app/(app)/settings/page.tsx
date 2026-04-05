import { connection } from "next/server";
import { getPreferences } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  await connection();
  const preferences = await getPreferences();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Timer durations and preferences
        </p>
      </div>

      <SettingsForm initialPreferences={preferences} />
    </div>
  );
}
