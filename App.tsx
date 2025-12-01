import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Usamos el cliente real para Auth

// Import types and constants
import {
  User,
  Propiedad,
  Propietario,
  Comprador,
  Visita,
  CompanySettings,
} from "./types";
import { DEFAULT_ROUTES, PERMISSION_PATH_MAP, ROLES, ROLE_DEFAULT_PERMISSIONS } from "./constants";
import adapter from "./data/localStorageAdapter";
import { saveSession, loadSession, clearSession } from "./sessions";

// Import pages
import Login from "./pages/Login";
import OportunidadesDashboard from "./pages/OportunidadesDashboard";
import AltaClientes from "./pages/AltaClientes";
import Catalogo from "./pages/Catalogo";
import Progreso from "./pages/Progreso";
import Reportes from "./pages/Reportes";
import ReporteDetalle from "./pages/ReporteDetalle";
import MiPerfil from "./pages/MiPerfil";
import Configuraciones from "./pages/Configuraciones";
import PlaceholderPage from "./pages/PlaceholderPage";
import ChangePassword from "./pages/ChangePassword";

// Import Settings pages
import PerfilEmpresa from "./components/settings/PerfilEmpresa";
import PersonalEmpresa from "./components/settings/PersonalEmpresa";
import Facturacion from "./components/settings/Facturacion";

// Import SuperAdmin pages
import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import SuperAdminEmpresas from "./pages/superadmin/Empresas";
import SuperAdminUsuarios from "./pages/superadmin/UsuariosGlobales";
import SuperAdminPlanes from "./pages/superadmin/Planes";
import SuperAdminConfiguracion from "./pages/superadmin/Configuracion";
import SuperAdminReportes from "./pages/superadmin/Reportes";
import SuperAdminLogs from "./pages/superadmin/Logs";

// Import components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/ui/Toast';

