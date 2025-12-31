import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// 边缘运行时版本的 NextAuth 配置
// 注意：此配置不包含数据库验证，仅用于 middleware 中的 session 验证

// 扩展 NextAuth 类型
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: "admin" | "teacher";
    teacherId?: string | null;
    teacherName?: string | null;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "teacher";
      teacherId?: string | null;
      teacherName?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    email: string;
    role: "admin" | "teacher";
    teacherId?: string | null;
    teacherName?: string | null;
  }
}

export const { auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // 在边缘运行时中，authorize 不会被调用
      // 实际验证在 /api/auth/[...nextauth]/route.ts 中进行
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.role = user.role;
        token.teacherId = user.teacherId;
        token.teacherName = user.teacherName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.role = token.role;
      session.user.teacherId = token.teacherId;
      session.user.teacherName = token.teacherName;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});

