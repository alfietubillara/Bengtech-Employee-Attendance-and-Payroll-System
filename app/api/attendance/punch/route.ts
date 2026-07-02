import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { distanceInMeters } from "@/lib/geo";
import { statusForDutyPeriod, statusForTimeIn } from "@/lib/attendance";
import { SELFIE_BUCKET } from "@/lib/constants";
import type { Branch, DutyPeriod, Profile, PunchType } from "@/lib/types";
import { createHash } from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Login is required." }, { status: 401 });

  const body = (await request.json()) as {
    type: PunchType;
    selfiePath: string;
    originalSelfiePath: string;
    latitude: number;
    longitude: number;
    dutyPeriod?: DutyPeriod;
    deviceId?: string;
    deviceLabel?: string;
    userAgent?: string;
  };

  if (!["time_in", "time_out"].includes(body.type)) return NextResponse.json({ error: "Invalid attendance action." }, { status: 400 });
  if (!body.selfiePath || !body.originalSelfiePath || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json({ error: "Selfie and GPS location are required." }, { status: 400 });
  }
  if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
    return NextResponse.json({ error: "Valid GPS coordinates are required." }, { status: 400 });
  }
  if (!body.deviceId || body.deviceId.length < 16) {
    return NextResponse.json({ error: "This phone is not registered for attendance. Please refresh the page and try again." }, { status: 400 });
  }

  const dutyPeriod = body.dutyPeriod || "full_day";
  if (!["full_day", "morning_half", "afternoon_half"].includes(dutyPeriod)) {
    return NextResponse.json({ error: "Invalid duty option." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (profileError || !profile || profile.status !== "Active" || !profile.branch_id) {
    return NextResponse.json({ error: "Your employee profile is not active." }, { status: 403 });
  }

  const { data: branch } = await admin.from("branches").select("*").eq("id", profile.branch_id).single<Branch>();
  if (!branch) return NextResponse.json({ error: "Assigned branch was not found." }, { status: 400 });

  const deviceHash = createHash("sha256").update(`${profile.id}:${body.deviceId}`).digest("hex");
  const { data: registeredDevice } = await admin.from("employee_devices").select("*").eq("employee_id", profile.id).maybeSingle();

  if (!registeredDevice) {
    const { error } = await admin.from("employee_devices").insert({
      employee_id: profile.id,
      device_id_hash: deviceHash,
      device_label: String(body.deviceLabel || "").slice(0, 120),
      user_agent: String(body.userAgent || request.headers.get("user-agent") || "").slice(0, 500),
      registered_at: new Date().toISOString(),
      last_used_at: new Date().toISOString()
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (registeredDevice.device_id_hash !== deviceHash) {
    return NextResponse.json(
      {
        error:
          "This account is already registered to another phone. Please use the registered phone or request admin approval to reset your device."
      },
      { status: 403 }
    );
  } else {
    await admin.from("employee_devices").update({ last_used_at: new Date().toISOString() }).eq("id", registeredDevice.id);
  }

  if (
    body.selfiePath === body.originalSelfiePath ||
    !body.selfiePath.startsWith(`${profile.id}/watermarked/`) ||
    !body.originalSelfiePath.startsWith(`${profile.id}/original/`)
  ) {
    return NextResponse.json({ error: "Valid original and watermarked selfies are required." }, { status: 400 });
  }

  const [watermarkedObject, originalObject] = await Promise.all([
    admin.storage.from(SELFIE_BUCKET).download(body.selfiePath),
    admin.storage.from(SELFIE_BUCKET).download(body.originalSelfiePath)
  ]);
  if (watermarkedObject.error || originalObject.error || !watermarkedObject.data?.size || !originalObject.data?.size) {
    return NextResponse.json({ error: "Selfie upload could not be verified." }, { status: 400 });
  }

  const distance = distanceInMeters(
    { latitude: body.latitude, longitude: body.longitude },
    { latitude: Number(branch.latitude), longitude: Number(branch.longitude) }
  );

  if (distance > Number(branch.allowed_radius_meters)) {
    const attemptedAt = new Date().toISOString();
    await Promise.all([
      admin.from("gps_incidents").insert({
        employee_id: profile.id,
        branch_id: profile.branch_id,
        punch_type: body.type,
        latitude: body.latitude,
        longitude: body.longitude,
        distance_meters: Math.round(distance),
        allowed_radius_meters: branch.allowed_radius_meters,
        attempted_at: attemptedAt,
        message: "Employee attempted attendance outside allowed GPS perimeter."
      }),
      admin.from("admin_notifications").insert({
        title: "Outside GPS perimeter",
        message: `${profile.full_name} attempted ${body.type === "time_in" ? "Time In" : "Time Out"} for ${branch.name} outside the allowed GPS perimeter.`,
        employee_id: profile.id,
        branch_id: profile.branch_id,
        latitude: body.latitude,
        longitude: body.longitude,
        created_at: attemptedAt
      })
    ]);
    return NextResponse.json(
      {
        error: `You are outside the allowed branch location. Assigned branch: ${branch.name}. Distance: ${Math.round(distance)}m. Allowed: ${branch.allowed_radius_meters}m.`
      },
      { status: 403 }
    );
  }

  const now = new Date();
  const { data: serverDate } = await admin.rpc("current_ph_date");
  const attendanceDate = serverDate || now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  const { data: existing } = await admin
    .from("attendance_records")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("attendance_date", attendanceDate)
    .maybeSingle();

  const hour = Number(
    new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).formatToParts(now).find((part) => part.type === "hour")?.value || 0
  );
  if (body.type === "time_in" && dutyPeriod === "afternoon_half" && hour < 12) {
    return NextResponse.json({ error: "Afternoon half-day Time In is available after 12:00 PM." }, { status: 409 });
  }
  if (body.type === "time_out" && existingDutyPeriod(existing?.duty_period) === "morning_half" && hour < 12) {
    return NextResponse.json({ error: "Morning half-day Time Out must be submitted in the afternoon." }, { status: 409 });
  }

  if (body.type === "time_in") {
    if (existing?.time_in_at) return NextResponse.json({ error: "You already timed in today." }, { status: 409 });
    if (existing?.status === "Absent" && dutyPeriod !== "afternoon_half") {
      return NextResponse.json({ error: "An absence was already generated for this morning. Select Half Day - Afternoon to continue." }, { status: 409 });
    }
    const payload = {
      employee_id: profile.id,
      branch_id: profile.branch_id,
      attendance_date: attendanceDate,
      time_in_at: now.toISOString(),
      time_in_selfie_path: body.selfiePath,
      time_in_selfie_original_path: body.originalSelfiePath,
      time_in_latitude: body.latitude,
      time_in_longitude: body.longitude,
      status: statusForDutyPeriod(dutyPeriod, statusForTimeIn(now)),
      duty_period: dutyPeriod
    };
    const query = existing ? admin.from("attendance_records").update(payload).eq("id", existing.id) : admin.from("attendance_records").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!existing?.time_in_at) return NextResponse.json({ error: "Time In is required before Time Out." }, { status: 409 });
  if (existing.time_out_at) return NextResponse.json({ error: "You already timed out today." }, { status: 409 });

  const { error } = await admin
    .from("attendance_records")
    .update({
      time_out_at: now.toISOString(),
      time_out_selfie_path: body.selfiePath,
      time_out_selfie_original_path: body.originalSelfiePath,
      time_out_latitude: body.latitude,
      time_out_longitude: body.longitude
    })
    .eq("id", existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function existingDutyPeriod(value: unknown): DutyPeriod {
  return value === "morning_half" || value === "afternoon_half" ? value : "full_day";
}
