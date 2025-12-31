import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateStudentSchema = z.object({
  name: z.string().min(1, "姓名必填").optional(),
  phone: z.string().min(1, "电话必填").optional(),
  grade: z.string().min(1, "年级必填").optional(),
});

// GET /api/students/[id] - 获取单个学生
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            course: {
              select: {
                id: true,
                courseCode: true,
                is_deleted: true,
                teacher: {
                  select: { name: true },
                },
              },
            },
          },
        },
        attendances: {
          include: {
            session: {
              select: {
                sessionCode: true,
                date: true,
                course: {
                  select: { courseCode: true },
                },
              },
            },
          },
          orderBy: { created_at: "desc" },
          take: 20,
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "學生不存在" }, { status: 404 });
    }

    return NextResponse.json(student);
  } catch (error) {
    console.error("获取学生失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// PATCH /api/students/[id] - 更新学生
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以更新学生
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateStudentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: "學生不存在" }, { status: 404 });
    }

    if (student.is_deleted) {
      return NextResponse.json({ error: "学生已被删除" }, { status: 400 });
    }

    const updated = await prisma.student.update({
      where: { id },
      data: validation.data,
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "update",
        entity_type: "student",
        entity_id: id,
        details: JSON.stringify({ before: student, after: updated }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新学生失败:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

// DELETE /api/students/[id] - 软删除学生
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授權" }, { status: 401 });
    }

    // 只有管理员可以删除学生
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get("hard") === "true";

    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: "學生不存在" }, { status: 404 });
    }

    if (isHardDelete) {
      // 硬删除 - 先删除相关的 attendance 和 enrollment 记录
      await prisma.$transaction(async (tx) => {
        // 删除出席记录
        await tx.attendance.deleteMany({
          where: { student_id: id },
        });

        // 删除报名记录
        await tx.enrollment.deleteMany({
          where: { student_id: id },
        });

        // 删除学生
        await tx.student.delete({
          where: { id },
        });
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          user_id: session.user.id,
          action: "hard_delete",
          entity_type: "student",
          entity_id: id,
          details: JSON.stringify({ 
            studentCode: student.studentCode, 
            name: student.name,
            type: "hard_delete"
          }),
        },
      });
    } else {
      // 软删除
      if (student.is_deleted) {
        return NextResponse.json({ error: "學生已被刪除" }, { status: 400 });
      }

      await prisma.student.update({
        where: { id },
        data: { is_deleted: true },
      });

      // 记录审计日志
      await prisma.auditLog.create({
        data: {
          user_id: session.user.id,
          action: "soft_delete",
          entity_type: "student",
          entity_id: id,
          details: JSON.stringify({ 
            studentCode: student.studentCode, 
            name: student.name,
            type: "soft_delete"
          }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete student failed:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

