import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // 获取当前语言
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value as Locale | undefined;
  const currentLocale = localeCookie && locales.includes(localeCookie) 
    ? localeCookie 
    : defaultLocale;

  return (
    <DashboardLayout
      userRole={session.user.role}
      userName={session.user.teacherName || session.user.email}
      currentLocale={currentLocale}
    >
      {children}
    </DashboardLayout>
  );
}

