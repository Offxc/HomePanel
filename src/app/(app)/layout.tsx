import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/header";
import { NavTabs, type Tab } from "@/components/nav-tabs";
import { ToastProvider } from "@/components/toast";

const BASE_TABS: Tab[] = [
  { href: "/today", label: "Today", icon: "today" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/shopping", label: "Shopping", icon: "shopping" },
  { href: "/notes", label: "Notes", icon: "notes" },
];

const KANBAN_TAB: Tab = { href: "/kanban", label: "Kanban", icon: "kanban" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const me = await db.user.findUnique({ where: { id: user.id }, select: { kanbanEnabled: true } });

  // Settings lives as a gear in the header (see AppHeader) to keep the tab bar uncluttered.
  const tabs: Tab[] = [
    ...BASE_TABS,
    ...(me?.kanbanEnabled ? [KANBAN_TAB] : []),
  ];

  return (
    <ToastProvider>
      <div
        className="mx-auto max-w-6xl"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        <AppHeader />
        <NavTabs tabs={tabs} />
        {children}
      </div>
    </ToastProvider>
  );
}
