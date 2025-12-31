import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Locale } from "@/i18n/config";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "admin" | "teacher";
  userName?: string;
  currentLocale?: Locale;
}

export function DashboardLayout({
  children,
  userRole,
  userName,
  currentLocale = "zh-TW",
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen grid-bg">
      <div className="flex min-h-screen">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
          <Sidebar userRole={userRole} userName={userName} />
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col md:pl-64">
          <Header userRole={userRole} userName={userName} currentLocale={currentLocale} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
