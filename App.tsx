import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; 

// Tipos y constantes
import { User, Propiedad, Propietario, Comprador, CompanySettings } from "./types";
import { DEFAULT_ROUTES, ROLES } from "./constants";
import adapter from "./data/localStorageAdapter"; 
import { getPropertiesByTenant, getContactsByTenant } from './Services/api';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

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

  // --- 1. LÓGICA DE AUTENTICACIÓN (CORREGIDA) ---
  useEffect(() => {
    let mounted = true;

    // Función para obtener el perfil desde Supabase
    const fetchProfile = async (sessionUser: any) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();

        if (error) {
          console.error("Error al obtener perfil:", error.message);
          return null;
        }

        return {
          id: data.id,
          email: sessionUser.email || '',
          name: data.full_name || 'Usuario',
          role: data.role || 'asesor',
          photo: data.avatar_url || 'VP',
          tenantId: data.tenant_id,
          permissions: data.permissions,
          phone: data.phone || '',
        };
      } catch (err) {
        console.error("Error inesperado en perfil:", err);
        return null;
      }
    };

    const initAuth = async () => {
      try {
        // Verificar sesión actual
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const profileUser = await fetchProfile(session.user);
          if (mounted && profileUser) {
            // @ts-ignore
            setUser(profileUser);
          }
        }
      } catch (error) {
        console.error("Error inicializando auth:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Solo recargamos si el usuario es null (para evitar bucles)
        if (!user) {
            const profileUser = await fetchProfile(session.user);
            if (mounted && profileUser) {
                // @ts-ignore
                setUser(profileUser);
            }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencias vacías para correr solo al montar

  // --- 2. CARGA DE DATOS ---
  useEffect(() => {
    const loadData = async () => {
        if (!user) return;

        // Si es Super Admin sin empresa, no cargamos propiedades de negocio
        if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) {
            return;
        }

        if (user.tenantId) {
            try {
                // Datos reales
                const props = await getPropertiesByTenant(user.tenantId);
                const contacts = await getContactsByTenant(user.tenantId);
                
                if (props) setPropiedades(props);
                if (contacts) {
                    setPropietarios(contacts.propietarios);
                    setCompradores(contacts.compradores);
                }

                // Datos locales (fallback temporal para usuarios y settings)
                setAllUsers(adapter.listUsers(user.tenantId));
                setCompanySettings(adapter.getTenantSettings(user.tenantId));
            } catch (error) {
                console.error("Error cargando datos:", error);
                // Fallback silencioso a local si falla la red
                setPropiedades(adapter.listProperties(user.tenantId));
            }
        }
    };
    loadData();
  }, [user]); // Se ejecuta cuando el usuario cambia (login)

  const asesores = useMemo(() => allUsers.filter(u => 
    u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA
  ), [allUsers]);

  // --- HANDLERS ---

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
        alert(error.message);
        setLoading(false);
    }
    // No navegamos manualmente, el listener lo hará
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handlers
  const handleUpdatePropiedad = () => showToast('Guardando...');
  const handleDeletePropiedad = () => showToast('Eliminando...');
  const handleAddVisita = () => showToast('Visita registrada');
  const handlePasswordChanged = () => setShowChangePassword(false);
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
        <div className="text-center">
            <div className="text-3xl font-bold text-iange-orange mb-2">IANGE<span className="text-gray-800">.</span></div>
            <div className="text-gray-500 animate-pulse">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Routes><Route path="*" element={<Login onLogin={handleLogin} />} /></Routes>;
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
          <Route path="/clientes" element={<AltaClientes showToast={showToast} propiedades={propiedades} setPropiedades={setPropiedades} propietarios={propietarios} setPropietarios={setPropietarios} compradores={compradores} setCompradores={setCompradores} handleUpdatePropiedad={handleUpdatePropiedad} handleDeletePropiedad={handleDeletePropiedad} initialEditPropId={initialEditPropId} setInitialEditPropId={setInitialEditPropId} asesores={asesores} currentUser={user} />} />
          <Route path="/catalogo" element={<Catalogo propiedades={propiedades} propietarios={propietarios} asesores={asesores} onAddVisita={handleAddVisita} handleUpdatePropiedad={handleUpdatePropiedad} showToast={showToast} />} />
          <Route path="/progreso" element={<Progreso propiedades={propiedades} propietarios={propietarios} onUpdatePropiedad={handleUpdatePropiedad} onNavigateAndEdit={onNavigateAndEdit} asesores={asesores} />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/reportes/:reportId" element={<ReporteDetalle propiedades={propiedades} asesores={asesores} />} />
          <Route path="/crm" element={<PlaceholderPage title="CRM" />} />

          <Route path="/configuraciones" element={<Configuraciones />}>
             <Route index element={<Navigate to="mi-perfil" replace />} />
             <Route path="mi-perfil" element={<MiPerfil user={user} onUserUpdated={handleUpdateUser} />} />
             <Route path="perfil" element={<PerfilEmpresa user={user} />} />
             <Route path="personal" element={<PersonalEmpresa showToast={showToast} currentUser={user} />} />
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