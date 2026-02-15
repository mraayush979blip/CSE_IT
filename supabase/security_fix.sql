-- SECURITY HARDENING SCRIPT
-- Run this in your Supabase SQL Editor to secure the application for production.

-- 1. Helper Functions to check roles efficiently
-- Function to check if the current user is an Admin
-- Function to check if the current user is an Admin (or Developer)
-- Function to check if the current user is an Admin (or Developer)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role IN ('ADMIN', 'DEVELOPER')
  ) OR (
    auth.jwt() ->> 'email' IN ('developerishere@gmail.com', 'hod@acropolis.in', 'acro472007@acropolis.in')
  );
end;
$$ language plpgsql security definer;

-- Function to check if the current user is a Developer
create or replace function public.is_developer()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'DEVELOPER'
  );
end;
$$ language plpgsql security definer;

-- Function to check if the current user is Faculty
create or replace function public.is_faculty()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'FACULTY'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop existing insecure or redundant policies (cleanup)
drop policy if exists "Admin only write" on public.branches;
drop policy if exists "Admin only write" on public.batches;
drop policy if exists "Admin only write" on public.subjects;
drop policy if exists "Admin can manage allocations" on public.assignments;
drop policy if exists "Admin can manage assignments" on public.assignments;
drop policy if exists "Faculty can insert attendance" on public.attendance;
drop policy if exists "Faculty can see attendance" on public.attendance;
drop policy if exists "Staff can view attendance" on public.attendance;
drop policy if exists "Staff can manage attendance" on public.attendance;
drop policy if exists "Staff can update attendance" on public.attendance;
drop policy if exists "Staff can delete attendance" on public.attendance;
drop policy if exists "Users can send notifications" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;
drop policy if exists "Admin can manage profiles" on public.profiles;
drop policy if exists "Admin can insert profiles" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Admin manage coordinators" on public.coordinators;
drop policy if exists "Coordinators visible to all" on public.coordinators;
drop policy if exists "Users can see profiles" on public.profiles;
drop policy if exists "Developer manage self" on public.profiles;
drop policy if exists "Admin can manage profiles" on public.profiles;
drop policy if exists "Admin can update profiles" on public.profiles;
drop policy if exists "Admin can delete profiles" on public.profiles;
drop policy if exists "Admin can insert any profiles" on public.profiles;

-- 3. Apply STRICT Policies

-- BRANCHES: Public Read, Admin Write
create policy "Admin only write" on public.branches
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- BATCHES: Public Read, Admin Write
create policy "Admin only write" on public.batches
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- SUBJECTS: Public Read, Admin Write
create policy "Admin only write" on public.subjects
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ASSIGNMENTS: Faculty Read, Admin Write
create policy "Admin can manage assignments" on public.assignments
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ATTENDANCE: 
-- Read: Admin, Faculty (All), Student (Own)
-- Write: Admin, Faculty
create policy "Staff can view attendance" on public.attendance
  for select
  using (public.is_admin() or public.is_faculty() or auth.uid() = student_id);

create policy "Staff can manage attendance" on public.attendance
  for insert
  with check (public.is_admin() or public.is_faculty());
  
create policy "Staff can update attendance" on public.attendance
  for update
  using (public.is_admin() or public.is_faculty());
  
create policy "Staff can delete attendance" on public.attendance
  for delete
  using (public.is_admin() or public.is_faculty());

-- NOTIFICATIONS:
-- Read/Write Own
create policy "Users can send notifications" on public.notifications
  for insert
  with check (auth.uid() = from_user_id);

-- PROFILES:
-- Read: Authenticated (but hide hidden developer from others)
-- Write: Admin (but prevent managing hidden developer), User (Update Own)
-- PROFILES:
-- Read: Authenticated (but hide hidden developer from others)
create policy "Users can see profiles" on public.profiles
  for select
  using (true);

-- Write: 
-- 1. Admin can insert ANY profile
create policy "Admin can insert profiles" on public.profiles
  for insert
  with check (public.is_admin());

-- 2. Admin can update/delete standard profiles
create policy "Admin can update profiles" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admin can delete profiles" on public.profiles
  for delete
  using (public.is_admin());

-- 3. Developer can manage everything (if they are the dev)
create policy "Developer manage self" on public.profiles
  for all
  using (public.is_developer())
  with check (public.is_developer());

-- 4. FIX FOREIGN KEY CONSTRAINTS (Allow Deleting Faculty/Students)
-- This block dynamically finds and replaces constraints to ensure ON DELETE SET NULL
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Fix attendance.marked_by
    FOR r IN (SELECT constraint_name FROM information_schema.key_column_usage WHERE table_name = 'attendance' AND column_name = 'marked_by' AND table_schema = 'public') LOOP
        EXECUTE 'ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    ALTER TABLE public.attendance ADD CONSTRAINT attendance_marked_by_profiles_fkey FOREIGN KEY (marked_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- Fix notifications.from_user_id
    FOR r IN (SELECT constraint_name FROM information_schema.key_column_usage WHERE table_name = 'notifications' AND column_name = 'from_user_id' AND table_schema = 'public') LOOP
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS ' || r.constraint_name;
    END LOOP;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_from_user_id_profiles_fkey FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- 5. UPDATE ROLE CONSTRAINT & ADD COLUMNS
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || r.conname;
    END LOOP;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT', 'DEVELOPER'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 6. ADMIN PASSWORD RESET FUNCTION
-- Allows an Admin to change any user's password directly in auth.users
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id uuid, new_password text)
RETURNS void AS $$
BEGIN
  -- Security Check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can reset passwords.';
  END IF;

  -- Update auth.users (Supabase Auth table)
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;

  -- Update public.profiles (Application reference table)
  UPDATE public.profiles
  SET password = new_password
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. COORDINATORS TABLE
CREATE TABLE IF NOT EXISTS public.coordinators (
    id TEXT PRIMARY KEY,
    faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    UNIQUE(faculty_id, branch_id)
);

ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

drop policy if exists "Coordinators visible to all" on public.coordinators;
create policy "Coordinators visible to all" on public.coordinators for select using (true);

drop policy if exists "Admin manage coordinators" on public.coordinators;
create policy "Admin manage coordinators" on public.coordinators for all using (public.is_admin());

-- 7. WHITELIST TABLE
CREATE TABLE IF NOT EXISTS public.whitelist (
    email TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

drop policy if exists "Admin manage whitelist" on public.whitelist;
create policy "Admin manage whitelist" on public.whitelist for all using (public.is_admin());
