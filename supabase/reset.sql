-- WARNING: This removes the Bengtech app database objects.
-- Supabase does not allow direct SQL deletion from storage.objects.
-- Delete files/buckets from Storage in the Supabase dashboard if you also want stored selfies removed.
-- Run this only when you want a clean Supabase setup for this project.

drop policy if exists "authenticated selfie upload" on storage.objects;
drop policy if exists "authenticated profile upload" on storage.objects;

drop table if exists payroll_records cascade;
drop table if exists payroll_locks cascade;
drop table if exists employee_notifications cascade;
drop table if exists audit_logs cascade;
drop table if exists holidays cascade;
drop table if exists overtime_entries cascade;
drop table if exists deductions cascade;
drop table if exists allowances cascade;
drop table if exists cash_advances cascade;
drop table if exists day_off_schedules cascade;
drop table if exists attendance_correction_requests cascade;
drop table if exists leave_requests cascade;
drop table if exists admin_notifications cascade;
drop table if exists employee_devices cascade;
drop table if exists gps_incidents cascade;
drop table if exists attendance_records cascade;
drop table if exists settings cascade;
drop table if exists profiles cascade;
drop table if exists branches cascade;

drop function if exists mark_missing_timeouts(date) cascade;
drop function if exists mark_daily_absences(date) cascade;
drop function if exists current_ph_date() cascade;
drop function if exists app_current_branch() cascade;
drop function if exists app_current_role() cascade;
drop function if exists current_branch() cascade;

drop type if exists punch_type cascade;
drop type if exists leave_type cascade;
drop type if exists request_status cascade;
drop type if exists duty_period cascade;
drop type if exists attendance_status cascade;
drop type if exists employee_status cascade;
drop type if exists user_role cascade;
