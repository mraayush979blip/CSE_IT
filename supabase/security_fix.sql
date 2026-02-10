-- SECURITY HARDENING SCRIPT
-- Run this in your Supabase SQL Editor to secure the application for production.

-- 1. Helper Functions to check roles efficiently
-- Function to check if the current user is an Admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  ) OR (
    auth.jwt() ->> 'email' IN ('hod@acropolis.in', 'acro472007@acropolis.in')
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
-- Read: Authenticated
-- Write: Admin (Create/Delete), User (Update Own)
create policy "Admin can manage profiles" on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Allow implicit self-registration if needed (optional, safer to restrict to Admin)
-- For this app, it seems students might self-register? 
-- The code shows `createStudent` uses `supabase.auth.signUp`.
-- If the client calls `profiles.insert`, they need permission.
-- Let's allow users to insert their *own* profile on signup if matches auth.uid().
create policy "Users can insert own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

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

-- 5. ADMIN PASSWORD RESET FUNCTION
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
