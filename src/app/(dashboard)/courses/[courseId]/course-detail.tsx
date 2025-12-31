"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, XCircle, Loader2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

// 辅助函数：解析 JSON 数组（SQLite 将数组存储为 JSON 字符串）
function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface Attendance {
  id: string;
  status: string;
  student: { id: string; studentCode: string; name: string };
}

interface Session {
  id: string;
  sessionCode: string;
  date: Date;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  attendances: Attendance[];
}

interface Course {
  id: string;
  courseCode: string;
  grades: string | string[];
  is_deleted: boolean;
  teacher: { id: string; teacherCode: string; name: string };
  sessions: Session[];
  enrollments: {
    is_active: boolean;
    student: { id: string; studentCode: string; name: string; grade: string };
  }[];
}

interface CourseDetailProps {
  course: Course;
  pastSessions: Session[];
  canEdit: boolean;
  isAdmin: boolean;
}

export function CourseDetail({ course, pastSessions, canEdit }: CourseDetailProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
    studentCode: string;
  } | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<"present" | "absent">("present");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // 获取活跃的学生列表
  const activeStudents = course.enrollments
    .filter((e) => e.is_active)
    .map((e) => e.student);

  // 获取学生的点名历史
  const getStudentAttendanceHistory = (studentId: string) => {
    const history: {
      session: Session;
      status: string | null;
    }[] = [];

    for (const session of course.sessions) {
      const attendance = session.attendances.find(
        (a) => a.student.id === studentId
      );
      history.push({
        session,
        status: attendance?.status || null,
      });
    }

    return history;
  };

  const handleAttendance = async () => {
    if (!selectedStudent || !selectedSessionId) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: selectedSessionId,
          student_id: selectedStudent.id,
          status: attendanceStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("attendance.markSuccess"));
      setIsAttendanceOpen(false);
      setSelectedStudent(null);
      setSelectedSessionId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openAttendance = (student: { id: string; name: string; studentCode: string }) => {
    setSelectedStudent(student);
    setAttendanceStatus("present");
    setSelectedSessionId("");
    setIsAttendanceOpen(true);
  };

  const openHistory = (student: { id: string; name: string; studentCode: string }) => {
    setSelectedStudent(student);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{course.courseCode}</h1>
          <p className="text-muted-foreground">
            {t("courses.teacher")}: {course.teacher.name} ({course.teacher.teacherCode})
          </p>
        </div>
        {course.is_deleted && (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            {t("courses.deleted")}
          </Badge>
        )}
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t("courses.courseInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{t("courses.grades")}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {parseJsonArray(course.grades).map((grade) => (
                  <Badge key={grade} variant="outline">
                    {grade}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("courses.sessions")}</p>
              <p className="font-medium">{course.sessions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("courses.sessions")}</CardTitle>
          <CardDescription>{t("courses.viewDetails")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Code</TableHead>
                <TableHead>{t("courses.date")}</TableHead>
                <TableHead>{t("courses.startTime")}</TableHead>
                <TableHead>{t("courses.duration")}</TableHead>
                <TableHead>{t("attendance.title")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {course.sessions.map((session) => {
                const isPast = new Date(session.date) < new Date();
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono">{session.sessionCode}</TableCell>
                    <TableCell>{format(new Date(session.date), "yyyy/MM/dd")}</TableCell>
                    <TableCell>
                      {session.start_time} - {session.end_time}
                    </TableCell>
                    <TableCell>{session.duration_minutes} 分钟</TableCell>
                    <TableCell>
                      {isPast ? (
                        <span>
                          {session.attendances.length} / {activeStudents.length}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未开始</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Students */}
      <Card>
        <CardHeader>
          <CardTitle>{t("courses.enrolledStudents")}</CardTitle>
          <CardDescription>{t("courses.activeStudents")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("students.studentCode")}</TableHead>
                <TableHead>{t("students.name")}</TableHead>
                <TableHead>{t("students.grade")}</TableHead>
                <TableHead>{t("attendance.title")}</TableHead>
                {canEdit && <TableHead className="text-right">{t("common.actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStudents.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 5 : 4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("students.noStudents")}
                  </TableCell>
                </TableRow>
              ) : (
                activeStudents.map((student) => {
                  const history = getStudentAttendanceHistory(student.id);
                  const presentCount = history.filter((h) => h.status === "present").length;
                  const absentCount = history.filter((h) => h.status === "absent").length;
                  const totalSessions = pastSessions.length;

                  return (
                    <TableRow key={student.id} className="group">
                      <TableCell className="font-mono">{student.studentCode}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.grade}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {presentCount}
                          </span>
                          <span className="text-red-400 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {absentCount}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            / {totalSessions}
                          </span>
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openHistory(student)}
                            >
                              历史
                            </Button>
                            {pastSessions.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAttendance(student)}
                              >
                                <ClipboardList className="h-4 w-4 mr-1" />
                                {t("attendance.markAttendance")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Attendance Dialog */}
      <Dialog open={isAttendanceOpen} onOpenChange={setIsAttendanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("attendance.markAttendance")}</DialogTitle>
            <DialogDescription>
              {t("students.name")}: {selectedStudent?.name} ({selectedStudent?.studentCode})
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t("attendance.selectStatus")}</Label>
              <Select
                value={attendanceStatus}
                onValueChange={(value: "present" | "absent") =>
                  setAttendanceStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      {t("attendance.present")}
                    </span>
                  </SelectItem>
                  <SelectItem value="absent">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      {t("attendance.absent")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t("attendance.selectSession")}</Label>
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("attendance.selectSession")} />
                </SelectTrigger>
                <SelectContent>
                  {pastSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.sessionCode} ({format(new Date(session.date), "yyyy/MM/dd")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAttendanceOpen(false);
                setSelectedStudent(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAttendance} disabled={loading || !selectedSessionId}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("attendance.attendanceHistory")}</DialogTitle>
            <DialogDescription>
              {t("students.name")}: {selectedStudent?.name} ({selectedStudent?.studentCode})
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStudent &&
                  getStudentAttendanceHistory(selectedStudent.id).map(
                    ({ session, status }) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-sm">
                          {session.sessionCode}
                        </TableCell>
                        <TableCell>
                          {format(new Date(session.date), "yyyy/MM/dd")}
                        </TableCell>
                        <TableCell>
                          {status === "present" ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              {t("attendance.present")}
                            </Badge>
                          ) : status === "absent" ? (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              {t("attendance.absent")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              -
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsHistoryOpen(false);
                setSelectedStudent(null);
              }}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

