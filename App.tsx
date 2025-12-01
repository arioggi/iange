import React, { useState, useEffect, useMemo } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
  Outlet,
} from "react-router-dom";

import adapter from "./data/localStorageAdapter";
import { saveSession, loadSession, clearSession } from "./sessions";

// Import types and constants
import {
  User,
  Propiedad,
  Propietario,
  Comprador,
  Visita,
  CompanySettings,
} from "./types";
import { 
  DEFAULT_ROUTES, 
  PERMISSION_PATH_MAP, 
  ROLES, 
  ROLE_DEFAULT_PERMISSIONS 
} from "./constants";

// Auth context
import { useAuth } from "./authContext";

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

// Settings pages
import PerfilEmpresa from "./components/settings/PerfilEmpresa";
import PersonalEmpresa from "./components/settings/PersonalEmpresa";
import Facturacion from "./components/settings/Facturacion";

// SuperAdmin pages
import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import SuperAdminEmpresas from "./pages/superadmin/Empresas";
import SuperAdminUsuarios from "./pages/superadmin/UsuariosGlobales";
import SuperAdminPlanes from "./pages/superadmin/Planes";
import SuperAdminConfiguracion from "./pages/superadmin/Configuracion";
import SuperAdminReportes from "./pages/superadmin/Reportes";
import SuperAdminLogs from "./pages/superadmin/Logs";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Toast from "./components/ui/Toast";

