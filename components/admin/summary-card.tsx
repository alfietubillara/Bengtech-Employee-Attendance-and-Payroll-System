import type { LucideIcon } from "lucide-react";

export function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: LucideIcon; tone: string }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-beng-ink">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-md ${tone}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
