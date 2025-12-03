import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { 
    getAllGlobalUsers, 
    getAllTenants, 
    updateUserProfile, 
    deleteUserSystem, 
    createSystemUser,
    deleteTenantFully // <--- IMPORTANTE: Usamos esta función para el borrado en cascada
} from '../../Services/api';
import Modal from '../../components/ui/Modal';
import { ROLES, ROLE_LABELS, ROLE_DEFAULT_PERMISSIONS } from '../../constants';

// Lista simplificada de roles para el dropdown
const ROLES_OPTIONS = [
    { value: ROLES.SUPER_ADMIN, label: 'Super Admin (IANGE)' },
    { value: ROLES.ADMIN_EMPRESA, label: 'Dueño / Admin Empresa' },
    { value: ROLES.ASESOR, label: 'Asesor Inmobiliario' },
    { value: ROLES.GESTOR, label: 'Gestor' },
];

interface EditUserFormProps {
    user?: User | null;
    tenants: any[];
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, tenants, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        password: '',
        phone: user?.phone || '',
        role: user?.role || ROLES.ASESOR,
        tenantId: user?.tenantId || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                tenantId: formData.tenantId === '' ? null : formData.tenantId,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-sm uppercase tracking-wide">Datos del Usuario</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Completo *</label>
                    <input 
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="w-full p-2 bg-gray-50 border rounded-md text-sm text-gray-900 focus:ring-iange-orange focus:border-iange-orange placeholder-gray-500"
                        placeholder="Ej. Ana García"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                    <input 
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={!!user}
                        className={`w-full p-2 border rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent ${user ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-50 focus:ring-iange-orange focus:border-iange-orange'}`}
                        placeholder="usuario@ejemplo.com"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!user ? (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña Inicial *</label>
                        <input 
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            className="w-full p-2 bg-gray-50 border rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                        <input 
                            disabled
                            className="w-full p-2 bg-gray-100 border rounded-md text-sm text-gray-500 cursor-not-allowed"
                            value="********"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
                    <input 
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full p-2 bg-gray-50 border rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent"
                        placeholder="55 1234 5678"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Rol en la Plataforma</label>
                    <select 
                        name="role"
                        value={formData.role} 
                        onChange={handleChange} 
                        className="w-full p-2 bg-gray-50 border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent"
                    >
                        {ROLES_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Empresa Perteneciente</label>
                    <select 
                        name="tenantId"
                        value={formData.tenantId || ''} 
                        onChange={handleChange} 
                        className="w-full p-2 bg-gray-50 border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent"
                    >
                        <option value="">-- Sin Empresa (Usuario Global / IANGE) --</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 font-medium text-sm transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 font-bold text-sm shadow-sm transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {isSubmitting ? 'Guardando...' : (user ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
            </div>
        </form>
    );
};

const SuperAdminUsuarios: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ showToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const refreshData = async () => {
        setLoading(true);
        try {
            const [uData, tData] = await Promise.all([getAllGlobalUsers(), getAllTenants()]);
            setUsers(uData);
            setTenants(tData);
        } catch (e) { 
            console.error(e);
            showToast('Error cargando datos', 'error');
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { refreshData(); }, []);

    const handleSave = async (data: any) => {
        try {
            if (selectedUser) {
                // EDITAR
                await updateUserProfile(selectedUser.id.toString(), {
                    full_name: data.fullName,
                    role: data.role,
                    tenant_id: data.tenantId,
                    phone: data.phone,
                    permissions: ROLE_DEFAULT_PERMISSIONS[data.role]
                });
                showToast('Usuario actualizado.', 'success');
            } else {
                // CREAR
                await createSystemUser({
                    email: data.email,
                    password: data.password,
                    fullName: data.fullName,
                    role: data.role,
                    tenantId: data.tenantId,
                    phone: data.phone
                });
                showToast('Usuario creado exitosamente.', 'success');
            }
            
            await refreshData();
            setModalOpen(false);
            setSelectedUser(null);
        } catch (e: any) {
            console.error(e);
            showToast('Error: ' + (e.message || 'Error desconocido'), 'error');
        }
    };

    // --- FUNCIÓN INTELIGENTE DE BORRADO ---
    // Soluciona el problema de empresas huérfanas
    const handleDelete = async (user: User) => {
        // 1. Detectar si el usuario es dueño de una empresa (Admin + Tenant asignado)
        const isOwner = (user.role === ROLES.ADMIN_EMPRESA || user.role === ROLES.CUENTA_EMPRESA) && user.tenantId;
        
        let confirmMessage = "¿Estás seguro de eliminar este usuario permanentemente? Esta acción es irreversible.";
        
        // 2. Advertencia especial si es dueño
        if (isOwner) {
            confirmMessage = `⚠️ ¡ATENCIÓN! \n\nEste usuario es ADMIN de una empresa.\nSi lo eliminas desde aquí, SE BORRARÁ TAMBIÉN SU EMPRESA completa.\n\n¿Deseas continuar y borrar TODO (Usuario + Empresa)?`;
        }

        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            if (isOwner && user.tenantId) {
                // CASO A: Borrado Cascada (Usuario + Empresa)
                await deleteTenantFully(user.tenantId);
                showToast('Usuario y su Empresa asociados eliminados correctamente.', 'success');
            } else {
                // CASO B: Borrado Simple (Solo usuario)
                await deleteUserSystem(user.id.toString());
                showToast('Usuario eliminado del sistema correctamente.', 'success');
            }
            
            // Recargar datos inmediatamente
            await refreshData();
            
        } catch (e: any) {
            console.error(e);
            showToast('Error al eliminar: ' + (e.message || 'Error desconocido'), 'error');
        }
    };

    const openCreateModal = () => {
        setSelectedUser(null);
        setModalOpen(true);
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setModalOpen(true);
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Usuarios Globales</h2>
                <button 
                    onClick={openCreateModal}
                    className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 shadow-sm font-semibold text-sm transition-colors"
                >
                    + Añadir Usuario
                </button>
            </div>

            <input 
                type="text" 
                placeholder="Buscar usuario..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full max-w-md mb-6 p-2 bg-gray-50 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-iange-orange focus:border-transparent text-gray-900 placeholder-gray-500" 
            />

            {loading ? <p className="text-center py-8 text-gray-500 animate-pulse">Cargando usuarios...</p> : (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 text-left tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left tracking-wider">Empresa</th>
                                <th className="px-6 py-3 text-right tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-base">{u.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${u.role === ROLES.SUPER_ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {ROLE_LABELS[u.role] || u.role}
                                        </span>
                                    </td>
                                    {/* @ts-ignore */}
                                    <td className="px-6 py-4 text-gray-600">
                                        {/* @ts-ignore */}
                                        {u.tenantName === 'Global / Sin Asignar' ? <span className="text-gray-400 italic">-- Global --</span> : <span className="font-medium">{u.tenantName}</span>}
                                    </td>
                                    <td className="px-6 py-4 flex gap-3 items-center justify-end">
                                        <button 
                                            onClick={() => openEditModal(u)} 
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors text-sm"
                                        >
                                            Editar
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleDelete(u)} // Pasamos el usuario completo para checar rol/tenant
                                            className="text-red-600 hover:text-red-800 hover:underline font-medium transition-colors text-sm"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-10 text-gray-400 italic">No se encontraron usuarios.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <Modal 
                    title={selectedUser ? "Administrar Usuario" : "Crear Nuevo Usuario"} 
                    isOpen={isModalOpen} 
                    onClose={() => setModalOpen(false)}
                >
                    <EditUserForm 
                        user={selectedUser} 
                        tenants={tenants} 
                        onSave={handleSave} 
                        onCancel={() => setModalOpen(false)} 
                    />
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminUsuarios;