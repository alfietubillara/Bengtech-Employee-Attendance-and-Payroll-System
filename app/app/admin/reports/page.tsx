import { requireRole } from "@/lib/authz";
import { ATTENDANCE_STATUSES, SELFIE_BUCKET } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, toDateInput } from "@/lib/utils";
import { ExportButtons } from "@/components/admin/export-buttons";
import { deleteAttendanceRecord, updateAttendanceStatus } from "./actions";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ date?: string; month?: string; branch?: string; employee?: string; status?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "manager"]);
  const date = params.date || "";
  const month = params.month || toDateInput().slice(0, 7);
  const start = date || `${month}-01`;
  const end = date || `${month}-31`;

  let query = supabase
    .from("attendance_records")
    .select("*, profiles(full_name), branches(name)")
    .gte("attendance_date", start)
    .lte("attendance_date", end)
    .order("attendance_date", { ascending: false });

  if (profile.role === "manager" && profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  if (params.branch) query = query.eq("branch_id", params.branch);
  if (params.employee) query = query.eq("employee_id", params.employee);
  if (params.status) query = query.eq("status", params.status);

  const { data: recordData } = await query;
  const { data: branchData } = await supabase.from("branches").select("id,name").order("name");
  const { data: employeeData } = await supabase.from("profiles").select("id,full_name").order("full_name");
  const records = recordData ?? [];
  const branches = branchData ?? [];
  const employees = employeeData ?? [];
  const exportRows = records.map((record) => ({
    Date: record.attendance_date,
    Employee: record.profiles?.full_name,
    Branch: record.branches?.name,
    "Time In": formatDateTime(record.time_in_at),
    "Time Out": formatDateTime(record.time_out_at),
    Status: record.status,
    Notes: record.notes || ""
  }));
  const admin = createAdminClient();
  const signedUrls = new Map<string, string>();
  await Promise.all(
    records
      .flatMap((record) => [record.time_in_selfie_path, record.time_out_selfie_path, record.time_in_selfie_original_path, record.time_out_selfie_original_path].filter(Boolean))
      .map(async (path) => {
      const { data } = await admin.storage.from(SELFIE_BUCKET).createSignedUrl(path, 60 * 10);
      if (data?.signedUrl) signedUrls.set(path, data.signedUrl);
    })
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">Daily, monthly, branch, and employee attendance history.</p>
        </div>
        <ExportButtons rows={exportRows} filename={`bengtech-attendance-${date || month}`} />
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
        <input className="field" type="date" name="date" defaultValue={date} />
        <input className="field" type="month" name="month" defaultValue={month} />
        <select className="field" name="branch" defaultValue={params.branch || ""}>
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select className="field" name="employee" defaultValue={params.employee || ""}>
          <option value="">All employees</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
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
          Filter
        </button>
      </form>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Date", "Employee", "Branch", "Time In", "Time Out", "Selfies", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">{record.attendance_date}</td>
                  <td className="px-4 py-3 font-semibold">{record.profiles?.full_name}</td>
                  <td className="px-4 py-3">{record.branches?.name}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_in_at)}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_out_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {record.time_in_selfie_path && signedUrls.get(record.time_in_selfie_path) ? (
                        <a className="font-semibold text-beng-green" href={signedUrls.get(record.time_in_selfie_path)} target="_blank">
                          In
                        </a>
                      ) : null}
                      {record.time_in_selfie_original_path && signedUrls.get(record.time_in_selfie_original_path) ? (
                        <a className="font-semibold text-slate-600" href={signedUrls.get(record.time_in_selfie_original_path)} target="_blank">
                          In Original
                        </a>
                      ) : null}
                      {record.time_out_selfie_path && signedUrls.get(record.time_out_selfie_path) ? (
                        <a className="font-semibold text-beng-green" href={signedUrls.get(record.time_out_selfie_path)} target="_blank">
                          Out
                        </a>
                      ) : null}
                      {record.time_out_selfie_original_path && signedUrls.get(record.time_out_selfie_original_path) ? (
                        <a className="font-semibold text-slate-600" href={signedUrls.get(record.time_out_selfie_original_path)} target="_blank">
                          Out Original
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">{record.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={updateAttendanceStatus} className="flex gap-2">
                        <input type="hidden" name="id" value={record.id} />
                        <select className="field min-w-40" name="status" defaultValue={record.status}>
                          {ATTENDANCE_STATUSES.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                        <button className="btn-secondary" type="submit">
                          Save
                        </button>
                      </form>
                      {profile.role === "admin" ? (
                        <form action={deleteAttendanceRecord}>
                          <input type="hidden" name="id" value={record.id} />
                          <button className="btn-secondary" type="submit">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
