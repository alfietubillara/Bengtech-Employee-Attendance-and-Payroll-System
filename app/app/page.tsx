import { redirect } from "next/navigation";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { CameraPunch } from "@/components/camera-punch";
import { createClient } from "@/lib/supabase/server";
import { displayAttendanceStatus } from "@/lib/attendance";
import { formatDateTime, toDateInput } from "@/lib/utils";
import type { AttendanceRecord, Branch, Profile } from "@/lib/types";

export default async function EmployeeHome() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile) redirect("/login");

  const today = toDateInput();
  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("attendance_date", today)
    .maybeSingle<AttendanceRecord>();

  const { data: branch } = profile.branch_id
    ? await supabase.from("branches").select("*").eq("id", profile.branch_id).single<Branch>()
    : { data: null };

  const canTimeIn = profile.status === "Active" && !attendance?.time_in_at;
  const canTimeOut = profile.status === "Active" && Boolean(attendance?.time_in_at) && !attendance?.time_out_at;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="rounded-lg bg-beng-green p-5 text-white shadow-soft">
        <p className="text-sm font-semibold text-white/80">Today&apos;s Status</p>
        <h1 className="mt-2 text-3xl font-bold">{displayAttendanceStatus(attendance)}</h1>
        <div className="mt-4 grid gap-2 text-sm text-white/90">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} />
            {today}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            {branch?.name || "No branch assigned"}
          </div>
        </div>
      </section>

      <CameraPunch employeeId={profile.id} canTimeIn={canTimeIn} canTimeOut={canTimeOut} />

      <section className="panel p-4">
        <h2 className="mb-3 flex items-center gap-2 font-bold">
          <Clock3 size={18} />
          Attendance Details
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="label">Time In</div>
            <div className="mt-1 font-semibold">{formatDateTime(attendance?.time_in_at || null)}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="label">Time Out</div>
            <div className="mt-1 font-semibold">{formatDateTime(attendance?.time_out_at || null)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
