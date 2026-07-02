import { requireRole } from "@/lib/authz";
import { ExportButtons } from "@/components/admin/export-buttons";

export default async function BackupPage() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: employees = [] }, { data: attendance = [] }, { data: payroll = [] }, { data: cash = [] }, { data: allowances = [] }] = await Promise.all([
    supabase.from("profiles").select("full_name,email,username,role,position,daily_rate,status"),
    supabase.from("attendance_records").select("attendance_date,status,time_in_at,time_out_at,profiles(full_name),branches(name)").order("attendance_date", { ascending: false }).limit(2000),
    supabase.from("payroll_records").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("cash_advances").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("allowances").select("*").order("created_at", { ascending: false }).limit(2000)
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Backup / Export Center</h1>
        <p className="text-sm text-slate-500">Download core business records before payroll or month-end closing.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <BackupCard title="Employees" rows={employees as Record<string, unknown>[]} filename="bengtech-employees" />
        <BackupCard title="Attendance" rows={(attendance as any[]).map((r) => ({ ...r, employee: r.profiles?.full_name, branch: r.branches?.name }))} filename="bengtech-attendance-backup" />
        <BackupCard title="Payroll" rows={payroll as Record<string, unknown>[]} filename="bengtech-payroll-backup" />
        <BackupCard title="Cash Advances" rows={cash as Record<string, unknown>[]} filename="bengtech-cash-advances" />
        <BackupCard title="Incentives" rows={allowances as Record<string, unknown>[]} filename="bengtech-incentives" />
      </div>
    </div>
  );
}

function BackupCard({ title, rows, filename }: { title: string; rows: Record<string, unknown>[]; filename: string }) {
  return (
    <section className="panel p-4">
      <h2 className="font-bold">{title}</h2>
      <p className="mb-3 text-sm text-slate-500">{rows.length} rows ready for export.</p>
      <ExportButtons rows={rows} filename={filename} />
    </section>
  );
}
