import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateDurationMinutes, generateSessionCode, toJsonString } from "@/types";

const sessionSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
});

const updateCourseSchema = z.object({
  teacher_id: z.string().optional(),
  grades: z.array(z.string()).min(1, "至少选择一个年级").optional(),
  sessions: z.array(sessionSchema).optional(),
});

// GET /api/courses/[id] - 获取单个课程
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
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, teacherCode: true, name: true },
        },
        sessions: {
          orderBy: { date: "asc" },
        },
        enrollments: {
          include: {
            student: {
              select: { id: true, studentCode: true, name: true, grade: true },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "課程不存在" }, { status: 404 });
    }

    // 如果课程已被删除且用户是老师，返回 403
    if (course.is_deleted && session.user.role === "teacher") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("获取课程失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// PATCH /api/courses/[id] - 更新课程
export async function PATCH(
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
      include: { sessions: true },
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
    const validation = updateCourseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { teacher_id, grades, sessions: sessionsData } = validation.data;

    // 老师不能修改 teacher_id
    if (session.user.role !== "admin" && teacher_id) {
      return NextResponse.json({ error: "教師無權修改授課教師" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // 更新课程基本信息
      const updateData: { teacher_id?: string; grades?: string } = {};
      if (teacher_id && session.user.role === "admin") {
        updateData.teacher_id = teacher_id;
      }
      if (grades) {
        updateData.grades = toJsonString(grades);
      }

      if (Object.keys(updateData).length > 0) {
        await tx.course.update({
          where: { id },
          data: updateData,
        });
      }

      // 更新 sessions
      if (sessionsData) {
        const existingSessionIds = course.sessions.map((s) => s.id);
        const updatedSessionIds = sessionsData.filter((s) => s.id).map((s) => s.id!);
        const toDelete = existingSessionIds.filter((id) => !updatedSessionIds.includes(id));

        // 删除不再存在的 sessions
        if (toDelete.length > 0) {
          await tx.session.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        // 更新或创建 sessions
        let sessionIndex = course.sessions.length;
        for (const s of sessionsData) {
          const durationMinutes = calculateDurationMinutes(s.start_time, s.end_time);

          if (s.id) {
            // 更新现有 session
            await tx.session.update({
              where: { id: s.id },
              data: {
                date: new Date(s.date),
                start_time: s.start_time,
                end_time: s.end_time,
                duration_minutes: durationMinutes,
              },
            });
          } else {
            // 创建新 session
            sessionIndex++;
            const sessionCode = generateSessionCode(course.courseCode, sessionIndex);
            await tx.session.create({
              data: {
                sessionCode,
                course_id: id,
                date: new Date(s.date),
                start_time: s.start_time,
                end_time: s.end_time,
                duration_minutes: durationMinutes,
              },
            });
          }
        }
      }
    });

    // 获取更新后的课程
    const updated = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: true,
        sessions: { orderBy: { date: "asc" } },
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "update",
        entity_type: "course",
        entity_id: id,
        details: JSON.stringify({ courseCode: course.courseCode }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("更新课程失败:", error);
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

// DELETE /api/courses/[id] - 软删除课程
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以删除课程
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const { id } = await params;
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      return NextResponse.json({ error: "課程不存在" }, { status: 404 });
    }

    if (course.is_deleted) {
      return NextResponse.json({ error: "课程已被删除" }, { status: 400 });
    }

    // 软删除
    await prisma.course.update({
      where: { id },
      data: { is_deleted: true },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "delete",
        entity_type: "course",
        entity_id: id,
        details: JSON.stringify({ courseCode: course.courseCode }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除课程失败:", error);
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

