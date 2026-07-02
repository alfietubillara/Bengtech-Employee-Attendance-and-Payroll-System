import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocationTester } from "@/components/location-tester";
import type { Branch, Profile } from "@/lib/types";

export default async function LocationTestPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile?.branch_id) redirect("/app");

  const { data: branch } = await supabase.from("branches").select("*").eq("id", profile.branch_id).single<Branch>();
  if (!branch) redirect("/app");

  return (
    <LocationTester
      branchName={branch.name}
      branchLatitude={Number(branch.latitude)}
      branchLongitude={Number(branch.longitude)}
      allowedRadius={Number(branch.allowed_radius_meters)}
    />
  );
}
