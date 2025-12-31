import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import ExcelJS from "exceljs";
import { format } from "date-fns";

// GET /api/export/hours - 导出老师课时 Excel
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 只有管理员可以导出
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "無權限" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const teacherId = searchParams.get("teacherId");
    const month = searchParams.get("month");

    if (!teacherId || !month) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    // 获取老师信息
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: "教師不存在" }, { status: 404 });
    }

    // 解析月份
    const [year, monthNum] = month.split("-").map(Number);
    const monthStart = new Date(year, monthNum - 1, 1);
    const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999);

    // 获取该老师该月的所有 sessions
    const sessions = await prisma.session.findMany({
      where: {
        course: {
          teacher_id: teacherId,
        },
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      include: {
        course: {
          select: { courseCode: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // 创建 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Tutoring Center";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("课时记录");

    // 设置列
    worksheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "StartTime", key: "startTime", width: 12 },
      { header: "EndTime", key: "endTime", width: 12 },
      { header: "DurationMinutes", key: "durationMinutes", width: 18 },
      { header: "DurationHours", key: "durationHours", width: 15 },
      { header: "CourseCode", key: "courseCode", width: 20 },
      { header: "SessionCode", key: "sessionCode", width: 25 },
    ];

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4A90D9" },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    // 添加数据行
    for (const s of sessions) {
      worksheet.addRow({
        date: format(new Date(s.date), "yyyy-MM-dd"),
        startTime: s.start_time,
        endTime: s.end_time,
        durationMinutes: s.duration_minutes,
        durationHours: (s.duration_minutes / 60).toFixed(2),
        courseCode: s.course.courseCode,
        sessionCode: s.sessionCode,
      });
    }

    // 添加汇总行
    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
    worksheet.addRow({});
    worksheet.addRow({
      date: "总计",
      durationMinutes: totalMinutes,
      durationHours: (totalMinutes / 60).toFixed(2),
    });

    // 生成 buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 记录审计日志
    await prisma.auditLog.create({
      data: {
        user_id: session.user.id,
        action: "export",
        entity_type: "hours",
        entity_id: teacherId,
        details: JSON.stringify({ teacherCode: teacher.teacherCode, month, sessionCount: sessions.length }),
      },
    });

    // 返回 Excel 文件
    const filename = `hours_${teacher.teacherCode}_${month}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("导出失败:", error);
    return NextResponse.json({ error: "匯出失敗" }, { status: 500 });
  }
}

