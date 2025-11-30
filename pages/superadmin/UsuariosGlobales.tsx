import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import adapter from '../../data/localStorageAdapter';
import Modal from '../../components/ui/Modal';
import { ROLES, ROLE_LABELS } from '../../constants';

const ORDERED_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.IANGE_ADMIN,
    ROLES.EMPRESA,
    ROLES.ADMIN_EMPRESA,
    ROLES.ASESOR,
    ROLES.GESTOR,
    ROLES.NOTARIA
];

interface AddEditUserFormProps {
    user?: User;
    onSave: (user: Partial<User>) => void;
    onCancel: () => void;
}

const AddEditUserForm: React.FC<AddEditUserFormProps> = ({ user, onSave, onCancel }) => {
    const allTenants = adapter.listTenants();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || ROLES.ASESOR,
        tenantId: user?.tenantId || allTenants[0]?.id || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const photo = formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
        onSave({ ...formData, photo });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                 <select name="role" value={formData.role} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500">
                    {ORDERED_ROLES.map(roleKey => (
                        <option key={roleKey} value={roleKey}>{ROLE_LABELS[roleKey]}</option>
                    ))}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                 <select name="tenantId" value={formData.tenantId} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500">
                    {allTenants.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">Guardar Usuario</button>
            </div>
        </form>
    );
};


const SuperAdminUsuarios: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ showToast }) => {
    const [allGlobalUsers, setAllGlobalUsers] = useState<User[]>(() => adapter.getAllUsers());
    const [isModalOpen, setModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const refreshUsers = () => {
        setAllGlobalUsers(adapter.getAllUsers());
    };

    const getEmpresaName = (tenantId?: string | null) => {
        if (!tenantId) return 'N/A';
        return adapter.listTenants().find(t => t.id === tenantId)?.nombre || 'Desconocida';
    };

    const filteredUsers = useMemo(() => {
        return allGlobalUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ROLE_LABELS[u.role] || u.role).toLowerCase().includes(searchTerm.toLowerCase()) ||
            getEmpresaName(u.tenantId).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allGlobalUsers, searchTerm]);

    const handleSave = (userData: Partial<User>) => {
        if (selectedUser && selectedUser.tenantId) {
            adapter.updateUser(selectedUser.tenantId, selectedUser.id, userData);
            showToast('Usuario actualizado exitosamente.');
        } else if (userData.tenantId) { // Create new user
            const { tenantId, ...rest} = userData;
            adapter.createUser(tenantId, rest as Omit<User, 'id'>);
            showToast('Usuario creado exitosamente.');
        }
        refreshUsers();
        setModalOpen(false);
        setSelectedUser(null);
    };

    const handleDelete = () => {
        if (selectedUser && selectedUser.tenantId) {
            adapter.deleteUser(selectedUser.tenantId, selectedUser.id);
            showToast('Usuario eliminado.', 'error');
            refreshUsers();
            setDeleteModalOpen(false);
            setSelectedUser(null);
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Usuarios Globales</h2>
                <button onClick={() => { setSelectedUser(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    + Crear Usuario
                </button>
            </div>
            <input 
                type="text"
                placeholder="Buscar por nombre, email, rol, empresa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md mb-4 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUsers.map(user => (
                            <tr key={`${user.tenantId}-${user.id}`} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                                <td className="px-6 py-4 text-gray-800 break-all">{user.email}</td>
                                <td className="px-6 py-4"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{ROLE_LABELS[user.role] || user.role}</span></td>
                                <td className="px-6 py-4 text-gray-800">{getEmpresaName(user.tenantId)}</td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1">
                                        <button onClick={() => { setSelectedUser(user); setModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        <button onClick={() => { setSelectedUser(user); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900">Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal title={selectedUser ? "Editar Usuario" : "Crear Nuevo Usuario"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <AddEditUserForm 
                        user={selectedUser || undefined}
                        onSave={handleSave} 
                        onCancel={() => { setModalOpen(false); setSelectedUser(null); }} 
                    />
                </Modal>
            )}

            {isDeleteModalOpen && (
                <Modal title="Confirmar Eliminación" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <p className="text-gray-700">¿Estás seguro de que quieres eliminar al usuario "{selectedUser?.name}"? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end space-x-4 mt-4">
                        <button onClick={() => setDeleteModalOpen(false)} className="bg-gray-200 py-2 px-4 rounded-md">Cancelar</button>
                        <button onClick={handleDelete} className="bg-red-600 text-white py-2 px-4 rounded-md">Eliminar</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminUsuarios;