// 年级选项
export const GRADE_OPTIONS = [
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "retaker",
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
] as const;

export type Grade = (typeof GRADE_OPTIONS)[number];

// 科目選項
export const SUBJECT_OPTIONS = [
  "中文",
  "英文",
  "數學",
  "物理",
  "化學",
  "生物",
  "M1",
  "M2",
  "經濟",
  "會計",
  "歷史",
  "中史",
  "地理",
  "其他",
] as const;

export type Subject = (typeof SUBJECT_OPTIONS)[number];

// 用户角色
export type UserRole = "admin" | "teacher";

// 老师状态
export type TeacherStatus = "active" | "inactive";

// 点名状态
export type AttendanceStatusType = "present" | "absent";

// Session 表单数据
export interface SessionFormData {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
}

// 用于判断新生/旧生
export function isNewStudent(firstEnrolledAt: Date | null): boolean {
  if (!firstEnrolledAt) return false;
  const now = new Date();
  const enrolledMonth = firstEnrolledAt.getMonth();
  const enrolledYear = firstEnrolledAt.getFullYear();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return enrolledMonth === currentMonth && enrolledYear === currentYear;
}

// 计算课程时长（分钟）
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}

// 生成 sessionCode
export function generateSessionCode(courseCode: string, sessionNumber: number): string {
  const nn = sessionNumber.toString().padStart(2, "0");
  return `${courseCode}-${nn}`;
}

// 香港时区
export const HK_TIMEZONE = "Asia/Hong_Kong";

// 解析 JSON 数组（用于 SQLite）
export function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 序列化为 JSON 字符串
export function toJsonString(arr: string[]): string {
  return JSON.stringify(arr);
}

// 获取香港时间
export function getHKDate(date: Date = new Date()): Date {
  return new Date(date.toLocaleString("en-US", { timeZone: HK_TIMEZONE }));
}

// 获取月份范围（香港时间）
export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

