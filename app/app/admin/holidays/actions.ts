"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

export async function saveHoliday(formData: FormData) {
  const { supabase, profile } = await requireRole(["admin"]);
  const payload = {
    holiday_date: String(formData.get("holiday_date")),
    name: String(formData.get("name") || ""),
    multiplier: Number(formData.get("multiplier") || 2)
  };
  const { error } = await supabase.from("holidays").upsert(payload);
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "holiday_saved", entityType: "holidays", details: payload });
  revalidatePath("/app/admin/holidays");
}

export async function deleteHoliday(formData: FormData) {
  const { supabase, profile } = await requireRole(["admin"]);
  const id = String(formData.get("id"));
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorId: profile.id, action: "holiday_deleted", entityType: "holidays", entityId: id });
  revalidatePath("/app/admin/holidays");
}
