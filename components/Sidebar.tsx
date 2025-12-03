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
    };
}

const NavItem: React.FC<NavItemProps> = ({ item }) => (
  <NavLink
    to={item.path}
    end={item.path === '/' || item.path === '/superadmin'}
    className={({ isActive }) =>
      `block py-3 px-4 rounded-md transition-colors text-gray-700 hover:bg-iange-salmon ${
        isActive ? 'text-iange-orange font-semibold bg-iange-salmon' : ''
      }`
    }
  >
    <span>{item.name}</span>
  </NavLink>
);

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

    const hasPermission = (item: { permissionKey?: keyof UserPermissions }): boolean => {
      // Items sin permissionKey son siempre visibles
      if (!item.permissionKey) {
        return true;
      }
      return userPermissions[item.permissionKey] === true;
    };

    const visibleMenuItems = MENU_ITEMS.filter(hasPermission);
    
    // Filtro corregido para que el SuperAdmin vea todas las configuraciones si quiere
    const visibleSettingsMenuItems = SETTINGS_MENU_ITEMS.filter(item => {
        if(item.path === "/configuraciones/mi-perfil") return true;
        
        // CORRECCIÓN: Permitimos que el SuperAdmin también vea estas opciones
        if(item.path === "/configuraciones/perfil" || item.path === "/configuraciones/facturacion") {
             return user.role === ROLES.EMPRESA || user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.SUPER_ADMIN;
        }
        
        // El resto se basa en permisos (Personal requiere 'equipo')
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
                <div className="space-y-2">
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
                className="w-full text-left py-3 px-4 rounded-md bg-iange-salmon text-iange-dark font-semibold mb-4 hover:bg-orange-200 transition-colors"
            >
                &larr; Atrás
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
    <aside className="w-64 bg-white h-screen p-6 flex flex-col justify-between border-r border-gray-200 fixed top-0 left-0 z-30">
      {renderContent()}
    </aside>
  );
};

export default Sidebar;