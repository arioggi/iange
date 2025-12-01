// supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("🔴 Supabase env vars missing", { supabaseUrl, supabaseAnonKey });
  throw new Error(
    "Missing Supabase env vars. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Render."
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
