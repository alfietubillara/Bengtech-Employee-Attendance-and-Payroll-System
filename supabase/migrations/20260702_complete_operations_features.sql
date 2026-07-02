do $$ begin
  create type request_status as enum ('Pending', 'Approved', 'Rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leave_type as enum ('Sick Leave', 'Emergency Leave', 'Vacation Leave', 'Unpaid Leave');
exception when duplicate_object then null; end $$;

create table if not exists leave_requests (
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

create table if not exists attendance_correction_requests (
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

create table if not exists payroll_locks (
  id uuid primary key default gen_random_uuid(),
  payroll_month text not null,
  payroll_period text not null check (payroll_period in ('first_half', 'second_half')),
  locked_by uuid references profiles(id),
  locked_at timestamptz not null default now(),
  unique(payroll_month, payroll_period)
);

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  multiplier numeric(5, 2) not null default 2.0,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists employee_notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table payroll_records add column if not exists holiday_pay numeric(10, 2) not null default 0;

alter table leave_requests enable row level security;
alter table attendance_correction_requests enable row level security;
alter table payroll_locks enable row level security;
alter table holidays enable row level security;
alter table audit_logs enable row level security;
alter table employee_notifications enable row level security;

drop policy if exists "leave scoped read" on leave_requests;
create policy "leave scoped read" on leave_requests for select using (employee_id = auth.uid() or app_current_role() = 'admin' or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch())));
drop policy if exists "leave employee insert" on leave_requests;
create policy "leave employee insert" on leave_requests for insert with check (employee_id = auth.uid());
drop policy if exists "leave admin manager update" on leave_requests;
create policy "leave admin manager update" on leave_requests for update using (app_current_role() = 'admin' or app_current_role() = 'manager') with check (app_current_role() = 'admin' or app_current_role() = 'manager');

drop policy if exists "correction scoped read" on attendance_correction_requests;
create policy "correction scoped read" on attendance_correction_requests for select using (employee_id = auth.uid() or app_current_role() = 'admin' or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch())));
drop policy if exists "correction employee insert" on attendance_correction_requests;
create policy "correction employee insert" on attendance_correction_requests for insert with check (employee_id = auth.uid());
drop policy if exists "correction admin manager update" on attendance_correction_requests;
create policy "correction admin manager update" on attendance_correction_requests for update using (app_current_role() = 'admin' or app_current_role() = 'manager') with check (app_current_role() = 'admin' or app_current_role() = 'manager');

drop policy if exists "payroll locks admin read write" on payroll_locks;
create policy "payroll locks admin read write" on payroll_locks for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "holidays authenticated read" on holidays;
create policy "holidays authenticated read" on holidays for select using (auth.uid() is not null);
drop policy if exists "holidays admin write" on holidays;
create policy "holidays admin write" on holidays for all using (app_current_role() = 'admin') with check (app_current_role() = 'admin');

drop policy if exists "audit admin read" on audit_logs;
create policy "audit admin read" on audit_logs for select using (app_current_role() = 'admin');
drop policy if exists "audit admin insert" on audit_logs;
create policy "audit admin insert" on audit_logs for insert with check (app_current_role() = 'admin');

drop policy if exists "employee notifications scoped read" on employee_notifications;
create policy "employee notifications scoped read" on employee_notifications for select using (employee_id = auth.uid() or app_current_role() = 'admin');
drop policy if exists "employee notifications scoped update" on employee_notifications;
create policy "employee notifications scoped update" on employee_notifications for update using (employee_id = auth.uid() or app_current_role() = 'admin') with check (employee_id = auth.uid() or app_current_role() = 'admin');

drop policy if exists "allowance scoped read" on allowances;
create policy "allowance scoped read" on allowances for select using (
  employee_id = auth.uid()
  or app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
);
drop policy if exists "allowance admin write" on allowances;
drop policy if exists "allowance admin manager write" on allowances;
create policy "allowance admin manager write" on allowances for all using (
  app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
) with check (
  app_current_role() = 'admin'
  or (app_current_role() = 'manager' and employee_id in (select id from profiles where branch_id = app_current_branch()))
);
