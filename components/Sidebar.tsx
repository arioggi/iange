import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS, SETTINGS_MENU_ITEM, SETTINGS_MENU_ITEMS, ROLE_PERMISSIONS, SUPERADMIN_MENU_ITEMS, ROLES } from '../constants';
import { User, UserPermissions } from '../types';

const Logo = () => (
    <div className="flex justify-center items-center mb-12 h-12">
      <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="30" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'" fontSize="32" fontWeight="bold" fill="#1E1E1E">
          IANGE
          <tspan fill="#F37321">.</tspan>
        </text>
      </svg>
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
    
    const userPermissions = user.permissions || {} as UserPermissions;

    const hasPermission = (item: { permissionKey?: keyof UserPermissions }): boolean => {
      // Items without a permissionKey are always visible
      if (!item.permissionKey) {
        return true;
      }
      return userPermissions[item.permissionKey] === true;
    };

    const visibleMenuItems = MENU_ITEMS.filter(hasPermission);
    const visibleSettingsMenuItems = SETTINGS_MENU_ITEMS.filter(item => {
        if(item.path === "/configuraciones/mi-perfil") return true;
        
        // Perfil de empresa y Facturación son para roles de alto nivel
        if(item.path === "/configuraciones/perfil" || item.path === "/configuraciones/facturacion") {
             return user.role === ROLES.EMPRESA || user.role === ROLES.ADMIN_EMPRESA;
        }
        
        // El resto se basa en permisos de toggle
        return hasPermission(item);
    });
    
    // Un usuario puede ver "Configuraciones" si tiene acceso a CUALQUIERA de sus sub-páginas
    const canSeeSettings = visibleSettingsMenuItems.length > 0;

    const handleBack = () => {
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
    if (isSuperAdminPage) {
        return <SuperAdminMenu />;
    }
    if (isSettingsPage) {
        return <SettingsMenu />;
    }
    return <MainMenu />;
  }

  return (
    <aside className="w-64 bg-white h-screen p-6 flex flex-col justify-between border-r border-gray-200 fixed top-0 left-0 z-30">
      {renderContent()}
    </aside>
  );
};

export default Sidebar;