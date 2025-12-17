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
    if (user.role === ROLES.SUPER_ADMIN) return <>{children}</>;
    
    if (permissionKey && !(user.permissions as any)?.[permissionKey]) {
        return <Navigate to="/configuraciones/mi-perfil" replace />;
    }
    return <>{children}</>;
};

// --- LAYOUT ---
const MainLayout = ({ children, user, title, onLogout, isImpersonating, onExitImpersonation, logoUrl }: { 
    children: React.ReactNode, 
    user: User, 
    title: string, 
    onLogout: () => void,
    isImpersonating: boolean,
    onExitImpersonation: () => void,
    logoUrl?: string | null 
}) => (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      <Sidebar user={user} logoUrl={logoUrl} />
      <main className="flex-1 ml-64 p-8">
        <Header 
          title={title} user={user} onLogout={onLogout} 
          isImpersonating={isImpersonating} onExitImpersonation={onExitImpersonation}
        />
        <div className="mt-8">{children}</div>
      </main>
    </div>
);

const App = () => {
  const { appUser: contextUser, status, logout } = useAuth();
  
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
    };

    return { ...contextUser, permissions: effectivePermissions };
  }, [contextUser]);

  const [isImpersonating, setIsImpersonating] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  
  // Inicialización inteligente de settings
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

  // --- FUNCIÓN DE TÍTULO DINÁMICO ---
  const getTitleForPath = (path: string): string => {
    if (path.startsWith('/reportes/')) return 'Detalle de Reporte';
    if (path.startsWith('/superadmin')) return 'Panel Super Admin';
    
    const routes: Record<string, string> = {
      '/': 'Inicio', 
      '/oportunidades': 'Dashboard', 
      '/clientes': 'Alta de Clientes',
      '/catalogo': 'Catálogo', 
      '/progreso': 'Progreso', 
      '/reportes': 'Reportes',
      '/configuraciones/mi-perfil': 'Mi Perfil', 
      '/configuraciones/personal': 'Personal',
      '/configuraciones/perfil': 'Perfil de Empresa', // Corregido para que salga el título correcto
      '/configuraciones/facturacion': 'Facturación'
    };

    // Si no es una ruta conocida, muestra el nombre de la empresa
    return routes[path] || companySettings?.name || 'IANGE';
  };

  // Refresh Data
  const refreshAppData = async () => {
      if (!user) {
          setDataLoading(false);
          return;
      }
      
      if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) {
          setDataLoading(false);
          return;
      }

      if (user.tenantId) {
          setDataLoading(true);

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
              let isNowOnboarded = cachedSettings.onboarded || hasLocalActivity || hasNetworkActivity;

              if (isNowOnboarded && !cachedSettings.onboarded) {
                  adapter.updateTenantSettings(user.tenantId, { onboarded: true });
              }

              if (tenantData) {
                  const newSettings = {
                      ...cachedSettings,
                      name: tenantData.name || tenantData.nombre, 
                      logo_url: tenantData.logo_url,
                      onboarded: isNowOnboarded,
                  };
                  setCompanySettings(newSettings);
                  adapter.updateTenantSettings(user.tenantId, newSettings);
              } else {
                  const fallbackSettings = { ...cachedSettings, onboarded: isNowOnboarded };
                  setCompanySettings(fallbackSettings);
                  adapter.updateTenantSettings(user.tenantId, fallbackSettings);
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

  useEffect(() => { refreshAppData(); }, [user]); 

  useEffect(() => {
      if (!user?.tenantId) return;
      const channel = supabase.channel('realtime:app-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'propiedades', filter: `tenant_id=eq.${user.tenantId}` }, () => refreshAppData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'contactos', filter: `tenant_id=eq.${user.tenantId}` }, () => refreshAppData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants', filter: `id=eq.${user.tenantId}` }, () => refreshAppData())
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [user?.tenantId]); 

  const asesores = useMemo(() => allUsers.filter(u => u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA), [allUsers]);

  const getInitialRoute = (currentUser: User) => {
      if (currentUser.role === ROLES.SUPER_ADMIN) return '/superadmin';
      const p = currentUser.permissions || {} as UserPermissions;
      if (p.dashboard) return '/oportunidades';
      if (p.contactos) return '/clientes';
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

  const handleUpdatePropiedad = async (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => {
    if (!user) return;
    showToast('Guardando cambios...', 'success');
    try {
        await updateContact(updatedPropietario.id, updatedPropietario);
        await updateProperty(updatedPropiedad, updatedPropietario.id.toString());
        showToast('Guardado con éxito.', 'success');
        refreshAppData();
    } catch (error) {
        showToast('Error al guardar.', 'error');
    }
  };

  const handleDeletePropiedad = () => showToast('Eliminando...');
  const handleAddVisita = () => showToast('Visita registrada');
  const handleUpdateUser = () => showToast('Perfil actualizado');
  const handleImpersonate = () => {}; 
  const handleExitImpersonation = () => {}; 
  const onNavigateAndEdit = (id: number) => { setInitialEditPropId(id); navigate('/clientes'); };

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
                >
                    <Routes>
                        <Route path="/" element={<Navigate to={getInitialRoute(user)} replace />} />
                        <Route path="/oportunidades" element={<ProtectedRoute user={user} permissionKey="dashboard"><OportunidadesDashboard propiedades={propiedades} asesores={asesores} propietarios={propietarios} compradores={compradores} companySettings={companySettings} isLoading={dataLoading} currentUser={user} /></ProtectedRoute>} />
                        <Route path="/clientes" element={<ProtectedRoute user={user} permissionKey="contactos"><AltaClientes showToast={showToast} propiedades={propiedades} setPropiedades={setPropiedades} propietarios={propietarios} setPropietarios={setPropietarios} compradores={compradores} setCompradores={setCompradores} handleUpdatePropiedad={handleUpdatePropiedad} handleDeletePropiedad={handleDeletePropiedad} initialEditPropId={initialEditPropId} setInitialEditPropId={setInitialEditPropId} asesores={asesores} currentUser={user} onDataChange={refreshAppData} /></ProtectedRoute>} />
                        <Route path="/catalogo" element={<ProtectedRoute user={user} permissionKey="propiedades"><Catalogo propiedades={propiedades} propietarios={propietarios} asesores={asesores} onAddVisita={handleAddVisita} handleUpdatePropiedad={handleUpdatePropiedad} showToast={showToast} currentUser={user} compradores={compradores} onDataChange={refreshAppData}/></ProtectedRoute>} />
                        <Route path="/progreso" element={<ProtectedRoute user={user} permissionKey="progreso"><Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={onNavigateAndEdit} asesores={asesores} /></ProtectedRoute>} />
                        <Route path="/reportes" element={<ProtectedRoute user={user} permissionKey="reportes"><Reportes /></ProtectedRoute>} />
                        <Route path="/reportes/:reportId" element={<ProtectedRoute user={user} permissionKey="reportes"><ReporteDetalle propiedades={propiedades} asesores={asesores} compradores={compradores} /></ProtectedRoute>} />
                        <Route path="/crm" element={<ProtectedRoute user={user} permissionKey="crm"><PlaceholderPage title="CRM" /></ProtectedRoute>} />
                        <Route path="/configuraciones" element={<Configuraciones />}>
                             <Route index element={<Navigate to="mi-perfil" replace />} />
                             <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
                             <Route path="perfil" element={(user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ? <PerfilEmpresa user={user} /> : <Navigate to="/configuraciones/mi-perfil" />} />
                             <Route path="facturacion" element={(user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ? <Facturacion /> : <Navigate to="/configuraciones/mi-perfil" />} />
                             <Route path="personal" element={<ProtectedRoute user={user} permissionKey="equipo"><PersonalEmpresa showToast={showToast} currentUser={user} onDataChange={refreshAppData} /></ProtectedRoute>} />
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