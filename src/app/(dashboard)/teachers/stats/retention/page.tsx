import prisma from "@/lib/prisma";
import { RetentionStats } from "./retention-stats";

export const dynamic = "force-dynamic";

async function getRetentionData() {
  // 获取所有课程、sessions、enrollments 数据
  const courses = await prisma.course.findMany({
    include: {
      teacher: {
        select: { id: true, teacherCode: true, name: true, subjects: true },
      },
      sessions: {
        select: { date: true },
      },
      enrollments: {
        include: {
          student: {
            select: { studentCode: true, first_enrolled_at: true },
          },
        },
      },
    },
  });

  return courses;
}

export default async function RetentionStatsPage() {
  const courses = await getRetentionData();

  return (
    <div className="space-y-6">
      <RetentionStats courses={courses} />
    </div>
  );
}







