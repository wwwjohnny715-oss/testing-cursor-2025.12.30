import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 开始播种数据...");

  // 清理现有数据（按依赖顺序）
  await prisma.auditLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.course.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.teacher.deleteMany();

  console.log("✅ 已清理现有数据");

  // 创建 Admin 用户
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@tutoring.com",
      password_hash: adminPasswordHash,
      role: "admin",
    },
  });
  console.log("✅ 已创建 Admin 用户:", admin.email);

  // 创建老师 1 - 陈老师（数学）
  const teacher1 = await prisma.teacher.create({
    data: {
      teacherCode: "T001",
      name: "陈老师",
      subjects: JSON.stringify(["数学", "M1", "M2"]),
      hire_date: new Date("2023-01-15"),
      status: "active",
    },
  });

  const teacher1PasswordHash = await bcrypt.hash("teacher123", 10);
  await prisma.user.create({
    data: {
      email: "chen@tutoring.com",
      password_hash: teacher1PasswordHash,
      role: "teacher",
      teacher_id: teacher1.id,
    },
  });
  console.log("✅ 已创建老师:", teacher1.name);

  // 创建老师 2 - 李老师（英文）
  const teacher2 = await prisma.teacher.create({
    data: {
      teacherCode: "T002",
      name: "李老师",
      subjects: JSON.stringify(["英文"]),
      hire_date: new Date("2023-03-20"),
      status: "active",
    },
  });

  const teacher2PasswordHash = await bcrypt.hash("teacher123", 10);
  await prisma.user.create({
    data: {
      email: "li@tutoring.com",
      password_hash: teacher2PasswordHash,
      role: "teacher",
      teacher_id: teacher2.id,
    },
  });
  console.log("✅ 已创建老师:", teacher2.name);

  // 创建学生
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 10);

  const students = await Promise.all([
    prisma.student.create({
      data: {
        studentCode: "S001",
        name: "张小明",
        phone: "98765432",
        grade: "S4",
        first_enrolled_at: lastMonth,
      },
    }),
    prisma.student.create({
      data: {
        studentCode: "S002",
        name: "王小红",
        phone: "91234567",
        grade: "S5",
        first_enrolled_at: lastMonth,
      },
    }),
    prisma.student.create({
      data: {
        studentCode: "S003",
        name: "李小华",
        phone: "92345678",
        grade: "S3",
        first_enrolled_at: thisMonth,
      },
    }),
    prisma.student.create({
      data: {
        studentCode: "S004",
        name: "陈小龙",
        phone: "93456789",
        grade: "S6",
        first_enrolled_at: thisMonth,
      },
    }),
    prisma.student.create({
      data: {
        studentCode: "S005",
        name: "林小燕",
        phone: "94567890",
        grade: "P6",
        first_enrolled_at: null,
      },
    }),
  ]);
  console.log("✅ 已创建", students.length, "个学生");

  // 创建课程 1 - 陈老师的数学课
  const course1 = await prisma.course.create({
    data: {
      courseCode: "MATH-S4-001",
      teacher_id: teacher1.id,
      grades: JSON.stringify(["S4", "S5"]),
    },
  });

  // 为课程 1 创建 Sessions
  const sessions1 = await Promise.all([
    prisma.session.create({
      data: {
        sessionCode: "MATH-S4-001-01",
        course_id: course1.id,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        start_time: "14:00",
        end_time: "16:00",
        duration_minutes: 120,
      },
    }),
    prisma.session.create({
      data: {
        sessionCode: "MATH-S4-001-02",
        course_id: course1.id,
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        start_time: "14:00",
        end_time: "16:00",
        duration_minutes: 120,
      },
    }),
    prisma.session.create({
      data: {
        sessionCode: "MATH-S4-001-03",
        course_id: course1.id,
        date: new Date(now.getFullYear(), now.getMonth(), 19),
        start_time: "14:00",
        end_time: "16:00",
        duration_minutes: 120,
      },
    }),
    prisma.session.create({
      data: {
        sessionCode: "MATH-S4-001-04",
        course_id: course1.id,
        date: new Date(now.getFullYear(), now.getMonth(), 26),
        start_time: "14:00",
        end_time: "16:00",
        duration_minutes: 120,
      },
    }),
  ]);
  console.log("✅ 已创建课程:", course1.courseCode, "含", sessions1.length, "个 Sessions");

  // 创建课程 2 - 李老师的英文课
  const course2 = await prisma.course.create({
    data: {
      courseCode: "ENG-S5-001",
      teacher_id: teacher2.id,
      grades: JSON.stringify(["S5", "S6"]),
    },
  });

  const sessions2 = await Promise.all([
    prisma.session.create({
      data: {
        sessionCode: "ENG-S5-001-01",
        course_id: course2.id,
        date: new Date(now.getFullYear(), now.getMonth(), 6),
        start_time: "10:00",
        end_time: "12:00",
        duration_minutes: 120,
      },
    }),
    prisma.session.create({
      data: {
        sessionCode: "ENG-S5-001-02",
        course_id: course2.id,
        date: new Date(now.getFullYear(), now.getMonth(), 13),
        start_time: "10:00",
        end_time: "12:00",
        duration_minutes: 120,
      },
    }),
  ]);
  console.log("✅ 已创建课程:", course2.courseCode, "含", sessions2.length, "个 Sessions");

  // 创建课程 3 - 陈老师的 M1 课（上月课程）
  const course3 = await prisma.course.create({
    data: {
      courseCode: "M1-S6-001",
      teacher_id: teacher1.id,
      grades: JSON.stringify(["S6"]),
    },
  });

  await prisma.session.create({
    data: {
      sessionCode: "M1-S6-001-01",
      course_id: course3.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      start_time: "16:00",
      end_time: "18:00",
      duration_minutes: 120,
    },
  });
  console.log("✅ 已创建课程:", course3.courseCode, "（上月课程）");

  // 创建 Enrollments
  await prisma.enrollment.create({
    data: {
      course_id: course1.id,
      student_id: students[0].id,
      joined_at: lastMonth,
    },
  });
  await prisma.enrollment.create({
    data: {
      course_id: course1.id,
      student_id: students[1].id,
      joined_at: lastMonth,
    },
  });
  await prisma.enrollment.create({
    data: {
      course_id: course1.id,
      student_id: students[2].id,
      joined_at: thisMonth,
    },
  });
  await prisma.enrollment.create({
    data: {
      course_id: course2.id,
      student_id: students[1].id,
      joined_at: lastMonth,
    },
  });
  await prisma.enrollment.create({
    data: {
      course_id: course2.id,
      student_id: students[3].id,
      joined_at: thisMonth,
    },
  });
  await prisma.enrollment.create({
    data: {
      course_id: course3.id,
      student_id: students[0].id,
      joined_at: lastMonth,
    },
  });

  console.log("✅ 已创建 Enrollments");

  // 创建点名记录
  if (sessions1[0].date < now) {
    await prisma.attendance.create({
      data: {
        session_id: sessions1[0].id,
        student_id: students[0].id,
        status: "present",
      },
    });
    await prisma.attendance.create({
      data: {
        session_id: sessions1[0].id,
        student_id: students[1].id,
        status: "present",
      },
    });
  }

  if (sessions1[1] && sessions1[1].date < now) {
    await prisma.attendance.create({
      data: {
        session_id: sessions1[1].id,
        student_id: students[0].id,
        status: "present",
      },
    });
    await prisma.attendance.create({
      data: {
        session_id: sessions1[1].id,
        student_id: students[1].id,
        status: "absent",
      },
    });
  }

  console.log("✅ 已创建 Attendance 记录");

  // 创建审计日志
  await prisma.auditLog.create({
    data: {
      user_id: admin.id,
      action: "create",
      entity_type: "teacher",
      entity_id: teacher1.id,
      details: JSON.stringify({ name: teacher1.name, teacherCode: teacher1.teacherCode }),
    },
  });

  console.log("✅ 已创建审计日志");

  console.log("🎉 播种完成！");
  console.log("\n📋 测试帐号:");
  console.log("  Admin: admin@tutoring.com / admin123");
  console.log("  老师1: chen@tutoring.com / teacher123");
  console.log("  老师2: li@tutoring.com / teacher123");
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
