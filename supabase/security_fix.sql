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
