
import { createClient } from '@supabase/supabase-js';

const isVercel = typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost'));
const supabaseUrl = isVercel
    ? `${window.location.origin}/api/supabase`
    : (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Special client for creating other users without swapping the admin's current session
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sb-acropolis-auth-temp' // Unique key to avoid 'Multiple instances' warning
    }
});
