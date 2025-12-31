import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import type { User as PrismaUser, Teacher } from "@prisma/client";

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("请输入邮箱和密码");
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // 查找用户
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            teacher: true,
          },
        });

        if (!user) {
          throw new Error("邮箱或密码错误");
        }

        // 验证密码
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
          throw new Error("邮箱或密码错误");
        }

        // 检查老师状态
        if (user.role === "teacher" && user.teacher) {
          if (user.teacher.status === "inactive") {
            throw new Error("您的帐号已被停用，请联系管理员");
          }
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role as "admin" | "teacher",
          teacherId: user.teacher_id,
          teacherName: user.teacher?.name || null,
        };
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

// 获取当前用户（服务端）
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

// 检查是否是管理员
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

// 检查是否是老师
export async function isTeacher() {
  const user = await getCurrentUser();
  return user?.role === "teacher";
}

// 获取当前老师 ID
export async function getCurrentTeacherId() {
  const user = await getCurrentUser();
  return user?.teacherId || null;
}

// 权限检查类型
export type UserWithTeacher = PrismaUser & {
  teacher: Teacher | null;
};



