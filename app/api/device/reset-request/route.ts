import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Login is required." }, { status: 401 });

  const body = (await request.json()) as { reason?: string };
  const reason = String(body.reason || "").trim().slice(0, 300) || "Employee requested to change registered device.";
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile) return NextResponse.json({ error: "Employee profile was not found." }, { status: 404 });

  const now = new Date().toISOString();
  const { data: device } = await admin.from("employee_devices").select("id").eq("employee_id", profile.id).maybeSingle();
  if (!device) return NextResponse.json({ error: "No registered device found for your account." }, { status: 404 });

  const { error } = await admin
    .from("employee_devices")
    .update({ reset_requested_at: now, reset_request_reason: reason })
    .eq("employee_id", profile.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("admin_notifications").insert({
    title: "Device reset requested",
    message: `${profile.full_name} requested admin approval to change registered attendance phone.`,
    employee_id: profile.id,
    branch_id: profile.branch_id,
    created_at: now
  });

  return NextResponse.json({ ok: true });
}
