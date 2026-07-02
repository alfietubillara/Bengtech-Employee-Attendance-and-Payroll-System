import { Trash2, UserPlus } from "lucide-react";
import { requireRole } from "@/lib/authz";
import { formatPeso } from "@/lib/utils";
import { deleteEmployee, updateEmployeeAccess, upsertEmployee } from "./actions";

const days = [
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"]
];

export default async function EmployeesPage() {
  const { supabase } = await requireRole(["admin"]);
  const { data: branchData } = await supabase.from("branches").select("id,name").order("name");
  const { data: employeeData } = await supabase.from("profiles").select("*, branches(name)").order("full_name");
  const branches = branchData ?? [];
  const employees = employeeData ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-sm text-slate-500">Add employees, assign branch, rate, role, and day-off schedule.</p>
      </div>

      <form action={upsertEmployee} className="panel grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
        <input className="field" name="full_name" placeholder="Full name" required />
        <input className="field" name="email" type="email" placeholder="Email" required />
        <input className="field" name="username" placeholder="Username" />
        <input className="field" name="password" type="password" placeholder="Initial password" required />
        <select className="field" name="role" defaultValue="employee">
          <option value="employee">Employee</option>
          <option value="manager">Branch Manager</option>
          <option value="admin">Admin / Owner</option>
        </select>
        <select className="field" name="branch_id" required>
          <option value="">Branch</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <input className="field" name="position" placeholder="Position" required />
        <input className="field" name="daily_rate" type="number" min="0" step="0.01" placeholder="Daily rate" required />
        <input className="field" name="required_work_hours_per_day" type="number" min="1" step="0.25" placeholder="Required hours/day" defaultValue={10} required />
        <input className="field" name="contact_number" placeholder="Contact number" />
        <select className="field" name="status" defaultValue="Active">
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <div className="md:col-span-2 lg:col-span-4">
          <div className="label mb-2">Day Off</div>
          <div className="flex flex-wrap gap-2">
            {days.map(([value, label]) => (
              <label key={value} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                <input type="checkbox" name="day_off" value={value} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary md:col-span-2 lg:col-span-4" type="submit">
          <UserPlus size={18} />
          Add Employee
        </button>
      </form>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-4 py-3 font-semibold">{employee.full_name}</td>
                  <td className="px-4 py-3">{employee.branches?.name || "-"}</td>
                  <td className="px-4 py-3">{employee.position}</td>
                  <td className="px-4 py-3">{formatPeso(employee.daily_rate)}</td>
                  <td className="px-4 py-3">{employee.required_work_hours_per_day || 10}</td>
                  <td className="px-4 py-3 capitalize">{employee.role}</td>
                  <td className="px-4 py-3">{employee.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <form action={updateEmployeeAccess} className="flex gap-2">
                        <input type="hidden" name="id" value={employee.id} />
                        <select className="field min-w-32" name="role" defaultValue={employee.role}>
                          <option value="employee">Employee</option>
                          <option value="manager">Branch Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select className="field min-w-28" name="status" defaultValue={employee.status}>
                          <option>Active</option>
                          <option>Inactive</option>
                        </select>
                        <input className="field w-28" name="daily_rate" type="number" min="0" step="0.01" defaultValue={employee.daily_rate} />
                        <input className="field w-24" name="required_work_hours_per_day" type="number" min="1" step="0.25" defaultValue={employee.required_work_hours_per_day || 10} />
                        <button className="btn-secondary" type="submit">
                          Save
                        </button>
                      </form>
                      <form action={deleteEmployee}>
                        <input type="hidden" name="id" value={employee.id} />
                        <button className="btn-secondary px-3" type="submit" aria-label="Delete employee" title="Delete employee">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
