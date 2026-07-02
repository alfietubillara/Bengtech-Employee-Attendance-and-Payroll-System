"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { ExportButtons } from "@/components/admin/export-buttons";
import { formatPeso } from "@/lib/utils";
import type { PayrollRow } from "@/lib/types";

export function PayrollClient({ rows, month }: { rows: PayrollRow[]; month: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: `Bengtech Payslips ${month}` });
  const exportRows = rows.map((row) => ({
    Employee: row.employee_name,
    Branch: row.branch_name,
    "Daily Rate": row.daily_rate,
    "Required Hours": row.required_work_hours_per_day,
    "Hourly Rate": row.hourly_rate,
    Present: row.present_days,
    "Paid Days": row.paid_days,
    "Half Days": row.half_days,
    Absent: row.absent_days,
    "Late Minutes": row.total_late_minutes,
    "Undertime Minutes": row.total_undertime_minutes,
    "Overtime Minutes": row.total_overtime_minutes,
    "Basic Pay": row.basic_pay,
    "Gross Pay": row.gross_pay,
    "Late Deduction": row.late_deduction,
    "Undertime Deduction": row.undertime_deduction,
    "Absent Deduction": row.absent_deduction,
    "Cash Advance": row.cash_advance,
    "Bonus / Additional Pay": row.bonus_pay,
    Overtime: row.overtime_pay,
    "Holiday Pay": row.holiday_pay,
    "Other Deductions": row.other_deductions,
    "Total Deductions": row.total_deductions,
    "Net Salary": row.net_salary
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <ExportButtons rows={exportRows} filename={`bengtech-payroll-${month}`} />
        <button className="btn-secondary" type="button" onClick={print}>
          <Printer size={18} />
          Payslips
        </button>
      </div>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Employee",
                  "Branch",
                  "Daily",
                  "Hourly",
                  "Present",
                  "Absent",
                  "Late Min",
                  "Under Min",
                  "OT Min",
                  "Basic",
                  "OT Pay",
                  "Bonus",
                  "Deductions",
                  "Gross",
                  "Net Salary"
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.employee_id}>
                  <td className="px-4 py-3 font-semibold">{row.employee_name}</td>
                  <td className="px-4 py-3">{row.branch_name}</td>
                  <td className="px-4 py-3">{formatPeso(row.daily_rate)}</td>
                  <td className="px-4 py-3">{formatPeso(row.hourly_rate)}</td>
                  <td className="px-4 py-3">{row.present_days}</td>
                  <td className="px-4 py-3">{row.absent_days}</td>
                  <td className="px-4 py-3">{row.total_late_minutes}</td>
                  <td className="px-4 py-3">{row.total_undertime_minutes}</td>
                  <td className="px-4 py-3">{row.total_overtime_minutes}</td>
                  <td className="px-4 py-3">{formatPeso(row.basic_pay)}</td>
                  <td className="px-4 py-3">{formatPeso(row.overtime_pay)}</td>
                  <td className="px-4 py-3">{formatPeso(row.bonus_pay)}</td>
                  <td className="px-4 py-3">{formatPeso(row.total_deductions)}</td>
                  <td className="px-4 py-3">{formatPeso(row.gross_pay)}</td>
                  <td className="px-4 py-3 text-base font-bold text-beng-green">{formatPeso(row.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={printRef} className="hidden print:block">
        {rows.map((row) => (
          <section key={row.employee_id} className="mb-6 border border-slate-300 p-5">
            <h2 className="text-xl font-bold">Bengtech Payslip</h2>
            <p>{month}</p>
            <hr className="my-3" />
            <p>
              <strong>Employee:</strong> {row.employee_name}
            </p>
            <p>
              <strong>Branch:</strong> {row.branch_name}
            </p>
            <p>
              <strong>Gross Pay:</strong> {formatPeso(row.gross_pay)}
            </p>
            <p>
              <strong>Daily Rate:</strong> {formatPeso(row.daily_rate)}
            </p>
            <p>
              <strong>Hourly Rate:</strong> {formatPeso(row.hourly_rate)}
            </p>
            <p>
              <strong>Paid Days:</strong> {row.paid_days}
            </p>
            <p>
              <strong>Present / Absent:</strong> {row.present_days} / {row.absent_days}
            </p>
            <p>
              <strong>Late / Undertime / Overtime:</strong> {row.total_late_minutes} / {row.total_undertime_minutes} / {row.total_overtime_minutes} minutes
            </p>
            <p>
              <strong>Basic Pay:</strong> {formatPeso(row.basic_pay)}
            </p>
            <p>
              <strong>Overtime Pay:</strong> {formatPeso(row.overtime_pay)}
            </p>
            <p>
              <strong>Bonus Pay:</strong> {formatPeso(row.bonus_pay)}
            </p>
            <p>
              <strong>Late Deduction:</strong> {formatPeso(row.late_deduction)}
            </p>
            <p>
              <strong>Undertime Deduction:</strong> {formatPeso(row.undertime_deduction)}
            </p>
            <p>
              <strong>Absent Deduction:</strong> {formatPeso(row.absent_deduction)}
            </p>
            <p>
              <strong>Cash Advance:</strong> {formatPeso(row.cash_advance)}
            </p>
            <p>
              <strong>Other Deductions:</strong> {formatPeso(row.other_deductions)}
            </p>
            <p>
              <strong>Total Deductions:</strong> {formatPeso(row.total_deductions)}
            </p>
            <p>
              <strong>Net Salary:</strong> {formatPeso(row.net_salary)}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
