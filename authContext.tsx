// src/authContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabaseClient";
import {
  User as SupabaseUser,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import { User } from "./types"; // tu tipo de usuario de app

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  appUser: User | null; // fila de public.usuarios
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);

  // 👇 NUEVO: enlazamos Supabase Auth -> public.usuarios por EMAIL
  const loadAppUser = async (sbUser: SupabaseUser) => {
    console.log("[Auth] Buscando appUser para", sbUser.email, sbUser.id);

    if (!sbUser.email) {
      console.warn("[Auth] El usuario de Supabase no tiene email definido");
      setAppUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", sbUser.email) // <- ahora usamos email
      .maybeSingle();

    if (error) {
      console.error("[Auth] Error cargando perfil de usuario", error);
      setAppUser(null);
      return;
    }

    if (!data) {
      console.warn(
        "[Auth] No hay fila en public.usuarios con email =",
        sbUser.email
      );
      setAppUser(null);
      return;
    }

    console.log("[Auth] appUser encontrado en public.usuarios =>", data);
    setAppUser(data as unknown as User);
  };

  useEffect(() => {
    console.log("[Auth] Provider montando...");

    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("[Auth] getSession ->", data, error);

      if (!isMounted) return;

      const session = (data?.session ?? null) as SupabaseSession | null;

      if (session?.user) {
        setAuthUser(session.user);
        await loadAppUser(session.user);
        setStatus("authenticated");
      } else {
        setStatus("unauthenticated");
      }
    };

    init();

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth] onAuthStateChange =>", event, session);

        if (!isMounted) return;

        if (session?.user) {
          setAuthUser(session.user);
          await loadAppUser(session.user);
          setStatus("authenticated");
        } else {
          setAuthUser(null);
          setAppUser(null);
          setStatus("unauthenticated");
        }
      }
    );

    const subscription = subscriptionData.subscription;

    return () => {
      console.log("[Auth] cleanup unsubscribe listener");
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[Auth] error en login", error);
      return { error: error.message };
    }

    if (data.user) {
      setAuthUser(data.user);
      await loadAppUser(data.user);
      setStatus("authenticated");
    }

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

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};