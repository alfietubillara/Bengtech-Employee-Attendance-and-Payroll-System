import { requireRole } from "@/lib/authz";
import { formatDateTime } from "@/lib/utils";
import { reviewCorrectionRequest, reviewLeaveRequest } from "./actions";

export default async function AdminRequestsPage() {
  const { supabase, profile } = await requireRole(["admin", "manager"]);
  let leaveQuery = supabase.from("leave_requests").select("*, profiles(full_name,branch_id)").order("created_at", { ascending: false });
  let correctionQuery = supabase.from("attendance_correction_requests").select("*, profiles(full_name,branch_id)").order("created_at", { ascending: false });
  if (profile.role === "manager" && profile.branch_id) {
    const { data: peopleData } = await supabase.from("profiles").select("id").eq("branch_id", profile.branch_id);
    const people = peopleData ?? [];
    const ids = people.map((person) => person.id);
    leaveQuery = leaveQuery.in("employee_id", ids);
    correctionQuery = correctionQuery.in("employee_id", ids);
  }
  const [{ data: leaveData }, { data: correctionData }] = await Promise.all([leaveQuery, correctionQuery]);
  const leaves = leaveData ?? [];
  const corrections = correctionData ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Requests</h1>
        <p className="text-sm text-slate-500">Approve leave and attendance correction requests.</p>
      </div>
      <AdminList title="Leave Requests" rows={leaves} action={reviewLeaveRequest} type="leave" />
      <AdminList title="Attendance Corrections" rows={corrections} action={reviewCorrectionRequest} type="correction" />
    </div>
  );
}

function AdminList({ title, rows, action, type }: { title: string; rows: any[]; action: (formData: FormData) => Promise<void>; type: "leave" | "correction" }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3 font-bold">{title}</div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <form key={row.id} action={action} className="grid gap-3 p-4 text-sm lg:grid-cols-[1.3fr_1.5fr_1fr_1fr]">
            <input type="hidden" name="id" value={row.id} />
            <div>
              <div className="font-semibold">{row.profiles?.full_name}</div>
              <div className="text-xs text-slate-500">{formatDateTime(row.created_at)}</div>
            </div>
            <div>
              <div className="font-semibold">{row.status}</div>
              <div className="text-slate-600">
                {type === "leave"
                  ? `${row.leave_type}: ${row.start_date} to ${row.end_date}`
                  : `${row.attendance_date}: ${formatDateTime(row.requested_time_in)} / ${formatDateTime(row.requested_time_out)}`}
              </div>
              <div className="text-xs text-slate-500">{row.reason}</div>
            </div>
            <textarea className="field min-h-20" name="admin_notes" placeholder="Admin notes" defaultValue={row.admin_notes || ""} />
            <div className="flex gap-2">
              <button className="btn-primary" name="status" value="Approved" type="submit" disabled={row.status !== "Pending"}>Approve</button>
              <button className="btn-secondary" name="status" value="Rejected" type="submit" disabled={row.status !== "Pending"}>Reject</button>
            </div>
          </form>
        ))}
        {!rows.length ? <div className="p-6 text-center text-sm text-slate-500">No requests yet.</div> : null}
      </div>
    </section>
  );
}
