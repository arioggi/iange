/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly GEMINI_API_KEY: string; // la que ya usabas
  // aquí puedes ir añadiendo más VITE_... si los necesitas
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}