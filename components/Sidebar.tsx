import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS, SETTINGS_MENU_ITEM, SETTINGS_MENU_ITEMS, SUPERADMIN_MENU_ITEMS, ROLES } from '../constants';
import { User, UserPermissions } from '../types';
import { useAuth } from '../authContext';

// --- ICONO FLECHA (Chevron) ---
const ChevronLeftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

// ==========================================
// COMPONENTE LOGO ADAPTATIVO (CENTRADO Y MÁS GRANDE)
// ==========================================
const Logo = ({ url, collapsed, accountName }: { url?: string | null, collapsed: boolean, accountName?: string }) => {
    const initial = accountName ? accountName.charAt(0).toUpperCase() : 'I';

    return (
        // Contenedor principal del Logo:
        // - collapsed: justify-center (Centrado perfecto)
        // - expanded: justify-center (También centrado para que se vea bien alineado) o justify-start si prefieres a la izquierda.
        // He puesto 'justify-center' en ambos para asegurar que se vea equilibrado, pero puedes cambiar el 'else' a 'justify-start'.
        <div className={`flex items-center mb-8 h-16 transition-all duration-300 w-full ${collapsed ? 'justify-center px-0' : 'justify-center px-2'}`}>
        {collapsed ? (
            // ✅ LOGO VERSIÓN CUADRO NARANJA (Centrado)
            <div className="w-10 h-10 bg-iange-orange rounded-lg flex items-center justify-center shadow-sm transition-transform hover:scale-105 cursor-default flex-shrink-0">
                <span className="text-white font-bold text-xl select-none">{initial}</span>
            </div>
        ) : (
            // ✅ LOGO COMPLETO (Más Grande y Centrado)
            <img 
                src={url || "/logo.svg"} 
                alt="Logo" 
                // Aumentado max-h-12 y max-w-[180px] para mayor presencia
                className="h-full w-auto object-contain max-h-12 max-w-[180px] transition-opacity duration-300" 
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('logo-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                }}
            />
        )}
        
        {/* Fallback oculto */}
        <div id="logo-fallback" className={`hidden ${collapsed ? 'hidden' : ''}`}>
            <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="30" fontFamily="sans-serif" fontSize="32" fontWeight="bold" fill="#1E1E1E">
                IANGE<tspan fill="#F37321">.</tspan>
                </text>
            </svg>
        </div>
        </div>
    );
};

// ==========================================
// NAV ITEM (TRANSICIÓN SUAVE)
// ==========================================
interface NavItemProps {
    item: {
        name: string;
        path: string;
        icon?: React.FC<{ className?: string }>; 
    };
    collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed }) => {
  const Icon = item.icon; 

  return (
    <NavLink
      to={item.path}
      end={item.path === '/' || item.path === '/superadmin'}
      title={collapsed ? item.name : ''}
      className={({ isActive }) =>
        `flex items-center rounded-md transition-all duration-300 group relative overflow-hidden
         py-2.5
         ${collapsed ? 'justify-center px-2' : 'px-4'} 
         ${isActive 
            ? 'bg-iange-salmon text-iange-orange' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 transition-all duration-300 ${collapsed ? '' : 'mr-3'}`}>
          {Icon && (
            <Icon className="w-5 h-5 transition-colors duration-300" />
          )}
      </div>
      
      <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${collapsed ? 'w-0 opacity-0' : 'w-40 opacity-100'}`}>
          <span className="font-medium text-sm">{item.name}</span>
      </div>
    </NavLink>
  );
};

interface SidebarProps {
    user: User;
    logoUrl?: string | null;
    accountName?: string;
    collapsed: boolean;
    toggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, logoUrl, accountName, collapsed, toggleCollapse }) => {
    
    const location = useLocation();
    const navigate = useNavigate();
    const { hasPermission: checkPermission } = useAuth(); 

    const isSettingsPage = location.pathname.startsWith('/configuraciones');
    const isSuperAdminPage = location.pathname.startsWith('/superadmin');
    
    // Filtros de menú
    const visibleMenuItems = MENU_ITEMS.filter(item => !item.permissionKey || checkPermission(item.permissionKey));
    const visibleSettingsMenuItems = SETTINGS_MENU_ITEMS.filter(item => {
        if(item.path === "/configuraciones/mi-perfil") return true;
        return item.permissionKey 
            ? checkPermission(item.permissionKey) 
            : [ROLES.EMPRESA, ROLES.ADMIN_EMPRESA, ROLES.SUPER_ADMIN, ROLES.CUENTA_EMPRESA].includes(user.role as any);
    });
    
    const canSeeSettings = visibleSettingsMenuItems.length > 0;

    const handleBack = () => {
        if (user.role === ROLES.SUPER_ADMIN) navigate('/superadmin');
        else {
            const p = user.permissions || {} as UserPermissions;
            if (p.dashboard) navigate('/oportunidades');
            else navigate('/configuraciones/mi-perfil');
        }
    };

    // --- RENDERERS ---

    const MainMenu = () => (
        <>
            <Logo url={logoUrl} collapsed={collapsed} accountName={accountName || user.name} />
            <nav className="space-y-1 w-full">
                {visibleMenuItems.map((item) => (
                    <NavItem key={item.name} item={item} collapsed={collapsed} />
                ))}
            </nav>
             {canSeeSettings && (
                <div className={`mt-auto pt-4 border-t border-gray-100 w-full ${collapsed ? 'px-0' : ''}`}>
                    <NavItem item={SETTINGS_MENU_ITEM} collapsed={collapsed} />
                </div>
             )}
        </>
    );

    const SuperAdminMenu = () => (
        <>
            <Logo url={logoUrl} collapsed={collapsed} accountName={accountName || user.name} />
            <nav className="space-y-1 w-full">
                {SUPERADMIN_MENU_ITEMS.map((item) => (
                    <NavItem key={item.name} item={item} collapsed={collapsed} />
                ))}
            </nav>
        </>
    );

    const SettingsMenu = () => (
         <>
            <Logo url={logoUrl} collapsed={collapsed} accountName={accountName || user.name} />
            
            <button
                onClick={handleBack}
                title="Volver"
                className={`
                    w-full mb-4 rounded-md bg-iange-salmon text-iange-dark font-semibold hover:bg-orange-200 transition-colors flex items-center overflow-hidden
                    py-2.5
                    ${collapsed ? 'justify-center px-2' : 'px-4'}
                `}
            >
                <div className={`flex-shrink-0 flex items-center justify-center w-6 h-6 transition-all duration-300 ${collapsed ? '' : 'mr-3'}`}>
                    <span>←</span> 
                </div>
                
                <div className={`overflow-hidden transition-all duration-300 whitespace-nowrap ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <span className="font-semibold text-sm">Atrás</span>
                </div>
            </button>

            <nav className="space-y-1 w-full">
                {visibleSettingsMenuItems.map((item) => (
                    <NavItem key={item.name} item={item} collapsed={collapsed} />
                ))}
            </nav>
        </>
    );

  const renderContent = () => {
    if (isSettingsPage) return <SettingsMenu />;
    if (isSuperAdminPage) return <SuperAdminMenu />;
    return <MainMenu />;
  }

  const widthClass = collapsed ? 'w-20' : 'w-64';

  return (
    <aside 
        className={`
            bg-white h-screen border-r border-gray-200 fixed top-0 left-0 z-30 
            flex flex-col transition-all duration-300 ease-in-out
            ${widthClass}
        `}
    >
        {/* BOTÓN DE COLAPSO (MEDIO) */}
        <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-iange-orange hover:border-iange-orange shadow-sm z-50 transition-colors focus:outline-none"
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
            <ChevronLeftIcon className={`w-3 h-3 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* CONTENIDO */}
        <div className={`flex-1 flex flex-col justify-between overflow-y-auto overflow-x-hidden ${collapsed ? 'items-center py-6 px-2' : 'p-6'}`}>
            <div className="flex flex-col h-full w-full">
                {renderContent()}
            </div>
        </div>

        {/* FOOTER */}
        <div className={`pb-3 text-[10px] text-gray-300 font-mono text-center select-none bg-white transition-opacity duration-300 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            v1.0.1
        </div>
    </aside>
  );
};

export default Sidebar;