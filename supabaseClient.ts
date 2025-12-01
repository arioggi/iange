import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Pequeña validación para no morir silenciosamente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env vars missing', {
    supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
}

export const supabase = createClient(
  supabaseUrl as string,
  supabaseAnonKey as string
);
