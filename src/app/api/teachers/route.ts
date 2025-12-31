import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createTeacherSchema = z.object({
  teacherCode: z.string().min(1, "老师编号必填"),
  name: z.string().min(1, "姓名必填"),
  subjects: z.array(z.string()).min(1, "至少选择一个科目"),
  hire_date: z.string().min(1, "入职日期必填"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
});

// GET /api/teachers - 获取老师列表
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const teachers = await prisma.teacher.findMany({
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("获取老师列表失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// POST /api/teachers - 创建老师
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以创建老师
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createTeacherSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { teacherCode, name, subjects, hire_date, email, password } = validation.data;

    // 检查老师编号是否已存在
    const existingTeacher = await prisma.teacher.findUnique({
      where: { teacherCode },
    });
    if (existingTeacher) {
      return NextResponse.json(
        { error: "教師編號已存在" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "邮箱已被使用" },
        { status: 400 }
      );
    }

    // 使用事务创建老师和用户
    const result = await prisma.$transaction(async (tx) => {
      // 创建老师
      const teacher = await tx.teacher.create({
        data: {
          teacherCode,
          name,
          subjects: JSON.stringify(subjects),
          hire_date: new Date(hire_date),
          status: "active",
        },
      });

      // 创建用户帐号
      const passwordHash = await bcrypt.hash(password, 10);
      await tx.user.create({
        data: {
          email,
          password_hash: passwordHash,
          role: "teacher",
          teacher_id: teacher.id,
        },
      });

      return teacher;
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "create",
        entity_type: "teacher",
        entity_id: result.id,
        details: JSON.stringify({ teacherCode, name, subjects, email }),
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create teacher failed:", error);
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}

