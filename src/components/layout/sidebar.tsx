"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  BarChart3,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  userRole: "admin" | "teacher";
  userName?: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations();

  const navigation = [
    {
      name: t("nav.students"),
      href: "/students",
      icon: Users,
      roles: ["admin", "teacher"],
    },
    {
      name: t("nav.teachers"),
      href: "/teachers",
      icon: GraduationCap,
      roles: ["admin"],
    },
    {
      name: t("nav.courses"),
      href: "/courses",
      icon: BookOpen,
      roles: ["admin", "teacher"],
    },
    {
      name: t("nav.timetable"),
      href: "/teachers/timetable",
      icon: Calendar,
      roles: ["admin", "teacher"],
    },
    {
      name: t("nav.hoursStats"),
      href: "/teachers/stats/hours",
      icon: BarChart3,
      roles: ["admin", "teacher"],
    },
    {
      name: t("nav.enrollmentStats"),
      href: "/teachers/stats/enrollments",
      icon: BarChart3,
      roles: ["admin", "teacher"],
    },
    {
      name: t("nav.retentionStats"),
      href: "/teachers/stats/retention",
      icon: BarChart3,
      roles: ["admin", "teacher"],
    },
  ];

  const filteredNav = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex py-4 items-center justify-center border-b border-sidebar-border px-4">
        <Link href="/students" className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Center of Mass Education"
            width={44}
            height={48}
            className="flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight neon-text">
              {t("auth.loginTitle")}
            </span>
            <span className="text-[10px] leading-tight mt-0.5 font-medium subtitle-glow">
              Center of Mass Education
            </span>
            <span className="text-[10px] leading-tight font-medium subtitle-glow">
              Management System
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary neon-glow"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 px-3">
          <p className="text-xs text-muted-foreground">{t("nav.loggedInAs")}</p>
          <p className="text-sm font-medium truncate">
            {userName || (userRole === "admin" ? t("auth.admin") : t("auth.teacher"))}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {userRole === "admin" ? t("auth.admin") : t("auth.teacher")}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {t("nav.logout")}
        </Button>
      </div>
    </div>
  );
}
