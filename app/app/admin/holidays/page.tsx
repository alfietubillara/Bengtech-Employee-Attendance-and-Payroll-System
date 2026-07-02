import { Trash2 } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { deleteHoliday, saveHoliday } from "./actions";

export default async function HolidaysPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("holidays").select("*").order("holiday_date", { ascending: false });
  const holidays = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Holidays</h1>
        <p className="text-sm text-slate-500">Set holiday multipliers for payroll.</p>
      </div>
      <form action={saveHoliday} className="panel grid gap-3 p-4 md:grid-cols-4">
        <input className="field" type="date" name="holiday_date" required />
        <input className="field md:col-span-2" name="name" placeholder="Holiday name" required />
        <input className="field" type="number" step="0.25" min="1" name="multiplier" defaultValue="2" />
        <button className="btn-primary md:col-span-4" type="submit">Save Holiday</button>
      </form>
      <div className="panel divide-y divide-slate-100">
        {holidays.map((holiday) => (
          <div key={holiday.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">{holiday.name}</div>
              <div className="text-sm text-slate-500">{holiday.holiday_date} - {holiday.multiplier}x</div>
            </div>
            <form action={deleteHoliday}>
              <input type="hidden" name="id" value={holiday.id} />
              <button className="btn-secondary" type="submit"><Trash2 size={16} /></button>
            </form>
          </div>
        ))}
        {!holidays.length ? <div className="p-6 text-center text-sm text-slate-500">No holidays yet.</div> : null}
      </div>
    </div>
  );
}
