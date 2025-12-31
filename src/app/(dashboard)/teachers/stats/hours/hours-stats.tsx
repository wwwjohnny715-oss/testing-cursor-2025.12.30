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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { SUBJECT_OPTIONS } from "@/types";

interface Teacher {
  id: string;
  teacherCode: string;
  name: string;
  subjects: string | string[];
}

interface Session {
  id: string;
  date: Date;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  sessionCode: string;
  course: {
    teacher_id: string;
    teacher: {
      teacherCode: string;
      name: string;
      subjects: string | string[];
    };
  };
}

interface HoursStatsProps {
  teachers: Teacher[];
  sessions: Session[];
  isAdmin: boolean;
}

type ViewType = "teacher-month" | "teacher-total" | "subject-month" | "subject-total";

export function HoursStats({
  teachers,
  sessions,
  isAdmin,
}: HoursStatsProps) {
  const t = useTranslations();
  const now = new Date();
  const [viewType, setViewType] = useState<ViewType>("teacher-month");
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  // 生成月份选项（过去12个月）
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

    if (viewType === "teacher-month" || viewType === "teacher-total") {
      const isMonthly = viewType === "teacher-month";
      const teacherStats: Record<string, { teacherCode: string; name: string; minutes: number }> = {};

      for (const session of sessions) {
        const sessionDate = new Date(session.date);
        if (isMonthly && (sessionDate < monthStart || sessionDate > monthEnd)) continue;

        const teacherId = session.course.teacher_id;
        if (!teacherStats[teacherId]) {
          teacherStats[teacherId] = {
            teacherCode: session.course.teacher.teacherCode,
            name: session.course.teacher.name,
            minutes: 0,
          };
        }
        teacherStats[teacherId].minutes += session.duration_minutes;
      }

      return Object.entries(teacherStats)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.minutes - a.minutes);
    } else {
      const isMonthly = viewType === "subject-month";
      const subjectStats: Record<string, number> = {};

      for (const session of sessions) {
        const sessionDate = new Date(session.date);
        if (isMonthly && (sessionDate < monthStart || sessionDate > monthEnd)) continue;

        // 课程老师的所有科目都算进去（简化处理：取第一个科目）
        const subjects = session.course.teacher.subjects;
        for (const subject of subjects) {
          if (!subjectStats[subject]) {
            subjectStats[subject] = 0;
          }
          // 平均分配到各科目
          subjectStats[subject] += session.duration_minutes / subjects.length;
        }
      }

      return SUBJECT_OPTIONS
        .filter((subject) => subjectStats[subject])
        .map((subject) => ({
          subject,
          minutes: Math.round(subjectStats[subject] || 0),
        }))
        .sort((a, b) => b.minutes - a.minutes);
    }
  }, [sessions, viewType, selectedMonth]);

  // 导出 Excel
  const handleExport = async () => {
    if (!selectedTeacherId) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setExporting(true);
    try {
      const res = await fetch(
        `/api/export/hours?teacherId=${selectedTeacherId}&month=${selectedMonth}`
      );

      if (!res.ok) {
        throw new Error(t("common.operationFailed"));
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hours_${selectedTeacherId}_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(t("common.success"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setExporting(false);
    }
  };

  const isTeacherView = viewType.startsWith("teacher");

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t("stats.hours")}</CardTitle>
          <CardDescription>{t("stats.totalHours")}</CardDescription>
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
                  <SelectItem value="subject-total">{t("stats.bySubjectCumulative")}</SelectItem>
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
            {isAdmin && isTeacherView && (
              <>
                <div className="w-48">
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("courses.selectTeacher")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={!selectedTeacherId || exporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("stats.exportExcel")}
                </Button>
              </>
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
                <TableHead className="text-right">{t("stats.totalMinutes")}</TableHead>
                <TableHead className="text-right">{t("stats.totalHours")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isTeacherView ? 4 : 3}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("stats.noData")}
                  </TableCell>
                </TableRow>
              ) : isTeacherView ? (
                (stats as { id: string; teacherCode: string; name: string; minutes: number }[]).map(
                  (item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono">{item.teacherCode}</TableCell>
                      <TableCell className="text-right">{item.minutes}</TableCell>
                      <TableCell className="text-right">
                        {(item.minutes / 60).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  )
                )
              ) : (
                (stats as { subject: string; minutes: number }[]).map((item) => (
                  <TableRow key={item.subject}>
                    <TableCell className="font-medium">{item.subject}</TableCell>
                    <TableCell className="text-right">{item.minutes}</TableCell>
                    <TableCell className="text-right">
                      {(item.minutes / 60).toFixed(1)}
                    </TableCell>
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

