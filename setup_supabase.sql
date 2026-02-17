-- #############################################################################
-- RELÓGIO DE PONTO PRO - SUPABASE SETUP (ALL RPCS)
-- #############################################################################
-- INSTRUÇÕES: Copie e cole TODO este script no SQL Editor do Supabase e execute.
-- #############################################################################

-- 1. FACIAL MATCHING
drop function if exists match_profile_faces(vector(128), float, int);
create or replace function match_profile_faces (
  query_embedding vector(128),
  match_threshold float,
  match_count int
)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select *
  from profiles
  where (face_embedding <-> query_embedding) < match_threshold
  order by face_embedding <-> query_embedding
  limit match_count;
end;
$$;

-- 2. SMART PROTOCOL: GET LAST PUNCH
drop function if exists get_last_user_attendance(uuid);
drop function if exists get_last_user_attendance(text);
create or replace function get_last_user_attendance (
  p_user_id text -- Using text for better JS compatibility, casted to uuid below
)
returns table (
  id uuid,
  type text,
  "timestamp" timestamptz,
  user_id uuid,
  verification_method text
)
language plpgsql
security definer
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
  where al.user_id = p_user_id::uuid
  order by al.timestamp desc
  limit 1;
end;
$$;

-- 3. SMART PROTOCOL: REGISTER ATTENDANCE
drop function if exists register_attendance_log(uuid, uuid, text, text, float, float);
drop function if exists register_attendance_log(text, text, text, text, float, float);
create or replace function register_attendance_log (
  p_user_id text,
  p_location_id text,
  p_type text,
  p_method text,
  p_lat float,
  p_lng float
)
returns setof attendance_logs
language plpgsql
security definer
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
    p_user_id::uuid, 
    p_location_id::uuid, 
    p_type, 
    p_method, 
    p_lat, 
    p_lng, 
    true
  )
  returning *;
end;
$$;

