
import { createClient } from '@supabase/supabase-js';

// --- 3rd Year (existing env vars — UNCHANGED, no Vercel changes needed) ---
const get3rdYearUrl = () => {
    const isVercel = typeof window !== 'undefined' &&
        (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost'));
    return isVercel
        ? `${window.location.origin}/api/supabase`
        : (import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co');
};
const KEY_3RD = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// --- 2nd Year (new env vars — add VITE_SUPABASE_URL_2ND & VITE_SUPABASE_ANON_KEY_2ND on Vercel) ---
const URL_2ND = import.meta.env.VITE_SUPABASE_URL_2ND || '';
const KEY_2ND = import.meta.env.VITE_SUPABASE_ANON_KEY_2ND || '';

// --- Year Selection Helper ---
export type YearMode = '2nd' | '3rd';
export const getYearMode = (): YearMode =>
    (localStorage.getItem('acro_year_mode') as YearMode) || '3rd';
export const setYearMode = (mode: YearMode) => {
    localStorage.setItem('acro_year_mode', mode);
    // Clear any cached data to prevent cross-contamination between years
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('acro_cache_')) {
            sessionStorage.removeItem(key);
        }
    }
    window.location.reload(); // Reload to re-initialise clients with correct credentials
};

// --- Active Credentials based on selection ---
const yearMode = getYearMode();
const supabaseUrl = yearMode === '2nd' ? URL_2ND : get3rdYearUrl();
const supabaseAnonKey = yearMode === '2nd' ? KEY_2ND : KEY_3RD;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Special client for creating other users without swapping the admin's current session
export const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'sb-acropolis-auth-temp'
    }
});
