"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Calendar, Timer, BarChart3, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/backlog", label: "Backlog", icon: Inbox, disabled: false },
  { href: "/weekly-plan", label: "Plan", icon: Calendar, disabled: false },
  { href: "/today", label: "Today", icon: Timer, disabled: false },
  { href: "/summary", label: "Summary", icon: BarChart3, disabled: false },
  { href: "/trends", label: "Trends", icon: TrendingUp, disabled: false },
];

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;

          if (tab.disabled) {
            return (
              <span
                key={tab.href}
                className="flex flex-col items-center gap-0.5 text-muted-foreground/30 px-2"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{tab.label}</span>
              </span>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
