"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SUBJECT_OPTIONS } from "@/types";

interface Course {
  id: string;
  courseCode: string;
  teacher: {
    id: string;
    teacherCode: string;
    name: string;
    subjects: string | string[];
  };
  sessions: { date: Date }[];
  enrollments: {
    is_active: boolean;
    student: { studentCode: string };
  }[];
}

interface EnrollmentStatsProps {
  courses: Course[];
}

type ViewType = "teacher-month" | "teacher-total" | "subject-month" | "subject-total";

export function EnrollmentStats({ courses }: EnrollmentStatsProps) {
  const t = useTranslations();
  const now = new Date();
  const [viewType, setViewType] = useState<ViewType>("teacher-month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );

  // 生成月份选项
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      options.push({ value, label });
    }
    return options;
  }, [now]);

  // 计算统计数据
  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // 筛选该月有 session 的课程
    const filterCoursesByMonth = (monthly: boolean) => {
      if (!monthly) return courses;
      return courses.filter((course) =>
        course.sessions.some((s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= monthStart && sessionDate <= monthEnd;
        })
      );
    };

    if (viewType === "teacher-month" || viewType === "teacher-total") {
      const isMonthly = viewType === "teacher-month";
      const filteredCourses = filterCoursesByMonth(isMonthly);
      const teacherStats: Record<string, { teacherCode: string; name: string; studentCodes: Set<string> }> = {};

      for (const course of filteredCourses) {
        const teacherId = course.teacher.id;
        if (!teacherStats[teacherId]) {
          teacherStats[teacherId] = {
            teacherCode: course.teacher.teacherCode,
            name: course.teacher.name,
            studentCodes: new Set(),
          };
        }
        // 统计所有报名学生（包括已移除的，因为历史数据要保留）
        for (const enrollment of course.enrollments) {
          teacherStats[teacherId].studentCodes.add(enrollment.student.studentCode);
        }
      }

      return Object.entries(teacherStats)
        .map(([id, data]) => ({
          id,
          teacherCode: data.teacherCode,
          name: data.name,
          count: data.studentCodes.size,
        }))
        .sort((a, b) => b.count - a.count);
    } else {
      const isMonthly = viewType === "subject-month";
      const filteredCourses = filterCoursesByMonth(isMonthly);
      const subjectStats: Record<string, Set<string>> = {};

      for (const course of filteredCourses) {
        const subjects = course.teacher.subjects;
        for (const subject of subjects) {
          if (!subjectStats[subject]) {
            subjectStats[subject] = new Set();
          }
          for (const enrollment of course.enrollments) {
            subjectStats[subject].add(enrollment.student.studentCode);
          }
        }
      }

      return SUBJECT_OPTIONS
        .filter((subject) => subjectStats[subject] && subjectStats[subject].size > 0)
        .map((subject) => ({
          subject,
          count: subjectStats[subject]?.size || 0,
        }))
        .sort((a, b) => b.count - a.count);
    }
  }, [courses, viewType, selectedMonth]);

  const isTeacherView = viewType.startsWith("teacher");

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stats.enrollments")}</CardTitle>
          <CardDescription>{t("stats.totalStudents")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={viewType} onValueChange={(v: ViewType) => setViewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher-month">{t("stats.byTeacherMonthly")}</SelectItem>
                  <SelectItem value="teacher-total">{t("stats.byTeacherCumulative")}</SelectItem>
                  <SelectItem value="subject-month">{t("stats.bySubjectMonthly")}</SelectItem>
                  <SelectItem value="subject-total">按科目（累积）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(viewType === "teacher-month" || viewType === "subject-month") && (
              <div className="w-40">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isTeacherView ? t("auth.teacher") : t("teachers.subjects")}</TableHead>
                {isTeacherView && <TableHead>{t("teachers.teacherCode")}</TableHead>}
                <TableHead className="text-right">{t("courses.studentCount")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isTeacherView ? 3 : 2}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("stats.noData")}
                  </TableCell>
                </TableRow>
              ) : isTeacherView ? (
                (stats as { id: string; teacherCode: string; name: string; count: number }[]).map(
                  (item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono">{item.teacherCode}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                    </TableRow>
                  )
                )
              ) : (
                (stats as { subject: string; count: number }[]).map((item) => (
                  <TableRow key={item.subject}>
                    <TableCell className="font-medium">{item.subject}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

