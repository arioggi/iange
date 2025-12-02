import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { getAllGlobalUsers, getAllTenants, updateUserProfile, deleteUserSystem } from '../../Services/api'; // <--- AGREGADO: deleteUserSystem
import Modal from '../../components/ui/Modal';
import { ROLES, ROLE_LABELS, ROLE_DEFAULT_PERMISSIONS } from '../../constants';

// Lista simplificada de roles para el dropdown
const ROLES_OPTIONS = [
    { value: ROLES.SUPER_ADMIN, label: 'Super Admin (IANGE)' },
    { value: ROLES.ADMIN_EMPRESA, label: 'Dueño / Admin Empresa' },
    { value: ROLES.ASESOR, label: 'Asesor Inmobiliario' },
    { value: ROLES.GESTOR, label: 'Gestor' },
];

const EditUserForm: React.FC<{ user: User; tenants: any[]; onSave: (id: string, data: any) => void; onCancel: () => void }> = ({ user, tenants, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        role: user.role || ROLES.ASESOR,
        tenantId: user.tenantId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user.id.toString(), {
            role: formData.role,
            tenant_id: formData.tenantId === '' ? null : formData.tenantId,
            permissions: ROLE_DEFAULT_PERMISSIONS[formData.role] // Permisos automáticos según rol
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md border text-sm">
                <p><span className="font-bold text-gray-700">Usuario:</span> {user.name}</p>
                <p><span className="font-bold text-gray-700">Email:</span> {user.email}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol en la Plataforma</label>
                <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    className="w-full p-2 border rounded-md bg-white text-gray-900"
                >
                    {ROLES_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa Perteneciente</label>
                <select 
                    value={formData.tenantId || ''} 
                    onChange={e => setFormData({...formData, tenantId: e.target.value})} 
                    className="w-full p-2 border rounded-md bg-white text-gray-900"
                >
                    <option value="">-- Sin Empresa (Usuario Global / IANGE) --</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-iange-orange text-white rounded-md hover:bg-orange-600">Guardar Cambios</button>
            </div>
        </form>
    );
};

const SuperAdminUsuarios: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const refreshData = async () => {
        setLoading(true);
        try {
            const [uData, tData] = await Promise.all([getAllGlobalUsers(), getAllTenants()]);
            setUsers(uData);
            setTenants(tData);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { refreshData(); }, []);

    const handleUpdate = async (userId: string, data: any) => {
        try {
            await updateUserProfile(userId, data);
            showToast('Usuario actualizado.');
            refreshData();
            setSelectedUser(null);
        } catch (e: any) { showToast('Error: ' + e.message); }
    };

    // --- NUEVA FUNCIÓN PARA ELIMINAR ---
    const handleDelete = async (userId: string) => {
        // 1. Confirmación obligatoria
        if (!window.confirm("¡CUIDADO! \n\nEstás a punto de eliminar este usuario permanentemente.\nEsta acción borrará su acceso y todos sus datos personales.\n\n¿Estás seguro?")) {
            return;
        }

        try {
            // 2. Llamada a la API (borra Auth + Profile)
            await deleteUserSystem(userId);
            
            // 3. Actualizar la lista visualmente sin recargar
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
            showToast('Usuario eliminado del sistema correctamente.');
        } catch (e: any) {
            console.error(e);
            showToast('Error al eliminar: ' + (e.message || 'Error desconocido'));
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Usuarios</h2>
                <p className="text-gray-500 text-sm">Lista maestra de todos los usuarios registrados en IANGE.</p>
            </div>

            <input 
                type="text" 
                placeholder="Buscar usuario..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full max-w-md mb-6 p-2 bg-gray-50 border rounded-md" 
            />

            {loading ? <p className="text-center py-8">Cargando...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Usuario</th>
                                <th className="px-6 py-3 text-left">Rol</th>
                                <th className="px-6 py-3 text-left">Empresa</th>
                                <th className="px-6 py-3 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{u.name}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                            {ROLE_LABELS[u.role] || u.role}
                                        </span>
                                    </td>
                                    {/* @ts-ignore */}
                                    <td className="px-6 py-4 text-gray-700 text-sm">{u.tenantName}</td>
                                    <td className="px-6 py-4 space-x-4">
                                        <button 
                                            onClick={() => setSelectedUser(u)} 
                                            className="text-iange-orange font-bold hover:underline text-sm"
                                        >
                                            Administrar
                                        </button>
                                        
                                        {/* --- BOTÓN ELIMINAR AGREGADO --- */}
                                        <button 
                                            onClick={() => handleDelete(u.id.toString())} 
                                            className="text-red-500 font-bold hover:text-red-700 hover:underline text-sm"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedUser && (
                <Modal title="Administrar Usuario" isOpen={!!selectedUser} onClose={() => setSelectedUser(null)}>
                    <EditUserForm user={selectedUser} tenants={tenants} onSave={handleUpdate} onCancel={() => setSelectedUser(null)} />
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminUsuarios;