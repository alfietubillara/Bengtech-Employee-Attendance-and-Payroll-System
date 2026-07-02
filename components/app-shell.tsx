import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Archive, BarChart3, Building2, CalendarDays, Clock3, ClipboardCheck, History, LogOut, MapPin, ReceiptText, Smartphone, Users } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { NotificationBell } from "@/components/admin/notification-bell";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

const nav = [
  { href: "/app", label: "Today", icon: Clock3, roles: ["admin", "manager", "employee"] },
  { href: "/app/location-test", label: "GPS Test", icon: MapPin, roles: ["admin", "manager", "employee"] },
  { href: "/app/my-records", label: "My Records", icon: CalendarDays, roles: ["employee"] },
  { href: "/app/requests", label: "Requests", icon: ClipboardCheck, roles: ["employee"] },
  { href: "/app/admin", label: "Dashboard", icon: BarChart3, roles: ["admin", "manager"] },
  { href: "/app/admin/requests", label: "Requests", icon: ClipboardCheck, roles: ["admin", "manager"] },
  { href: "/app/admin/employees", label: "Employees", icon: Users, roles: ["admin"] },
  { href: "/app/admin/devices", label: "Phones", icon: Smartphone, roles: ["admin"] },
  { href: "/app/admin/branches", label: "Branches", icon: Building2, roles: ["admin"] },
  { href: "/app/admin/payroll", label: "Payroll", icon: ReceiptText, roles: ["admin", "manager"] },
  { href: "/app/admin/holidays", label: "Holidays", icon: CalendarDays, roles: ["admin"] },
  { href: "/app/admin/reports", label: "Reports", icon: CalendarDays, roles: ["admin", "manager"] }
  ,
  { href: "/app/admin/backup", label: "Backup", icon: Archive, roles: ["admin"] },
  { href: "/app/admin/audit", label: "Audit", icon: History, roles: ["admin"] }
];

export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single<Profile>();
  if (!profile) redirect("/login");

  const visibleNav = nav.filter((item) => item.roles.includes(profile.role));
  const { data: notifications = [] } =
    profile.role === "admin" || profile.role === "manager"
      ? await supabase.from("admin_notifications").select("id,title,message,latitude,longitude,read_at,created_at").order("created_at", { ascending: false }).limit(20)
      : { data: [] };

  return (
    <div className="min-h-screen bg-beng-mist">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-beng-green font-bold text-white">B</div>
            <div>
              <div className="font-bold leading-tight text-beng-ink">Bengtech</div>
              <div className="text-xs text-slate-500">{profile.full_name}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {profile.role === "admin" || profile.role === "manager" ? <NotificationBell initialNotifications={notifications ?? []} /> : null}
            <form action={signOut}>
              <button className="btn-secondary h-10 px-3" type="submit" aria-label="Logout" title="Logout">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-beng-ink"
            >
              <item.icon size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
