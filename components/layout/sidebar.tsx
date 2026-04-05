"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Calendar,
  Timer,
  BarChart3,
  TrendingUp,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions/auth";

const navItems = [
  { href: "/backlog", label: "Backlog", icon: Inbox, disabled: false },
  {
    href: "/weekly-plan",
    label: "Weekly Plan",
    icon: Calendar,
    disabled: false,
  },
  { href: "/today", label: "Today", icon: Timer, disabled: false },
  { href: "/summary", label: "Summary", icon: BarChart3, disabled: true },
  { href: "/trends", label: "Trends", icon: TrendingUp, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center px-5">
        <Link href="/backlog" className="text-lg font-semibold tracking-tight">
          Planer
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed select-none"
              >
                <Icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto text-[10px] uppercase tracking-wider font-medium opacity-60">
                  Soon
                </span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>

        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              Personal workspace
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
