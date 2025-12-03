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
}

const PersonalEmpresa: React.FC<PersonalEmpresaProps> = ({ showToast, currentUser }) => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estados para los modales
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Función para cargar usuarios REALES desde Supabase
    const loadUsers = async () => {
        if (!currentUser.tenantId) return;
        setLoading(true);
        try {
            const data = await getUsersByTenant(currentUser.tenantId);
            setUsers(data);
        } catch (error) {
            console.error(error);
            // Si la función no existe aún en api.ts, esto fallará silenciosamente o mostrará error
            // showToast('Error cargando el personal.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Cargar al montar el componente
    useEffect(() => {
        loadUsers();
    }, [currentUser.tenantId]);

    // Crear Usuario (Conecta con Supabase Auth)
    const handleAddUser = async (newUser: Omit<User, 'id'>) => {
        if (!currentUser.tenantId) return;
        
        try {
            // Usamos la contraseña que viene del formulario o una temporal por defecto
            const passwordToUse = newUser.password || "Temporal123!";
            
            await createTenantUser(
                newUser.email, 
                passwordToUse,
                currentUser.tenantId, 
                newUser.role || 'asesor', 
                newUser.name
            );

            showToast('Usuario creado correctamente.');
            loadUsers(); // Recargamos la lista real
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
                // Usamos deleteUserSystem para borrar de Auth y DB mediante RPC
                await deleteUserSystem(selectedUser.id.toString());
                
                // Actualizamos la UI
                loadUsers(); // Equivalente a refreshUsers() en tu snippet
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
            return <div className="p-8 text-center text-gray-500">Cargando personal...</div>;
        }

        switch (activeTab) {
            case 'Personal':
                return <UserTable users={users} onEdit={handleEditClick} onDelete={handleDeleteClick} />;
            case 'Añadir usuario':
                return <AddUserForm onUserAdded={handleAddUser} currentUser={currentUser} />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-iange-dark mb-6">Personal de la Empresa</h2>
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
                    <div className="text-center">
                        <p className="text-lg text-gray-700">
                            ¿Estás seguro de que quieres borrar al usuario <span className="font-bold">{selectedUser.name}</span>?
                        </p>
                        <p className="text-sm text-red-500 mt-2 font-semibold">
                            ⚠️ Esta acción eliminará su acceso a la plataforma permanentemente.
                        </p>
                        <div className="mt-6 flex justify-center space-x-4">
                            <button 
                                onClick={() => setDeleteModalOpen(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmDelete}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Borrar Definitivamente
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}
        </div>
    );
};

export default PersonalEmpresa;