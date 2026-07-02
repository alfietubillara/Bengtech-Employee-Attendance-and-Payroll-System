import { Building2 } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { upsertBranch } from "./actions";

export default async function BranchesPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("branches").select("*").order("name");
  const branches = data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Branches</h1>
        <p className="text-sm text-slate-500">GPS coordinates and allowed radius control attendance validation.</p>
      </div>

      <form action={upsertBranch} className="panel grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-5">
        <input className="field" name="name" placeholder="Branch name" required />
        <input className="field lg:col-span-2" name="address" placeholder="Address" required />
        <input className="field" name="latitude" type="number" step="0.000001" placeholder="Latitude" required />
        <input className="field" name="longitude" type="number" step="0.000001" placeholder="Longitude" required />
        <input className="field" name="allowed_radius_meters" type="number" placeholder="Radius meters" defaultValue={100} required />
        <button className="btn-primary md:col-span-2 lg:col-span-5" type="submit">
          <Building2 size={18} />
          Add Branch
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {branches.map((branch) => (
          <form key={branch.id} action={upsertBranch} className="panel grid gap-3 p-4">
            <input type="hidden" name="id" value={branch.id} />
            <input className="field" name="name" defaultValue={branch.name} required />
            <input className="field" name="address" defaultValue={branch.address} required />
            <div className="grid grid-cols-2 gap-3">
              <input className="field" name="latitude" type="number" step="0.000001" defaultValue={branch.latitude} required />
              <input className="field" name="longitude" type="number" step="0.000001" defaultValue={branch.longitude} required />
            </div>
            <input className="field" name="allowed_radius_meters" type="number" defaultValue={branch.allowed_radius_meters} required />
            <button className="btn-secondary" type="submit">
              Save Changes
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
