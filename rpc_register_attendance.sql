-- Function to register attendance (Bypassing RLS)
-- Necessary because the Kiosk terminal usually runs as a different user (or anon) 
-- but needs to insert records on behalf of the identified employee.

create or replace function register_attendance_log (
  p_user_id uuid,
  p_location_id uuid,
  p_type text,
  p_method text,
  p_lat float,
  p_lng float
)
returns setof attendance_logs
language plpgsql
security definer -- Bypass RLS
set search_path = public
as $$
begin
  return query
  insert into attendance_logs (
    user_id, 
    location_id, 
    type, 
    verification_method, 
    latitude, 
    longitude, 
    is_valid
  )
  values (
    p_user_id, 
    p_location_id, 
    p_type, 
    p_method, 
    p_lat, 
    p_lng, 
    true
  )
  returning *;
end;
$$;
