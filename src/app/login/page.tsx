"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

// 獲取初始語言
function getInitialLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const localeCookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("locale="))
    ?.split("=")[1] as Locale | undefined;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }
  return defaultLocale;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const callbackUrl = searchParams.get("callbackUrl") || "/students";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLocale] = useState<Locale>(getInitialLocale);
  const [errorMessage, setErrorMessage] = useState(
    error ? (error === "CredentialsSignin" ? t("auth.invalidCredentials") : error) : ""
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setErrorMessage(result.error || t("auth.loginError"));
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setErrorMessage(t("auth.loginError"));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid-bg flex items-center justify-center p-4 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher currentLocale={currentLocale} />
      </div>

      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <div className="h-6 w-6 rounded border-2 border-primary neon-glow" />
          </div>
          <CardTitle className="text-2xl neon-text">{t("auth.loginTitle")}</CardTitle>
          <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@tutoring.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50"
              />
            </div>

            <Button
              type="submit"
              className="w-full btn-cyber"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("auth.loggingIn")}
                </>
              ) : (
                t("auth.loginButton")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
