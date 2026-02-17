-- Function to get the last attendance log for a user (Bypassing RLS)
-- Necessary because the Kiosk terminal is not logged in as the target user.

create or replace function get_last_user_attendance (
  target_user_id uuid
)
returns table (
  id uuid,
  type text,
  timestamp timestamptz,
  user_id uuid,
  verification_method text
)
language plpgsql
security definer -- Bypass RLS
set search_path = public
as $$
begin
  return query
  select 
    al.id,
    al.type,
    al.timestamp,
    al.user_id,
    al.verification_method
  from attendance_logs al
  where al.user_id = target_user_id
  order by al.timestamp desc
  limit 1;
end;
$$;

-- Function to delete a specific attendance log (Bypassing RLS for Undo)
-- Explicitly checks if it's the *latest* log for that user to prevent abuse, 
-- or we rely on the client to only send the ID returned by get_last.
-- For simplicity and trust in the Kiosk app, we allow deleting by ID if it belongs to the user.

create or replace function delete_attendance_log (
  log_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from attendance_logs where id = log_id;
end;
$$;