const App: React.FC = () => {
  const { status, appUser, login, logout: authLogout } = useAuth();

  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = loadSession();
    return stored ? (stored as User) : null;
  });

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  // Tenant-specific data states
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [companySettings, setCompanySettings] =
    useState<CompanySettings | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [initialEditPropId, setInitialEditPropId] =
    useState<number | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- INITIALIZATION ---
  useEffect(() => {
    adapter.initialize();
  }, []);

  // --- SINCRONIZACIÓN CORREGIDA ---
  useEffect(() => {
    console.log("[App] auth status ->", status, "appUser ->", appUser);

    // 1. LOGIN
    if (status === "authenticated" && appUser) {
      let typed = appUser as unknown as User;
      
      // --- FIX: SUPER ADMIN POWERS ---
      // Si el usuario es Super Admin, le inyectamos los permisos por defecto
      // definidos en constants.ts para que pueda ver todo el menú.
      if (typed.role === ROLES.SUPER_ADMIN) {
        typed = {
            ...typed,
            permissions: ROLE_DEFAULT_PERMISSIONS[ROLES.SUPER_ADMIN]
        };
      }
      // -------------------------------

      // Solo actualizamos si realmente cambió
      if (!user || user.id !== typed.id) {
        setUser(typed);
        saveSession(typed);
      }
    }

    // 2. LOGOUT
    if (status === "unauthenticated") {
      if (user !== null) {
        setUser(null);
        clearSession();
        setOriginalUser(null);
        setIsImpersonating(false);
        navigate("/login");
      }
    }
  }, [status, appUser, user, navigate]);

  useEffect(() => {
    if (user?.mustChangePassword) {
      setShowChangePassword(true);
    }
  }, [user]);

  // Cargar datos locales por tenant cuando cambia el usuario
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

  const asesores = useMemo(
    () =>
      allUsers.filter(
        (u) =>
          u.role === ROLES.ASESOR ||
          u.role === ROLES.ADMIN_EMPRESA ||
          u.role === ROLES.EMPRESA
      ),
    [allUsers]
  );

  // --- AUTH & TOAST HANDLERS ---
  const handleLogin = async (email: string, pass: string) => {
    const { error } = await login(email, pass);

    if (error) {
      alert(error || "Credenciales incorrectas");
      return;
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handlePasswordChanged = (userId: number, newPassword: string) => {
    if (!user) return;
    adapter.setPassword(user.tenantId || null, userId, newPassword, false);
    const updatedUser: User = { ...user, mustChangePassword: false };
    setUser(updatedUser);
    saveSession(updatedUser);
    setShowChangePassword(false);
    const defaultRoute = DEFAULT_ROUTES[updatedUser.role] || "/";
    navigate(defaultRoute);
    showToast("Contraseña actualizada correctamente.");
  };

  // --- LOGOUT CORREGIDO ---
  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (error) {
      console.error("Error en logout:", error);
      clearSession();
      setUser(null);
      navigate("/login");
    }
  };

  const handleImpersonate = (tenantId: string) => {
    const tenantUsers = adapter.listUsers(tenantId);
    const owner = tenantUsers.find((u) => u.role === ROLES.EMPRESA);
    if (owner) {
      setOriginalUser(user);
      setUser(owner);
      setIsImpersonating(true);
      navigate(DEFAULT_ROUTES[owner.role] || "/");
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
    }
  };

  // --- DATA HANDLERS & PERSISTENCE ---
  const handleUpdateUser = (updatedUser: User) => {
    if (user && user.id === updatedUser.id) {
      setUser((prevUser) => {
        const merged = { ...prevUser!, ...updatedUser };
        saveSession(merged);
        return merged;
      });
    }
    showToast("Perfil actualizado con éxito");
  };

  const handleUpdatePropiedad = (
    updatedPropiedad: Propiedad,
    updatedPropietario: Propietario
  ) => {
    if (!user?.tenantId) return;
    const newPropiedades = propiedades.map((p) =>
      p.id === updatedPropiedad.id ? updatedPropiedad : p
    );
    const newPropietarios = propietarios.map((p) =>
      p.id === updatedPropietario.id ? updatedPropietario : p
    );
    setPropiedades(newPropiedades);
    setPropietarios(newPropietarios);
    adapter.setProperties(user.tenantId, newPropiedades);
    adapter.setContacts(user.tenantId, {
      propietarios: newPropietarios,
      compradores,
    });
    showToast("Datos actualizados correctamente");
  };

  const handleDeletePropiedad = (propiedadToDelete: Propiedad) => {
    if (!user?.tenantId) return;
    const newPropiedades = propiedades.filter(
      (p) => p.id !== propiedadToDelete.id
    );
    const newPropietarios = propietarios.filter(
      (p) => p.id !== propiedadToDelete.propietarioId
    );
    setPropiedades(newPropiedades);
    setPropietarios(newPropietarios);
    adapter.setProperties(user.tenantId, newPropiedades);
    adapter.setContacts(user.tenantId, {
      propietarios: newPropietarios,
      compradores,
    });
    showToast("Propiedad eliminada", "error");
  };

  const handleAddVisita = (
    propiedadId: number,
    visitaData: Omit<Visita, "id" | "fecha">
  ) => {
    if (!user?.tenantId) return;
    const newVisita: Visita = {
      ...visitaData,
      id: Date.now(),
      fecha: new Date().toISOString(),
    };
    const newPropiedades = propiedades.map((p) =>
      p.id === propiedadId
        ? { ...p, visitas: [...(p.visitas || []), newVisita] }
        : p
    );
    setPropiedades(newPropiedades);
    adapter.setProperties(user.tenantId, newPropiedades);
    showToast("Visita registrada con éxito");
  };

  const onNavigateAndEdit = (propiedadId: number) => {
    setInitialEditPropId(propiedadId);
    navigate("/clientes");
  };

  // --- LAYOUT & ROUTING ---
  const getTitleForPath = (path: string): string => {
    if (path.startsWith("/reportes/")) return "Detalle de Reporte";
    if (path.startsWith("/superadmin/empresas")) return "Gestión de Empresas";
    if (path.startsWith("/superadmin/usuarios-globales")) return "Usuarios Globales";
    if (path.startsWith("/superadmin/planes")) return "Planes y Facturación";
    if (path.startsWith("/superadmin/configuracion")) return "Configuración del Sistema";
    if (path.startsWith("/superadmin/reportes-globales")) return "Reportes Globales";
    if (path.startsWith("/superadmin/logs")) return "Logs y Auditoría";
    if (path.startsWith("/superadmin")) return "Dashboard Super Admin";

    const routes: { [key: string]: string } = {
      "/": "Inicio",
      "/oportunidades": "Dashboard de Oportunidades",
      "/clientes": "Contactos (Propiedades y Clientes)",
      "/catalogo": "Catálogo de Propiedades",
      "/progreso": "Progreso de Ventas",
      "/reportes": "Central de Reportes",
      "/crm": "CRM",
      "/configuraciones/mi-perfil": "Mi Perfil",
      "/configuraciones/perfil": "Perfil de Empresa",
      "/configuraciones/personal": "Personal",
      "/configuraciones/facturacion": "Facturación",
    };
    return routes[path] || "IANGE";
  };

  if (status === "loading" && !user) {
    return <div style={{ padding: 32 }}>Cargando sesión...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={handleLogin} />} />
      </Routes>
    );
  }

  if (showChangePassword) {
    return (
      <ChangePassword user={user} onPasswordChanged={handlePasswordChanged} />
    );
  }

  const MainLayout = ({ children }: { children: React.ReactNode }) => (
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
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );

  const ProtectedRoute = () => {
    // 🟠 SUPER ADMIN: acceso total
    if (user.role === ROLES.SUPER_ADMIN) {
      return <Outlet />;
    }

    const path = location.pathname;

    // Bloquear rutas de superadmin para otros roles
    if (path.startsWith("/superadmin")) {
      return <Navigate to={DEFAULT_ROUTES[user.role] || "/"} replace />;
    }

    const userPermissions = user.permissions;

    if (!userPermissions) {
      // Si no hay permisos, mandamos al login por seguridad
      return <Navigate to="/login" replace />;
    }

    // Configuraciones básicas
    if (path === "/configuraciones/mi-perfil") return <Outlet />;
    
    // Configuraciones avanzadas (Empresa/Facturación)
    if (
      (path === "/configuraciones/perfil" || path === "/configuraciones/facturacion") &&
      (user.role === ROLES.EMPRESA || user.role === ROLES.ADMIN_EMPRESA)
    ) {
      return <Outlet />;
    }

    // Check de permisos según el mapa
    for (const [permission, paths] of Object.entries(PERMISSION_PATH_MAP)) {
      if (paths.some((p) => path.startsWith(p))) {
        if (userPermissions[permission as keyof typeof userPermissions]) {
          return <Outlet />;
        } else {
          return (
            <Navigate to={DEFAULT_ROUTES[user.role] || "/"} replace />
          );
        }
      }
    }

    return <Outlet />;
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <MainLayout>
        <Routes>
          <Route
            path="/login"
            element={<Navigate to={DEFAULT_ROUTES[user.role] || "/"} />}
          />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={<Navigate to={DEFAULT_ROUTES[user.role] || "/"} />}
            />
            <Route
              path="/oportunidades"
              element={
                <OportunidadesDashboard
                  propiedades={propiedades}
                  asesores={asesores}
                  propietarios={propietarios}
                  compradores={compradores}
                  companySettings={companySettings}
                />
              }
            />
            <Route
              path="/clientes"
              element={
                <AltaClientes
                  showToast={showToast}
                  propiedades={propiedades}
                  setPropiedades={setPropiedades}
                  propietarios={propietarios}
                  setPropietarios={setPropietarios}
                  compradores={compradores}
                  setCompradores={setCompradores}
                  handleUpdatePropiedad={handleUpdatePropiedad}
                  handleDeletePropiedad={handleDeletePropiedad}
                  initialEditPropId={initialEditPropId}
                  setInitialEditPropId={setInitialEditPropId}
                  asesores={asesores}
                  currentUser={user}
                />
              }
            />
            <Route
              path="/catalogo"
              element={
                <Catalogo
                  propiedades={propiedades}
                  propietarios={propietarios}
                  asesores={asesores}
                  onAddVisita={handleAddVisita}
                  handleUpdatePropiedad={handleUpdatePropiedad}
                  showToast={showToast}
                />
              }
            />
            <Route
              path="/progreso"
              element={
                <Progreso
                  propiedades={propiedades}
                  propietarios={propietarios}
                  onUpdatePropiedad={handleUpdatePropiedad}
                  onNavigateAndEdit={onNavigateAndEdit}
                  asesores={asesores}
                />
              }
            />
            <Route path="/reportes" element={<Reportes />} />
            <Route
              path="/reportes/:reportId"
              element={
                <ReporteDetalle
                  propiedades={propiedades}
                  asesores={asesores}
                />
              }
            />
            <Route path="/crm" element={<PlaceholderPage title="CRM" />} />

            <Route path="/configuraciones" element={<Configuraciones />}>
              <Route
                index
                element={
                  <Navigate to="/configuraciones/mi-perfil" replace />
                }
              />
              <Route
                path="mi-perfil"
                element={
                  <MiPerfil user={user} onUserUpdated={handleUpdateUser} />
                }
              />
              <Route
                path="perfil"
                element={<PerfilEmpresa user={user} />}
              />
              <Route
                path="personal"
                element={
                  <PersonalEmpresa
                    showToast={showToast}
                    currentUser={user}
                  />
                }
              />
              <Route
                path="facturacion"
                element={<Facturacion />}
              />
            </Route>

            {/* Super Admin Routes */}
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
            <Route
              path="/superadmin/empresas"
              element={
                <SuperAdminEmpresas
                  showToast={showToast}
                  onImpersonate={handleImpersonate}
                />
              }
            />
            <Route
              path="/superadmin/usuarios-globales"
              element={
                <SuperAdminUsuarios showToast={showToast} />
              }
            />
            <Route path="/superadmin/planes" element={<SuperAdminPlanes />} />
            <Route
              path="/superadmin/configuracion"
              element={
                <SuperAdminConfiguracion showToast={showToast} />
              }
            />
            <Route
              path="/superadmin/reportes-globales"
              element={<SuperAdminReportes />}
            />
            <Route path="/superadmin/logs" element={<SuperAdminLogs />} />
          </Route>

          <Route
            path="*"
            element={
              <PlaceholderPage title="404 - Página no encontrada" />
            }
          />
        </Routes>
      </MainLayout>
    </>
  );
};

export default App;