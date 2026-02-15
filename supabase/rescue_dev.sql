-- DATABASE RESCUE & CLEANUP SCRIPT (developerishere@gmail.com)
-- Run this in your Supabase SQL Editor to fix the "Database Error" and allow creation.

-- 1. CLEANUP: Remove any existing partial records to allow a fresh start
DELETE FROM auth.users WHERE email = 'developerishere@gmail.com';
DELETE FROM public.profiles WHERE email = 'developerishere@gmail.com';

-- 2. DYNAMICALLY FIX ROLE CONSTRAINT
-- This block finds the existing check constraint on the 'role' column and replaces it.
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

-- Add the new robust constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('ADMIN', 'FACULTY', 'STUDENT', 'DEVELOPER'));

-- 3. ENSURE INSERT POLICY IS PERMISSIVE FOR ADMINS
DROP POLICY IF EXISTS "Admin can insert any profiles" ON public.profiles;
CREATE POLICY "Admin can insert any profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- 4. VERIFY POLICY IDEMPOTENCY
DROP POLICY IF EXISTS "Developer manage self" ON public.profiles;
CREATE POLICY "Developer manage self" ON public.profiles
  FOR ALL
  USING (public.is_developer())
  WITH CHECK (public.is_developer());

-- 5. VERIFY DEVELOPER OVERRIDE Logic in is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'DEVELOPER')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
