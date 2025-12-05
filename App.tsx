import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

// Tipos y constantes
import { User, Propiedad, Propietario, Comprador, CompanySettings, UserPermissions } from "./types";
import { DEFAULT_ROUTES, ROLES, ROLE_DEFAULT_PERMISSIONS } from "./constants";
import adapter from "./data/localStorageAdapter"; 
import { getPropertiesByTenant, getContactsByTenant, getUsersByTenant } from './Services/api';

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

const App = () => {
  // --- ESTADO ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); 
  const [isImpersonating, setIsImpersonating] = useState(false);

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
  const [showChangePassword, setShowChangePassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. AUTENTICACIÓN ESTABLE ---
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
                    
                    // --- CORRECCIÓN CRÍTICA DE PERMISOS ---
                    // Lógica para garantizar acceso a dueños y consistencia en permisos
                    let effectivePermissions: UserPermissions;

                    // Si es Admin o Dueño, forzamos TODOS los permisos a TRUE
                    if (userRole === ROLES.ADMIN_EMPRESA || userRole === ROLES.CUENTA_EMPRESA || userRole === ROLES.SUPER_ADMIN) {
                        effectivePermissions = {
                            propiedades: true,
                            contactos: true,
                            operaciones: true,
                            documentosKyc: true,
                            reportes: true,
                            equipo: true
                        };
                    } else {
                        // Para otros roles, mezclamos DB con Defaults
                        const defaultPerms = ROLE_DEFAULT_PERMISSIONS[userRole] || ROLE_DEFAULT_PERMISSIONS['asesor'];
                        const dbPerms = data.permissions || {};

                        effectivePermissions = {
                            propiedades: dbPerms.propiedades ?? defaultPerms.propiedades,
                            contactos: dbPerms.contactos ?? defaultPerms.contactos,
                            operaciones: dbPerms.operaciones ?? defaultPerms.operaciones,
                            documentosKyc: dbPerms.documentosKyc ?? defaultPerms.documentosKyc,
                            reportes: dbPerms.reportes ?? defaultPerms.reportes,
                            equipo: dbPerms.equipo ?? defaultPerms.equipo,
                        };
                    }

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


  // --- 2. CARGA DE DATOS DE NEGOCIO (Función expuesta) ---
  const refreshAppData = async () => {
      if (!user) return;
      if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) return;

      if (user.tenantId) {
          try {
              // Datos reales Supabase
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
                  setAllUsers(usersDb); // <-- Esto actualiza la lista de asesores para el Dashboard
              }

              // Configuración sigue local por ahora
              setCompanySettings(adapter.getTenantSettings(user.tenantId));
          } catch (error) {
              console.error("Error cargando datos negocio:", error);
              // Fallback en caso de error
              setPropiedades(adapter.listProperties(user.tenantId));
          }
      }
  };

  useEffect(() => {
    refreshAppData();
  }, [user]); 

  const asesores = useMemo(() => allUsers.filter(u => 
    u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA
  ), [allUsers]);

  // --- HANDLERS ---

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

  const handleUpdatePropiedad = () => showToast('Guardando...');
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

  // --- RENDER ---

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
          <div className="text-gray-500">Cargando sistema...</div>
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

  const MainLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      <Sidebar user={user} />
      <main className="flex-1 ml-64 p-8">
        <Header 
          title={getTitleForPath(location.pathname)} user={user} onLogout={handleLogout} 
          isImpersonating={isImpersonating} onExitImpersonation={handleExitImpersonation}
        />
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_ROUTES[user.role] || '/oportunidades'} />} />
          <Route path="/login" element={<Navigate to="/" />} />
          
          <Route path="/oportunidades" element={<OportunidadesDashboard propiedades={propiedades} asesores={asesores} propietarios={propietarios} compradores={compradores} companySettings={companySettings} />} />
          <Route path="/clientes" element={
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
              onDataChange={refreshAppData} // <--- SE PASA LA FUNCIÓN AQUÍ
            />
          } />
          <Route path="/catalogo" element={<Catalogo propiedades={propiedades} propietarios={propietarios} asesores={asesores} onAddVisita={handleAddVisita} handleUpdatePropiedad={handleUpdatePropiedad} showToast={showToast} />} />
          <Route path="/progreso" element={<Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={onNavigateAndEdit} asesores={asesores} />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/reportes/:reportId" element={<ReporteDetalle propiedades={propiedades} asesores={asesores} />} />
          <Route path="/crm" element={<PlaceholderPage title="CRM" />} />

          <Route path="/configuraciones" element={<Configuraciones />}>
             <Route index element={<Navigate to="mi-perfil" replace />} />
             <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
             <Route path="perfil" element={<PerfilEmpresa user={user} />} />
             <Route path="personal" element={
                <PersonalEmpresa 
                  showToast={showToast} 
                  currentUser={user} 
                  onDataChange={refreshAppData} // <--- SE PASA LA FUNCIÓN AQUÍ TAMBIÉN
                />
             } />
             <Route path="facturacion" element={<Facturacion />} />
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