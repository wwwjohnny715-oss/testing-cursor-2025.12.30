"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";

interface Session {
  id: string;
  courseId: string;
  courseCode: string;
  teacherId: string;
  teacherName: string;
  date: Date;
  startTime: string;
  endTime: string;
  studentCount: number;
}

interface TimetableCalendarProps {
  sessions: Session[];
  isAdmin: boolean;
  currentTeacherId?: string | null;
}

export function TimetableCalendar({
  sessions,
  isAdmin,
  currentTeacherId,
}: TimetableCalendarProps) {
  const router = useRouter();

  const events = useMemo(() => {
    return sessions.map((session) => {
      const dateStr = new Date(session.date).toISOString().split("T")[0];
      const isOwner = isAdmin || session.teacherId === currentTeacherId;

      return {
        id: session.id,
        title: `${session.courseCode} (${session.studentCount}人)`,
        start: `${dateStr}T${session.startTime}`,
        end: `${dateStr}T${session.endTime}`,
        extendedProps: {
          courseId: session.courseId,
          teacherName: session.teacherName,
          isOwner,
        },
        backgroundColor: isOwner ? "oklch(0.75 0.18 195)" : "oklch(0.40 0.10 260)",
        borderColor: isOwner ? "oklch(0.75 0.18 195)" : "oklch(0.40 0.10 260)",
        textColor: isOwner ? "oklch(0.12 0.02 260)" : "oklch(0.90 0.01 260)",
      };
    });
  }, [sessions, isAdmin, currentTeacherId]);

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const courseId = info.event.extendedProps.courseId;
      router.push(`/courses/${courseId}`);
    },
    [router]
  );

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        eventClick={handleEventClick}
        height="auto"
        locale="zh-cn"
        buttonText={{
          today: "今天",
          month: "月",
          week: "周",
          day: "日",
        }}
        allDaySlot={false}
        slotMinTime="08:00:00"
        slotMaxTime="22:00:00"
        weekends={true}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
        slotLabelFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
      />
    </div>
  );
}





