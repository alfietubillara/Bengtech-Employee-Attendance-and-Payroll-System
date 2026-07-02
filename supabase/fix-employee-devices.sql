-- Creates the employee_devices table needed by the one-phone attendance lock.
-- Safe to run more than once.

create table if not exists employee_devices (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade unique,
  device_id_hash text not null,
  device_label text,
  user_agent text,
  registered_at timestamptz not null default now(),
  last_used_at timestamptz,
  reset_requested_at timestamptz,
  reset_request_reason text,
  created_at timestamptz not null default now()
);

alter table employee_devices enable row level security;

drop policy if exists "employee devices scoped read" on employee_devices;
create policy "employee devices scoped read" on employee_devices
for select
using (employee_id = auth.uid() or app_current_role() = 'admin');

drop policy if exists "employee devices admin write" on employee_devices;
create policy "employee devices admin write" on employee_devices
for all
using (app_current_role() = 'admin')
with check (app_current_role() = 'admin');

notify pgrst, 'reload schema';
