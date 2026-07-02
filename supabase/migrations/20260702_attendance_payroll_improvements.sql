do $$
begin
  alter type attendance_status add value if not exists 'Half Day Morning';
  alter type attendance_status add value if not exists 'Half Day Afternoon';
exception
  when undefined_object then null;
end $$;

do $$
begin
  create type duty_period as enum ('full_day', 'morning_half', 'afternoon_half');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type punch_type as enum ('time_in', 'time_out');
exception
  when duplicate_object then null;
end $$;

alter table attendance_records add column if not exists time_in_selfie_original_path text;
alter table attendance_records add column if not exists time_out_selfie_original_path text;
alter table attendance_records add column if not exists duty_period duty_period not null default 'full_day';

create table if not exists gps_incidents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  branch_id uuid references branches(id),
  punch_type punch_type not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  distance_meters integer,
  allowed_radius_meters integer,
  attempted_at timestamptz not null default now(),
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  employee_id uuid references profiles(id) on delete set null,
  branch_id uuid references branches(id) on delete set null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

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

alter table payroll_records add column if not exists paid_days numeric(8, 2) not null default 0;
alter table payroll_records add column if not exists half_days integer not null default 0;
alter table payroll_records add column if not exists payroll_period text not null default 'first_half';
alter table cash_advances add column if not exists payroll_period text not null default 'first_half';
alter table allowances add column if not exists payroll_period text not null default 'first_half';
alter table deductions add column if not exists payroll_period text not null default 'first_half';
alter table overtime_entries add column if not exists payroll_period text not null default 'first_half';

alter table payroll_records drop constraint if exists payroll_records_payroll_month_employee_id_key;
do $$
begin
  alter table payroll_records add constraint payroll_records_month_period_employee_key unique (payroll_month, payroll_period, employee_id);
exception
  when duplicate_object then null;
end $$;

alter table gps_incidents enable row level security;
alter table admin_notifications enable row level security;
alter table employee_devices enable row level security;

drop policy if exists "gps incidents admin manager read" on gps_incidents;
create policy "gps incidents admin manager read" on gps_incidents for select using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);

drop policy if exists "gps incidents admin write" on gps_incidents;
create policy "gps incidents admin write" on gps_incidents for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "admin notifications admin manager read" on admin_notifications;
create policy "admin notifications admin manager read" on admin_notifications for select using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);

drop policy if exists "admin notifications admin update" on admin_notifications;
create policy "admin notifications admin update" on admin_notifications for update using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
) with check (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);

drop policy if exists "employee devices scoped read" on employee_devices;
create policy "employee devices scoped read" on employee_devices for select using (employee_id = auth.uid() or app_current_role() = 'admin');
drop policy if exists "employee devices admin write" on employee_devices;
create policy "employee devices admin write" on employee_devices for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "payroll admin read write" on payroll_records;
drop policy if exists "payroll scoped read" on payroll_records;
create policy "payroll scoped read" on payroll_records for select using (employee_id = auth.uid() or app_current_role() = 'admin');
drop policy if exists "payroll admin write" on payroll_records;
create policy "payroll admin write" on payroll_records for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "cash admin read write" on cash_advances;
drop policy if exists "cash scoped read" on cash_advances;
create policy "cash scoped read" on cash_advances for select using (employee_id = auth.uid() or app_current_role() = 'admin');
drop policy if exists "cash admin write" on cash_advances;
create policy "cash admin write" on cash_advances for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "allowance admin read write" on allowances;
drop policy if exists "allowance scoped read" on allowances;
create policy "allowance scoped read" on allowances for select using (employee_id = auth.uid() or app_current_role() = 'admin');
drop policy if exists "allowance admin write" on allowances;
create policy "allowance admin write" on allowances for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

create or replace function mark_daily_absences(target_date date default current_ph_date())
returns void
language plpgsql
security definer
as $$
begin
  insert into attendance_records(employee_id, branch_id, attendance_date, status, notes)
  select p.id, p.branch_id, target_date,
    case when extract(dow from target_date)::int = any(p.day_off) then 'Day Off'::attendance_status else 'Absent'::attendance_status end,
    case when extract(dow from target_date)::int = any(p.day_off) then 'Scheduled day off' else 'No Time In by 9:00 AM' end
  from profiles p
  where p.status = 'Active'
    and p.branch_id is not null
    and not exists (
      select 1 from attendance_records a
      where a.employee_id = p.id and a.attendance_date = target_date
    );
end;
$$;

create or replace function mark_missing_timeouts(target_date date default current_ph_date())
returns void
language sql
security definer
as $$
  update attendance_records
  set status = 'Missing Time Out', updated_at = now()
  where attendance_date = target_date
    and time_in_at is not null
    and time_out_at is null
    and status in ('Present', 'Late', 'Half Day Morning', 'Half Day Afternoon');
$$;

do $$
begin
  alter publication supabase_realtime add table admin_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

drop policy if exists "authenticated selfie upload" on storage.objects;
create policy "authenticated selfie upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attendance-selfies'
  and (storage.foldername(name))[1] = auth.uid()::text
  and ((storage.foldername(name))[2] = 'original' or (storage.foldername(name))[2] = 'watermarked')
);
