"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

export async function saveAdjustment(formData: FormData) {
  const { profile } = await requireRole(["admin", "manager"]);
  const admin = createAdminClient();
  const table = String(formData.get("table"));
  if (!["cash_advances", "allowances", "deductions", "overtime_entries"].includes(table)) throw new Error("Invalid payroll adjustment.");
  if (profile.role === "manager" && table !== "allowances") {
    throw new Error("Branch managers can only add incentives or bonuses.");
  }
  const common = {
    employee_id: String(formData.get("employee_id")),
    payroll_month: String(formData.get("payroll_month")),
    payroll_period: String(formData.get("payroll_period") || "first_half"),
    notes: String(formData.get("notes") || "")
  };
  if (profile.role === "manager") {
    const { data: employee } = await admin.from("profiles").select("branch_id").eq("id", common.employee_id).single();
    if (!profile.branch_id || employee?.branch_id !== profile.branch_id) {
      throw new Error("You can only add incentives for employees in your assigned branch.");
    }
  }
  const { data: lock } = await admin.from("payroll_locks").select("id").eq("payroll_month", common.payroll_month).eq("payroll_period", common.payroll_period).maybeSingle();
  if (lock) throw new Error("This payroll period is locked.");
  const { error } =
    table === "overtime_entries"
      ? await admin.from("overtime_entries").insert({ ...common, hours: Number(formData.get("hours") || 0) })
      : table === "cash_advances"
        ? await admin.from("cash_advances").insert({ ...common, amount: Number(formData.get("amount") || 0) })
        : table === "allowances"
          ? await admin.from("allowances").insert({ ...common, amount: Number(formData.get("amount") || 0) })
          : await admin.from("deductions").insert({ ...common, amount: Number(formData.get("amount") || 0) });
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "payroll_adjustment_saved", entityType: table, details: common });
  revalidatePath("/app/admin/payroll");
}

export async function savePayrollRows(formData: FormData) {
  const { profile } = await requireRole(["admin"]);
  const admin = createAdminClient();
  const month = String(formData.get("month"));
  const period = String(formData.get("period") || "first_half");
  const { data: lock } = await admin.from("payroll_locks").select("id").eq("payroll_month", month).eq("payroll_period", period).maybeSingle();
  if (lock) throw new Error("This payroll period is locked.");
  const rows = JSON.parse(String(formData.get("rows") || "[]"));
  const { error } = await admin.from("payroll_records").upsert(rows.map((row: Record<string, unknown>) => ({ ...row, payroll_month: month, payroll_period: period })));
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "payroll_saved", entityType: "payroll_records", details: { month, period, count: rows.length } });
  revalidatePath("/app/admin/payroll");
}

export async function lockPayroll(formData: FormData) {
  const { profile } = await requireRole(["admin"]);
  const admin = createAdminClient();
  const month = String(formData.get("month"));
  const period = String(formData.get("period") || "first_half");
  const { error } = await admin.from("payroll_locks").upsert({ payroll_month: month, payroll_period: period, locked_by: profile.id, locked_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "payroll_locked", entityType: "payroll_locks", details: { month, period } });
  revalidatePath("/app/admin/payroll");
}

export async function unlockPayroll(formData: FormData) {
  const { profile } = await requireRole(["admin"]);
  const admin = createAdminClient();
  const month = String(formData.get("month"));
  const period = String(formData.get("period") || "first_half");
  const { error } = await admin.from("payroll_locks").delete().eq("payroll_month", month).eq("payroll_period", period);
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "payroll_unlocked", entityType: "payroll_locks", details: { month, period } });
  revalidatePath("/app/admin/payroll");
}
