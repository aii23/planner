"use client";

import { createContext, useContext } from "react";

type BacklogContextValue = {
  refresh: () => Promise<void>;
};

const BacklogContext = createContext<BacklogContextValue | null>(null);

export const BacklogProvider = BacklogContext.Provider;

export function useBacklogRefresh() {
  const ctx = useContext(BacklogContext);
  if (!ctx) {
    throw new Error("useBacklogRefresh must be used within a BacklogProvider");
  }
  return ctx.refresh;
}
