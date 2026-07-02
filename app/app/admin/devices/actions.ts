"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

export async function resetEmployeeDevice(formData: FormData) {
  const { supabase, profile } = await requireRole(["admin"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("employee_devices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "employee_device_deleted", entityType: "employee_devices", entityId: id });
  revalidatePath("/app/admin/devices");
}
