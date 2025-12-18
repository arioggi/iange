// src/authContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User } from "./types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  user: User | null; 
  appUser: User | null; // Mantenemos este alias para que el resto de la App no se rompa
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null); 
  
  const isMounted = useRef(true);

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
            phone: data.phone || sbUser.phone || '', 
        };
        setUser(mappedUser);
      }
    } catch (err) {
      console.error("💥 [Auth] Error inesperado en authContext:", err);
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
            setUser(null);
            if (isMounted.current) setStatus("unauthenticated");
        }
    };
    supabase.auth.getSession().then(({ data }) => { handleSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { handleSession(session); });
    return () => { isMounted.current = false; subscription.unsubscribe(); };
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
        setUser(null);
        setStatus("unauthenticated");
    }
  };

  // Exportamos AMBOS nombres para que toda la App esté contenta
  const value: AuthContextValue = { status, authUser, user, appUser: user, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};