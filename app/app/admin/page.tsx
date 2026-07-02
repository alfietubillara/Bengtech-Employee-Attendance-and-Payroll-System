import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { toDateInput, formatDateTime } from "@/lib/utils";
import { SummaryCard } from "@/components/admin/summary-card";
import { ATTENDANCE_STATUSES } from "@/lib/constants";
import type { AttendanceRecord } from "@/lib/types";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ date?: string; branch?: string; status?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "manager"]);
  const date = params.date || toDateInput();

  let query = supabase
    .from("attendance_records")
    .select("*, profiles(full_name), branches(name)")
    .eq("attendance_date", date)
    .order("created_at", { ascending: false });

  if (profile.role === "manager" && profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (params.branch) query = query.eq("branch_id", params.branch);
  if (params.status) query = query.eq("status", params.status);

  const { data: recordData } = await query;
  const { data: branchData } = await supabase.from("branches").select("id,name").order("name");
  const [{ count: leaveCount }, { count: correctionCount }, { count: gpsCount }, { count: deviceResetCount }] = await Promise.all([
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("attendance_correction_requests").select("id", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("gps_incidents").select("id", { count: "exact", head: true }).gte("attempted_at", `${date}T00:00:00+08:00`),
    supabase.from("employee_devices").select("id", { count: "exact", head: true }).not("reset_requested_at", "is", null)
  ]);
  const records = recordData ?? [];
  const branches = branchData ?? [];

  const present = records.filter((r: AttendanceRecord) => r.status === "Present").length;
  const late = records.filter((r: AttendanceRecord) => r.status === "Late").length;
  const absent = records.filter((r: AttendanceRecord) => r.status === "Absent").length;
  const missing = records.filter((r: AttendanceRecord) => r.status === "Missing Time Out" || (r.time_in_at && !r.time_out_at)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">Attendance overview for Bengtech branches.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Present today" value={present} icon={CheckCircle2} tone="bg-green-50 text-green-700" />
        <SummaryCard label="Late today" value={late} icon={Clock3} tone="bg-yellow-50 text-yellow-700" />
        <SummaryCard label="Absent today" value={absent} icon={XCircle} tone="bg-red-50 text-red-700" />
        <SummaryCard label="Missing Time Out" value={missing} icon={AlertTriangle} tone="bg-orange-50 text-orange-700" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Leave requests" value={leaveCount || 0} icon={CalendarDays} tone="bg-blue-50 text-blue-700" />
        <SummaryCard label="Correction requests" value={correctionCount || 0} icon={AlertTriangle} tone="bg-orange-50 text-orange-700" />
        <SummaryCard label="GPS alerts today" value={gpsCount || 0} icon={XCircle} tone="bg-red-50 text-red-700" />
        <SummaryCard label="Device reset requests" value={deviceResetCount || 0} icon={Clock3} tone="bg-purple-50 text-purple-700" />
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-4">
        <input className="field" type="date" name="date" defaultValue={date} />
        <select className="field" name="branch" defaultValue={params.branch || ""}>
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select className="field" name="status" defaultValue={params.status || ""}>
          <option value="">All statuses</option>
          {ATTENDANCE_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button className="btn-primary" type="submit">
          Apply Filters
        </button>
      </form>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Time In</th>
                <th className="px-4 py-3">Time Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-semibold">{record.profiles?.full_name}</td>
                  <td className="px-4 py-3">{record.branches?.name}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_in_at)}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_out_at)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">{record.status}</span>
                  </td>
                </tr>
              ))}
              {!records.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
