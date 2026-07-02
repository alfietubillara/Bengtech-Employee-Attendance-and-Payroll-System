import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    process.env[key] = value;
  }
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function main() {
  loadEnv();

  const [, , email, password, ...nameParts] = process.argv;
  const fullName = nameParts.join(" ").trim() || "Bengtech Admin";

  if (!email || !password) {
    console.log("Usage: npm run setup:admin -- admin@email.com StrongPassword \"Full Name\"");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !url.startsWith("https://") || !url.includes(".supabase.co")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL.");
  }

  if (!serviceKey || serviceKey.includes("your-")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  let user = await findUserByEmail(admin, email);

  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (created.error) throw created.error;
    user = created.data.user;
    console.log(`Created Supabase Auth user: ${email}`);
  } else {
    const updated = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (updated.error) throw updated.error;
    console.log(`Updated existing Supabase Auth user password: ${email}`);
  }

  const { data: firstBranch } = await admin.from("branches").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email,
    username: "admin",
    full_name: fullName,
    role: "admin",
    branch_id: firstBranch?.id || null,
    position: "Owner",
    daily_rate: 0,
    contact_number: null,
    status: "Active",
    day_off: []
  });

  if (profileError) throw profileError;

  console.log("Admin profile is ready.");
  console.log(`Login email: ${email}`);
}

main().catch((error) => {
  if (error?.cause?.code === "ENOTFOUND" || error?.code === "ENOTFOUND") {
    console.error("Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.");
    console.error("It must be the exact Project URL from Supabase, for example: https://abcdefghijk.supabase.co");
    console.error("Open Supabase Dashboard > Project Settings > Data API, then copy Project URL.");
    process.exit(1);
  }
  console.error(error.message || error);
  process.exit(1);
});
