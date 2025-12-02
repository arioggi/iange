// src/authContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  appUser: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);

  const loadAppUser = async (sbUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .single();

      if (error) {
        console.error("[Auth] Error cargando perfil:", error.message);
        setAppUser(null);
        return;
      }

      if (data) {
        const mappedUser: User = {
            id: data.id,
            email: data.email || sbUser.email || '',
            name: data.full_name || 'Usuario',
            role: data.role || 'asesor',
            photo: data.avatar_url || 'VP',
            tenantId: data.tenant_id,
            permissions: data.permissions,
            phone: data.phone || '',
        };
        setAppUser(mappedUser);
      }
    } catch (err) {
      console.error("[Auth] Error inesperado:", err);
      setAppUser(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        // 1. Verificar sesión actual
        const { data } = await supabase.auth.getSession();
        
        if (data?.session?.user) {
          setAuthUser(data.session.user);
          // Esperamos a cargar el perfil ANTES de decir que estamos listos
          await loadAppUser(data.session.user);
          if (isMounted) setStatus("authenticated");
        } else {
          if (isMounted) setStatus("unauthenticated");
        }
      } catch (error) {
        console.error("[Auth] Error inicializando:", error);
        if (isMounted) setStatus("unauthenticated");
      }
      // NOTA: No necesitamos 'finally' aquí porque los if/else cubren los casos,
      // pero el try/catch asegura que no muera silenciosamente.
    };

    initSession();

    // 2. Escuchar cambios
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setAuthUser(session.user);
        // Recargamos perfil al iniciar sesión explícitamente
        await loadAppUser(session.user); 
        setStatus("authenticated");
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setAppUser(null);
        setStatus("unauthenticated");
      }
      // Ignoramos otros eventos como TOKEN_REFRESHED para no causar re-renders innecesarios
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };
    
    // No seteamos estado manual aquí, dejamos que onAuthStateChange lo maneje
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAppUser(null);
    setStatus("unauthenticated");
  };

  const value: AuthContextValue = {
    status,
    authUser,
    appUser,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};