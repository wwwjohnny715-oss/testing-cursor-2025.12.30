import { NextRequest, NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();

    // 验证 locale 是否有效
    if (!locale || !locales.includes(locale as Locale)) {
      return NextResponse.json(
        { error: "Invalid locale" },
        { status: 400 }
      );
    }

    // 创建响应并设置 cookie
    const response = NextResponse.json({ success: true, locale });
    
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to set locale" },
      { status: 500 }
    );
  }
}





