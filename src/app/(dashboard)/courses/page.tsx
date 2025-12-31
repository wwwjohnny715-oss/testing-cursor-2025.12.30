import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CourseList } from "./course-list";

export const dynamic = "force-dynamic";

async function getCourses(userId?: string, userRole?: string, teacherId?: string | null) {
  const courses = await prisma.course.findMany({
    where: {
      is_deleted: false,
    },
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

  return courses.map((course) => ({
    ...course,
    isOwner: userRole === "admin" || course.teacher.id === teacherId,
    studentCount: course.enrollments.length,
  }));
}

async function getTeachers() {
  return prisma.teacher.findMany({
    where: { status: "active" },
    select: { id: true, teacherCode: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getStudents() {
  return prisma.student.findMany({
    where: { is_deleted: false },
    select: { id: true, studentCode: true, name: true, grade: true },
    orderBy: { name: "asc" },
  });
}

export default async function CoursesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "admin";
  const teacherId = session?.user.teacherId;

  const [courses, teachers, students] = await Promise.all([
    getCourses(session?.user.id, session?.user.role, teacherId),
    getTeachers(),
    getStudents(),
  ]);

  return (
    <div className="space-y-6">
      <CourseList
        courses={courses}
        teachers={teachers}
        students={students}
        isAdmin={isAdmin}
      />
    </div>
  );
}

