import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth-edge";

// 需要认证的路径
const protectedPaths = [
  "/students",
  "/teachers",
  "/courses",
];

// 公开路径
const publicPaths = ["/", "/login"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 检查是否是静态资源或 API 路由
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 获取 session
  const session = await auth();

  // 检查是否需要认证
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isProtectedPath && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录用户访问登录页，重定向到主页
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/students", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

