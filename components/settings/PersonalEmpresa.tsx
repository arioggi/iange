import React, { useState, useEffect } from 'react';
import UserTable from './UserTable';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import Modal from '../ui/Modal';
import { User } from '../../types';
import adapter from '../../data/localStorageAdapter';

const TABS = ['Personal', 'Añadir usuario'];

interface PersonalEmpresaProps {
    showToast: (message: string, type?: 'success' | 'error') => void;
    currentUser: User;
}

const PersonalEmpresa: React.FC<PersonalEmpresaProps> = ({ showToast, currentUser }) => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [users, setUsers] = useState<User[]>([]);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (currentUser.tenantId) {
            setUsers(adapter.listUsers(currentUser.tenantId));
        }
    }, [currentUser.tenantId]);

    const refreshUsers = () => {
        if (currentUser.tenantId) {
            setUsers(adapter.listUsers(currentUser.tenantId));
        }
    };

    const handleAddUser = (newUser: Omit<User, 'id'>) => {
        if (!currentUser.tenantId) return;
        try {
            adapter.createUser(currentUser.tenantId, newUser);
            showToast('Usuario dado de alta');
            refreshUsers();
            setActiveTab(TABS[0]);
            if (currentUser.tenantId) {
                adapter.updateTenantSettings(currentUser.tenantId, { onboarded: true });
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setEditModalOpen(true);
    };

    const handleUpdateUser = (updatedUser: User) => {
        if (currentUser.tenantId) {
            adapter.updateUser(currentUser.tenantId, updatedUser.id, updatedUser);
            refreshUsers();
            setEditModalOpen(false);
            showToast('Usuario actualizado con éxito');
        }
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (selectedUser && currentUser.tenantId) {
            adapter.deleteUser(currentUser.tenantId, selectedUser.id);
            refreshUsers();
            setDeleteModalOpen(false);
            showToast('Usuario eliminado', 'error');
            setSelectedUser(null);
        }
    };

    const renderContent = () => {
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
                        <p className="text-sm text-gray-500 mt-2">Esta acción no se puede deshacer.</p>
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
                                Borrar Usuario
                            </button>
                        </div>
                    </div>
                 </Modal>
            )}
        </div>
    );
};

export default PersonalEmpresa;
