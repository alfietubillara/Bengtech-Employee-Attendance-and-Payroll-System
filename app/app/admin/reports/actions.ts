"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import type { AttendanceStatus } from "@/lib/types";
import { writeAudit } from "@/lib/audit";

export async function updateAttendanceStatus(formData: FormData) {
  const { supabase, profile } = await requireRole(["admin", "manager"]);
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as AttendanceStatus;
  let query = supabase.from("attendance_records").update({ status, notes: `Manually marked ${status}` }).eq("id", id);
  if (profile.role === "manager" && profile.branch_id) query = query.eq("branch_id", profile.branch_id);
  const { error } = await query;
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "attendance_status_updated", entityType: "attendance_records", entityId: id, details: { status } });
  revalidatePath("/app/admin/reports");
  revalidatePath("/app/admin");
}

export async function deleteAttendanceRecord(formData: FormData) {
  const { supabase, profile } = await requireRole(["admin"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "attendance_deleted", entityType: "attendance_records", entityId: id });
  revalidatePath("/app/admin/reports");
  revalidatePath("/app/admin");
}