-- 4. SMART PROTOCOL: SWITCH TYPE (CORRECT ACTION)
drop function if exists switch_attendance_log_type(uuid);
drop function if exists switch_attendance_log_type(text);
create or replace function switch_attendance_log_type (
  p_log_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_type text;
  new_type text;
begin
  select type into current_type from attendance_logs where id = p_log_id::uuid;
  
  if current_type is null then return null; end if;

  if current_type = 'entry' then new_type := 'exit';
  else new_type := 'entry'; end if;

  update attendance_logs set type = new_type where id = p_log_id::uuid;
  return new_type;
end;
$$;

-- 5. ADMIN: UPDATE LOG (EDIT TIME)
drop function if exists update_attendance_log(uuid, timestamptz);
drop function if exists update_attendance_log(text, timestamptz);
create or replace function update_attendance_log (
  p_log_id text,
  p_new_timestamp timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update attendance_logs
  set 
    timestamp = p_new_timestamp,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"edited_manual": true}'::jsonb,
    is_valid = true
  where id = p_log_id::uuid;
end;
$$;

-- 6. ADMIN: DELETE DAILY LOGS (CLEAR ROW)
drop function if exists delete_user_daily_logs(uuid, date);
drop function if exists delete_user_daily_logs(text, date);
create or replace function delete_user_daily_logs (
  p_user_id text,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from attendance_logs
  where user_id = p_user_id::uuid
  and (timestamp at time zone 'UTC')::date = p_date;
end;
$$;

-- 7. ADMIN: INSERT MANUAL LOG
create or replace function insert_manual_log (
  p_user_id text,
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
    p_user_id::uuid,
    p_type,
    p_timestamp,
    '00000000-0000-0000-0000-000000000001',
    'manual',
    0, 0,
    true,
    '{"edited_manual": true}'::jsonb
  ) returning id into new_id;
  
  return new_id;
end;
$$;

-- 8. ADMIN: MANAGE WORK SCHEDULES
drop function if exists upsert_work_schedule(text, int, time, time, time, time, time, time, time, time);
create or replace function upsert_work_schedule (
  p_user_id text,
  p_day_of_week int,
  p_p1_start time, p_p1_end time,
  p_p2_start time, p_p2_end time,
  p_p3_start time, p_p3_end time,
  p_p4_start time, p_p4_end time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into work_schedules (
    user_id, day_of_week, 
    pair_1_start, pair_1_end, 
    pair_2_start, pair_2_end, 
    pair_3_start, pair_3_end, 
    pair_4_start, pair_4_end
  )
  values (
    p_user_id::uuid, p_day_of_week, 
    p_p1_start, p_p1_end, 
    p_p2_start, p_p2_end, 
    p_p3_start, p_p3_end, 
    p_p4_start, p_p4_end
  )
  on conflict (user_id, day_of_week) 
  do update set
    pair_1_start = p_p1_start, pair_1_end = p_p1_end,
    pair_2_start = p_p2_start, pair_2_end = p_p2_end,
    pair_3_start = p_p3_start, pair_3_end = p_p3_end,
    pair_4_start = p_p4_start, pair_4_end = p_p4_end;
end;
$$;

-- 9. VACATIONS: REQUEST VACATION
drop function if exists request_vacation(text, date, date, text);
drop function if exists request_vacation(text, date, date, text, text, time, time);
create or replace function request_vacation (
  p_user_id text,
  p_start_date date,
  p_end_date date,
  p_type text,
  p_intensity text default 'full',
  p_start_time time default null,
  p_end_time time default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into vacation_requests (
    user_id, start_date, end_date, type, intensity, start_time, end_time
  )
  values (
    p_user_id::uuid, p_start_date, p_end_date, p_type, p_intensity, p_start_time, p_end_time
  )
  returning id into new_id;
  
  return new_id;
end;
$$;

-- 10. ADMIN: VALIDATE VACATION
drop function if exists validate_vacation(text, text, text);
create or replace function validate_vacation (
  p_request_id text,
  p_status text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update vacation_requests
  set status = p_status, admin_notes = p_notes
  where id = p_request_id::uuid;
end;
$$;

-- 11. TEAM VIEW: GET APPROVED VACATIONS
drop function if exists get_team_vacations();
create or replace function get_team_vacations()
returns table (
  id uuid,
  full_name text,
  start_date date,
  end_date date,
  type text,
  intensity text,
  start_time time,
  end_time time
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    vr.id,
    p.full_name,
    vr.start_date,
    vr.end_date,
    vr.type,
    vr.intensity,
    vr.start_time,
    vr.end_time
  from vacation_requests vr
  join profiles p on vr.user_id = p.id
  where vr.status = 'approved'
  order by vr.start_date asc;
end;
$$;

-- 12. SECURITY: VERIFY PIN FOR MANUAL ACCESS
drop function if exists verify_profile_pin(uuid, text);
drop function if exists verify_profile_pin(text, text);
create or replace function verify_profile_pin (
  p_user_id text,
  p_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matches boolean;
begin
  select (pin_code = p_pin) into matches
  from profiles
  where id = p_user_id::uuid;
  
  return coalesce(matches, false);
end;
$$;

-- 13. SECURITY: GET PUBLIC EMPLOYEE LIST
create or replace function get_employee_list()
returns table (
  id uuid,
  full_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.id, p.full_name
  from profiles p
  order by p.full_name asc;
end;
$$;
-- 14. SECURITY: GET PROFILE BY ID (BYPASS RLS FOR PORTAL)
create or replace function get_profile_by_id(p_user_id text)
returns setof profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select * from profiles
  where id = p_user_id::uuid;
end;
$$;
-- 15. VACATION: GET EMPLOYEE PORTAL DATA
create or replace function get_employee_portal_data(p_user_id text)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  start_date date,
  end_date date,
  status text,
  type text,
  intensity text,
  start_time time,
  end_time time,
  calendar_color text,
  is_own boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    vr.id,
    vr.user_id,
    p.full_name,
    vr.start_date,
    vr.end_date,
    vr.status,
    vr.type,
    vr.intensity,
    vr.start_time,
    vr.end_time,
    '#00E5FF'::text as calendar_color, -- Default color, could be from profiles
    (vr.user_id = p_user_id::uuid) as is_own
  from vacation_requests vr
  join profiles p on vr.user_id = p.id
  where 
    (vr.user_id = p_user_id::uuid) -- Own regardless of status
    or (vr.status = 'approved'); -- Team only approved
end;
$$;

-- 16. VACATION: GET STATS FOR DASHBOARD
create or replace function get_vacation_stats(p_user_id text)
returns table (
  entitlement integer,
  scheduled integer,
  taken integer,
  pending integer,
  fixed integer,
  available integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := p_user_id::uuid;
  v_entitlement integer := 22; -- Default allowance
  v_taken integer;
  v_scheduled integer;
  v_pending integer;
begin
  -- Calculate Taken (Approved and past)
  select count(*)::integer into v_taken
  from vacation_requests
  where user_id = v_uid and status = 'approved' and start_date < current_date;

  -- Calculate Scheduled (Approved and future/today)
  select count(*)::integer into v_scheduled
  from vacation_requests
  where user_id = v_uid and status = 'approved' and start_date >= current_date;

  -- Calculate Pending
  select count(*)::integer into v_pending
  from vacation_requests
  where user_id = v_uid and status = 'pending';

  return query
  select 
    v_entitlement as entitlement,
    v_scheduled as scheduled,
    v_taken as taken,
    v_pending as pending,
    0 as fixed,
    (v_entitlement - v_taken - v_scheduled) as available;
end;
$$;

-- 17. VACATION: CANCEL OWN PENDING REQUEST
create or replace function cancel_vacation(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from vacation_requests
  where id = p_request_id 
    and (status = 'pending' or status = 'rejected') -- Allow deleting if not approved yet
    and user_id = auth.uid(); -- Extra safety check
  
  return found;
end;
$$;
