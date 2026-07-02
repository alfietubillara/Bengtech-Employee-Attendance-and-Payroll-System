insert into branches (name, address, latitude, longitude, allowed_radius_meters) values
  ('Bengtech Gmall Tagum', 'Gaisano Mall of Tagum, Tagum City', 7.4475, 125.8077, 120),
  ('Bengtech Grandmall Nabunturan', 'Grandmall Nabunturan, Davao de Oro', 7.6078, 125.9662, 120),
  ('Bengtech Novo Nabunturan', 'Novo Nabunturan, Davao de Oro', 7.6069, 125.9668, 120),
  ('Bengtech Compostela', 'Compostela, Davao de Oro', 7.6730, 126.0889, 120)
on conflict (name) do update set
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  allowed_radius_meters = excluded.allowed_radius_meters;

-- Bingtek Printing Services should be added after replacing exact coordinates in:
-- supabase/add-bingtek-printing-branch.sql

-- Create sample users in Supabase Authentication first, then insert matching profile rows with their auth.users ids.
-- Example:
-- insert into profiles (id, email, username, full_name, role, branch_id, position, daily_rate, contact_number, status, day_off)
-- values (
--   'AUTH_USER_UUID_HERE',
--   'employee@bengtech.local',
--   'employee1',
--   'Sample Employee',
--   'employee',
--   (select id from branches where name = 'Bengtech Gmall Tagum'),
--   'Sales Staff',
--   500,
--   '09170000000',
--   'Active',
--   '{0}'
-- );
