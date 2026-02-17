-- Database Schema for Relógio de Ponto Pro

-- Enable extensions
create extension if not exists vector;

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'employee')) default 'employee',
  pin_code text, -- 4-6 digits for manual entry
  face_embedding vector(128), -- Descriptor from face-api.js
  work_start time, -- Expected start time (e.g., '09:00:00')
  work_end time,   -- Expected end time (e.g., '18:00:00')
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  message text not null,
  type text check (type in ('info', 'warning', 'alert')) default 'info',
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Work Schedules (Expected shifts)
create table if not exists public.work_schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  day_of_week integer check (day_of_week between 0 and 6) not null,
  pair_1_start time, pair_1_end time,
  pair_2_start time, pair_2_end time,
  pair_3_start time, pair_3_end time,
  pair_4_start time, pair_4_end time,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, day_of_week)
);

-- Vacation Requests
create table if not exists public.vacation_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  start_date date not null,
  end_date date not null,
  type text check (type in ('vacation', 'absence', 'other')) default 'vacation',
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  intensity text check (intensity in ('full', 'morning', 'afternoon', 'partial')) default 'full',
  start_time time,
  end_time time,
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (end_date >= start_date)
);

-- Locations (Geofencing targets)
create table if not exists public.locations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer default 30,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Attendance Logs (Picagens)
create table if not exists public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  location_id uuid references public.locations not null,
  type text check (type in ('entry', 'exit')) not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  latitude double precision not null,
  longitude double precision not null,
  verification_method text check (verification_method in ('face', 'biometric', 'pin')) not null,
  photo_proof_url text,
  is_valid boolean default true,
  metadata jsonb -- Extra info like browser/device
);

-- Security: Enable RLS
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.work_schedules enable row level security;
alter table public.vacation_requests enable row level security;

-- Policies for public.profiles
create policy "Profiles: Users can read own" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles: Admins read all" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Policies for public.locations
create policy "Locations: Everyone authenticated can read" on public.locations
  for select using (auth.role() = 'authenticated');

-- Policies for public.attendance_logs
create policy "Logs: Users can read own" on public.attendance_logs
  for select using (auth.uid() = user_id);

create policy "Logs: Users can insert own" on public.attendance_logs
  for insert with check (auth.uid() = user_id);

create policy "Logs: Admins can read all" on public.attendance_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Storage: Bucket for enrollment photos
-- Note: Buckets must be created via the Supabase dashboard, but policies can be SQL.
-- Assume bucket name "enrollments"

create policy "Enrollments: Admins can upload"
  on storage.objects for insert with check (
    bucket_id = 'enrollments' AND
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Enrollments: Public can read"
  on storage.objects for select using (bucket_id = 'enrollments');

-- Policies for public.notifications
create policy "Notifications: Users read own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Notifications: Admins read all" on public.notifications
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Notifications: System can insert" on public.notifications
  for insert with check (true); -- Usually handled by service role or edge functions

-- Policies for public.work_schedules
create policy "Schedules: Users can read own" on public.work_schedules
  for select using (auth.uid() = user_id);

create policy "Schedules: Admins can manage all" on public.work_schedules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Policies for public.vacation_requests
create policy "Vacations: Users can read own" on public.vacation_requests
  for select using (auth.uid() = user_id);

create policy "Vacations: Users can insert own" on public.vacation_requests
  for insert with check (auth.uid() = user_id);

create policy "Vacations: Admins can manage all" on public.vacation_requests
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Vacations: Everyone can read approved for team view" on public.vacation_requests
  for select using (status = 'approved');
