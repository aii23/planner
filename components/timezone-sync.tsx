"use client";

import { useEffect } from "react";
import { updatePreferences } from "@/app/actions/settings";

export function TimezoneSync({ currentTz }: { currentTz: string }) {
  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz && browserTz !== currentTz) {
      updatePreferences({ timezone: browserTz });
    }
  }, [currentTz]);

  return null;
}
