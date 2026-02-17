import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    console.warn('⚠️ Supabase credentials missing during build. This is expected if they are not in Vercel yet.');
  } else {
    console.warn('Supabase credentials missing. Check your .env.local file.');
  }
}

// Create client with fallback empty strings to avoid crash at build time, 
// as long as we don't actually call any methods.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