const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = loadSession();
    return stored ? (stored as User) : null;
  });

  const [session, setSession] = useState<any>(null); // Sesión de Supabase
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  // Datos locales (aún usamos el adapter para datos mientras migramos)
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; } | null>(null);
  const [initialEditPropId, setInitialEditPropId] = useState<number | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- INITIALIZATION ---
  useEffect(() => {
    adapter.initialize(); // Inicializa datos locales si están vacíos

    // Escuchar cambios de sesión en Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Si se cierra sesión en Supabase, limpiamos local
        handleLogoutLocal();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DATA LOADING (LOCAL ADAPTER) ---
  useEffect(() => {
    if (user && user.tenantId) {
      setAllUsers(adapter.listUsers(user.tenantId));
      setPropiedades(adapter.listProperties(user.tenantId));
      const contacts = adapter.listContacts(user.tenantId);
      setPropietarios(contacts.propietarios);
      setCompradores(contacts.compradores);
      setCompanySettings(adapter.getTenantSettings(user.tenantId));
    } else {
      setAllUsers([]);
      setPropiedades([]);
      setPropietarios([]);
      setCompradores([]);
      setCompanySettings(null);
    }
  }, [user]);

  const asesores = useMemo(() =>
      allUsers.filter(u => u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA),
    [allUsers]
  );

  // --- AUTH HANDLERS ---
  const handleLogin = async (email: string, pass: string) => {
    // 1. Intentar login real con Supabase
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (error) {
      // FALLBACK: Si falla Supabase (ej. usuario local de prueba), intentamos local
      console.warn("Supabase auth failed, trying local adapter...", error.message);
      const localLogin = adapter.login(email, pass);
      if (localLogin) {
        completeLogin(localLogin.user);
      } else {
        alert("Credenciales incorrectas (Ni en nube ni local)");
      }
      return;
    }

    // 2. Si Supabase responde OK, construimos el usuario
    if (data.user) {
        // Aquí deberíamos buscar el perfil en public.usuarios, pero por ahora
        // simularemos el usuario basado en el adapter o crearemos uno básico
        // para que no te quedes bloqueado.
        const localUser = adapter.findUserByEmail(email)?.user;
        
        const appUser: User = localUser || {
            id: Date.now(), // ID temporal
            email: data.user.email!,
            name: "Usuario Supabase",
            photo: "US",
            phone: "",
            role: ROLES.SUPER_ADMIN, // Asumimos superadmin por defecto si no existe local
            permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.SUPER_ADMIN],
            tenantId: null
        };
        
        completeLogin(appUser);
    }
  };

  const completeLogin = (userData: User) => {
      // Inyección de permisos para Super Admin
      if (userData.role === ROLES.SUPER_ADMIN) {
          userData.permissions = ROLE_DEFAULT_PERMISSIONS[ROLES.SUPER_ADMIN];
      }
      
      setUser(userData);
      saveSession(userData);

      if (userData.mustChangePassword) {
          setShowChangePassword(true);
      } else {
          const defaultRoute = DEFAULT_ROUTES[userData.role] || "/";
          navigate(defaultRoute);
      }
  };

  const handleLogoutLocal = () => {
      setUser(null);
      clearSession();
      setOriginalUser(null);
      setIsImpersonating(false);
      navigate("/login");
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      handleLogoutLocal();
  };

  // --- IMPERSONATION (Logic Local) ---
  const handleImpersonate = (tenantId: string) => {
    const tenantUsers = adapter.listUsers(tenantId);
    const owner = tenantUsers.find((u) => u.role === ROLES.EMPRESA);
    if (owner) {
      setOriginalUser(user);
      setUser(owner); // Cambiamos el usuario en el estado, la app reacciona cargando datos de ese tenant
      setIsImpersonating(true);
      navigate(DEFAULT_ROUTES[owner.role] || "/");
      showToast(`Impersonando a: ${owner.name}`);
    } else {
      showToast("No se encontró un usuario owner para representar.", "error");
    }
  };

  const handleExitImpersonation = () => {
    if (originalUser) {
      setUser(originalUser);
      setOriginalUser(null);
      setIsImpersonating(false);
      navigate("/superadmin/empresas");
      showToast("Modo impersonación finalizado");
    }
  };

  // --- UI HANDLERS ---
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasswordChanged = (userId: number, newPassword: string) => {
      if(!user) return;
      // Actualizamos localmente por ahora
      adapter.setPassword(user.tenantId || null, userId, newPassword, false);
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      saveSession(updatedUser);
      setShowChangePassword(false);
      navigate(DEFAULT_ROUTES[updatedUser.role] || "/");
      showToast("Contraseña actualizada.");
  };

  // --- DATA HANDLERS (Local Wrapper) ---
  const handleUpdateUser = (updatedUser: User) => {
      if (user && user.id === updatedUser.id) {
          const merged = { ...user, ...updatedUser };
          setUser(merged);
          saveSession(merged);
      }
      showToast("Perfil actualizado");
  };

  // Wrappers para crud de propiedades local
  const handleUpdatePropiedad = (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
      if (!user?.tenantId) return;
      const newProps = propiedades.map(p => p.id === updatedPropiedad.id ? updatedPropiedad : p);
      const newOwners = propietarios.map(p => p.id === updatedPropietario.id ? updatedPropietario : p);
      setPropiedades(newProps);
      setPropietarios(newOwners);
      adapter.setProperties(user.tenantId, newProps);
      adapter.setContacts(user.tenantId, { propietarios: newOwners, compradores });
      showToast("Propiedad actualizada");
  };

  const handleDeletePropiedad = (prop: Propiedad) => {
      if (!user?.tenantId) return;
      const newProps = propiedades.filter(p => p.id !== prop.id);
      setPropiedades(newProps);
      adapter.setProperties(user.tenantId, newProps);
      showToast("Propiedad eliminada", "error");
  };

  const handleAddVisita = (propId: number, visita: Omit<Visita, "id"|"fecha">) => {
      if (!user?.tenantId) return;
      const newVisita = { ...visita, id: Date.now(), fecha: new Date().toISOString() };
      const newProps = propiedades.map(p => p.id === propId ? { ...p, visitas: [...(p.visitas||[]), newVisita] } : p);
      setPropiedades(newProps);
      adapter.setProperties(user.tenantId, newProps);
      showToast("Visita registrada");
  };

  // --- RENDER ---
  const getTitleForPath = (path: string): string => {
      if (path.startsWith("/superadmin")) return "Panel Super Admin";
      if (path.startsWith("/oportunidades")) return "Dashboard";
      if (path.startsWith("/clientes")) return "Alta de Clientes";
      return "IANGE";
  };

  const ProtectedRoute = () => {
      if (user?.role === ROLES.SUPER_ADMIN) return <Outlet />;
      if (!user?.permissions) return <Navigate to="/login" />;
      return <Outlet />;
  };

  if (!user) {
      return <Routes><Route path="*" element={<Login onLogin={handleLogin} />} /></Routes>;
  }

  if (showChangePassword) {
      return <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />;
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex bg-gray-50 min-h-screen font-sans">
        <Sidebar user={user} />
        <main className="flex-1 ml-64 p-8">
          <Header
            title={getTitleForPath(location.pathname)}
            user={user}
            onLogout={handleLogout}
            isImpersonating={isImpersonating}
            onExitImpersonation={handleExitImpersonation}
          />
          <div className="mt-8">
            <Routes>
                <Route path="/login" element={<Navigate to="/" />} />
                <Route element={<ProtectedRoute />}>
                    {/* Rutas Comunes */}
                    <Route path="/" element={<Navigate to={DEFAULT_ROUTES[user.role] || "/"} />} />
                    <Route path="/oportunidades" element={<OportunidadesDashboard propiedades={propiedades} asesores={asesores} propietarios={propietarios} compradores={compradores} companySettings={companySettings} />} />
                    <Route path="/clientes" element={<AltaClientes showToast={showToast} propiedades={propiedades} setPropiedades={setPropiedades} propietarios={propietarios} setPropietarios={setPropietarios} compradores={compradores} setCompradores={setCompradores} handleUpdatePropiedad={handleUpdatePropiedad} handleDeletePropiedad={handleDeletePropiedad} initialEditPropId={initialEditPropId} setInitialEditPropId={setInitialEditPropId} asesores={asesores} currentUser={user} />} />
                    <Route path="/catalogo" element={<Catalogo propiedades={propiedades} propietarios={propietarios} asesores={asesores} onAddVisita={handleAddVisita} handleUpdatePropiedad={handleUpdatePropiedad} showToast={showToast} />} />
                    <Route path="/progreso" element={<Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={(id) => { setInitialEditPropId(id); navigate("/clientes"); }} asesores={asesores} />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/reportes/:reportId" element={<ReporteDetalle propiedades={propiedades} asesores={asesores} />} />
                    <Route path="/crm" element={<PlaceholderPage title="CRM" />} />
                    
                    {/* Configuraciones */}
                    <Route path="/configuraciones" element={<Configuraciones />}>
                        <Route index element={<Navigate to="mi-perfil" />} />
                        <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
                        <Route path="perfil" element={<PerfilEmpresa user={user} />} />
                        <Route path="personal" element={<PersonalEmpresa showToast={showToast} currentUser={user} />} />
                        <Route path="facturacion" element={<Facturacion />} />
                    </Route>

                    {/* Rutas Super Admin */}
                    <Route path="/superadmin" element={<SuperAdminDashboard />} />
                    <Route path="/superadmin/empresas" element={<SuperAdminEmpresas showToast={showToast} onImpersonate={handleImpersonate} />} />
                    <Route path="/superadmin/usuarios-globales" element={<SuperAdminUsuarios showToast={showToast} />} />
                    <Route path="/superadmin/planes" element={<SuperAdminPlanes />} />
                    <Route path="/superadmin/configuracion" element={<SuperAdminConfiguracion showToast={showToast} />} />
                    <Route path="/superadmin/reportes-globales" element={<SuperAdminReportes />} />
                    <Route path="/superadmin/logs" element={<SuperAdminLogs />} />
                </Route>
                <Route path="*" element={<PlaceholderPage title="404" />} />
            </Routes>
          </div>
        </main>
      </div>
    </>
  );
};

export default App;
