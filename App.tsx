import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

// Contexto
import { useAuth } from './authContext';

// Tipos y constantes
import { User, Propiedad, Propietario, Comprador, CompanySettings, UserPermissions } from "./types";
import { ROLES, ROLE_DEFAULT_PERMISSIONS } from "./constants";
import adapter from "./data/localStorageAdapter"; 
import { getPropertiesByTenant, getContactsByTenant, getUsersByTenant, updateProperty, updateContact, getTenantById } from './Services/api';

// Páginas
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
import PublicPropertyPage from "./pages/PublicPropertyPage";
import PublicCatalogPage from "./pages/PublicCatalogPage"; 
import PublicVerification from "./pages/PublicVerification";

// Settings
import PerfilEmpresa from "./components/settings/PerfilEmpresa";
import PersonalEmpresa from "./components/settings/PersonalEmpresa";
import Facturacion from "./components/settings/Facturacion";

// Super Admin
import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import SuperAdminEmpresas from "./pages/superadmin/Empresas";
import SuperAdminUsuarios from "./pages/superadmin/UsuariosGlobales";
import SuperAdminPlanes from "./pages/superadmin/Planes";
import SuperAdminConfiguracion from "./pages/superadmin/Configuracion";
import SuperAdminReportes from "./pages/superadmin/Reportes";
import SuperAdminLogs from "./pages/superadmin/Logs";

// Componentes UI
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/ui/Toast';

// --- PROTECTED ROUTE ---
const ProtectedRoute = ({ user, permissionKey, children }: { user: User, permissionKey?: keyof UserPermissions, children: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" replace />;
    
    // Super Admin siempre tiene acceso
    if (user.role === ROLES.SUPER_ADMIN) return <>{children}</>;

    // Bloqueo TOTAL solo si la cuenta está explícitamente cancelada o suspendida
    if (user.subscriptionStatus === 'canceled' || user.subscriptionStatus === 'suspended') {
        return <Navigate to="/configuraciones/facturacion" replace />;
    }

    if (permissionKey && !(user.permissions as any)?.[permissionKey]) {
        return <Navigate to="/configuraciones/mi-perfil" replace />;
    }
    return <>{children}</>;
};

// --- LAYOUT CON SIDEBAR COLAPSABLE Y HEADER FIJO ---
const MainLayout = ({ 
    children, 
    user, 
    title, 
    onLogout, 
    isImpersonating, 
    onExitImpersonation, 
    logoUrl,
    accountName,             // Prop para inicial del logo
    sidebarCollapsed,        // Estado de colapso
    setSidebarCollapsed      // Setter de colapso
}: { 
    children: React.ReactNode, 
    user: User, 
    title: string, 
    onLogout: () => void,
    isImpersonating: boolean,
    onExitImpersonation: () => void,
    logoUrl?: string | null,
    accountName?: string,
    sidebarCollapsed: boolean,
    setSidebarCollapsed: (v: boolean) => void
}) => (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* Sidebar: Controla su renderizado pero recibe estado del padre */}
      <Sidebar 
        user={user} 
        logoUrl={logoUrl} 
        accountName={accountName}
        collapsed={sidebarCollapsed} 
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Contenedor derecho: Margen dinámico para la animación suave */}
      <div 
        className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
            sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        
        {/* Header Fijo */}
        <div className="flex-shrink-0 z-20 bg-white border-b border-gray-200">
            <Header 
              title={title} user={user} onLogout={onLogout} 
              isImpersonating={isImpersonating} onExitImpersonation={onExitImpersonation}
            />
        </div>

        {/* Contenido Scrollable */}
        <main className="flex-1 overflow-y-auto p-8">
            {/* Se eliminó la clase mt-2 para cuadrar el espaciado superior con el lateral */}
            <div>
                {children}
            </div>
        </main>
      </div>
    </div>
);

