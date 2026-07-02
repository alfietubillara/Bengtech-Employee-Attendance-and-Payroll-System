import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Banknote, CalendarX, Gift, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentMonthInput, formatDateTime, formatPeso } from "@/lib/utils";
import type { AttendanceRecord, Profile } from "@/lib/types";

export default async function MyRecordsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile || profile.role !== "employee") redirect("/app");

  const month = params.month || currentMonthInput();
  const start = `${month}-01`;
  const end = `${month}-31`;

  const [{ data: attendanceData }, { data: cashData }, { data: incentiveData }, { data: payrollData }, { data: notificationData }] = await Promise.all([
    supabase.from("attendance_records").select("*").eq("employee_id", profile.id).gte("attendance_date", start).lte("attendance_date", end).order("attendance_date", { ascending: false }),
    supabase.from("cash_advances").select("*").eq("employee_id", profile.id).eq("payroll_month", month).order("created_at", { ascending: false }),
    supabase.from("allowances").select("*").eq("employee_id", profile.id).eq("payroll_month", month).order("created_at", { ascending: false }),
    supabase.from("payroll_records").select("*").eq("employee_id", profile.id).eq("payroll_month", month).order("created_at", { ascending: false }),
    supabase.from("employee_notifications").select("*").eq("employee_id", profile.id).order("created_at", { ascending: false }).limit(10)
  ]);

  const attendance = (attendanceData ?? []) as AttendanceRecord[];
  const cashAdvances = cashData ?? [];
  const incentives = incentiveData ?? [];
  const payroll = payrollData ?? [];
  const notifications = notificationData ?? [];
  const absences = attendance.filter((record) => record.status === "Absent" || record.status === "Missing Time Out");
  const cashTotal = cashAdvances.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const incentiveTotal = incentives.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">My Records</h1>
        <p className="text-sm text-slate-500">Your own attendance, absences, cash advances, incentives, and salary records.</p>
      </div>

      <form className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <input className="field sm:max-w-56" type="month" name="month" defaultValue={month} />
        <button className="btn-primary" type="submit">
          View Month
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <Summary label="Absences" value={absences.length} icon={<CalendarX size={21} />} />
        <Summary label="Cash Advances" value={formatPeso(cashTotal)} icon={<Banknote size={21} />} />
        <Summary label="Incentives" value={formatPeso(incentiveTotal)} icon={<Gift size={21} />} />
        <Summary label="Payslips" value={payroll.length} icon={<ReceiptText size={21} />} />
      </div>

      <section className="panel p-4">
        <h2 className="font-bold">Notifications</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {notifications.map((item) => (
            <div key={item.id} className="py-3">
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-slate-600">{item.message}</div>
              <div className="text-xs text-slate-500">{formatDateTime(item.created_at)}</div>
            </div>
          ))}
          {!notifications.length ? <div className="py-3 text-sm text-slate-500">No notifications yet.</div> : null}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 font-bold">Attendance History</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time In</th>
                <th className="px-4 py-3">Time Out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">{record.attendance_date}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_in_at)}</td>
                  <td className="px-4 py-3">{formatDateTime(record.time_out_at)}</td>
                  <td className="px-4 py-3 font-semibold">{record.status}</td>
                </tr>
              ))}
              {!attendance.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    No attendance records for this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <MoneyList title="Cash Advances" rows={cashAdvances} empty="No cash advances." />
        <MoneyList title="Incentives" rows={incentives} empty="No incentives." />
        <MoneyList title="Salary / Payslips" rows={payroll.map((row) => ({ ...row, amount: row.net_salary, notes: row.payroll_period || "Payroll" }))} empty="No salary record yet." />
      </div>
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-beng-green/10 text-beng-green">{icon}</div>
      <div className="text-sm font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function MoneyList({ title, rows, empty }: { title: string; rows: { id: string; amount?: number; notes?: string | null; created_at?: string }[]; empty: string }) {
  return (
    <section className="panel p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md bg-slate-50 p-3">
            <div className="font-semibold">{formatPeso(Number(row.amount || 0))}</div>
            <div className="text-xs text-slate-500">{row.notes || "No notes"}</div>
          </div>
        ))}
        {!rows.length ? <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-500">{empty}</div> : null}
      </div>
    </section>
  );
}
