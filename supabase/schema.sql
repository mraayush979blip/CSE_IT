
-- 1. Enable 필요한 extensions
create extension if not exists "uuid-ossp";

-- 2. Create Tables

-- Branches Table
create table if not exists public.branches (
    id text primary key,
    name text not null
);

-- Batches Table
create table if not exists public.batches (
    id text primary key,
    name text not null,
    branch_id text references public.branches(id) on delete cascade
);

-- Subjects Table
create table if not exists public.subjects (
    id text primary key,
    name text not null,
    code text not null
);

-- Profiles Table (Links to Supabase Auth)
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    display_name text,
    role text check (role in ('ADMIN', 'FACULTY', 'STUDENT', 'DEVELOPER')),
    branch_id text references public.branches(id) on delete set null,
    batch_id text references public.batches(id) on delete set null,
    enrollment_id text,
    roll_no text,
    mobile_no text,
    password text, -- For administrative reference if needed, though Supabase manages passwords
    last_login timestamptz
);

-- Faculty Assignments Table
create table if not exists public.assignments (
    id text primary key,
    faculty_id uuid references public.profiles(id) on delete cascade,
    branch_id text references public.branches(id) on delete cascade,
    batch_id text, -- Can be 'ALL' or a specific ID
    subject_id text references public.subjects(id) on delete cascade
);

-- Attendance Records Table
create table if not exists public.attendance (
    id text primary key,
    date date not null,
    student_id uuid references public.profiles(id) on delete cascade,
    subject_id text references public.subjects(id) on delete cascade,
    branch_id text references public.branches(id) on delete cascade,
    batch_id text references public.batches(id) on delete cascade,
    is_present boolean not null,
    marked_by uuid references public.profiles(id),
    timestamp bigint not null,
    lecture_slot integer,
    reason text
);

-- Notifications Table
create table if not exists public.notifications (
    id text primary key,
    to_user_id uuid references public.profiles(id) on delete cascade,
    from_user_id uuid references public.profiles(id),
    from_user_name text,
    type text not null,
    status text default 'PENDING',
    data jsonb not null,
    timestamp bigint not null
);

-- Whitelist Table
create table if not exists public.whitelist (
    email text primary key,
    role text not null,
    created_at timestamptz default now()
);

-- 3. RLS Policies (Simplified for now, can be tightened later)
alter table public.branches enable row level security;
alter table public.batches enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;
alter table public.whitelist enable row level security;

-- Policies
drop policy if exists "Public Read for all" on public.branches;
create policy "Public Read for all" on public.branches for select using (true);

drop policy if exists "Public Read for all" on public.batches;
create policy "Public Read for all" on public.batches for select using (true);

drop policy if exists "Public Read for all" on public.subjects;
create policy "Public Read for all" on public.subjects for select using (true);

drop policy if exists "Admin only write" on public.branches;
create policy "Admin only write" on public.branches for all using (true); -- Simplified

drop policy if exists "Admin only write" on public.batches;
create policy "Admin only write" on public.batches for all using (true);

drop policy if exists "Admin only write" on public.subjects;
create policy "Admin only write" on public.subjects for all using (true);

drop policy if exists "Users can see all profiles" on public.profiles;
create policy "Users can see all profiles" on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Admin can insert profiles" on public.profiles;
create policy "Admin can insert profiles" on public.profiles for insert with check (public.is_admin());

drop policy if exists "Faculty can see assignments" on public.assignments;
create policy "Faculty can see assignments" on public.assignments for select using (true);

drop policy if exists "Admin can manage allocations" on public.assignments;
create policy "Admin can manage allocations" on public.assignments for all using (true);

drop policy if exists "Faculty can see attendance" on public.attendance;
create policy "Faculty can see attendance" on public.attendance for select using (true);

drop policy if exists "Faculty can insert attendance" on public.attendance;
create policy "Faculty can insert attendance" on public.attendance for insert with check (true);

drop policy if exists "Users can see their notifications" on public.notifications;
create policy "Users can see their notifications" on public.notifications for select using (auth.uid() = to_user_id);

drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications for update using (auth.uid() = to_user_id);

drop policy if exists "Users can delete their notifications" on public.notifications;
create policy "Users can delete their notifications" on public.notifications for delete using (auth.uid() = to_user_id);

drop policy if exists "Users can insert notifications" on public.notifications;
create policy "Users can insert notifications" on public.notifications for insert with check (true);

drop policy if exists "Admin manage whitelist" on public.whitelist;
create policy "Admin manage whitelist" on public.whitelist for all using (true);
