import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { calculateDurationMinutes, generateSessionCode, toJsonString } from "@/types";

const sessionSchema = z.object({
  date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
});

const createCourseSchema = z.object({
  courseCode: z.string().min(1, "课程编号必填"),
  teacher_id: z.string().min(1, "授课老师必填"),
  grades: z.array(z.string()).min(1, "至少选择一个年级"),
  sessions: z.array(sessionSchema).min(1, "至少添加一个 Session"),
});

// GET /api/courses - 获取课程列表
export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const courses = await prisma.course.findMany({
      where: { is_deleted: false },
      orderBy: { created_at: "desc" },
      include: {
        teacher: {
          select: { id: true, teacherCode: true, name: true },
        },
        sessions: {
          orderBy: { date: "asc" },
        },
        enrollments: {
          where: { is_active: true },
          include: {
            student: {
              select: { id: true, studentCode: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error("获取课程列表失败:", error);
    return NextResponse.json({ error: "獲取失敗" }, { status: 500 });
  }
}

// POST /api/courses - 创建课程
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以创建课程
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const body = await request.json();
    const validation = createCourseSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { courseCode, teacher_id, grades, sessions } = validation.data;

    // 检查课程编号是否已存在
    const existing = await prisma.course.findUnique({
      where: { courseCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "課程編號已存在" },
        { status: 400 }
      );
    }

    // 检查老师是否存在
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacher_id },
    });
    if (!teacher) {
      return NextResponse.json(
        { error: "教師不存在" },
        { status: 400 }
      );
    }

    // 创建课程和 sessions
    const course = await prisma.$transaction(async (tx) => {
      const newCourse = await tx.course.create({
        data: {
          courseCode,
          teacher_id,
          grades: toJsonString(grades),
        },
      });

      // 创建 sessions
      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const sessionCode = generateSessionCode(courseCode, i + 1);
        const durationMinutes = calculateDurationMinutes(s.start_time, s.end_time);

        await tx.session.create({
          data: {
            sessionCode,
            course_id: newCourse.id,
            date: new Date(s.date),
            start_time: s.start_time,
            end_time: s.end_time,
            duration_minutes: durationMinutes,
          },
        });
      }

      return newCourse;
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "create",
        entity_type: "course",
        entity_id: course.id,
        details: JSON.stringify({ courseCode, teacher_id, grades, sessionCount: sessions.length }),
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error("Create course failed:", error);
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}

