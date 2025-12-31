import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "补习社管理系统 | Tutoring Center",
  description: "补习社管理系统 - 学生、老师、课程、点名、统计",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            {children}
            <Toaster 
              position="top-right" 
              richColors 
              closeButton
              theme="dark"
            />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
