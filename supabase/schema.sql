create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'manager', 'employee');
create type employee_status as enum ('Active', 'Inactive');
create type attendance_status as enum ('Present', 'Late', 'Absent', 'Day Off', 'Missing Time Out', 'Approved Leave', 'Half Day Morning', 'Half Day Afternoon');
create type duty_period as enum ('full_day', 'morning_half', 'afternoon_half');
create type punch_type as enum ('time_in', 'time_out');
create type request_status as enum ('Pending', 'Approved', 'Rejected');
create type leave_type as enum ('Sick Leave', 'Emergency Leave', 'Vacation Leave', 'Unpaid Leave');

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  allowed_radius_meters integer not null default 100,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text unique,
  full_name text not null,
  role user_role not null default 'employee',
  branch_id uuid references branches(id),
  position text not null default 'Staff',
  daily_rate numeric(10, 2) not null default 0,
  required_work_hours_per_day numeric(5, 2) not null default 10,
  contact_number text,
  status employee_status not null default 'Active',
  profile_photo_path text,
  day_off integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  branch_id uuid not null references branches(id),
  attendance_date date not null,
  time_in_at timestamptz,
  time_out_at timestamptz,
  time_in_selfie_path text,
  time_out_selfie_path text,
  time_in_selfie_original_path text,
  time_out_selfie_original_path text,
  time_in_latitude numeric(10, 7),
  time_in_longitude numeric(10, 7),
  time_out_latitude numeric(10, 7),
  time_out_longitude numeric(10, 7),
  status attendance_status not null default 'Present',
  duty_period duty_period not null default 'full_day',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create table cash_advances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  payroll_month text not null,
  payroll_period text not null default 'first_half' check (payroll_period in ('first_half', 'second_half')),
  amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table gps_incidents (
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

create table employee_devices (
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

create table admin_notifications (
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

create table day_off_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  created_at timestamptz not null default now(),
  unique(employee_id, day_of_week)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  leave_type leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status request_status not null default 'Pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create table attendance_correction_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  attendance_date date not null,
  requested_time_in timestamptz,
  requested_time_out timestamptz,
  reason text not null,
  status request_status not null default 'Pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now()
);

create table allowances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  payroll_month text not null,
  payroll_period text not null default 'first_half' check (payroll_period in ('first_half', 'second_half')),
  amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table deductions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  payroll_month text not null,
  payroll_period text not null default 'first_half' check (payroll_period in ('first_half', 'second_half')),
  amount numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table overtime_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  payroll_month text not null,
  payroll_period text not null default 'first_half' check (payroll_period in ('first_half', 'second_half')),
  hours numeric(8, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table payroll_records (
  id uuid primary key default gen_random_uuid(),
  payroll_month text not null,
  payroll_period text not null default 'first_half' check (payroll_period in ('first_half', 'second_half')),
  employee_id uuid not null references profiles(id) on delete cascade,
  employee_name text not null,
  branch_name text not null,
  daily_rate numeric(10, 2) not null,
  required_work_hours_per_day numeric(5, 2) not null default 10,
  hourly_rate numeric(10, 2) not null default 0,
  present_days integer not null,
  paid_days numeric(8, 2) not null default 0,
  late_days integer not null,
  absent_days integer not null,
  half_days integer not null default 0,
  total_late_minutes integer not null default 0,
  total_undertime_minutes integer not null default 0,
  total_overtime_minutes integer not null default 0,
  overtime_hours numeric(8, 2) not null default 0,
  overtime_multiplier numeric(5, 2) not null default 1.25,
  basic_pay numeric(10, 2) not null default 0,
  allowance numeric(10, 2) not null default 0,
  bonus_pay numeric(10, 2) not null default 0,
  cash_advance numeric(10, 2) not null default 0,
  other_deductions numeric(10, 2) not null default 0,
  gross_pay numeric(10, 2) not null,
  late_deduction numeric(10, 2) not null,
  undertime_deduction numeric(10, 2) not null default 0,
  absent_deduction numeric(10, 2) not null,
  overtime_pay numeric(10, 2) not null,
  holiday_pay numeric(10, 2) not null default 0,
  total_deductions numeric(10, 2) not null default 0,
  net_salary numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  unique(payroll_month, payroll_period, employee_id)
);

create table payroll_locks (
  id uuid primary key default gen_random_uuid(),
  payroll_month text not null,
  payroll_period text not null check (payroll_period in ('first_half', 'second_half')),
  locked_by uuid references profiles(id),
  locked_at timestamptz not null default now(),
  unique(payroll_month, payroll_period)
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  multiplier numeric(5, 2) not null default 2.0,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table employee_notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings(key, value) values
  ('opening_time', '"08:00"'),
  ('closing_time', '"18:00"'),
  ('absent_cutoff_time', '"09:00"'),
  ('overtime_multiplier', '1.25')
on conflict (key) do nothing;

create or replace function current_ph_date()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;

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

alter table branches enable row level security;
alter table profiles enable row level security;
alter table attendance_records enable row level security;
alter table employee_devices enable row level security;
alter table gps_incidents enable row level security;
alter table admin_notifications enable row level security;
alter table cash_advances enable row level security;
alter table day_off_schedules enable row level security;
alter table leave_requests enable row level security;
alter table attendance_correction_requests enable row level security;
alter table allowances enable row level security;
alter table deductions enable row level security;
alter table overtime_entries enable row level security;
alter table payroll_records enable row level security;
alter table payroll_locks enable row level security;
alter table holidays enable row level security;
alter table audit_logs enable row level security;
alter table employee_notifications enable row level security;
alter table settings enable row level security;

create or replace function app_current_role()
returns user_role
language sql
stable
security definer
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function app_current_branch()
returns uuid
language sql
stable
security definer
as $$
  select branch_id from profiles where id = auth.uid();
$$;

create policy "profiles self read" on profiles for select using (id = auth.uid() or app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch()));
create policy "profiles admin write" on profiles for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

create policy "branches readable" on branches for select using (auth.uid() is not null);
create policy "branches admin write" on branches for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

create policy "attendance scoped read" on attendance_records for select using (
  employee_id = auth.uid()
  or app_current_role() = 'admin'
  or (app_current_role() = 'manager' and branch_id = app_current_branch())
);
create policy "attendance admin manager write" on attendance_records for all using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
) with check (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);

create policy "employee devices scoped read" on employee_devices for select using (employee_id = auth.uid() or app_current_role() = 'admin');
create policy "employee devices admin write" on employee_devices for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

create policy "gps incidents admin manager read" on gps_incidents for select using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);
create policy "gps incidents admin write" on gps_incidents for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

create policy "admin notifications admin manager read" on admin_notifications for select using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);
create policy "admin notifications admin update" on admin_notifications for update using (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
) with check (
  app_current_role() = 'admin' or (app_current_role() = 'manager' and branch_id = app_current_branch())
);

