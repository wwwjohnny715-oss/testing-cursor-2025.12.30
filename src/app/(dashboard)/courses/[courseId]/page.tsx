import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { CourseDetail } from "./course-detail";

export const dynamic = "force-dynamic";

async function getCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      teacher: {
        select: { id: true, teacherCode: true, name: true },
      },
      sessions: {
        orderBy: { date: "asc" },
        include: {
          attendances: {
            include: {
              student: {
                select: { id: true, studentCode: true, name: true },
              },
            },
          },
        },
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

  return course;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  const { courseId } = await params;

  const course = await getCourse(courseId);

  if (!course) {
    notFound();
  }

  // 如果课程已被删除且用户是老师，重定向
  if (course.is_deleted && session?.user.role === "teacher") {
    redirect("/courses");
  }

  const isAdmin = session?.user.role === "admin";
  const isOwner = session?.user.teacherId === course.teacher.id;
  const canEdit = isAdmin || isOwner;

  // 过滤已过去的 sessions 用于点名
  const now = new Date();
  const pastSessions = course.sessions.filter(
    (s) => new Date(s.date) < now
  );

  return (
    <div className="space-y-6">
      <CourseDetail
        course={course}
        pastSessions={pastSessions}
        canEdit={canEdit}
        isAdmin={isAdmin}
      />
    </div>
  );
}



