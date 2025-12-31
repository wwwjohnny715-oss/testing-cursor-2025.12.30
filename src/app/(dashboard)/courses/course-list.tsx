"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  Eye,
  X,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { GRADE_OPTIONS } from "@/types";
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

interface Session {
  id: string;
  sessionCode: string;
  date: Date;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

interface Course {
  id: string;
  courseCode: string;
  grades: string | string[];
  is_deleted: boolean;
  created_at: Date;
  teacher: { id: string; teacherCode: string; name: string };
  sessions: Session[];
  enrollments: {
    student: { id: string; studentCode: string; name: string };
  }[];
  isOwner: boolean;
  studentCount: number;
}

interface Teacher {
  id: string;
  teacherCode: string;
  name: string;
}

interface Student {
  id: string;
  studentCode: string;
  name: string;
  grade: string;
}

interface SessionInput {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
}

// 生成小时选项 (00-23)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => 
  i.toString().padStart(2, "0")
);

// 生成分钟选项 (00, 15, 30, 45)
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

// 解析时间为小时和分钟
function parseTime(time: string): { hour: string; minute: string } {
  if (!time) return { hour: "", minute: "" };
  const [hour, minute] = time.split(":");
  return { hour: hour || "", minute: minute || "" };
}

// 合并小时和分钟为时间字符串
function formatTime(hour: string, minute: string): string {
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
}

interface CourseListProps {
  courses: Course[];
  teachers: Teacher[];
  students: Student[];
  isAdmin: boolean;
}

