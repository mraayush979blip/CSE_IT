
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
    role text check (role in ('ADMIN', 'FACULTY', 'STUDENT')),
    branch_id text references public.branches(id) on delete set null,
    batch_id text references public.batches(id) on delete set null,
    enrollment_id text,
    roll_no text,
    mobile_no text,
    password text -- For administrative reference if needed, though Supabase manages passwords
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
    lecture_slot integer
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

-- 3. RLS Policies (Simplified for now, can be tightened later)
alter table public.branches enable row level security;
alter table public.batches enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;

-- Policies
create policy "Public Read for all" on public.branches for select using (true);
create policy "Public Read for all" on public.batches for select using (true);
create policy "Public Read for all" on public.subjects for select using (true);
create policy "Admin only write" on public.branches for all using (true); -- Simplified
create policy "Admin only write" on public.batches for all using (true);
create policy "Admin only write" on public.subjects for all using (true);

create policy "Users can see all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admin can insert profiles" on public.profiles for insert with check (true);

create policy "Faculty can see assignments" on public.assignments for select using (true);
create policy "Admin can manage allocations" on public.assignments for all using (true);
create policy "Faculty can see attendance" on public.attendance for select using (true);
create policy "Faculty can insert attendance" on public.attendance for insert with check (true);

create policy "Users can see their notifications" on public.notifications for select using (auth.uid() = to_user_id);
create policy "Users can update their notifications" on public.notifications for update using (auth.uid() = to_user_id);
create policy "Users can delete their notifications" on public.notifications for delete using (auth.uid() = to_user_id);
create policy "Users can insert notifications" on public.notifications for insert with check (true);
