import { ABSENT_CUTOFF_TIME, LATE_GRACE_TIME } from "@/lib/constants";
import type { AttendanceRecord, AttendanceStatus, DutyPeriod } from "@/lib/types";

function phTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);
  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value || 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value || 0)
  };
}

export function isAfterTime(date: Date, hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const current = phTimeParts(date);
  return current.hour * 60 + current.minute > hours * 60 + minutes;
}

export function statusForTimeIn(serverDate: Date): AttendanceStatus {
  return isAfterTime(serverDate, LATE_GRACE_TIME) ? "Late" : "Present";
}

export function statusForDutyPeriod(dutyPeriod: DutyPeriod, fallback: AttendanceStatus): AttendanceStatus {
  if (dutyPeriod === "morning_half") return "Half Day Morning";
  if (dutyPeriod === "afternoon_half") return "Half Day Afternoon";
  return fallback;
}

export function shouldMarkAbsent(serverDate: Date) {
  return isAfterTime(serverDate, ABSENT_CUTOFF_TIME);
}

export function displayAttendanceStatus(record?: Pick<AttendanceRecord, "status" | "time_in_at" | "time_out_at"> | null) {
  if (!record) return "No Time In Yet";
  if (record.status === "Present" || record.status === "Late") {
    return record.time_in_at && !record.time_out_at ? "Timed In" : record.status;
  }
  return record.status;
}
