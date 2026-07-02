"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Login is required.");
  return { supabase, userId: data.user.id };
}

export async function createLeaveRequest(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  const { error } = await supabase.from("leave_requests").insert({
    employee_id: userId,
    leave_type: String(formData.get("leave_type")),
    start_date: String(formData.get("start_date")),
    end_date: String(formData.get("end_date")),
    reason: String(formData.get("reason") || "")
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/requests");
}

export async function createCorrectionRequest(formData: FormData) {
  const { supabase, userId } = await currentUserId();
  const date = String(formData.get("attendance_date"));
  const timeIn = String(formData.get("requested_time_in") || "");
  const timeOut = String(formData.get("requested_time_out") || "");
  const { error } = await supabase.from("attendance_correction_requests").insert({
    employee_id: userId,
    attendance_date: date,
    requested_time_in: timeIn ? `${date}T${timeIn}:00+08:00` : null,
    requested_time_out: timeOut ? `${date}T${timeOut}:00+08:00` : null,
    reason: String(formData.get("reason") || "")
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/requests");
}
