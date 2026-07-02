import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPeso(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila"
  }).format(new Date(value));
}

export function toDateInput(value = new Date()) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function currentMonthInput(value = new Date()) {
  const date = toDateInput(value);
  return date.slice(0, 7);
}

export function currentPayrollPeriod(value = new Date()) {
  const day = Number(toDateInput(value).slice(8, 10));
  return day <= 15 ? "first_half" : "second_half";
}

export function payrollPeriodRange(month: string, period: "first_half" | "second_half") {
  if (period === "first_half") {
    return { start: `${month}-01`, end: `${month}-15`, label: "1st Half: 1-15" };
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { start: `${month}-16`, end: `${month}-${String(lastDay).padStart(2, "0")}`, label: "2nd Half: 16-End" };
}
