import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const attendanceSchema = z.object({
  session_id: z.string().min(1, "Session ID 必填"),
  student_id: z.string().min(1, "学生 ID 必填"),
  status: z.enum(["present", "absent"]),
});

// POST /api/attendance - 创建或更新点名记录（upsert）
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const validation = attendanceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { session_id, student_id, status } = validation.data;

    // 获取 session 和对应的课程
    const sessionData = await prisma.session.findUnique({
      where: { id: session_id },
      include: {
        course: true,
      },
    });

    if (!sessionData) {
      return NextResponse.json({ error: "Session 不存在" }, { status: 404 });
    }

    // 检查 session 是否已过去
    const now = new Date();
    if (new Date(sessionData.date) > now) {
      return NextResponse.json({ error: "不能为未来的 Session 点名" }, { status: 400 });
    }

    // 检查权限：管理员或课程所属老师
    const isOwner = session.user.teacherId === sessionData.course.teacher_id;
    if (session.user.role !== "admin" && !isOwner) {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    // 检查学生是否存在
    const student = await prisma.student.findUnique({
      where: { id: student_id },
    });
    if (!student) {
      return NextResponse.json({ error: "學生不存在" }, { status: 404 });
    }

    // Upsert 点名记录
    const attendance = await prisma.attendance.upsert({
      where: {
        session_id_student_id: {
          session_id,
          student_id,
        },
      },
      update: {
        status,
        updated_at: now,
      },
      create: {
        session_id,
        student_id,
        status,
      },
    });

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "attendance",
        entity_type: "attendance",
        entity_id: attendance.id,
        details: JSON.stringify({
          sessionCode: sessionData.sessionCode,
          studentCode: student.studentCode,
          status,
        }),
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("点名失败:", error);
    return NextResponse.json({ error: "點名失敗" }, { status: 500 });
  }
}

