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
    Present: row.present_days,
    "Paid Days": row.paid_days,
    "Half Days": row.half_days,
    Late: row.late_days,
    Absent: row.absent_days,
    "Gross Pay": row.gross_pay,
    "Late Deduction": row.late_deduction,
    "Absent Deduction": row.absent_deduction,
    "Cash Advance": row.cash_advance,
    "Incentive / Allowance": row.allowance,
    Overtime: row.overtime_pay,
    "Holiday Pay": row.holiday_pay,
    "Other Deductions": row.other_deductions,
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
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["Employee", "Branch", "Paid Days", "Half Days", "Late", "Absent", "Gross", "Deductions", "Incentive", "Overtime", "Holiday", "Net Salary"].map((heading) => (
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
                  <td className="px-4 py-3">{row.paid_days}</td>
                  <td className="px-4 py-3">{row.half_days}</td>
                  <td className="px-4 py-3">{row.late_days}</td>
                  <td className="px-4 py-3">{row.absent_days}</td>
                  <td className="px-4 py-3">{formatPeso(row.gross_pay)}</td>
                  <td className="px-4 py-3">{formatPeso(row.late_deduction + row.absent_deduction + row.cash_advance + row.other_deductions)}</td>
                  <td className="px-4 py-3">{formatPeso(row.allowance)}</td>
                  <td className="px-4 py-3">{formatPeso(row.overtime_pay)}</td>
                  <td className="px-4 py-3">{formatPeso(row.holiday_pay)}</td>
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
              <strong>Paid Days:</strong> {row.paid_days}
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
