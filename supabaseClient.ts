// supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

// Si faltan, solo mostramos error en consola, pero NO lanzamos excepción.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("👉 Supabase env vars missing 😭", {
    supabaseUrl,
    supabaseAnonKey,
  });
}

// Exportamos supabase, o null si no se pudo crear
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
