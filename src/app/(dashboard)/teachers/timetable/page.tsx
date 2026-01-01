import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { TimetableCalendar } from "./timetable-calendar";

export const dynamic = "force-dynamic";

async function getSessions() {
  const sessions = await prisma.session.findMany({
    where: {
      course: {
        is_deleted: false,
      },
    },
    include: {
      course: {
        select: {
          id: true,
          courseCode: true,
          teacher_id: true,
          teacher: {
            select: { name: true },
          },
          enrollments: {
            where: { is_active: true },
            select: { student_id: true },
          },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  return sessions.map((session) => ({
    id: session.id,
    courseId: session.course.id,
    courseCode: session.course.courseCode,
    teacherId: session.course.teacher_id,
    teacherName: session.course.teacher.name,
    date: session.date,
    startTime: session.start_time,
    endTime: session.end_time,
    studentCount: new Set(session.course.enrollments.map((e) => e.student_id)).size,
  }));
}

export default async function TimetablePage() {
  const session = await auth();
  const sessions = await getSessions();

  const isAdmin = session?.user.role === "admin";
  const currentTeacherId = session?.user.teacherId;

  return (
    <div className="space-y-6">
      <TimetableCalendar
        sessions={sessions}
        isAdmin={isAdmin}
        currentTeacherId={currentTeacherId}
      />
    </div>
  );
}





