
-- SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for login page)
CREATE POLICY "Settings are readable by all" ON public.system_settings
    FOR SELECT USING (true);

-- Only admins can modify settings
CREATE POLICY "Admin can manage settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        ) OR (
            auth.jwt() ->> 'email' IN ('hod@acropolis.in', 'acro472007@acropolis.in')
        )
    );

-- Insert default value for student login
INSERT INTO public.system_settings (key, value)
VALUES ('student_login_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
