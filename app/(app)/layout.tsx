import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { TimezoneSync } from "@/components/timezone-sync";
import { getUserTimezone } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tz = await getUserTimezone();

  return (
    <div className="flex h-screen overflow-hidden">
      <TimezoneSync currentTz={tz} />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-20 md:px-6 md:py-8 md:pb-8">
          {children}
        </div>
      </main>
      <BottomTabs />
    </div>
  );
}
