import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createStudentSchema = z.object({
  studentCode: z.string().min(1, "学生编号必填"),
  name: z.string().min(1, "姓名必填"),
  phone: z.string().min(1, "电话必填"),
  grade: z.string().min(1, "年级必填"),
});

// GET /api/students - 获取学生列表
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const students = await prisma.student.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("获取学生列表失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// POST /api/students - 创建学生
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以创建学生
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createStudentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { studentCode, name, phone, grade } = validation.data;

    // 检查学生编号是否已存在
    const existing = await prisma.student.findUnique({
      where: { studentCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "學生編號已存在" },
        { status: 400 }
      );
    }

    const student = await prisma.student.create({
      data: {
        studentCode,
        name,
        phone,
        grade,
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "create",
        entity_type: "student",
        entity_id: student.id,
        details: JSON.stringify({ studentCode, name, phone, grade }),
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("Create student failed:", error);
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}

