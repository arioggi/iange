import React, { useState, useEffect } from 'react';
import UserTable from './UserTable';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import Modal from '../ui/Modal';
import { User } from '../../types';
// IMPORTANTE: Importamos las funciones reales de la API
import { getUsersByTenant, deleteUserSystem, createTenantUser, updateUserProfile } from '../../Services/api';

const TABS = ['Personal', 'Añadir usuario'];

interface PersonalEmpresaProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    currentUser: User;
    onDataChange?: () => void; 
}

const PersonalEmpresa: React.FC<PersonalEmpresaProps> = ({ showToast, currentUser, onDataChange }) => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para los modales
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Función para cargar usuarios REALES desde Supabase
    const loadUsers = async () => {
        // Validación de seguridad: Si no hay tenantId, no cargamos nada
        if (!currentUser.tenantId) return;
        
        setLoading(true);
        try {
            const data = await getUsersByTenant(currentUser.tenantId);
            setUsers(data);
        } catch (error) {
            console.error(error);
            showToast('Error cargando el personal.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Cargar al montar el componente o cambiar de usuario
    useEffect(() => {
        loadUsers();
    }, [currentUser.tenantId]);

    // Crear Usuario (Conecta con Supabase Auth)
    const handleAddUser = async (newUser: Omit<User, 'id'>) => {
        if (!currentUser.tenantId) {
            showToast('Error: No se identificó la empresa del usuario actual.', 'error');
            return;
        }
        
        try {
            const passwordToUse = newUser.password || "Temporal123!";
            
            // --- CORRECCIÓN AQUÍ: SE AGREGA EL ARGUMENTO DE PERMISOS ---
            await createTenantUser(
                newUser.email, 
                passwordToUse,
                currentUser.tenantId, 
                newUser.role || 'asesor', 
                newUser.name,
                newUser.permissions // <--- ¡ESTO FALTABA! Ahora los toggles se guardan al crear.
            );

            showToast('Usuario creado correctamente y vinculado a tu empresa.');
            loadUsers(); 
            
            // <--- Sincronizar estado global
            if (onDataChange) onDataChange();
            
            setActiveTab(TABS[0]); 
            
        } catch (error: any) {
            console.error(error);
            const msg = error.message?.includes('already registered') 
                ? 'El correo ya está registrado en el sistema.' 
                : (error.message || 'Error al crear usuario.');
            showToast(msg, 'error');
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };

    // Actualizar Usuario (Base de datos real)
    const handleUpdateUser = async (updatedUser: User) => {
        try {
            await updateUserProfile(updatedUser.id.toString(), {
                full_name: updatedUser.name,
                role: updatedUser.role,
                permissions: updatedUser.permissions
            });
            
            showToast('Usuario actualizado con éxito');
            loadUsers();
            
            // <--- 2. LÓGICA CRÍTICA PARA PERMISOS
            if (onDataChange) onDataChange();

            // Si me edito a mí mismo, recargo la página para aplicar cambios en Sidebar
            if (updatedUser.id === currentUser.id) {
                window.location.reload();
            }
            // ------------------------------------

            setEditModalOpen(false);
        } catch (error: any) {
            console.error(error);
            showToast('Error actualizando: ' + error.message, 'error');
        }
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };

    // --- BLOQUE DE ELIMINACIÓN INTEGRADO ---
    const handleConfirmDelete = async () => { 
        if (selectedUser && currentUser.tenantId) {
            try {
                await deleteUserSystem(selectedUser.id.toString());
                
                loadUsers(); 
                
                // <--- Sincronizar estado global
                if (onDataChange) onDataChange();

                setDeleteModalOpen(false);
                showToast('Usuario eliminado del sistema correctamente', 'success');
                setSelectedUser(null);
            } catch (error: any) {
                console.error("Error al borrar:", error);
                showToast('Error al eliminar: ' + error.message, 'error');
            }
        }
    };
    // ----------------------------------------

    const renderContent = () => {
        if (loading && activeTab === 'Personal' && users.length === 0) {
            return (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-iange-orange"></div>
                    <span className="ml-3 text-gray-500">Cargando equipo...</span>
                </div>
            );
        }

        switch (activeTab) {
            case 'Personal':
                return (
                    <div>
                        {users.length > 0 ? (
                            <UserTable users={users} onEdit={handleEditClick} onDelete={handleDeleteClick} />
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                <p className="text-gray-500 mb-2">No hay usuarios registrados en esta empresa aún.</p>
                                <button 
                                    onClick={() => setActiveTab('Añadir usuario')}
                                    className="text-iange-orange font-semibold hover:underline"
                                >
                                    ¡Añade el primero aquí!
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'Añadir usuario':
                return <AddUserForm onUserAdded={handleAddUser} currentUser={currentUser} />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Personal de la Empresa</h2>
                {activeTab === 'Personal' && (
                    <button 
                        onClick={() => setActiveTab('Añadir usuario')}
                        className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 text-sm font-semibold shadow-sm transition-colors"
                    >
                        + Nuevo Usuario
                    </button>
                )}
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                                activeTab === tab
                                    ? 'border-iange-orange text-iange-orange'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            aria-current={activeTab === tab ? 'page' : undefined}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            <div>
                {renderContent()}
            </div>
            
            {selectedUser && (
                <Modal title="Editar Usuario" isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                    <EditUserForm 
                        user={selectedUser} 
                        onUserUpdated={handleUpdateUser} 
                        onCancel={() => setEditModalOpen(false)}
                        currentUser={currentUser}
                    />
                </Modal>
            )}

            {selectedUser && (
                 <Modal title="Confirmar Eliminación" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <div className="text-center p-4">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">¿Eliminar usuario?</h3>
                        <p className="text-sm text-gray-500 mt-2">
                            Estás a punto de eliminar a <span className="font-bold text-gray-700">{selectedUser.name}</span>.
                            <br/>
                            Esta acción eliminará su acceso a la plataforma permanentemente.
                        </p>
                        <div className="mt-6 flex justify-center gap-3">
                            <button 
                                onClick={() => setDeleteModalOpen(false)}
                                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}
        </div>
    );
};

export default PersonalEmpresa;