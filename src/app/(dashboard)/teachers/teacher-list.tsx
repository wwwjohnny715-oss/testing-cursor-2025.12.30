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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Loader2, Calendar, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { SUBJECT_OPTIONS } from "@/types";
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

interface Teacher {
  id: string;
  teacherCode: string;
  name: string;
  subjects: string | string[];
  hire_date: Date;
  status: string;
  created_at: Date;
  user: { email: string } | null;
  courses: { id: string; courseCode: string }[];
}

interface TeacherListProps {
  teachers: Teacher[];
}

export function TeacherList({ teachers }: TeacherListProps) {
  const router = useRouter();
  const t = useTranslations();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    teacherCode: "",
    name: "",
    subjects: [] as string[],
    hire_date: "",
    email: "",
    password: "",
    status: "active" as string,
  });

  const resetForm = () => {
    setFormData({
      teacherCode: "",
      name: "",
      subjects: [],
      hire_date: "",
      email: "",
      password: "",
      status: "active",
    });
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const handleCreate = async () => {
    if (
      !formData.teacherCode ||
      !formData.name ||
      formData.subjects.length === 0 ||
      !formData.hire_date ||
      !formData.email ||
      !formData.password
    ) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("teachers.createSuccess"));
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
    if (!selectedTeacher) return;
    if (!formData.name || formData.subjects.length === 0) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          subjects: formData.subjects,
          status: formData.status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("teachers.updateSuccess"));
      setIsEditOpen(false);
      setSelectedTeacher(null);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      teacherCode: teacher.teacherCode,
      name: teacher.name,
      subjects: parseJsonArray(teacher.subjects),
      hire_date: format(new Date(teacher.hire_date), "yyyy-MM-dd"),
      email: teacher.user?.email || "",
      password: "",
      status: teacher.status,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          <Link href="/teachers/timetable">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              {t("nav.timetable")}
            </Button>
          </Link>
          <Link href="/teachers/stats/hours">
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("nav.stats")}
            </Button>
          </Link>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("teachers.addTeacher")}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("teachers.teacherCode")}</TableHead>
              <TableHead>{t("teachers.name")}</TableHead>
              <TableHead>{t("teachers.email")}</TableHead>
              <TableHead>{t("teachers.subjects")}</TableHead>
              <TableHead>{t("teachers.hireDate")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("teachers.courses")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("teachers.noTeachers")}
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <TableRow key={teacher.id} className="group">
                  <TableCell className="font-mono">{teacher.teacherCode}</TableCell>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {teacher.user?.email || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {parseJsonArray(teacher.subjects).slice(0, 3).map((subject) => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {parseJsonArray(teacher.subjects).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{parseJsonArray(teacher.subjects).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(teacher.hire_date), "yyyy/MM/dd")}
                  </TableCell>
                  <TableCell>
                    {teacher.status === "active" ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        {t("teachers.active")}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        {t("teachers.inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{teacher.courses.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(teacher)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teachers.addTeacher")}</DialogTitle>
            <DialogDescription>{t("teachers.fillInfo")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="teacherCode">{t("teachers.teacherCode")} *</Label>
              <Input
                id="teacherCode"
                placeholder="例如: T003"
                value={formData.teacherCode}
                onChange={(e) =>
                  setFormData({ ...formData, teacherCode: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("teachers.name")} *</Label>
              <Input
                id="name"
                placeholder={t("teachers.name")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("teachers.subjects")} *</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background/50">
                {SUBJECT_OPTIONS.map((subject) => (
                  <Badge
                    key={subject}
                    variant={formData.subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleSubjectToggle(subject)}
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hire_date">{t("teachers.hireDate")} *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) =>
                  setFormData({ ...formData, hire_date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("teachers.email")} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="teacher@tutoring.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("teachers.password")} *</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少 6 位"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("teachers.editTeacher")}</DialogTitle>
            <DialogDescription>
              {t("teachers.teacherCode")}: {selectedTeacher?.teacherCode}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("teachers.name")} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("teachers.subjects")} *</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background/50">
                {SUBJECT_OPTIONS.map((subject) => (
                  <Badge
                    key={subject}
                    variant={formData.subjects.includes(subject) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleSubjectToggle(subject)}
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">{t("common.status")}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("teachers.active")}</SelectItem>
                  <SelectItem value="inactive">{t("teachers.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTeacher(null);
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
    </div>
  );
}

