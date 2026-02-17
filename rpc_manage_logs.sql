-- Function to update an attendance log (Edit Time)
-- Used for the "Inline Edit" feature in Timesheet Reports.
-- Sets a metadata flag "edited_manual" to true for highlighting.

create or replace function update_attendance_log (
  p_log_id uuid,
  p_new_timestamp timestamptz
)
returns void
language plpgsql
security definer -- Admin privileges to update
set search_path = public
as $$
begin
  update attendance_logs
  set 
    timestamp = p_new_timestamp,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"edited_manual": true}'::jsonb,
    is_valid = true -- Assume manual edit makes it valid
  where id = p_log_id;
end;
$$;

-- Function to delete ALL logs for a user on a specific date (Clear Row)
-- Used for the "Delete Line" feature.

create or replace function delete_user_daily_logs (
  p_user_id uuid,
  p_date date -- 'YYYY-MM-DD'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from attendance_logs
  where user_id = p_user_id
  and date(timestamp at time zone 'UTC') = p_date;
end;
$$;

-- Function to insert a manual log (Add missing punch)
-- Used when a cell is empty and admin types a time.
create or replace function insert_manual_log (
  p_user_id uuid,
  p_timestamp timestamptz,
  p_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into attendance_logs (
    user_id,
    type,
    timestamp,
    location_id,
    verification_method,
    latitude,
    longitude,
    is_valid,
    metadata
  ) values (
    p_user_id,
    p_type,
    p_timestamp,
    '00000000-0000-0000-0000-000000000001', -- Default HQ
    'manual',
    0, 0,
    true,
    '{"edited_manual": true}'::jsonb
  ) returning id into new_id;
  
  return new_id;
end;
$$;