create policy "payroll scoped read" on payroll_records for select using (employee_id = auth.uid() or app_current_role() = 'admin');
create policy "payroll admin write" on payroll_records for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "cash scoped read" on cash_advances for select using (employee_id = auth.uid() or app_current_role() = 'admin');
create policy "cash admin write" on cash_advances for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "day off admin read write" on day_off_schedules for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "leave scoped read" on leave_requests for select using (employee_id = auth.uid() or app_current_role() = 'admin' or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch())));
create policy "leave employee insert" on leave_requests for insert with check (employee_id = auth.uid());
create policy "leave admin manager update" on leave_requests for update using (app_current_role() = 'admin' or app_current_role() = 'manager') with check (app_current_role() = 'admin' or app_current_role() = 'manager');
create policy "correction scoped read" on attendance_correction_requests for select using (employee_id = auth.uid() or app_current_role() = 'admin' or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch())));
create policy "correction employee insert" on attendance_correction_requests for insert with check (employee_id = auth.uid());
create policy "correction admin manager update" on attendance_correction_requests for update using (app_current_role() = 'admin' or app_current_role() = 'manager') with check (app_current_role() = 'admin' or app_current_role() = 'manager');
create policy "allowance scoped read" on allowances for select using (
  employee_id = auth.uid()
  or app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
);
create policy "allowance admin manager write" on allowances for all using (
  app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
) with check (
  app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
);
create policy "deduction admin read write" on deductions for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "overtime admin read write" on overtime_entries for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "payroll locks admin read write" on payroll_locks for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "holidays authenticated read" on holidays for select using (auth.uid() is not null);
create policy "holidays admin write" on holidays for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');
create policy "audit admin read" on audit_logs for select using (app_current_role() = 'admin');
create policy "audit admin insert" on audit_logs for insert with check (app_current_role() = 'admin');
create policy "employee notifications scoped read" on employee_notifications for select using (employee_id = auth.uid() or app_current_role() = 'admin');
create policy "employee notifications scoped update" on employee_notifications for update using (employee_id = auth.uid() or app_current_role() = 'admin') with check (employee_id = auth.uid() or app_current_role() = 'admin');
create policy "settings admin read write" on settings for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

insert into storage.buckets (id, name, public) values
  ('attendance-selfies', 'attendance-selfies', false),
  ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "authenticated selfie upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attendance-selfies'
  and (storage.foldername(name))[1] = auth.uid()::text
  and ((storage.foldername(name))[2] = 'original' or (storage.foldername(name))[2] = 'watermarked')
);

create policy "authenticated profile upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos');
