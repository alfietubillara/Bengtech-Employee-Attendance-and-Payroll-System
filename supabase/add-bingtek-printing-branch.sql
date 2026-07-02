-- Replace the latitude and longitude values with the exact Bingtek Printing Services GPS coordinates.
-- Keep allowed_radius_meters at 50 as requested.

do $$
declare
  branch_latitude numeric := 7.4557667;
  branch_longitude numeric := 125.8045444;
begin
  if branch_latitude = 0 or branch_longitude = 0 then
    raise exception 'Replace branch_latitude and branch_longitude with the exact Bingtek Printing Services GPS coordinates before running this file.';
  end if;

  insert into branches (name, address, latitude, longitude, allowed_radius_meters)
  values (
    'Bingtek Printing Services',
    'Bingtek Printing Services',
    branch_latitude,
    branch_longitude,
    50
  )
  on conflict (name) do update set
    address = excluded.address,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    allowed_radius_meters = excluded.allowed_radius_meters;
end $$;
