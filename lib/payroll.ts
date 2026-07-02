import type { AttendanceRecord, PayrollRow, Profile } from "@/lib/types";

type Adjustment = {
  employee_id: string;
  amount?: number | null;
};

type Holiday = {
  holiday_date: string;
  multiplier?: number | null;
};

const TIME_IN_REQUIRED = "08:00";
const TIME_OUT_REQUIRED = "18:00";
const DEFAULT_REQUIRED_HOURS = 10;
const DEFAULT_OVERTIME_MULTIPLIER = 1.25;

const sumByEmployee = (rows: Adjustment[]) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.employee_id] = (acc[row.employee_id] || 0) + Number(row.amount || 0);
    return acc;
  }, {});

export function buildPayrollRows(input: {
  employees: (Profile & { branches?: { name: string } | null })[];
  attendance: AttendanceRecord[];
  cashAdvances: Adjustment[];
  allowances: Adjustment[];
  deductions: Adjustment[];
  overtime?: Adjustment[];
  holidays?: Holiday[];
  overtimeMultiplier?: number;
}): PayrollRow[] {
  const cash = sumByEmployee(input.cashAdvances);
  const bonuses = sumByEmployee(input.allowances);
  const deductions = sumByEmployee(input.deductions);
  const overtimeMultiplier = input.overtimeMultiplier || DEFAULT_OVERTIME_MULTIPLIER;

  return input.employees.map((employee) => {
    const records = input.attendance.filter((record) => record.employee_id === employee.id);
    const dailyRate = Number(employee.daily_rate || 0);
    const requiredHours = Number(employee.required_work_hours_per_day || DEFAULT_REQUIRED_HOURS);
    const hourlyRate = requiredHours > 0 ? dailyRate / requiredHours : 0;

    const presentRecords = records.filter((record) => isPaidAttendance(record));
    const halfDays = records.filter((record) => record.status === "Half Day Morning" || record.status === "Half Day Afternoon").length;
    const paidDays = presentRecords.reduce((sum, record) => sum + dayCredit(record), 0);
    const presentDays = presentRecords.length;
    const absentDays = records.filter((record) => record.status === "Absent" || !record.time_in_at).length;

    const totalLateMinutes = presentRecords.reduce((sum, record) => sum + lateMinutes(record), 0);
    const totalUndertimeMinutes = presentRecords.reduce((sum, record) => sum + undertimeMinutes(record), 0);
    const totalOvertimeMinutes = presentRecords.reduce((sum, record) => sum + overtimeMinutes(record), 0);

    const basicPay = paidDays * dailyRate;
    const lateDeduction = (totalLateMinutes / 60) * hourlyRate;
    const undertimeDeduction = (totalUndertimeMinutes / 60) * hourlyRate;
    const absentDeduction = absentDays * dailyRate;
    const overtimePay = (totalOvertimeMinutes / 60) * hourlyRate * overtimeMultiplier;
    const bonusPay = bonuses[employee.id] || 0;
    const cashAdvance = cash[employee.id] || 0;
    const otherDeductions = deductions[employee.id] || 0;
    const holidayPay = presentRecords.reduce((sum, record) => {
      const holiday = input.holidays?.find((item) => item.holiday_date === record.attendance_date);
      if (!holiday) return sum;
      return sum + dailyRate * dayCredit(record) * Math.max(Number(holiday.multiplier || 1) - 1, 0);
    }, 0);
    const grossPay = basicPay + overtimePay + holidayPay + bonusPay;
    const totalDeductions = lateDeduction + undertimeDeduction + absentDeduction + cashAdvance + otherDeductions;
    const netSalary = grossPay - totalDeductions;

    return {
      employee_id: employee.id,
      employee_name: employee.full_name,
      branch_name: employee.branches?.name || "Unassigned",
      daily_rate: dailyRate,
      required_work_hours_per_day: requiredHours,
      hourly_rate: hourlyRate,
      present_days: presentDays,
      paid_days: paidDays,
      late_days: records.filter((record) => lateMinutes(record) > 0).length,
      absent_days: absentDays,
      half_days: halfDays,
      total_late_minutes: totalLateMinutes,
      total_undertime_minutes: totalUndertimeMinutes,
      total_overtime_minutes: totalOvertimeMinutes,
      overtime_hours: totalOvertimeMinutes / 60,
      basic_pay: basicPay,
      allowance: bonusPay,
      bonus_pay: bonusPay,
      cash_advance: cashAdvance,
      other_deductions: otherDeductions,
      gross_pay: grossPay,
      late_deduction: lateDeduction,
      undertime_deduction: undertimeDeduction,
      absent_deduction: absentDeduction,
      overtime_pay: overtimePay,
      holiday_pay: holidayPay,
      total_deductions: totalDeductions,
      net_salary: netSalary
    };
  });
}

function isPaidAttendance(record: AttendanceRecord) {
  return ["Present", "Late", "Missing Time Out", "Half Day Morning", "Half Day Afternoon"].includes(record.status) && Boolean(record.time_in_at);
}

function dayCredit(record: AttendanceRecord) {
  return record.status === "Half Day Morning" || record.status === "Half Day Afternoon" ? 0.5 : 1;
}

function lateMinutes(record: AttendanceRecord) {
  if (!record.time_in_at) return 0;
  return Math.max(0, minutesSinceMidnight(record.time_in_at) - requiredMinutes(TIME_IN_REQUIRED));
}

function undertimeMinutes(record: AttendanceRecord) {
  if (!record.time_in_at || !record.time_out_at) return 0;
  return Math.max(0, requiredMinutes(TIME_OUT_REQUIRED) - minutesSinceMidnight(record.time_out_at));
}

function overtimeMinutes(record: AttendanceRecord) {
  if (!record.time_in_at || !record.time_out_at || record.status === "Absent") return 0;
  return Math.max(0, minutesSinceMidnight(record.time_out_at) - requiredMinutes(TIME_OUT_REQUIRED));
}

function requiredMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesSinceMidnight(value: string) {
  const parts = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}
