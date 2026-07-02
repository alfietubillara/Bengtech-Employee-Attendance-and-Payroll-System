import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    process.env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
}

async function main() {
  loadEnv();
  const [, , emailOrUsername, role = "employee"] = process.argv;
  if (!emailOrUsername || !["admin", "manager", "employee"].includes(role)) {
    console.log("Usage: npm run set:role -- email-or-username employee");
    process.exit(1);
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const query = admin.from("profiles").update({ role }).or(`email.eq.${emailOrUsername},username.eq.${emailOrUsername}`);
  const { data, error } = await query.select("email,username,full_name,role");
  if (error) throw error;
  if (!data?.length) throw new Error("No profile found for that email or username.");

  for (const row of data) {
    console.log(`${row.full_name} (${row.email || row.username}) is now ${row.role}.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
