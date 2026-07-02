"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");

  let email = login;
  if (!login.includes("@")) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("username", login).single();
    email = profile?.email || login;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("Invalid email/username or password.")}`);
  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
