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
import { Badge } from "@/components/ui/badge";
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
    joined_at: Date;
    student: { studentCode: string; first_enrolled_at: Date | null };
  }[];
}

interface RetentionStatsProps {
  courses: Course[];
}

type ViewType = "teacher" | "subject";

export function RetentionStats({ courses }: RetentionStatsProps) {
  const t = useTranslations();
  const now = new Date();
  const [viewType, setViewType] = useState<ViewType>("teacher");
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

  // 计算续费率
  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    
    // 当月范围
    const currentMonthStart = new Date(year, month - 1, 1);
    const currentMonthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // 上月范围
    const lastMonthStart = new Date(year, month - 2, 1);
    const lastMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);

    // 筛选某月有 session 的课程
    const getCoursesInMonth = (start: Date, end: Date) => {
      return courses.filter((course) =>
        course.sessions.some((s) => {
          const sessionDate = new Date(s.date);
          return sessionDate >= start && sessionDate <= end;
        })
      );
    };

    const currentMonthCourses = getCoursesInMonth(currentMonthStart, currentMonthEnd);
    const lastMonthCourses = getCoursesInMonth(lastMonthStart, lastMonthEnd);

    if (viewType === "teacher") {
      // 按老师统计
      const teacherData: Record<string, {
        teacherCode: string;
        name: string;
        lastMonthStudents: Set<string>;
        currentMonthOldStudents: Set<string>;
      }> = {};

      // 收集上月学生
      for (const course of lastMonthCourses) {
        const teacherId = course.teacher.id;
        if (!teacherData[teacherId]) {
          teacherData[teacherId] = {
            teacherCode: course.teacher.teacherCode,
            name: course.teacher.name,
            lastMonthStudents: new Set(),
            currentMonthOldStudents: new Set(),
          };
        }
        for (const enrollment of course.enrollments) {
          teacherData[teacherId].lastMonthStudents.add(enrollment.student.studentCode);
        }
      }

      // 收集本月旧学生（在上月已存在的）
      for (const course of currentMonthCourses) {
        const teacherId = course.teacher.id;
        if (!teacherData[teacherId]) continue; // 上月没有这个老师的课

        for (const enrollment of course.enrollments) {
          const studentCode = enrollment.student.studentCode;
          const firstEnrolled = enrollment.student.first_enrolled_at;
          
          // 旧学生定义：first_enrolled_at 在上月之前或上月内
          if (firstEnrolled && new Date(firstEnrolled) <= lastMonthEnd) {
            // 且在上月该老师的课程中
            if (teacherData[teacherId].lastMonthStudents.has(studentCode)) {
              teacherData[teacherId].currentMonthOldStudents.add(studentCode);
            }
          }
        }
      }

      return Object.entries(teacherData)
        .map(([id, data]) => {
          const lastCount = data.lastMonthStudents.size;
          const currentOldCount = data.currentMonthOldStudents.size;
          const rate = lastCount > 0 ? (currentOldCount / lastCount) * 100 : 0;
          return {
            id,
            teacherCode: data.teacherCode,
            name: data.name,
            lastMonthCount: lastCount,
            currentOldCount,
            rate,
          };
        })
        .filter((item) => item.lastMonthCount > 0)
        .sort((a, b) => b.rate - a.rate);
    } else {
      // 按科目统计
      const subjectData: Record<string, {
        lastMonthStudents: Set<string>;
        currentMonthOldStudents: Set<string>;
      }> = {};

      // 收集上月学生（按科目）
      for (const course of lastMonthCourses) {
        for (const subject of course.teacher.subjects) {
          if (!subjectData[subject]) {
            subjectData[subject] = {
              lastMonthStudents: new Set(),
              currentMonthOldStudents: new Set(),
            };
          }
          for (const enrollment of course.enrollments) {
            subjectData[subject].lastMonthStudents.add(enrollment.student.studentCode);
          }
        }
      }

      // 收集本月旧学生（按科目）
      for (const course of currentMonthCourses) {
        for (const subject of course.teacher.subjects) {
          if (!subjectData[subject]) continue;

          for (const enrollment of course.enrollments) {
            const studentCode = enrollment.student.studentCode;
            const firstEnrolled = enrollment.student.first_enrolled_at;
            
            if (firstEnrolled && new Date(firstEnrolled) <= lastMonthEnd) {
              if (subjectData[subject].lastMonthStudents.has(studentCode)) {
                subjectData[subject].currentMonthOldStudents.add(studentCode);
              }
            }
          }
        }
      }

      return SUBJECT_OPTIONS
        .filter((subject) => subjectData[subject] && subjectData[subject].lastMonthStudents.size > 0)
        .map((subject) => {
          const data = subjectData[subject];
          const lastCount = data.lastMonthStudents.size;
          const currentOldCount = data.currentMonthOldStudents.size;
          const rate = lastCount > 0 ? (currentOldCount / lastCount) * 100 : 0;
          return {
            subject,
            lastMonthCount: lastCount,
            currentOldCount,
            rate,
          };
        })
        .sort((a, b) => b.rate - a.rate);
    }
  }, [courses, viewType, selectedMonth]);

  const isTeacherView = viewType === "teacher";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stats.retention")}</CardTitle>
          <CardDescription>
            {t("stats.retentionRate")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={viewType} onValueChange={(v: ViewType) => setViewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">{t("stats.byTeacher")}</SelectItem>
                  <SelectItem value="subject">{t("stats.bySubject")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                <TableHead className="text-right">{t("stats.totalStudents")}</TableHead>
                <TableHead className="text-right">{t("stats.monthly")}</TableHead>
                <TableHead className="text-right">{t("stats.retentionRate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isTeacherView ? 5 : 4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("stats.noData")}
                  </TableCell>
                </TableRow>
              ) : isTeacherView ? (
                (stats as { id: string; teacherCode: string; name: string; lastMonthCount: number; currentOldCount: number; rate: number }[]).map(
                  (item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono">{item.teacherCode}</TableCell>
                      <TableCell className="text-right">{item.lastMonthCount}</TableCell>
                      <TableCell className="text-right">{item.currentOldCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            item.rate >= 80
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : item.rate >= 50
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {item.rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                )
              ) : (
                (stats as { subject: string; lastMonthCount: number; currentOldCount: number; rate: number }[]).map(
                  (item) => (
                    <TableRow key={item.subject}>
                      <TableCell className="font-medium">{item.subject}</TableCell>
                      <TableCell className="text-right">{item.lastMonthCount}</TableCell>
                      <TableCell className="text-right">{item.currentOldCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          className={
                            item.rate >= 80
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : item.rate >= 50
                              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                          }
                        >
                          {item.rate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

