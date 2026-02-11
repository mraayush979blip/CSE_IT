-- PERFORMANCE OPTIMIZATION SCRIPT
-- Run this in your Supabase SQL Editor to speed up reports and queries.

-- 1. ATTENDANCE TABLE INDEXES (Most critical for speed)
-- Speeds up the "Daily Attendance Monitor" and "Report Management"
CREATE INDEX IF NOT EXISTS idx_attendance_date_branch ON public.attendance (date, branch_id);

-- Speeds up the "Student Dashboard" and individual student history
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance (student_id);

-- Speeds up subject-specific reports and filtering
CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON public.attendance (subject_id);

-- Speeds up batch-wise filtering
CREATE INDEX IF NOT EXISTS idx_attendance_batch_id ON public.attendance (batch_id);


-- 2. PROFILES TABLE INDEXES
-- Speeds up Admin student lists filtered by Class
CREATE INDEX IF NOT EXISTS idx_profiles_role_branch ON public.profiles (role, branch_id);

-- Speeds up Login and Search by Enrollment ID
CREATE INDEX IF NOT EXISTS idx_profiles_enrollment ON public.profiles (enrollment_id);

-- Speeds up sorting by Serial No (Legacy roll_no)
CREATE INDEX IF NOT EXISTS idx_profiles_roll_no ON public.profiles (roll_no);


-- 3. ASSIGNMENTS & COORDINATORS INDEXES
-- Speeds up Faculty Dashboard loading (showing their assigned classes)
CREATE INDEX IF NOT EXISTS idx_assignments_faculty_id ON public.assignments (faculty_id);

-- Speeds up Class Co-ordinator verification during login
CREATE INDEX IF NOT EXISTS idx_coordinators_faculty_id ON public.coordinators (faculty_id);


-- 4. NOTIFICATIONS INDEXES
-- Speeds up the notification bell and unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_to_user_status ON public.notifications (to_user_id, status);

-- 5. VACUUM ANALYZE (Tells the database to update its statistics for the new indexes)
ANALYZE public.attendance;
ANALYZE public.profiles;
