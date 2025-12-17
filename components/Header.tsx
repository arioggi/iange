import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import Modal from './ui/Modal';

interface HeaderProps {
  title: string;
  user: User;
  onLogout: () => void;
  isImpersonating?: boolean;
  onExitImpersonation?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, user, onLogout, isImpersonating, onExitImpersonation }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleLogoutClick = () => {
        setDropdownOpen(false);
        setLogoutModalOpen(true);
    };
    
    const handleConfirmLogout = () => {
        setLogoutModalOpen(false);
        onLogout();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

  return (
    <>
        {isImpersonating && (
            <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-center py-2 z-50 text-sm font-semibold">
                Estás en modo administrador.
                <button onClick={onExitImpersonation} className="ml-4 font-bold underline hover:text-yellow-900">
                    Salir y volver a Super Admin
                </button>
            </div>
        )}
        <header className="flex justify-between items-center py-4">
        <h1 className="text-3xl font-bold text-iange-dark">{title}</h1>
        <div className="flex items-center space-x-4">
            <div className="text-right">
                <p className="font-semibold text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-500">{user.role}</p>
            </div>
            
            <div className="relative" ref={dropdownRef}>
                {/* --- BOTÓN DE PERFIL CORREGIDO --- */}
                <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)} 
                    className="w-12 h-12 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange transition-all"
                >
                    {user.photo && user.photo.length > 10 ? (
                        // Opción A: Mostrar la imagen real
                        <img 
                            src={user.photo} 
                            alt="Perfil" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        // Opción B: Fallback (Inicial sobre fondo naranja)
                        <div className="w-full h-full bg-iange-orange flex items-center justify-center text-white font-bold text-xl">
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                    )}
                </button>

                {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                        <Link to="/configuraciones/mi-perfil" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Configuración de mi perfil
                        </Link>
                        <button onClick={handleLogoutClick} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Cerrar sesión
                        </button>
                    </div>
                )}
            </div>
        </div>
        </header>
        <Modal title="Confirmar Cierre de Sesión" isOpen={isLogoutModalOpen} onClose={() => setLogoutModalOpen(false)}>
            <div className="text-center">
                <p className="text-lg text-gray-700">
                    ¿Estás seguro de que quieres cerrar sesión?
                </p>
                <div className="mt-6 flex justify-center space-x-4">
                    <button 
                        onClick={() => setLogoutModalOpen(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmLogout}
                        className="px-6 py-2 bg-iange-orange text-white rounded-md hover:bg-orange-600"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </div>
        </Modal>
    </>
  );
};

export default Header;