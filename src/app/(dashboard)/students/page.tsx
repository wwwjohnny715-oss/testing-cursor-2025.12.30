import { Suspense } from "react";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StudentList } from "./student-list";
import { Loader2 } from "lucide-react";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

async function getStudents(search?: string, newOnly?: boolean) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

  const where: Prisma.StudentWhereInput = {
    is_deleted: false,
  };

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { studentCode: { contains: search } },
    ];
  }

  if (newOnly) {
    where.first_enrolled_at = {
      gte: monthStart,
      lte: monthEnd,
    };
  }

  const students = await prisma.student.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      enrollments: {
        where: { is_active: true },
        include: {
          course: {
            select: { courseCode: true, is_deleted: true },
          },
        },
      },
    },
  });

  return students.map((student) => ({
    ...student,
    isNew: Boolean(
      student.first_enrolled_at &&
      student.first_enrolled_at >= monthStart &&
      student.first_enrolled_at <= monthEnd
    ),
    activeCourses: student.enrollments
      .filter((e) => !e.course.is_deleted)
      .map((e) => e.course.courseCode),
  }));
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; newOnly?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const search = params.search;
  const newOnly = params.newOnly === "true";

  const students = await getStudents(search, newOnly);

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <StudentList
          students={students}
          isAdmin={session?.user.role === "admin"}
          initialSearch={search}
          initialNewOnly={newOnly}
        />
      </Suspense>
    </div>
  );
}
