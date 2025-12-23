import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { MENU_ITEMS, SETTINGS_MENU_ITEM, SETTINGS_MENU_ITEMS, SUPERADMIN_MENU_ITEMS, ROLES } from '../constants';
import { User, UserPermissions } from '../types';
import { useAuth } from '../authContext'; // 1. Importamos el hook global

// ==========================================
// COMPONENTE LOGO PERSONALIZADO (DINÁMICO)
// ==========================================
const Logo = ({ url }: { url?: string | null }) => (
    <div className="flex justify-center items-center mb-12 h-16 px-2">
      <img 
        src={url || "/logo.svg"} 
        alt="Logo" 
        className="h-full w-auto object-contain max-h-12 max-w-[180px]" 
        onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = document.getElementById('logo-fallback');
            if (fallback) fallback.classList.remove('hidden');
        }}
      />
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
        icon?: React.FC<{ className?: string }>; 
    };
}

const NavItem: React.FC<NavItemProps> = ({ item }) => {
  const Icon = item.icon; 

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
      {Icon && (
        <Icon 
          className={`h-5 w-5 mr-3 transition-colors`} 
        />
      )}
      <span>{item.name}</span>
    </NavLink>
  );
};

interface SidebarProps {
    user: User;
    logoUrl?: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ user, logoUrl }) => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // 2. Obtenemos la función de permisos centralizada del Contexto
    const { hasPermission: checkPermission } = useAuth(); 

    const isSettingsPage = location.pathname.startsWith('/configuraciones');
    const isSuperAdminPage = location.pathname.startsWith('/superadmin');
    
    // Filtramos el menú principal usando la lógica global
    const visibleMenuItems = MENU_ITEMS.filter(item => {
        if (!item.permissionKey) return true;
        return checkPermission(item.permissionKey);
    });
    
    // 3. REEMPLAZO DE visibleSettingsMenuItems SIN BLOQUEOS MANUALES
    const visibleSettingsMenuItems = SETTINGS_MENU_ITEMS.filter(item => {
        // "Mi perfil" es siempre visible
        if(item.path === "/configuraciones/mi-perfil") return true;
        
        // Si el item tiene llave de permiso (ej: 'billing_edit'), consultamos al Contexto.
        // Si NO tiene llave (ej: 'Perfil de empresa'), permitimos el acceso solo a administradores.
        if (item.permissionKey) {
            return checkPermission(item.permissionKey);
        } else {
            return [ROLES.EMPRESA, ROLES.ADMIN_EMPRESA, ROLES.SUPER_ADMIN, ROLES.CUENTA_EMPRESA].includes(user.role as any);
        }
    });
    
    const canSeeSettings = visibleSettingsMenuItems.length > 0;

    const handleBack = () => {
        if (user.role === ROLES.SUPER_ADMIN) {
            navigate('/superadmin');
            return;
        }
        
        const p = user.permissions || {} as UserPermissions;

        if (p.dashboard) navigate('/oportunidades');
        else if (p.contactos) navigate('/clientes');
        else if (p.propiedades) navigate('/catalogo');
        else if (p.progreso) navigate('/progreso');
        else if (p.reportes) navigate('/reportes');
        else if (p.crm) navigate('/crm');
        else {
            navigate('/configuraciones/mi-perfil');
        }
    };

    const MainMenu = () => (
        <>
            <div>
                <Logo url={logoUrl} />
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
            <Logo url={logoUrl} />
            <nav className="space-y-2">
            {SUPERADMIN_MENU_ITEMS.map((item) => (
                <NavItem key={item.name} item={item} />
            ))}
            </nav>
        </div>
    );

    const SettingsMenu = () => (
         <div>
            <Logo url={logoUrl} />
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
    if (isSettingsPage) {
        return <SettingsMenu />;
    }
    if (isSuperAdminPage) {
        return <SuperAdminMenu />;
    }
    return <MainMenu />;
  }

  return (
    // ESTRUCTURA CORREGIDA:
    // 1. El aside principal mantiene la posición fija y el borde, pero delegamos el layout interno.
    <aside className="w-64 bg-white h-screen flex flex-col border-r border-gray-200 fixed top-0 left-0 z-30">
      
      {/* 2. CONTENEDOR DE CONTENIDO (flex-1):
          Aquí movemos todas las clases que controlaban el layout original:
          - p-6: Padding original.
          - justify-between: Separa logo (arriba) de configuraciones (abajo).
          - overflow-y-auto: Scroll interno si la pantalla es chica.
          - flex-1: OBLIGA a este div a ocupar todo el espacio disponible, empujando los items.
      */}
      <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
        {renderContent()}
      </div>

      {/* 3. VERSIÓN (Footer):
          Queda fuera del padding y scroll, pegado al borde inferior.
      */}
      <div className="pb-2 text-[10px] text-gray-300 font-mono text-center select-none bg-white">
        v1.0.1
      </div>

    </aside>
  );
};

export default Sidebar;