import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateTeacherSchema = z.object({
  name: z.string().min(1, "姓名必填").optional(),
  subjects: z.array(z.string()).min(1, "至少选择一个科目").optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// GET /api/teachers/[id] - 获取单个老师
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: { email: true },
        },
        courses: {
          include: {
            sessions: true,
            enrollments: {
              where: { is_active: true },
              include: {
                student: {
                  select: { studentCode: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: "教師不存在" }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error("获取老师失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// PATCH /api/teachers/[id] - 更新老师
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以更新老师
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateTeacherSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json({ error: "教師不存在" }, { status: 404 });
    }

    // 如果有 subjects 字段，需要转换为 JSON 字符串
    const updateData: { name?: string; status?: string; subjects?: string } = {};
    if (validation.data.name) updateData.name = validation.data.name;
    if (validation.data.status) updateData.status = validation.data.status;
    if (validation.data.subjects) updateData.subjects = JSON.stringify(validation.data.subjects);

    const updated = await prisma.teacher.update({
      where: { id },
      data: updateData,
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "update",
        entity_type: "teacher",
        entity_id: id,
        details: JSON.stringify({ before: teacher, after: updated }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新老师失败:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

