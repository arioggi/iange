import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

// Tipos y constantes
import { User, Propiedad, Propietario, Comprador, CompanySettings, UserPermissions } from "./types";
import { ROLES, ROLE_DEFAULT_PERMISSIONS } from "./constants";
import adapter from "./data/localStorageAdapter"; 
import { getPropertiesByTenant, getContactsByTenant, getUsersByTenant, updateProperty, updateContact } from './Services/api';

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
import ChangePassword from "./pages/ChangePassword";

// Configuración
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

// Componentes
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/ui/Toast';

// --- 1. COMPONENTE DE PROTECCIÓN DE RUTAS ---
const ProtectedRoute = ({ user, permissionKey, children }: { user: User, permissionKey?: keyof UserPermissions, children: React.ReactNode }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === ROLES.SUPER_ADMIN) return <>{children}</>;
    if (permissionKey && !user.permissions?.[permissionKey]) {
        return <Navigate to="/configuraciones/mi-perfil" replace />;
    }
    return <>{children}</>;
};

// --- 2. LAYOUT PRINCIPAL (DEFINIDO FUERA DE APP PARA EVITAR EL BUG DE HOOKS) ---
const MainLayout = ({ children, user, title, onLogout, isImpersonating, onExitImpersonation }: { 
    children: React.ReactNode, 
    user: User, 
    title: string, 
    onLogout: () => void,
    isImpersonating: boolean,
    onExitImpersonation: () => void
}) => (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      <Sidebar user={user} />
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
  // --- ESTADO ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); 
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  // Datos
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [propietarios, setPropietarios] = useState<Propietario[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [initialEditPropId, setInitialEditPropId] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    let mounted = true;

    const loadProfile = async (sessionUser: any) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();
            
            if (mounted) {
                if (data) {
                    const userRole = data.role || 'asesor';
                    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[userRole] || ROLE_DEFAULT_PERMISSIONS['asesor'];
                    const dbPerms = data.permissions || {};

                    const effectivePermissions: UserPermissions = {
                        dashboard: dbPerms.dashboard ?? defaultPerms.dashboard,
                        contactos: dbPerms.contactos ?? defaultPerms.contactos,
                        propiedades: dbPerms.propiedades ?? defaultPerms.propiedades,
                        progreso: dbPerms.progreso ?? defaultPerms.progreso,
                        reportes: dbPerms.reportes ?? defaultPerms.reportes,
                        crm: dbPerms.crm ?? defaultPerms.crm,
                        equipo: dbPerms.equipo ?? defaultPerms.equipo,
                    };

                    setDataLoading(true);

                    setUser({
                        id: data.id as any,
                        email: sessionUser.email || '',
                        name: data.full_name || 'Usuario',
                        role: userRole,
                        photo: data.avatar_url || 'VP',
                        tenantId: data.tenant_id,
                        permissions: effectivePermissions, 
                        phone: data.phone || '',
                    });
                } else if (error) {
                    console.error("Error perfil:", error.message);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (mounted) setLoading(false);
        }
    };

    const checkCurrentSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await loadProfile(session.user);
        } else {
            if (mounted) setLoading(false);
        }
    };

    checkCurrentSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
            setUser(null);
            navigate('/login');
        } else if (event === 'SIGNED_IN' && session?.user) {
            if (userRef.current?.id === session.user.id) return;
            loadProfile(session.user); 
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []); 


  // --- CARGA DE DATOS ---
  const refreshAppData = async () => {
      if (!user) return;
      if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) {
          setDataLoading(false);
          return;
      }

      if (user.tenantId) {
          try {
              const propsPromise = getPropertiesByTenant(user.tenantId);
              const contactsPromise = getContactsByTenant(user.tenantId);
              const usersPromise = getUsersByTenant(user.tenantId);

              const [props, contacts, usersDb] = await Promise.all([propsPromise, contactsPromise, usersPromise]);
              
              if (props) setPropiedades(props);
              if (contacts) {
                  setPropietarios(contacts.propietarios);
                  setCompradores(contacts.compradores);
              }
              if (usersDb) {
                  setAllUsers(usersDb);
              }
              setCompanySettings(adapter.getTenantSettings(user.tenantId));
          } catch (error) {
              console.error("Error cargando datos negocio:", error);
              setPropiedades([]); 
          } finally {
              setDataLoading(false);
          }
      } else {
          setDataLoading(false);
      }
  };

  useEffect(() => {
    refreshAppData();
  }, [user]); 

  // --- REALTIME: ACTUALIZACIÓN EN VIVO (EL OÍDO GLOBAL) ---
  useEffect(() => {
      if (!user?.tenantId) return;

      console.log("🔌 Conectando a Supabase Realtime...");

      // Nos suscribimos a cambios en las tablas de este tenant
      const channel = supabase.channel('realtime:app-updates')
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'propiedades', filter: `tenant_id=eq.${user.tenantId}` },
              (payload) => {
                  console.log('🔔 Cambio en PROPIEDADES detectado. Actualizando...');
                  refreshAppData();
              }
          )
          .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'contactos', filter: `tenant_id=eq.${user.tenantId}` },
              (payload) => {
                  console.log('🔔 Cambio en CLIENTES/OFERTAS detectado. Actualizando...');
                  refreshAppData();
              }
          )
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [user?.tenantId]); // Se reconecta solo si cambia el usuario/empresa


  const asesores = useMemo(() => allUsers.filter(u => 
    u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA
  ), [allUsers]);

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
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
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
        showToast('Propiedad y Propietario actualizados con éxito.', 'success');
        refreshAppData();
    } catch (error) {
        console.error("Error al actualizar propiedad:", error);
        showToast('Error al guardar cambios.', 'error');
    }
  };

  const handleDeletePropiedad = () => showToast('Eliminando...');
  const handleAddVisita = () => showToast('Visita registrada');
  const handleUpdateUser = () => showToast('Perfil actualizado');
  const handleImpersonate = () => {}; 
  const handleExitImpersonation = () => {}; 
  const onNavigateAndEdit = (id: number) => { setInitialEditPropId(id); navigate('/clientes'); };

  const getTitleForPath = (path: string): string => {
    if (path.startsWith('/reportes/')) return 'Detalle de Reporte';
    if (path.startsWith('/superadmin')) return 'Panel Super Admin';
    const routes: Record<string, string> = {
      '/': 'Inicio', '/oportunidades': 'Dashboard', '/clientes': 'Alta de Clientes',
      '/catalogo': 'Catálogo', '/progreso': 'Progreso', '/reportes': 'Reportes',
      '/configuraciones/mi-perfil': 'Mi Perfil', '/configuraciones/personal': 'Personal',
    };
    return routes[path] || 'IANGE';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-pulse flex flex-col items-center">
          <div className="mb-4 h-16 flex items-center justify-center">
             <img 
                src="/logo.svg" 
                alt="IANGE" 
                className="h-full w-auto object-contain max-h-12"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    document.getElementById('loading-logo-fallback')?.classList.remove('hidden');
                }}
            />
            <div id="loading-logo-fallback" className="hidden">
               <div className="text-3xl font-bold text-iange-orange mb-2">IANGE<span className="text-gray-800">.</span></div>
            </div>
          </div>
          <div className="text-gray-500">Iniciando sesión...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
        <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <MainLayout 
        user={user} 
        title={getTitleForPath(location.pathname)} 
        onLogout={handleLogout}
        isImpersonating={isImpersonating}
        onExitImpersonation={handleExitImpersonation}
      >
        <Routes>
          <Route path="/" element={<Navigate to={getInitialRoute(user)} replace />} />
          <Route path="/login" element={<Navigate to="/" />} />
          
          <Route path="/oportunidades" element={
            <ProtectedRoute user={user} permissionKey="dashboard">
                <OportunidadesDashboard 
                    propiedades={propiedades} 
                    asesores={asesores} 
                    propietarios={propietarios} 
                    compradores={compradores} 
                    companySettings={companySettings} 
                    isLoading={dataLoading} 
                    currentUser={user} 
                />
            </ProtectedRoute>
          } />
          
          <Route path="/clientes" element={
            <ProtectedRoute user={user} permissionKey="contactos">
                <AltaClientes 
                  showToast={showToast} 
                  propiedades={propiedades} setPropiedades={setPropiedades} 
                  propietarios={propietarios} setPropietarios={setPropietarios} 
                  compradores={compradores} setCompradores={setCompradores} 
                  handleUpdatePropiedad={handleUpdatePropiedad} handleDeletePropiedad={handleDeletePropiedad} 
                  initialEditPropId={initialEditPropId} setInitialEditPropId={setInitialEditPropId} 
                  asesores={asesores} currentUser={user} onDataChange={refreshAppData} 
                />
            </ProtectedRoute>
          } />
          
          <Route path="/catalogo" element={
            <ProtectedRoute user={user} permissionKey="propiedades">
                <Catalogo 
                  propiedades={propiedades} 
                  propietarios={propietarios} 
                  asesores={asesores} 
                  onAddVisita={handleAddVisita} 
                  handleUpdatePropiedad={handleUpdatePropiedad} 
                  showToast={showToast} 
                  currentUser={user}          // <--- CRUCIAL PARA LA OFERTA
                  compradores={compradores}   // <--- CRUCIAL PARA LA OFERTA
                  onDataChange={refreshAppData}
                />
            </ProtectedRoute>
          } />
          
          <Route path="/progreso" element={
            <ProtectedRoute user={user} permissionKey="progreso">
                <Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={onNavigateAndEdit} asesores={asesores} />
            </ProtectedRoute>
          } />
          
          <Route path="/reportes" element={
            <ProtectedRoute user={user} permissionKey="reportes">
                <Reportes />
            </ProtectedRoute>
          } />
          <Route path="/reportes/:reportId" element={
            <ProtectedRoute user={user} permissionKey="reportes">
                <ReporteDetalle 
                  propiedades={propiedades} 
                  asesores={asesores} 
                  compradores={compradores} // <--- CRUCIAL PARA LOS CÁLCULOS
                />
            </ProtectedRoute>
          } />
          
          <Route path="/crm" element={
            <ProtectedRoute user={user} permissionKey="crm">
                <PlaceholderPage title="CRM" />
            </ProtectedRoute>
          } />

          <Route path="/configuraciones" element={<Configuraciones />}>
             <Route index element={<Navigate to="mi-perfil" replace />} />
             <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
             
             <Route path="perfil" element={
                (user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ?
                <PerfilEmpresa user={user} /> : <Navigate to="/configuraciones/mi-perfil" />
             } />
             
             <Route path="facturacion" element={
                (user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA || user.role === ROLES.SUPER_ADMIN) ?
                <Facturacion /> : <Navigate to="/configuraciones/mi-perfil" />
             } />

             <Route path="personal" element={
                <ProtectedRoute user={user} permissionKey="equipo">
                    <PersonalEmpresa showToast={showToast} currentUser={user} onDataChange={refreshAppData} />
                </ProtectedRoute>
             } />
          </Route>

          <Route path="/superadmin/*" element={
             user.role === ROLES.SUPER_ADMIN ? (
               <Routes>
                 <Route path="/" element={<SuperAdminDashboard />} />
                 <Route path="empresas" element={<SuperAdminEmpresas showToast={showToast} onImpersonate={handleImpersonate} />} />
                 <Route path="usuarios-globales" element={<SuperAdminUsuarios showToast={showToast} />} />
                 <Route path="planes" element={<SuperAdminPlanes />} />
                 <Route path="configuracion" element={<SuperAdminConfiguracion showToast={showToast} />} />
                 <Route path="reportes-globales" element={<SuperAdminReportes />} />
                 <Route path="logs" element={<SuperAdminLogs />} />
               </Routes>
             ) : <Navigate to="/" />
          } />

          <Route path="*" element={<PlaceholderPage title="Página no encontrada" />} />
        </Routes>
      </MainLayout>
    </>
  );
};

export default App;