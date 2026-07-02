alter table profiles add column if not exists required_work_hours_per_day numeric(5, 2) not null default 10;

alter table payroll_records add column if not exists required_work_hours_per_day numeric(5, 2) not null default 10;
alter table payroll_records add column if not exists hourly_rate numeric(10, 2) not null default 0;
alter table payroll_records add column if not exists total_late_minutes integer not null default 0;
alter table payroll_records add column if not exists total_undertime_minutes integer not null default 0;
alter table payroll_records add column if not exists total_overtime_minutes integer not null default 0;
alter table payroll_records add column if not exists basic_pay numeric(10, 2) not null default 0;
alter table payroll_records add column if not exists bonus_pay numeric(10, 2) not null default 0;
alter table payroll_records add column if not exists undertime_deduction numeric(10, 2) not null default 0;
alter table payroll_records add column if not exists total_deductions numeric(10, 2) not null default 0;
alter table payroll_records add column if not exists overtime_multiplier numeric(5, 2) not null default 1.25;

insert into settings(key, value)
values ('overtime_multiplier', '1.25')
on conflict (key) do update set value = excluded.value;
