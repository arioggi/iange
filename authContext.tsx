// src/authContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  appUser: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  
  const isMounted = useRef(true);

  // Función principal que carga los datos del perfil
  const loadAppUser = async (sbUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .single();

      if (!isMounted.current) return;

      if (error) {
        console.error("❌ [Auth] Error cargando perfil:", error.message);
        // Importante: No retornamos error fatal, dejamos que la app decida qué hacer si user es null
        return; 
      }

      if (data) {
        const mappedUser: User = {
            id: data.id,
            email: data.email || sbUser.email || '',
            name: data.full_name || 'Usuario',
            role: data.role || 'asesor',
            photo: data.avatar_url || '',
            tenantId: data.tenant_id,
            permissions: data.permissions || {},
            
            // --- CORRECCIÓN CLAVE ---
            // Prioridad: 1. Perfil personalizado, 2. Teléfono de registro (Auth), 3. Vacío
            phone: data.phone || sbUser.phone || '', 
        };
        setAppUser(mappedUser);
      }
    } catch (err) {
      console.error("💥 [Auth] Error inesperado:", err);
    }
  };

  const refreshUser = async () => {
    if (authUser) await loadAppUser(authUser);
  };

  useEffect(() => {
    isMounted.current = true;

    const handleSession = async (session: Session | null) => {
        if (!isMounted.current) return;

        if (session?.user) {
            setAuthUser(session.user);
            await loadAppUser(session.user);
            if (isMounted.current) setStatus("authenticated");
        } else {
            setAuthUser(null);
            setAppUser(null);
            if (isMounted.current) setStatus("unauthenticated");
        }
    };

    // 1. Cargar sesión existente al inicio
    supabase.auth.getSession().then(({ data }) => {
        handleSession(data.session);
    });

    // 2. Escuchar cambios (login, logout, refresh token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });

    return () => {
        isMounted.current = false;
        subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (isMounted.current) {
        setAuthUser(null);
        setAppUser(null);
        setStatus("unauthenticated");
    }
  };

  const value: AuthContextValue = { status, authUser, appUser, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};