import type { AttendanceRecord, PayrollRow, Profile } from "@/lib/types";

type Adjustment = {
  employee_id: string;
  amount?: number | null;
  hours?: number | null;
};

type Holiday = {
  holiday_date: string;
  multiplier?: number | null;
};

const sumByEmployee = (rows: Adjustment[]) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.employee_id] = (acc[row.employee_id] || 0) + Number(row.amount || row.hours || 0);
    return acc;
  }, {});

export function buildPayrollRows(input: {
  employees: (Profile & { branches?: { name: string } | null })[];
  attendance: AttendanceRecord[];
  cashAdvances: Adjustment[];
  allowances: Adjustment[];
  deductions: Adjustment[];
  overtime: Adjustment[];
  holidays?: Holiday[];
}): PayrollRow[] {
  const cash = sumByEmployee(input.cashAdvances);
  const allowances = sumByEmployee(input.allowances);
  const deductions = sumByEmployee(input.deductions);
  const overtimeHours = sumByEmployee(input.overtime);

  return input.employees.map((employee) => {
    const records = input.attendance.filter((record) => record.employee_id === employee.id);
    const fullPaidDays = records.filter((record) => record.status === "Present" || record.status === "Late" || record.status === "Missing Time Out").length;
    const halfDays = records.filter((record) => record.status === "Half Day Morning" || record.status === "Half Day Afternoon").length;
    const paidDays = fullPaidDays + halfDays * 0.5;
    const presentDays = fullPaidDays;
    const lateDays = records.filter((record) => record.status === "Late").length;
    const absentDays = records.filter((record) => record.status === "Absent").length;
    const holidayPay = records
      .filter((record) => record.status === "Present" || record.status === "Late" || record.status === "Half Day Morning" || record.status === "Half Day Afternoon")
      .reduce((sum, record) => {
        const holiday = input.holidays?.find((item) => item.holiday_date === record.attendance_date);
        if (!holiday) return sum;
        const dayCredit = record.status === "Half Day Morning" || record.status === "Half Day Afternoon" ? 0.5 : 1;
        return sum + dailyRateSafe(employee) * dayCredit * Math.max(Number(holiday.multiplier || 1) - 1, 0);
      }, 0);
    const dailyRate = Number(employee.daily_rate || 0);
    const grossPay = dailyRate * paidDays;
    const lateDeduction = lateDays * 50;
    const absentDeduction = absentDays * dailyRate;
    const overtimePay = (overtimeHours[employee.id] || 0) * (dailyRate / 8) * 1.25;
    const netSalary =
      grossPay + holidayPay + overtimePay + (allowances[employee.id] || 0) - lateDeduction - absentDeduction - (cash[employee.id] || 0) - (deductions[employee.id] || 0);

    return {
      employee_id: employee.id,
      employee_name: employee.full_name,
      branch_name: employee.branches?.name || "Unassigned",
      daily_rate: dailyRate,
      present_days: presentDays,
      paid_days: paidDays,
      late_days: lateDays,
      absent_days: absentDays,
      half_days: halfDays,
      overtime_hours: overtimeHours[employee.id] || 0,
      allowance: allowances[employee.id] || 0,
      cash_advance: cash[employee.id] || 0,
      other_deductions: deductions[employee.id] || 0,
      gross_pay: grossPay,
      late_deduction: lateDeduction,
      absent_deduction: absentDeduction,
      overtime_pay: overtimePay,
      holiday_pay: holidayPay,
      net_salary: netSalary
    };
  });
}

function dailyRateSafe(employee: Profile) {
  return Number(employee.daily_rate || 0);
}
