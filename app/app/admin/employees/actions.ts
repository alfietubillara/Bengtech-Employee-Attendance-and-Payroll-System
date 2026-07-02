"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/authz";

export async function upsertEmployee(formData: FormData) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const id = String(formData.get("id") || "");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const payload = {
    email,
    username: String(formData.get("username") || "").trim() || null,
    full_name: String(formData.get("full_name") || "").trim(),
    role: String(formData.get("role") || "employee"),
    branch_id: String(formData.get("branch_id") || "") || null,
    position: String(formData.get("position") || ""),
    daily_rate: Number(formData.get("daily_rate") || 0),
    contact_number: String(formData.get("contact_number") || "") || null,
    status: String(formData.get("status") || "Active"),
    day_off: formData.getAll("day_off").map(Number)
  };

  let userId = id;
  if (!userId) {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw new Error(created.error.message);
    userId = created.data.user.id;
  }

  const { error } = await admin.from("profiles").upsert({ id: userId, ...payload });
  if (error) throw new Error(error.message);
  revalidatePath("/app/admin/employees");
}

export async function deleteEmployee(formData: FormData) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  await admin.from("profiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id);
  revalidatePath("/app/admin/employees");
}

export async function updateEmployeeAccess(formData: FormData) {
  await requireRole(["admin"]);
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const role = String(formData.get("role") || "employee");
  const status = String(formData.get("status") || "Active");

  if (!["admin", "manager", "employee"].includes(role)) throw new Error("Invalid role.");
  if (!["Active", "Inactive"].includes(status)) throw new Error("Invalid status.");

  const { error } = await admin.from("profiles").update({ role, status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/admin/employees");
}
