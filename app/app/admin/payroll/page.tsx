import { requireRole } from "@/lib/authz";
import { currentMonthInput, currentPayrollPeriod, payrollPeriodRange } from "@/lib/utils";
import { buildPayrollRows } from "@/lib/payroll";
import { PayrollClient } from "@/components/admin/payroll-client";
import { lockPayroll, saveAdjustment, savePayrollRows, unlockPayroll } from "./actions";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string; period?: "first_half" | "second_half"; branch?: string; employee?: string }> }) {
  const params = await searchParams;
  const { supabase, profile } = await requireRole(["admin", "manager"]);
  const month = params.month || currentMonthInput();
  const period = params.period || currentPayrollPeriod();
  const { start, end, label } = payrollPeriodRange(month, period);
  const effectiveBranch = profile.role === "manager" ? profile.branch_id || "" : params.branch || "";

  let employeeQuery = supabase.from("profiles").select("*, branches(name)").eq("status", "Active").order("full_name");
  if (effectiveBranch) employeeQuery = employeeQuery.eq("branch_id", effectiveBranch);
  if (params.employee) employeeQuery = employeeQuery.eq("id", params.employee);

  const [{ data: employeeData }, { data: attendanceData }, { data: branchData }, { data: cashAdvanceData }, { data: allowanceData }, { data: deductionData }, { data: holidayData }, { data: lock }, { data: overtimeSetting }] =
    await Promise.all([
      employeeQuery,
      effectiveBranch
        ? supabase.from("attendance_records").select("*").gte("attendance_date", start).lte("attendance_date", end).eq("branch_id", effectiveBranch)
        : supabase.from("attendance_records").select("*").gte("attendance_date", start).lte("attendance_date", end),
      supabase.from("branches").select("id,name").order("name"),
      supabase.from("cash_advances").select("*").eq("payroll_month", month).eq("payroll_period", period),
      supabase.from("allowances").select("*").eq("payroll_month", month).eq("payroll_period", period),
      supabase.from("deductions").select("*").eq("payroll_month", month).eq("payroll_period", period),
      supabase.from("holidays").select("*").gte("holiday_date", start).lte("holiday_date", end),
      supabase.from("payroll_locks").select("*").eq("payroll_month", month).eq("payroll_period", period).maybeSingle(),
      supabase.from("settings").select("value").eq("key", "overtime_multiplier").maybeSingle()
    ]);
  const employees = employeeData ?? [];
  const attendance = attendanceData ?? [];
  const branches = branchData ?? [];
  const cashAdvances = cashAdvanceData ?? [];
  const allowances = allowanceData ?? [];
  const deductions = deductionData ?? [];
  const holidays = holidayData ?? [];
  const overtimeMultiplier = Number(overtimeSetting?.value || 1.25);

  const rows = buildPayrollRows({ employees, attendance, cashAdvances, allowances, deductions, holidays, overtimeMultiplier });
  const isLocked = Boolean(lock);
  const managerMode = profile.role === "manager";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Payroll</h1>
        <p className="text-sm text-slate-500">Generate salary every 15 days, with deductions, overtime, incentives, and printable payslips.</p>
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-5">
        <input className="field" type="month" name="month" defaultValue={month} />
        <select className="field" name="period" defaultValue={period}>
          <option value="first_half">1st Half: 1-15</option>
          <option value="second_half">2nd Half: 16-End</option>
        </select>
        <select className="field" name="branch" defaultValue={effectiveBranch} disabled={managerMode}>
          {!managerMode ? <option value="">All branches</option> : null}
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
        <button className="btn-primary" type="submit">
          Generate
        </button>
      </form>

      <form action={saveAdjustment} className="panel grid gap-3 p-4 md:grid-cols-6">
        <input type="hidden" name="payroll_month" value={month} />
        <input type="hidden" name="payroll_period" value={period} />
        <select className="field" name="table" defaultValue={managerMode ? "allowances" : "cash_advances"}>
          {!managerMode ? <option value="cash_advances">Cash Advance</option> : null}
          <option value="allowances">Bonus / Additional Pay</option>
          {!managerMode ? <option value="deductions">Other Deduction</option> : null}
        </select>
        <select className="field md:col-span-2" name="employee_id" required>
          <option value="">Employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name}
            </option>
          ))}
        </select>
        <input className="field" name="amount" type="number" step="0.01" placeholder="Amount" />
        <input className="field" name="hours" type="number" step="0.25" placeholder="Hours" />
        <button className="btn-secondary" type="submit" disabled={isLocked}>
          Save
        </button>
      </form>

      {!managerMode ? (
        <>
          <form action={savePayrollRows}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="period" value={period} />
            <input type="hidden" name="rows" value={JSON.stringify(rows)} />
            <button className="btn-primary mb-3" type="submit" disabled={isLocked}>
              Save Payroll Records
            </button>
          </form>
          <form action={isLocked ? unlockPayroll : lockPayroll}>
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="period" value={period} />
            <button className={isLocked ? "btn-secondary mb-3" : "btn-primary mb-3"} type="submit">
              {isLocked ? "Unlock Payroll Period" : "Lock Payroll Period"}
            </button>
          </form>
        </>
      ) : null}

      <PayrollClient rows={rows} month={`${month} ${label}`} />
    </div>
  );
}
