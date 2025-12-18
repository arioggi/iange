// arioggi/iange/iange-stripe-setting-plans/authContext.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./supabaseClient";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { User, UserPermissions } from "./types";
import { ROLES, ROLE_MIGRATION_MAP } from "./constants"; 

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  authUser: SupabaseUser | null;
  user: User | null; 
  appUser: User | null; 
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
      // --- CORRECCIÓN CRÍTICA: JOIN CON TENANTS ---
      // Pedimos los datos del perfil Y los datos de suscripción de la inmobiliaria
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          tenants (
            subscription_status,
            plan_id,
            current_period_end
          )
        `) 
        .eq("id", sbUser.id)
        .single();

      if (!isMounted.current) return;

      if (error) {
        console.error("❌ [Auth] Error cargando perfil y suscripción:", error.message);
        return; 
      }

      if (data) {
        const rawRole = data.role || 'asesor';
        const normalizedRole = ROLE_MIGRATION_MAP[rawRole] || rawRole;

        // Supabase puede devolver tenants como objeto o array. Manejamos ambos.
        const tenantRaw = data.tenants;
        const tenantInfo = Array.isArray(tenantRaw) ? tenantRaw[0] : tenantRaw;

        const mappedUser: User = {
            id: data.id,
            email: data.email || sbUser.email || '',
            name: data.full_name || 'Usuario',
            role: normalizedRole,
            photo: data.avatar_url || '',
            tenantId: data.tenant_id,
            permissions: data.permissions || {},
            phone: data.phone || sbUser.phone || '',
            // --- SINCRONIZACIÓN DE PLAN ---
            // Si tenantInfo.plan_id existe, el banner de bienvenida se ocultará
            subscriptionStatus: tenantInfo?.subscription_status || 'inactive',
            planId: tenantInfo?.plan_id || null,
            currentPeriodEnd: tenantInfo?.current_period_end || null
        };

        // Log de depuración para confirmar que Katya tiene plan asignado
        console.log(`👤 [Auth] Usuario ${mappedUser.email} cargado con Plan ID: ${mappedUser.planId}`);

        setUser(mappedUser);
      }
    } catch (err) {
      console.error("💥 [Auth] Error inesperado en authContext:", err);
    }
  };

  const refreshUser = async () => {
    if (authUser) await loadAppUser(authUser);
  };

  const hasPermission = (permissionKey: keyof UserPermissions): boolean => {
    if (!user) return false;
    const isAdmin = [ROLES.SUPER_ADMIN, ROLES.ADMIN_EMPRESA, ROLES.CUENTA_EMPRESA].includes(user.role as any);
    if (isAdmin) return true;
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
    hasPermission 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};