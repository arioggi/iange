// src/authContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, UserPermissions } from "./types";
import { ROLES, ROLE_MIGRATION_MAP } from "./constants"; // Importamos el mapa de normalización

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  user: User | null; 
  appUser: User | null; // Alias para compatibilidad
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /**
   * Nueva función para controlar el acceso en la UI.
   * Verifica si el usuario tiene un rol administrativo o el permiso específico en el JSONB.
   */
  hasPermission: (permissionKey: keyof UserPermissions) => boolean; 
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
        // --- NORMALIZACIÓN DEL ROL ---
        // Utilizamos el mapa de migración para convertir strings como "Administrador" a "adminempresa"
        const rawRole = data.role || 'asesor';
        const normalizedRole = ROLE_MIGRATION_MAP[rawRole] || rawRole;

        const mappedUser: User = {
            id: data.id,
            email: data.email || sbUser.email || '',
            name: data.full_name || 'Usuario',
            role: normalizedRole, // Almacenamos el rol normalizado
            photo: data.avatar_url || '',
            tenantId: data.tenant_id, // Vinculación clave para facturación
            permissions: data.permissions || {}, // Objeto JSONB de permisos
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

  // Lógica centralizada de permisos
  const hasPermission = (permissionKey: keyof UserPermissions): boolean => {
    if (!user) return false;
    // Los administradores (usando roles normalizados) tienen acceso total por defecto
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN_EMPRESA, ROLES.CUENTA_EMPRESA].includes(user.role as any);
    if (isAdmin) return true;
    // Si no es admin, verifica el permiso específico en el JSONB
    return !!user.permissions?.[permissionKey];
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

  const value: AuthContextValue = { 
    status, 
    authUser, 
    user, 
    appUser: user, 
    login, 
    logout, 
    refreshUser,
    hasPermission // Exportamos la función para usarla en la UI
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};