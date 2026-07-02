import { Smartphone, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { formatDateTime } from "@/lib/utils";
import { resetEmployeeDevice } from "./actions";

export default async function DevicesPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase
    .from("employee_devices")
    .select("*, profiles(full_name,email,branches(name))")
    .order("reset_requested_at", { ascending: false, nullsFirst: false })
    .order("registered_at", { ascending: false });

  const devices = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Registered Phones</h1>
        <p className="text-sm text-slate-500">Each employee is locked to the first phone/browser used for attendance.</p>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Last Used</th>
                <th className="px-4 py-3">Reset Request</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{device.profiles?.full_name}</div>
                    <div className="text-xs text-slate-500">{device.profiles?.email}</div>
                  </td>
                  <td className="px-4 py-3">{device.profiles?.branches?.name || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone size={16} />
                      <span>{device.device_label || "Registered phone"}</span>
                    </div>
                    <div className="mt-1 max-w-xs truncate text-xs text-slate-500">{device.user_agent}</div>
                  </td>
                  <td className="px-4 py-3">{formatDateTime(device.registered_at)}</td>
                  <td className="px-4 py-3">{formatDateTime(device.last_used_at)}</td>
                  <td className="px-4 py-3">
                    {device.reset_requested_at ? (
                      <div>
                        <div className="font-semibold text-red-700">{formatDateTime(device.reset_requested_at)}</div>
                        <div className="max-w-xs text-xs text-slate-500">{device.reset_request_reason}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form action={resetEmployeeDevice}>
                      <input type="hidden" name="id" value={device.id} />
                      <button className="btn-secondary" type="submit">
                        <Trash2 size={16} />
                        Delete Device
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {!devices.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                    No phones registered yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
