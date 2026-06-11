import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { AppHeader } from "@/components/header";
import { NavTabs, type Tab } from "@/components/nav-tabs";

const BASE_TABS: Tab[] = [
  { href: "/today", label: "Today", icon: "☀" },
  { href: "/calendar", label: "Calendar", icon: "▦" },
  { href: "/shopping", label: "Shopping", icon: "▤" },
  { href: "/notes", label: "Notes", icon: "✎" },
];

const KANBAN_TAB: Tab = { href: "/kanban", label: "Kanban", icon: "▥" };
const SETTINGS_TAB: Tab = { href: "/settings", label: "Settings", icon: "⚙" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  const me = await db.user.findUnique({ where: { id: user.id }, select: { kanbanEnabled: true } });

  const tabs: Tab[] = [
    ...BASE_TABS,
    ...(me?.kanbanEnabled ? [KANBAN_TAB] : []),
    SETTINGS_TAB,
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <AppHeader />
      <NavTabs tabs={tabs} />
      {children}
    </div>
  );
}
