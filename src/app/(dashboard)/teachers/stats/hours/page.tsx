import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { HoursStats } from "./hours-stats";

export const dynamic = "force-dynamic";

async function getTeachers() {
  return prisma.teacher.findMany({
    select: { id: true, teacherCode: true, name: true, subjects: true },
    orderBy: { name: "asc" },
  });
}

async function getHoursData() {
  // 获取所有 sessions 和相关课程/老师信息
  const sessions = await prisma.session.findMany({
    include: {
      course: {
        select: {
          teacher_id: true,
          teacher: {
            select: { teacherCode: true, name: true, subjects: true },
          },
        },
      },
    },
  });

  return sessions;
}

export default async function HoursStatsPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "admin";
  
  const [teachers, sessionsData] = await Promise.all([
    getTeachers(),
    getHoursData(),
  ]);

  return (
    <div className="space-y-6">
      <HoursStats
        teachers={teachers}
        sessions={sessionsData}
        isAdmin={isAdmin}
      />
    </div>
  );
}

