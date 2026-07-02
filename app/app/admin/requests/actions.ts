"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

export async function reviewLeaveRequest(formData: FormData) {
  const { profile } = await requireRole(["admin", "manager"]);
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const adminNotes = String(formData.get("admin_notes") || "");

  const { data: request, error: fetchError } = await admin.from("leave_requests").select("*").eq("id", id).single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await admin
    .from("leave_requests")
    .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (status === "Approved") {
    const start = new Date(`${request.start_date}T00:00:00+08:00`);
    const end = new Date(`${request.end_date}T00:00:00+08:00`);
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const attendanceDate = date.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      await admin.from("attendance_records").upsert({
        employee_id: request.employee_id,
        branch_id: (await branchForEmployee(admin, request.employee_id)) || null,
        attendance_date: attendanceDate,
        status: "Approved Leave",
        notes: `${request.leave_type}: ${request.reason}`
      });
    }
  }

  await admin.from("employee_notifications").insert({
    employee_id: request.employee_id,
    title: `Leave ${status}`,
    message: `Your ${request.leave_type} request was ${status.toLowerCase()}.`
  });
  await writeAudit({ actorId: profile.id, action: `leave_${status.toLowerCase()}`, entityType: "leave_requests", entityId: id, details: { adminNotes } });
  revalidatePath("/app/admin/requests");
}

export async function reviewCorrectionRequest(formData: FormData) {
  const { profile } = await requireRole(["admin", "manager"]);
  const admin = createAdminClient();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const adminNotes = String(formData.get("admin_notes") || "");
  const { data: request, error: fetchError } = await admin.from("attendance_correction_requests").select("*").eq("id", id).single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await admin
    .from("attendance_correction_requests")
    .update({ status, reviewed_by: profile.id, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (status === "Approved") {
    const branchId = await branchForEmployee(admin, request.employee_id);
    await admin.from("attendance_records").upsert({
      employee_id: request.employee_id,
      branch_id: branchId,
      attendance_date: request.attendance_date,
      time_in_at: request.requested_time_in,
      time_out_at: request.requested_time_out,
      status: "Present",
      notes: `Approved correction: ${request.reason}`
    });
  }

  await admin.from("employee_notifications").insert({
    employee_id: request.employee_id,
    title: `Attendance Correction ${status}`,
    message: `Your attendance correction request for ${request.attendance_date} was ${status.toLowerCase()}.`
  });
  await writeAudit({ actorId: profile.id, action: `correction_${status.toLowerCase()}`, entityType: "attendance_correction_requests", entityId: id, details: { adminNotes } });
  revalidatePath("/app/admin/requests");
}

async function branchForEmployee(admin: ReturnType<typeof createAdminClient>, employeeId: string) {
  const { data } = await admin.from("profiles").select("branch_id").eq("id", employeeId).single();
  return data?.branch_id;
}
