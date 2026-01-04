import prisma from "@/lib/prisma";
import { EnrollmentStats } from "./enrollment-stats";

export const dynamic = "force-dynamic";

async function getEnrollmentData() {
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
            select: { studentCode: true },
          },
        },
      },
    },
  });

  return courses;
}

export default async function EnrollmentStatsPage() {
  const courses = await getEnrollmentData();

  return (
    <div className="space-y-6">
      <EnrollmentStats courses={courses} />
    </div>
  );
}







