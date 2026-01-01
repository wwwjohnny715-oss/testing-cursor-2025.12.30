import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers";

export const metadata: Metadata = {
  title: "香港質心教育 管理系統 | COMET Management System",
  description: "香港質心教育管理系統 - 學生、老師、課程、點名、統計",
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