const App = () => {
  const { appUser: contextUser, status, logout, refreshUser } = useAuth(); 
  
  const isLoading = status === 'loading';

  const user = useMemo(() => {
    if (!contextUser) return null;

    const userRole = (contextUser.role || 'asesor') as any;
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[userRole] || ROLE_DEFAULT_PERMISSIONS['asesor'];
    const dbPerms = contextUser.permissions || {};

    const effectivePermissions: UserPermissions = {
        dashboard: (dbPerms as any).dashboard ?? defaultPerms.dashboard,
        contactos: (dbPerms as any).contactos ?? defaultPerms.contactos,
        propiedades: (dbPerms as any).propiedades ?? defaultPerms.propiedades,
        progreso: (dbPerms as any).progreso ?? defaultPerms.progreso,
        reportes: (dbPerms as any).reportes ?? defaultPerms.reportes,
        crm: (dbPerms as any).crm ?? defaultPerms.crm,
        equipo: (dbPerms as any).equipo ?? defaultPerms.equipo,
        billing_edit: (dbPerms as any).billing_edit ?? defaultPerms.billing_edit,
    };

    return { ...contextUser, permissions: effectivePermissions };
  }, [contextUser]);

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  // ✅ CAMBIO 1: Inicialización leyendo localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
      const saved = localStorage.getItem('sidebar_collapsed');
      // Si existe y es 'true', iniciamos colapsado
      return saved === 'true';
  });

  // ✅ CAMBIO 2: Guardar en localStorage cuando cambie
  useEffect(() => {
      localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(() => {
      if (contextUser?.tenantId) {
          try {
              return adapter.getTenantSettings(contextUser.tenantId);
          } catch { return null; }
      }
      return null;
  });

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [initialEditPropId, setInitialEditPropId] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const getTitleForPath = (path: string): string => {
    if (path.startsWith('/reportes/')) return 'Detalle de Reporte';
    if (path.startsWith('/superadmin')) return 'Panel Super Admin';
    
    const routes: Record<string, string> = {
      '/': 'Inicio', 
      '/inicio': 'Inicio',              
      '/oportunidades': 'Oportunidades', 
      '/catalogo': 'Catálogo', 
      '/progreso': 'Progreso', 
      '/reportes': 'Reportes',
      '/configuraciones/mi-perfil': 'Mi Perfil', 
      '/configuraciones/personal': 'Personal',
      '/configuraciones/perfil': 'Perfil de Empresa',
      '/configuraciones/facturacion': 'Facturación'
    };

    if (routes[path]) return routes[path];
    if (path.includes('/oportunidades')) return 'Oportunidades'; 
    if (path.includes('/inicio')) return 'Inicio';

    return companySettings?.name || 'IANGE';
  };

  const refreshAppData = async (silent = false) => {
      if (!user) {
          setDataLoading(false);
          return;
      }
      
      if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) {
          setDataLoading(false);
          return;
      }

      if (user.tenantId) {
          if (!silent) setDataLoading(true);

          try {
              const cachedSettings = adapter.getTenantSettings(user.tenantId);
              if (cachedSettings) setCompanySettings(cachedSettings);

              const localProps = adapter.listProperties(user.tenantId);
              const localUsers = adapter.listUsers(user.tenantId);
              const hasLocalActivity = (localProps && localProps.length > 0) || (localUsers && localUsers.length > 1);

              const [props, contacts, usersDb, tenantData] = await Promise.all([
                  getPropertiesByTenant(user.tenantId),
                  getContactsByTenant(user.tenantId),
                  getUsersByTenant(user.tenantId),
                  getTenantById(user.tenantId)
              ]);
              
              if (props) setPropiedades(props);
              if (contacts) {
                  setPropietarios(contacts.propietarios);
                  setCompradores(contacts.compradores);
              }
              if (usersDb) setAllUsers(usersDb);
              
              const hasNetworkActivity = (props && props.length > 0) || (usersDb && usersDb.length > 1);
              let isNowOnboarded = (cachedSettings?.onboarded) || hasLocalActivity || hasNetworkActivity;

              if (isNowOnboarded && !cachedSettings?.onboarded) {
                  adapter.updateTenantSettings(user.tenantId, { onboarded: true });
              }

              if (tenantData) {
                  const newSettings = {
                      ...cachedSettings,
                      name: tenantData.name || tenantData.nombre, 
                      logo_url: tenantData.logo_url,
                      onboarded: isNowOnboarded,
                  };
                  setCompanySettings(newSettings as any);
                  adapter.updateTenantSettings(user.tenantId, newSettings as any);
              } else {
                  const fallbackSettings = { ...cachedSettings, onboarded: isNowOnboarded };
                  setCompanySettings(fallbackSettings as any);
                  adapter.updateTenantSettings(user.tenantId, fallbackSettings as any);
              }

          } catch (error) {
              console.error("Error cargando datos:", error);
          } finally {
              setDataLoading(false);
          }
      } else {
          setDataLoading(false);
      }
  };

  useEffect(() => { 
      refreshAppData(); 
  }, [user?.tenantId]); 

  useEffect(() => {
      if (!user?.tenantId) return;
      const channel = supabase.channel('realtime:app-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'propiedades', filter: `tenant_id=eq.${user.tenantId}` }, () => refreshAppData(true))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'contactos', filter: `tenant_id=eq.${user.tenantId}` }, () => refreshAppData(true))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${user.tenantId}` }, async () => {
              console.log("🔔 Cambio en Tenant detectado, refrescando datos y usuario...");
              await refreshAppData(true);
              await refreshUser(); 
          })
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [user?.tenantId, refreshUser]);

  const asesores = useMemo(() => allUsers.filter(u => u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA), [allUsers]);

  const getInitialRoute = (currentUser: User) => {
      if (currentUser.role === ROLES.SUPER_ADMIN) return '/superadmin';
      const p = currentUser.permissions || {} as UserPermissions;
      if (p.dashboard) return '/inicio'; 
      if (p.contactos) return '/oportunidades'; 
      if (p.propiedades) return '/catalogo';
      if (p.progreso) return '/progreso';
      if (p.reportes) return '/reportes';
      if (p.crm) return '/crm';
      return '/configuraciones/mi-perfil';
  };

  const handleLogin = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ✅ CORRECCIÓN FINAL: Manejo de Bypass en el padre
  const handleUpdatePropiedad = async (updatedPropiedad: Propiedad, updatedPropietario?: Propietario | null) => {
    if (!user) return;
    if (!user.planId) {
        showToast('Debes elegir un plan para guardar información.', 'error');
        return;
    }
    showToast('Guardando cambios...', 'success');
    try {
        if (updatedPropietario && updatedPropietario.id > 0) {
            await updateContact(updatedPropietario.id, updatedPropietario);
        }
        const ownerIdToSave = updatedPropietario?.id ? updatedPropietario.id.toString() : null;
        await updateProperty(updatedPropiedad, ownerIdToSave);
        
        showToast('Guardado con éxito.', 'success');
        refreshAppData(true); 
    } catch (error) {
        console.error("Error al guardar:", error);
        showToast('Error al guardar.', 'error');
    }
  };

  const handleDeletePropiedad = () => showToast('Eliminando...');
  const handleAddVisita = () => showToast('Visita registrada');
  const handleUpdateUser = () => showToast('Perfil actualizado');
  const handleImpersonate = () => {}; 
  const handleExitImpersonation = () => {}; 
  const onNavigateAndEdit = (id: number) => { 
      setInitialEditPropId(id); 
      navigate('/oportunidades'); 
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-pulse flex flex-col items-center">
          <div className="mb-4 h-16 flex items-center justify-center">
             <img src="/logo.svg" alt="IANGE" className="h-full w-auto object-contain max-h-12"/>
          </div>
          <div className="text-gray-500">Iniciando sesión...</div>
        </div>
      </div>
    );
  }

  if (status === 'authenticated' && !user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
            <div className="bg-red-50 p-6 rounded-lg max-w-md border border-red-100 shadow-sm">
                <h1 className="text-2xl font-bold text-red-700 mb-2">⚠️ Error de Perfil</h1>
                <p className="text-gray-700 mb-6">
                    Sesión iniciada, pero no se pudo cargar el perfil.
                    <br/><span className="text-sm text-gray-500">Revisa permisos RLS en Supabase (tabla profiles).</span>
                </p>
                <button 
                    onClick={async () => { await logout(); navigate('/login'); }} 
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition font-medium shadow-sm"
                >
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Routes>
        <Route path="/preview/:token" element={<PublicPropertyPage />} />
        <Route path="/p/:id" element={<PublicPropertyPage />} />
        <Route path="/c/:tenantId" element={<PublicCatalogPage />} />
        <Route path="/verificar-identidad/:token" element={<PublicVerification />} />

        <Route path="/login" element={
            status === 'authenticated' ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />

        <Route path="/*" element={
            !user ? (
                <Navigate to="/login" replace />
            ) : (
                <MainLayout 
                    user={user} 
                    title={getTitleForPath(location.pathname)} 
                    onLogout={handleLogout}
                    isImpersonating={isImpersonating}
                    onExitImpersonation={handleExitImpersonation}
                    logoUrl={companySettings?.logo_url}
                    // ✅ NUEVAS PROPS PARA EL SIDEBAR
                    accountName={companySettings?.name || user.name} // Para el logo naranja
                    sidebarCollapsed={sidebarCollapsed}
                    setSidebarCollapsed={setSidebarCollapsed}
                >
                    <Routes>
                        <Route path="/" element={<Navigate to={getInitialRoute(user)} replace />} />
                        <Route path="/inicio" element={<ProtectedRoute user={user} permissionKey="dashboard"><OportunidadesDashboard propiedades={propiedades} asesores={asesores} propietarios={propietarios} compradores={compradores} companySettings={companySettings} isLoading={dataLoading} currentUser={user} /></ProtectedRoute>} />
                        <Route path="/oportunidades" element={<ProtectedRoute user={user} permissionKey="contactos"><AltaClientes showToast={showToast} propiedades={propiedades} setPropiedades={setPropiedades} propietarios={propietarios} setPropietarios={setPropietarios} compradores={compradores} setCompradores={setCompradores} handleUpdatePropiedad={handleUpdatePropiedad} handleDeletePropiedad={handleDeletePropiedad} initialEditPropId={initialEditPropId} setInitialEditPropId={setInitialEditPropId} asesores={asesores} currentUser={user} onDataChange={() => refreshAppData(true)} /></ProtectedRoute>} />
                        <Route path="/catalogo" element={<ProtectedRoute user={user} permissionKey="propiedades"><Catalogo propiedades={propiedades} propietarios={propietarios} asesores={asesores} onAddVisita={handleAddVisita} handleUpdatePropiedad={handleUpdatePropiedad} showToast={showToast} currentUser={user} compradores={compradores} onDataChange={() => refreshAppData(true)}/></ProtectedRoute>} />
                        <Route path="/progreso" element={<ProtectedRoute user={user} permissionKey="progreso"><Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={onNavigateAndEdit} asesores={asesores} /></ProtectedRoute>} />
                        <Route path="/reportes" element={<ProtectedRoute user={user} permissionKey="reportes"><Reportes /></ProtectedRoute>} />
                        <Route path="/reportes/:reportId" element={<ProtectedRoute user={user} permissionKey="reportes"><ReporteDetalle propiedades={propiedades} asesores={asesores} compradores={compradores} /></ProtectedRoute>} />
                        <Route path="/crm" element={<ProtectedRoute user={user} permissionKey="crm"><PlaceholderPage title="CRM" /></ProtectedRoute>} />
                        <Route path="/configuraciones" element={<Configuraciones />}>
                             <Route index element={<Navigate to="mi-perfil" replace />} />
                             <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
                             <Route path="perfil" element={(user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ? <PerfilEmpresa user={user} onDataChange={() => refreshAppData(true)} /> : <Navigate to="/configuraciones/mi-perfil" />} />
                             <Route path="facturacion" element={(user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ? <Facturacion /> : <Navigate to="/configuraciones/mi-perfil" />} />
                             <Route path="personal" element={<ProtectedRoute user={user} permissionKey="equipo"><PersonalEmpresa showToast={showToast} currentUser={user} onDataChange={() => refreshAppData(true)} /></ProtectedRoute>} />
                        </Route>
                        <Route path="/superadmin/*" element={user.role === ROLES.SUPER_ADMIN ? (<Routes><Route path="/" element={<SuperAdminDashboard />} /><Route path="empresas" element={<SuperAdminEmpresas showToast={showToast} onImpersonate={handleImpersonate} />} /><Route path="usuarios-globales" element={<SuperAdminUsuarios showToast={showToast} />} /><Route path="planes" element={<SuperAdminPlanes />} /><Route path="configuracion" element={<SuperAdminConfiguracion showToast={showToast} />} /><Route path="reportes-globales" element={<SuperAdminReportes />} /><Route path="logs" element={<SuperAdminLogs />} /></Routes>) : <Navigate to="/" />} />
                        <Route path="*" element={<PlaceholderPage title="Página no encontrada" />} />
                    </Routes>
                </MainLayout>
            )
        } />
      </Routes>
    </>
  );
};

export default App;