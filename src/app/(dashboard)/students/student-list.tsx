"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { GRADE_OPTIONS } from "@/types";
import { format } from "date-fns";

interface Student {
  id: string;
  studentCode: string;
  name: string;
  phone: string;
  grade: string;
  first_enrolled_at: Date | null;
  is_deleted: boolean;
  created_at: Date;
  isNew: boolean;
  activeCourses: string[];
}

interface StudentListProps {
  students: Student[];
  isAdmin: boolean;
  initialSearch?: string;
  initialNewOnly: boolean;
}

export function StudentList({
  students,
  isAdmin,
  initialSearch = "",
  initialNewOnly,
}: StudentListProps) {
  const router = useRouter();
  const t = useTranslations();
  const [search, setSearch] = useState(initialSearch);
  const [newOnly, setNewOnly] = useState(initialNewOnly);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<"soft" | "hard">("soft");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    studentCode: "",
    name: "",
    phone: "",
    grade: "",
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (newOnly) params.set("newOnly", "true");
    router.push(`/students?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleNewOnlyChange = (checked: boolean) => {
    setNewOnly(checked);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (checked) params.set("newOnly", "true");
    router.push(`/students?${params.toString()}`);
  };

  const resetForm = () => {
    setFormData({
      studentCode: "",
      name: "",
      phone: "",
      grade: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.phone || !formData.grade || !formData.studentCode) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("students.createSuccess"));
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
    if (!selectedStudent) return;
    if (!formData.name || !formData.phone || !formData.grade) {
      toast.error(t("common.fillRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          grade: formData.grade,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.operationFailed"));
      }

      toast.success(t("students.updateSuccess"));
      setIsEditOpen(false);
      setSelectedStudent(null);
      resetForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: "soft" | "hard") => {
    if (!selectedStudent) return;

    setLoading(true);
    try {
      const url = type === "hard" 
        ? `/api/students/${selectedStudent.id}?hard=true`
        : `/api/students/${selectedStudent.id}`;
      
      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("common.deleteFailed"));
      }

      toast.success(t("students.deleteSuccess"));
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      setDeleteType("soft");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      studentCode: student.studentCode,
      name: student.name,
      phone: student.phone,
      grade: student.grade,
    });
    setIsEditOpen(true);
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setDeleteType("soft");
    setIsDeleteOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("students.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button variant="secondary" onClick={handleSearch}>
            {t("common.search")}
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="newOnly"
              checked={newOnly}
              onCheckedChange={handleNewOnlyChange}
            />
            <Label htmlFor="newOnly" className="text-sm cursor-pointer">
              {t("students.filterNewStudents")}
            </Label>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("students.addStudent")}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("students.studentCode")}</TableHead>
              <TableHead>{t("students.name")}</TableHead>
              <TableHead>{t("students.phone")}</TableHead>
              <TableHead>{t("students.grade")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("students.enrolledCourses")}</TableHead>
              <TableHead>{t("students.createdAt")}</TableHead>
              {isAdmin && <TableHead className="text-right">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 8 : 7}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("students.noStudents")}
                </TableCell>
              </TableRow>
            ) : (
              students.map((student) => (
                <TableRow key={student.id} className="group">
                  <TableCell className="font-mono">{student.studentCode}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.grade}</Badge>
                  </TableCell>
                  <TableCell>
                    {student.isNew ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        {t("students.isNew")}
                      </Badge>
                    ) : student.first_enrolled_at ? (
                      <Badge variant="secondary">-</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        -
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.activeCourses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {student.activeCourses.slice(0, 2).map((code) => (
                          <Badge key={code} variant="outline" className="text-xs">
                            {code}
                          </Badge>
                        ))}
                        {student.activeCourses.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{student.activeCourses.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(student.created_at), "yyyy/MM/dd")}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(student)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(student)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("students.addStudent")}</DialogTitle>
            <DialogDescription>{t("students.fillInfo")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="studentCode">{t("students.studentCode")} *</Label>
              <Input
                id="studentCode"
                placeholder="S006"
                value={formData.studentCode}
                onChange={(e) =>
                  setFormData({ ...formData, studentCode: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("students.name")} *</Label>
              <Input
                id="name"
                placeholder={t("students.namePlaceholder")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("students.phone")} *</Label>
              <Input
                id="phone"
                placeholder="98765432"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grade">{t("students.grade")} *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("students.grade")} />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("students.editStudent")}</DialogTitle>
            <DialogDescription>
              {t("students.studentCode")}: {selectedStudent?.studentCode}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("students.name")} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">{t("students.phone")} *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-grade">{t("students.grade")} *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) =>
                  setFormData({ ...formData, grade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      {grade}
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
                setIsEditOpen(false);
                setSelectedStudent(null);
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
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
            <DialogDescription>
              {t("students.deleteConfirm", { name: selectedStudent?.name || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {/* Soft Delete Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "soft"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => setDeleteType("soft")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    deleteType === "soft"
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  }`}
                />
                <div>
                  <p className="font-medium">{t("students.softDelete")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("students.softDeleteDesc")}
                  </p>
                </div>
              </div>
            </div>

            {/* Hard Delete Option */}
            <div
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                deleteType === "hard"
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:border-muted-foreground"
              }`}
              onClick={() => setDeleteType("hard")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    deleteType === "hard"
                      ? "border-destructive bg-destructive"
                      : "border-muted-foreground"
                  }`}
                />
                <div>
                  <p className="font-medium text-destructive">{t("students.hardDelete")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("students.hardDeleteDesc")}
                  </p>
                  <p className="text-sm text-destructive mt-1">
                    {t("students.hardDeleteWarning")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setSelectedStudent(null);
                setDeleteType("soft");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={deleteType === "hard" ? "destructive" : "default"}
              onClick={() => handleDelete(deleteType)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {deleteType === "hard" ? t("students.hardDelete") : t("students.softDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
