import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function requireRole(roles: Role[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile || !roles.includes(profile.role)) redirect("/app");
  return { supabase, profile };
}
