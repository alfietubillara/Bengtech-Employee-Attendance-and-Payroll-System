import { requireRole } from "@/lib/authz";
import { formatDateTime } from "@/lib/utils";

export default async function AuditPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("audit_logs").select("*, profiles(full_name)").order("created_at", { ascending: false }).limit(200);
  const logs = data ?? [];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-slate-500">Admin changes, payroll locks, approvals, and device resets.</p>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3">{formatDateTime(log.created_at)}</td>
                <td className="px-4 py-3">{log.profiles?.full_name || "System"}</td>
                <td className="px-4 py-3 font-semibold">{log.action}</td>
                <td className="px-4 py-3">{log.entity_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