export function CourseList({
  courses,
  teachers,
  students,
  isAdmin,
}: CourseListProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  // Filter students based on search
  const filteredStudents = students.filter((student) => {
    if (!studentSearch) return true;
    const searchLower = studentSearch.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.studentCode.toLowerCase().includes(searchLower) ||
      student.grade.toLowerCase().includes(searchLower)
    );
  });

  // Form state
  const [formData, setFormData] = useState({
    courseCode: "",
    teacher_id: "",
    grades: [] as string[],
    sessions: [{ date: "", start_time: "", end_time: "" }] as SessionInput[],
  });

  const resetForm = () => {
    setFormData({
      courseCode: "",
      teacher_id: "",
      grades: [],
      sessions: [{ date: "", start_time: "", end_time: "" }],
    });
  };

  const handleGradeToggle = (grade: string) => {
    setFormData((prev) => ({
      ...prev,
      grades: prev.grades.includes(grade)
        ? prev.grades.filter((g) => g !== grade)
        : [...prev.grades, grade],
    }));
  };

  const addSession = () => {
    setFormData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, { date: "", start_time: "", end_time: "" }],
    }));
  };

  const removeSession = (index: number) => {
    if (formData.sessions.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== index),
    }));
  };

  const updateSession = (index: number, field: keyof SessionInput, value: string) => {
    setFormData((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleCreate = async () => {
    if (
      !formData.courseCode ||
      !formData.teacher_id ||
      formData.grades.length === 0 ||
      formData.sessions.some((s) => !s.date || !s.start_time || !s.end_time)
    ) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("courses.createSuccess"));
      setIsCreateOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCourse) return;
    if (
      formData.grades.length === 0 ||
      formData.sessions.some((s) => !s.date || !s.start_time || !s.end_time)
    ) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: formData.teacher_id,
          grades: formData.grades,
          sessions: formData.sessions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("courses.updateSuccess"));
      setIsEditOpen(false);
      setSelectedCourse(null);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("courses.deleteSuccess"));
      setIsDeleteOpen(false);
      setSelectedCourse(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse || selectedStudents.length === 0) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "加入失败");
      }

      toast.success(t("common.success"));
      setIsEnrollOpen(false);
      setSelectedCourse(null);
      setSelectedStudents([]);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入失败");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      courseCode: course.courseCode,
      teacher_id: course.teacher.id,
      grades: parseJsonArray(course.grades),
      sessions: course.sessions.map((s) => ({
        id: s.id,
        date: format(new Date(s.date), "yyyy-MM-dd"),
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    });
    setIsEditOpen(true);
  };

  const openEnroll = (course: Course) => {
    setSelectedCourse(course);
    const enrolledIds = course.enrollments.map((e) => e.student.id);
    setSelectedStudents(enrolledIds);
    setIsEnrollOpen(true);
  };

  const canEdit = (course: Course) => isAdmin || course.isOwner;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-end">
        {isAdmin && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("courses.addCourse")}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("courses.courseCode")}</TableHead>
              <TableHead>{t("courses.teacher")}</TableHead>
              <TableHead>{t("courses.grades")}</TableHead>
              <TableHead>{t("courses.sessions")}</TableHead>
              <TableHead>{t("courses.studentCount")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("courses.noCourses")}
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id} className="group">
                  <TableCell className="font-mono">{course.courseCode}</TableCell>
                  <TableCell>{course.teacher.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {parseJsonArray(course.grades).slice(0, 3).map((grade) => (
                        <Badge key={grade} variant="outline" className="text-xs">
                          {grade}
                        </Badge>
                      ))}
                      {parseJsonArray(course.grades).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{parseJsonArray(course.grades).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{course.sessions.length}</TableCell>
                  <TableCell>{course.studentCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEdit(course) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEnroll(course)}
                          title={t("courses.addStudents")}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/courses/${course.id}`}>
                        <Button variant="ghost" size="icon" title={t("courses.viewDetails")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canEdit(course) && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(course)}
                            title={t("common.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCourse(course);
                                setIsDeleteOpen(true);
                              }}
                              title={t("common.delete")}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t("courses.addCourse")}</DialogTitle>
            <DialogDescription>{t("courses.fillInfo")}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 180px)" }}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="courseCode">{t("courses.courseCode")} *</Label>
                <Input
                  id="courseCode"
                  placeholder="例如: MATH-S4-002"
                  value={formData.courseCode}
                  onChange={(e) =>
                    setFormData({ ...formData, courseCode: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacher">{t("courses.teacher")} *</Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, teacher_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("courses.selectTeacher")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.teacherCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("courses.grades")} *</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background/50">
                  {GRADE_OPTIONS.map((grade) => (
                    <Badge
                      key={grade}
                      variant={formData.grades.includes(grade) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleGradeToggle(grade)}
                    >
                      {grade}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label>Sessions *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSession}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("common.add")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.sessions.map((session, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">{t("courses.date")}</Label>
                          <Input
                            type="date"
                            value={session.date}
                            onChange={(e) =>
                              updateSession(index, "date", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("courses.startTime")}</Label>
                          <div className="flex gap-1">
                            <Select
                              value={parseTime(session.start_time).hour}
                              onValueChange={(hour) =>
                                updateSession(
                                  index,
                                  "start_time",
                                  formatTime(hour, parseTime(session.start_time).minute || "00")
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOUR_OPTIONS.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={parseTime(session.start_time).minute}
                              onValueChange={(minute) =>
                                updateSession(
                                  index,
                                  "start_time",
                                  formatTime(parseTime(session.start_time).hour || "00", minute)
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {MINUTE_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">{t("courses.endTime")}</Label>
                          <div className="flex gap-1">
                            <Select
                              value={parseTime(session.end_time).hour}
                              onValueChange={(hour) =>
                                updateSession(
                                  index,
                                  "end_time",
                                  formatTime(hour, parseTime(session.end_time).minute || "00")
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOUR_OPTIONS.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={parseTime(session.end_time).minute}
                              onValueChange={(minute) =>
                                updateSession(
                                  index,
                                  "end_time",
                                  formatTime(parseTime(session.end_time).hour || "00", minute)
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {MINUTE_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      {formData.sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSession(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t("courses.editCourse")}</DialogTitle>
            <DialogDescription>
              {t("courses.courseCode")}: {selectedCourse?.courseCode}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: "calc(90vh - 180px)" }}>
            <div className="grid gap-4 py-4">
              {isAdmin && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-teacher">{t("courses.teacher")} *</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, teacher_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.teacherCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>{t("courses.grades")} *</Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background/50">
                  {GRADE_OPTIONS.map((grade) => (
                    <Badge
                      key={grade}
                      variant={formData.grades.includes(grade) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleGradeToggle(grade)}
                    >
                      {grade}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between items-center">
                  <Label>Sessions *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSession}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t("common.add")}
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.sessions.map((session, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">{t("courses.date")}</Label>
                          <Input
                            type="date"
                            value={session.date}
                            onChange={(e) =>
                              updateSession(index, "date", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t("courses.startTime")}</Label>
                          <div className="flex gap-1">
                            <Select
                              value={parseTime(session.start_time).hour}
                              onValueChange={(hour) =>
                                updateSession(
                                  index,
                                  "start_time",
                                  formatTime(hour, parseTime(session.start_time).minute || "00")
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOUR_OPTIONS.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={parseTime(session.start_time).minute}
                              onValueChange={(minute) =>
                                updateSession(
                                  index,
                                  "start_time",
                                  formatTime(parseTime(session.start_time).hour || "00", minute)
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {MINUTE_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">{t("courses.endTime")}</Label>
                          <div className="flex gap-1">
                            <Select
                              value={parseTime(session.end_time).hour}
                              onValueChange={(hour) =>
                                updateSession(
                                  index,
                                  "end_time",
                                  formatTime(hour, parseTime(session.end_time).minute || "00")
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="HH" />
                              </SelectTrigger>
                              <SelectContent>
                                {HOUR_OPTIONS.map((h) => (
                                  <SelectItem key={h} value={h}>
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="flex items-center">:</span>
                            <Select
                              value={parseTime(session.end_time).minute}
                              onValueChange={(minute) =>
                                updateSession(
                                  index,
                                  "end_time",
                                  formatTime(parseTime(session.end_time).hour || "00", minute)
                                )
                              }
                            >
                              <SelectTrigger className="w-[70px]">
                                <SelectValue placeholder="MM" />
                              </SelectTrigger>
                              <SelectContent>
                                {MINUTE_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {m}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      {formData.sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSession(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedCourse(null);
                resetForm();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courses.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enroll Dialog */}
      <Dialog open={isEnrollOpen} onOpenChange={(open) => {
        setIsEnrollOpen(open);
        if (!open) setStudentSearch("");
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t("courses.addStudents")}</DialogTitle>
            <DialogDescription>
              {t("courses.courseCode")}: {selectedCourse?.courseCode}
            </DialogDescription>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="flex-shrink-0 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("students.searchPlaceholder")}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: "calc(80vh - 250px)" }}>
            <div className="space-y-2">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("students.noStudents")}
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background/50 hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedStudents((prev) =>
                        prev.includes(student.id)
                          ? prev.filter((id) => id !== student.id)
                          : [...prev, student.id]
                      );
                    }}
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => {}}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.studentCode} · {student.grade}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEnrollOpen(false);
                setSelectedCourse(null);
                setSelectedStudents([]);
                setStudentSearch("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEnroll} disabled={loading || selectedStudents.length === 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")} ({selectedStudents.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

