import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS, SETTINGS_MENU_ITEM, SETTINGS_MENU_ITEMS, SUPERADMIN_MENU_ITEMS, ROLES } from '../constants';
import { User, UserPermissions } from '../types';

// ==========================================
// COMPONENTE LOGO PERSONALIZADO
// ==========================================
const Logo = () => (
    <div className="flex justify-center items-center mb-12 h-16 px-2">
      {/* INSTRUCCIONES PARA TU LOGO:
          1. Sube tu archivo de imagen (ej. logo.png) a la carpeta 'public' de tu proyecto.
          2. Asegúrate que el 'src' de abajo coincida con el nombre de tu archivo.
      */}
      <img 
        src="/logo.svg" 
        alt="IANGE" 
        // CAMBIO: Reduje max-h-14 a max-h-10 (~30% menos) para que sea menos invasivo
        className="h-full w-auto object-contain max-h-10"
        onError={(e) => {
            // SISTEMA DE SEGURIDAD (FALLBACK):
            // Si la imagen no carga (porque no la has subido aún), ocultamos la imagen
            // y mostramos el logo de texto original automáticamente.
            e.currentTarget.style.display = 'none';
            const fallback = document.getElementById('logo-fallback');
            if (fallback) fallback.classList.remove('hidden');
        }}
      />
      
      {/* Logo original (Texto SVG) como respaldo */}
      <div id="logo-fallback" className="hidden">
          <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="30" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#1E1E1E">
              IANGE
              <tspan fill="#F37321">.</tspan>
            </text>
          </svg>
      </div>
    </div>
);

interface NavItemProps {
    item: {
        name: string;
        path: string;
        icon?: React.FC<{ className?: string }>; // Tipado para el icono
    };
}

const NavItem: React.FC<NavItemProps> = ({ item }) => {
  const Icon = item.icon; // Extraer el componente icono

  return (
    <NavLink
      to={item.path}
      end={item.path === '/' || item.path === '/superadmin'}
      className={({ isActive }) =>
        `flex items-center py-3 px-4 rounded-md transition-all duration-200 group ${
          isActive 
            ? 'bg-iange-salmon text-iange-orange font-semibold' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {/* Renderizado condicional del ícono con clases para color y tamaño */}
      {Icon && (
        <Icon 
          className={`h-5 w-5 mr-3 transition-colors ${
            // El icono hereda el color del texto automáticamente
            '' 
          }`} 
        />
      )}
      <span>{item.name}</span>
    </NavLink>
  );
};

interface SidebarProps {
    user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSettingsPage = location.pathname.startsWith('/configuraciones');
    const isSuperAdminPage = location.pathname.startsWith('/superadmin');
    
    // Si los permisos vienen nulos (ej. superadmin recién creado), usamos un objeto vacío
    const userPermissions = user.permissions || {} as UserPermissions;

    // --- FUNCIÓN DE FILTRADO PRINCIPAL ---
    const hasPermission = (item: { permissionKey?: keyof UserPermissions }): boolean => {
      // 1. Si el ítem NO requiere permiso específico (ej. Dashboard si no tuviera key), se muestra.
      // NOTA: En tus constantes, casi todo tiene permissionKey.
      if (!item.permissionKey) {
        return true;
      }
      
      // 2. Verificamos el valor exacto en el objeto de permisos.
      // Usamos !! para convertir a booleano real. Si es false o undefined, devuelve false.
      // Esto soluciona problemas con datos corruptos o incompletos en la DB.
      return !!userPermissions[item.permissionKey];
    };

    const visibleMenuItems = MENU_ITEMS.filter(hasPermission);
    
    // --- LÓGICA ESPECIAL PARA CONFIGURACIÓN ---
    // Filtramos el menú de configuración asegurando que el Admin vea TODO
    // y que los empleados solo vean lo que les corresponde.
    const visibleSettingsMenuItems = SETTINGS_MENU_ITEMS.filter(item => {
        // 1. "Mi Perfil" lo ven todos, siempre.
        if(item.path === "/configuraciones/mi-perfil") return true;
        
        // 2. Definimos quién es "Admin" (Dueño, Admin Empresa o SuperAdmin)
        // Esto incluye el rol 'cuentaempresa' para dueños.
        const isAdmin = user.role === ROLES.EMPRESA || user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.SUPER_ADMIN || user.role === ROLES.CUENTA_EMPRESA;

        // 3. Si es Admin, tiene acceso VIP a todo el menú de configuración.
        if (isAdmin) {
            return true;
        }

        // 4. --- RESTRICCIÓN ESTRICTA PARA NO ADMINS ---
        // Si NO es admin, ocultamos forzosamente estos apartados sensibles
        // independientemente de lo que diga la base de datos.
        if (item.path === '/configuraciones/perfil' || item.path === '/configuraciones/facturacion') {
            return false;
        }
        
        // 5. Para el resto (ej. 'Personal'), revisamos el permiso específico (toggle 'equipo')
        // usando la función robusta hasPermission.
        return hasPermission(item);
    });
    
    const canSeeSettings = visibleSettingsMenuItems.length > 0;

    // --- LÓGICA DE NAVEGACIÓN ---
    const handleBack = () => {
        // Si soy Super Admin, SIEMPRE vuelvo a /superadmin, sin importar de dónde venga
        if (user.role === ROLES.SUPER_ADMIN) {
            navigate('/superadmin');
            return;
        }
        
        // Comportamiento normal para otros roles
        navigate(isSuperAdminPage ? '/superadmin' : '/oportunidades');
    };

    const MainMenu = () => (
        <>
            <div>
                <Logo />
                <nav className="space-y-2">
                {visibleMenuItems.map((item) => (
                    <NavItem key={item.name} item={item} />
                ))}
                </nav>
            </div>
             {canSeeSettings && (
                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                    <NavItem item={SETTINGS_MENU_ITEM} />
                </div>
             )}
        </>
    );

    const SuperAdminMenu = () => (
        <div>
            <Logo />
            <nav className="space-y-2">
            {SUPERADMIN_MENU_ITEMS.map((item) => (
                <NavItem key={item.name} item={item} />
            ))}
            </nav>
        </div>
    );

    const SettingsMenu = () => (
         <div>
            <Logo />
            <button
                onClick={handleBack}
                className="w-full text-left py-3 px-4 rounded-md bg-iange-salmon text-iange-dark font-semibold mb-4 hover:bg-orange-200 transition-colors flex items-center"
            >
                <span className="mr-2">←</span> Atrás
            </button>
            <nav className="space-y-2">
            {visibleSettingsMenuItems.map((item) => (
                <NavItem key={item.name} item={item} />
            ))}
            </nav>
        </div>
    );

  const renderContent = () => {
    // Prioridad visual: Si es página de settings, mostramos menú de settings
    if (isSettingsPage) {
        return <SettingsMenu />;
    }
    // Si estamos en rutas de superadmin, mostramos menú de superadmin
    if (isSuperAdminPage) {
        return <SuperAdminMenu />;
    }
    // Por defecto menú principal
    return <MainMenu />;
  }

  return (
    <aside className="w-64 bg-white h-screen p-6 flex flex-col justify-between border-r border-gray-200 fixed top-0 left-0 z-30 overflow-y-auto">
      {renderContent()}
    </aside>
  );
};

export default Sidebar;