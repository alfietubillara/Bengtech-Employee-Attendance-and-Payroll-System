import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { createCorrectionRequest, createLeaveRequest } from "./actions";

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile || profile.role !== "employee") redirect("/app");

  const [{ data: leaveData }, { data: correctionData }] = await Promise.all([
    supabase.from("leave_requests").select("*").eq("employee_id", profile.id).order("created_at", { ascending: false }),
    supabase.from("attendance_correction_requests").select("*").eq("employee_id", profile.id).order("created_at", { ascending: false })
  ]);
  const leaves = leaveData ?? [];
  const corrections = correctionData ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="text-sm text-slate-500">Request leave or attendance correction for admin approval.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form action={createLeaveRequest} className="panel grid gap-3 p-4">
          <h2 className="font-bold">Leave Request</h2>
          <select className="field" name="leave_type" required>
            <option>Sick Leave</option>
            <option>Emergency Leave</option>
            <option>Vacation Leave</option>
            <option>Unpaid Leave</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="field" type="date" name="start_date" required />
            <input className="field" type="date" name="end_date" required />
          </div>
          <textarea className="field min-h-24" name="reason" placeholder="Reason" required />
          <button className="btn-primary" type="submit">Submit Leave</button>
        </form>

        <form action={createCorrectionRequest} className="panel grid gap-3 p-4">
          <h2 className="font-bold">Attendance Correction</h2>
          <input className="field" type="date" name="attendance_date" required />
          <div className="grid grid-cols-2 gap-3">
            <input className="field" type="time" name="requested_time_in" />
            <input className="field" type="time" name="requested_time_out" />
          </div>
          <textarea className="field min-h-24" name="reason" placeholder="Reason" required />
          <button className="btn-primary" type="submit">Submit Correction</button>
        </form>
      </div>

      <RequestList title="My Leave Requests" rows={leaves} fields={["leave_type", "start_date", "end_date"]} />
      <RequestList title="My Correction Requests" rows={corrections} fields={["attendance_date", "requested_time_in", "requested_time_out"]} />
    </div>
  );
}

function RequestList({ title, rows, fields }: { title: string; rows: any[]; fields: string[] }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3 font-bold">{title}</div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-1 p-4 text-sm md:grid-cols-4">
            <div className="font-semibold">{row.status}</div>
            <div>{fields.map((field) => row[field] ? (String(row[field]).includes("T") ? formatDateTime(row[field]) : row[field]) : "-").join(" / ")}</div>
            <div className="text-slate-500">{row.reason}</div>
            <div className="text-xs text-slate-500">{formatDateTime(row.created_at)}</div>
          </div>
        ))}
        {!rows.length ? <div className="p-6 text-center text-sm text-slate-500">No requests yet.</div> : null}
      </div>
    </section>
  );
}
