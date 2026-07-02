import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { shouldMarkAbsent } from "@/lib/attendance";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const admin = createAdminClient();

  if (shouldMarkAbsent(now)) {
    const { error } = await admin.rpc("mark_daily_absences");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hour = Number(
    new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", hour12: false }).formatToParts(now).find((part) => part.type === "hour")?.value || 0
  );
  if (hour >= 18) {
    const { error } = await admin.rpc("mark_missing_timeouts");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ranAt: now.toISOString() });
}
