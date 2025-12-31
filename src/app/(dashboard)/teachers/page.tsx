import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { TeacherList } from "./teacher-list";

export const dynamic = "force-dynamic";

async function getTeachers() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: { email: true },
      },
      courses: {
        where: { is_deleted: false },
        select: { id: true, courseCode: true },
      },
    },
  });

  return teachers;
}

export default async function TeachersPage() {
  const session = await auth();
  
  // 只有管理员可以访问老师管理页面
  if (session?.user.role !== "admin") {
    redirect("/students");
  }

  const teachers = await getTeachers();

  return (
    <div className="space-y-6">
      <TeacherList teachers={teachers} />
    </div>
  );
}

