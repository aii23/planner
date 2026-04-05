"use client";

import { useCallback, useEffect, useRef } from "react";

export function useNotifications() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    permissionRef.current = Notification.permission;
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return;
    }
    if (Notification.permission === "denied") return;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
  }, []);

  const notify = useCallback((title: string, body?: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (permissionRef.current !== "granted") return;

    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "planer-timer",
      });
    } catch {
      // notification blocked or unsupported
    }
  }, []);

  const playChime = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);

      setTimeout(() => ctx.close(), 500);
    } catch {
      // audio context blocked
    }
  }, []);

  return { requestPermission, notify, playChime };
}
