import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  // --- ESTADO ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Empieza cargando
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Referencia para evitar recargas innecesarias
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

    // Función auxiliar para cargar perfil
    const loadProfile = async (sessionUser: any) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();
            
            if (mounted) {
                if (data) {
                    setUser({
                        id: data.id as any,
                        email: sessionUser.email || '',
                        name: data.full_name || 'Usuario',
                        role: data.role || 'asesor',
                        photo: data.avatar_url || 'VP',
                        tenantId: data.tenant_id,
                        permissions: data.permissions,
                        phone: data.phone || '',
                    });
                } else if (error) {
                    console.error("Error perfil:", error.message);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            // PASE LO QUE PASE, al terminar de buscar perfil, quitamos loading
            if (mounted) setLoading(false);
        }
    };

    // A. Chequeo Inicial (Al recargar página)
    const checkCurrentSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await loadProfile(session.user);
        } else {
            if (mounted) setLoading(false); // Si no hay sesión, quitamos carga inmediatamente
        }
    };

    checkCurrentSession();

    // B. Oyente de Cambios (Login/Logout futuros)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT') {
            setUser(null);
            navigate('/login');
        } else if (event === 'SIGNED_IN' && session?.user) {
            // Si el usuario ya está cargado (por el chequeo inicial), NO hacemos nada.
            // Esto evita el bucle infinito y el parpadeo.
            if (userRef.current?.id === session.user.id) return;

            // Si es un login nuevo, cargamos el perfil SIN poner setLoading(true)
            // Dejamos que la UI se actualice reactivamente cuando llegue la data.
            loadProfile(session.user); 
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  // --- 2. CARGA DE DATOS DE NEGOCIO ---
  useEffect(() => {
    const loadData = async () => {
        if (!user) return;
        if (!user.tenantId && user.role === ROLES.SUPER_ADMIN) return;

        if (user.tenantId) {
            try {
                // Datos reales Supabase
                const props = await getPropertiesByTenant(user.tenantId);
                const contacts = await getContactsByTenant(user.tenantId);
                
                if (props) setPropiedades(props);
                if (contacts) {
                    setPropietarios(contacts.propietarios);
                    setCompradores(contacts.compradores);
                }
                // Datos locales (fallback)
                setAllUsers(adapter.listUsers(user.tenantId));
                setCompanySettings(adapter.getTenantSettings(user.tenantId));
            } catch (error) {
                console.error("Error cargando datos negocio:", error);
                setPropiedades(adapter.listProperties(user.tenantId));
            }
        }
    };
    loadData();
  }, [user]); 

  const asesores = useMemo(() => allUsers.filter(u => 
    u.role === ROLES.ASESOR || u.role === ROLES.ADMIN_EMPRESA || u.role === ROLES.EMPRESA
  ), [allUsers]);

  // --- HANDLERS ---

  const handleLogin = async (email: string, pass: string) => {
    // NO activamos setLoading(true) aquí. Dejamos que Login.tsx maneje su spinner visual.
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

  // Handlers Dummy / Locales
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
        <div className="text-center animate-pulse">
          <div className="text-3xl font-bold text-iange-orange mb-2">IANGE<span className="text-gray-800">.</span></div>
          <div className="text-gray-500">Cargando sistema...</div>
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