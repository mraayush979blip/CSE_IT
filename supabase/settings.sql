
-- SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for login page)
DROP POLICY IF EXISTS "Settings are readable by all" ON public.system_settings;
CREATE POLICY "Settings are readable by all" ON public.system_settings
    FOR SELECT USING (true);

-- Only admins can modify settings
DROP POLICY IF EXISTS "Admin can manage settings" ON public.system_settings;
CREATE POLICY "Admin can manage settings" ON public.system_settings
    FOR ALL 
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Insert default value for student login
INSERT INTO public.system_settings (key, value)
VALUES ('student_login_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;
