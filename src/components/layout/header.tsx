"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/i18n/config";

interface HeaderProps {
  userRole: "admin" | "teacher";
  userName?: string;
  currentLocale?: Locale;
}

export function Header({ userRole, userName, currentLocale = "zh-TW" }: HeaderProps) {
  const pathname = usePathname();
  const t = useTranslations();

  // 获取页面标题
  const getTitle = () => {
    const titleMap: Record<string, string> = {
      "/students": t("nav.students"),
      "/teachers": t("nav.teachers"),
      "/courses": t("nav.courses"),
      "/teachers/timetable": t("nav.timetable"),
      "/teachers/stats/hours": t("nav.hoursStats"),
      "/teachers/stats/enrollments": t("nav.enrollmentStats"),
      "/teachers/stats/retention": t("nav.retentionStats"),
    };

    // 精确匹配
    if (titleMap[pathname]) {
      return titleMap[pathname];
    }
    // 课程详情
    if (pathname.startsWith("/courses/")) {
      return t("courses.viewDetails");
    }
    return t("auth.loginTitle");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar userRole={userRole} userName={userName} />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="text-xl font-semibold">{getTitle()}</h1>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-4">
        <LanguageSwitcher currentLocale={currentLocale} />
      </div>
    </header>
  );
}
