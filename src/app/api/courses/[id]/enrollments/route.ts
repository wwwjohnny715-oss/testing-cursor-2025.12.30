import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const enrollSchema = z.object({
  studentIds: z.array(z.string()).min(0),
});

// POST /api/courses/[id]/enrollments - 更新课程学生（加入/移除）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        enrollments: {
          where: { is_active: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "課程不存在" }, { status: 404 });
    }

    if (course.is_deleted) {
      return NextResponse.json({ error: "课程已被删除" }, { status: 400 });
    }

    // 检查权限：管理员或课程所属老师
    const isOwner = session.user.teacherId === course.teacher_id;
    if (session.user.role !== "admin" && !isOwner) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const validation = enrollSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { studentIds } = validation.data;
    const currentStudentIds = course.enrollments.map((e) => e.student_id);
    const now = new Date();

    // 需要移除的学生（之前在但现在不在）
    const toRemove = currentStudentIds.filter((id) => !studentIds.includes(id));
    // 需要加入的学生（之前不在但现在在）
    const toAdd = studentIds.filter((id) => !currentStudentIds.includes(id));

    await prisma.$transaction(async (tx) => {
      // 移除学生（设置 is_active=false 和 ended_at）
      if (toRemove.length > 0) {
        await tx.enrollment.updateMany({
          where: {
            course_id: id,
            student_id: { in: toRemove },
            is_active: true,
          },
          data: {
            is_active: false,
            ended_at: now,
          },
        });

        // 记录审计日志
        await tx.auditLog.create({
          data: {
            user_id: session.user.id,
            action: "enrollment_remove",
            entity_type: "enrollment",
            entity_id: id,
            details: JSON.stringify({ courseId: id, removedStudents: toRemove }),
          },
        });
      }

      // 加入学生
      for (const studentId of toAdd) {
        // 检查是否已有过报名记录（非 active）
        const existing = await tx.enrollment.findFirst({
          where: {
            course_id: id,
            student_id: studentId,
          },
        });

        if (existing) {
          // 重新激活
          await tx.enrollment.update({
            where: { id: existing.id },
            data: {
              is_active: true,
              ended_at: null,
              joined_at: now,
            },
          });
        } else {
          // 创建新的报名记录
          await tx.enrollment.create({
            data: {
              course_id: id,
              student_id: studentId,
              joined_at: now,
            },
          });
        }

        // 更新学生的 first_enrolled_at（如果是第一次加入任何课程）
        const student = await tx.student.findUnique({
          where: { id: studentId },
        });
        if (student && !student.first_enrolled_at) {
          await tx.student.update({
            where: { id: studentId },
            data: { first_enrolled_at: now },
          });
        }
      }

      if (toAdd.length > 0) {
        // 记录审计日志
        await tx.auditLog.create({
          data: {
            user_id: session.user.id,
            action: "enrollment_add",
            entity_type: "enrollment",
            entity_id: id,
            details: JSON.stringify({ courseId: id, addedStudents: toAdd }),
          },
        });
      }
    });

    return NextResponse.json({ success: true, added: toAdd.length, removed: toRemove.length });
  } catch (error) {
    console.error("更新课程学生失败:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

