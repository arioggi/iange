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
  refreshUser: () => Promise<void>;
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
        // No lanzamos error para evitar loop, simplemente no hay perfil
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
            phone: data.phone || '',
        };
        setAppUser(mappedUser);
      }
    } catch (err) {
      console.error("[Auth] Error inesperado:", err);
    }
  };

  const refreshUser = async () => {
    if (authUser) await loadAppUser(authUser);
  };

  useEffect(() => {
    let isMounted = true;
    const initSession = async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setAuthUser(data.session.user);
          await loadAppUser(data.session.user);
          if (isMounted) setStatus("authenticated");
        } else {
          if (isMounted) setStatus("unauthenticated");
        }
    };
    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setAuthUser(session.user);
        await loadAppUser(session.user); 
        setStatus("authenticated");
      } else if (event === 'SIGNED_OUT') {
        setAuthUser(null);
        setAppUser(null);
        setStatus("unauthenticated");
      }
    });
    return () => { isMounted = false; authListener.subscription.unsubscribe(); };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAppUser(null);
    setStatus("unauthenticated");
  };

  const value: AuthContextValue = { status, authUser, appUser, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};