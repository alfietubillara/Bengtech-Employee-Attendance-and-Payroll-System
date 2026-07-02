"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";

export async function upsertBranch(formData: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = String(formData.get("id") || "");
  const payload = {
    name: String(formData.get("name") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    latitude: Number(formData.get("latitude")),
    longitude: Number(formData.get("longitude")),
    allowed_radius_meters: Number(formData.get("allowed_radius_meters") || 100)
  };
  const { error } = id ? await supabase.from("branches").update(payload).eq("id", id) : await supabase.from("branches").insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath("/app/admin/branches");
}
