-- Function to switch attendance type (Entry <-> Exit)
-- Used for the "Correct" feature when the Smart Protocol guesses wrong.

create or replace function switch_attendance_log_type (
  log_id uuid
)
returns text -- Returns the new type
language plpgsql
security definer -- Bypass RLS
set search_path = public
as $$
declare
  current_type text;
  new_type text;
begin
  -- Get current type
  select type into current_type from attendance_logs where id = log_id;
  
  if current_type is null then
    return null; -- Log not found
  end if;

  -- Determine new type
  if current_type = 'entry' then
    new_type := 'exit';
  else
    new_type := 'entry';
  end if;

  -- Update the log
  update attendance_logs
  set type = new_type
  where id = log_id;

  return new_type;
end;
$$;
