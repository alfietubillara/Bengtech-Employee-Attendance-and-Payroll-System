"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, Check, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({ initialNotifications }: { initialNotifications: NotificationRow[] }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [pending, startTransition] = useTransition();
  const unread = useMemo(() => notifications.filter((item) => !item.read_at).length, [notifications]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, (payload) => {
        setNotifications((current) => [payload.new as NotificationRow, ...current].slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function markRead(id: string) {
    startTransition(async () => {
      const supabase = createClient();
      const readAt = new Date().toISOString();
      await supabase.from("admin_notifications").update({ read_at: readAt }).eq("id", id);
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read_at: readAt } : item)));
    });
  }

  return (
    <div className="relative">
      <button className="btn-secondary relative h-10 px-3" type="button" onClick={() => setOpen((value) => !value)} aria-label="Admin notifications" title="Admin notifications">
        <Bell size={18} />
        {unread ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">{unread}</span> : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(92vw,420px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="font-bold">GPS Alerts</div>
            <div className="text-xs text-slate-500">Outside-perimeter attendance attempts appear here immediately.</div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.map((item) => (
              <div key={item.id} className="border-b border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.title}</div>
                    <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                  </div>
                  {!item.read_at ? (
                    <button className="btn-secondary px-2 py-1" type="button" onClick={() => markRead(item.id)} disabled={pending} aria-label="Mark read" title="Mark read">
                      <Check size={15} />
                    </button>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <div>{formatDateTime(item.created_at)}</div>
                  {item.latitude !== null && item.longitude !== null ? (
                    <div className="flex items-center gap-1">
                      <MapPin size={13} />
                      {item.latitude}, {item.longitude}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {!notifications.length ? <div className="px-4 py-8 text-center text-sm text-slate-500">No GPS alerts yet.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
