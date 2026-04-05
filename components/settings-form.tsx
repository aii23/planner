"use client";

import { useState } from "react";
import { Save, Timer, Bell, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updatePreferences,
  type UserPreferences,
} from "@/app/actions/settings";

interface SettingsFormProps {
  initialPreferences: UserPreferences;
}

export function SettingsForm({ initialPreferences }: SettingsFormProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);

  function update(key: keyof UserPreferences, value: number | boolean | string) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updatePreferences(prefs);
    setSaving(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4" />
            Timer Durations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="work-duration" className="text-sm font-medium">
                Work Period
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="work-duration"
                  type="number"
                  min={1}
                  max={120}
                  value={prefs.work_duration_min}
                  onChange={(e) =>
                    update(
                      "work_duration_min",
                      parseInt((e.target as HTMLInputElement).value, 10) || 50
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Default: 50 minutes
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="rest-duration" className="text-sm font-medium">
                Rest Period
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="rest-duration"
                  type="number"
                  min={1}
                  max={60}
                  value={prefs.rest_duration_min}
                  onChange={(e) =>
                    update(
                      "rest_duration_min",
                      parseInt((e.target as HTMLInputElement).value, 10) || 10
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Default: 10 minutes
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="unit-duration" className="text-sm font-medium">
                Unit Checkpoint
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="unit-duration"
                  type="number"
                  min={5}
                  max={60}
                  value={prefs.unit_duration_min}
                  onChange={(e) =>
                    update(
                      "unit_duration_min",
                      parseInt((e.target as HTMLInputElement).value, 10) || 20
                    )
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">min</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Default: 20 minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Notification Sound</p>
              <p className="text-xs text-muted-foreground">
                Play a chime at work/rest boundaries and checkpoints
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notification_sound}
              onClick={() => update("notification_sound", !prefs.notification_sound)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${prefs.notification_sound ? "bg-primary" : "bg-muted"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm
                  ${prefs.notification_sound ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium">Daily Check-in</p>
              <p className="text-xs text-muted-foreground">
                AI-powered daily suggestions on first visit (future feature)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.daily_checkin}
              onClick={() => update("daily_checkin", !prefs.daily_checkin)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${prefs.daily_checkin ? "bg-primary" : "bg-muted"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm
                  ${prefs.daily_checkin ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Week starts on</label>
            <select
              value={prefs.week_start_day}
              onChange={(e) => update("week_start_day", e.target.value)}
              className="h-9 w-40 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
