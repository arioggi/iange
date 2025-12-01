import React, { useState, useEffect, useMemo } from 'react';
import { User, Empresa } from '../../types';
import { supabase } from '../../supabaseClient';
import Modal from '../../components/ui/Modal';
import { ROLES, ROLE_LABELS } from '../../constants';
import { TrashIcon, PencilIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const ORDERED_ROLES = [
    ROLES.SUPER_ADMIN,
    ROLES.IANGE_ADMIN,
    ROLES.CUENTA_EMPRESA,
    ROLES.ADMIN_EMPRESA,
    ROLES.ASESOR,
    ROLES.GESTOR,
    ROLES.NOTARIA
];

interface AddEditUserFormProps {
    user?: User;
    empresas: Empresa[];
    onSave: (userData: Partial<User>) => void;
    onCancel: () => void;
    saving: boolean;
}

const AddEditUserForm: React.FC<AddEditUserFormProps> = ({ user, empresas, onSave, onCancel, saving }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || ROLES.ASESOR,
        tenantId: user?.tenantId || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md" />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700">Email (Vinculado a Auth)</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!!user} className="w-full mt-1 p-2 bg-gray-100 border rounded-md text-gray-500 cursor-not-allowed" />
                {!user && <p className="text-xs text-orange-600 mt-1">Para crear un usuario nuevo, primero invítalo desde el panel de Authentication de Supabase, o créalo aquí para registrar su perfil primero.</p>}
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                 <select name="role" value={formData.role} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md">
                    {ORDERED_ROLES.map(roleKey => (
                        <option key={roleKey} value={roleKey}>{ROLE_LABELS[roleKey] || roleKey}</option>
                    ))}
                </select>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Empresa Asignada</label>
                 <select name="tenantId" value={formData.tenantId} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md">
                    <option value="">-- Sin Empresa (Global) --</option>
                    {empresas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </form>
    );
};

const SuperAdminUsuarios: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void }> = ({ showToast }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Usuarios
            const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false });
            if (usersError) throw usersError;

            // 2. Empresas
            const { data: empresasData, error: empresasError } = await supabase.from('empresas').select('id, nombre');
            if (empresasError) throw empresasError;

            // Mapear tenant_id a tenantId para compatibilidad
            const mappedUsers = (usersData || []).map((u: any) => ({
                ...u,
                tenantId: u.tenant_id
            }));

            setUsers(mappedUsers as User[]);
            setEmpresas((empresasData as unknown as Empresa[]) || []);

        } catch (error: any) {
            console.error("Error:", error);
            showToast("Error al cargar datos: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getEmpresaName = (tenantId?: string | null) => {
        if (!tenantId) return '-';
        const emp = empresas.find(e => String(e.id) === String(tenantId));
        return emp ? emp.nombre : 'Empresa no encontrada';
    };

    const handleSave = async (userData: Partial<User>) => {
        setSaving(true);
        try {
            const payload = {
                nombre: userData.name, // Ajuste: la tabla dice 'nombre', no 'name'
                name: userData.name, // Guardamos ambos por compatibilidad
                email: userData.email,
                telefono: userData.phone,
                role: userData.role,
                tenant_id: userData.tenantId || null
            };

            if (selectedUser) {
                const { error } = await supabase.from('usuarios').update(payload).eq('id', selectedUser.id);
                if (error) throw error;
                showToast('Usuario actualizado.', 'success');
            } else {
                // Crear perfil (Nota: El login real se crea en Auth, aquí solo perfil)
                const { error } = await supabase.from('usuarios').insert([payload]);
                if (error) throw error;
                showToast('Perfil de usuario creado.', 'success');
            }
            
            setModalOpen(false);
            setSelectedUser(null);
            fetchData();

        } catch (error: any) {
            console.error(error);
            showToast('Error: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (userId: number | string) => {
        if (!window.confirm("¿Borrar perfil?")) return;
        try {
            const { error } = await supabase.from('usuarios').delete().eq('id', userId);
            if (error) throw error;
            showToast('Perfil eliminado.', 'success');
            fetchData();
        } catch (error: any) {
            showToast('Error: ' + error.message, 'error');
        }
    };
    
    // ... Resto del render (Tabla) es igual, pero asegúrate de usar handleSave actualizado ...
    // Para simplificar, te pego el render básico de la tabla aquí:
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Usuarios Globales</h2>
                <button onClick={() => { setSelectedUser(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    + Crear Perfil
                </button>
            </div>

            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? <tr><td colSpan={4} className="p-4 text-center">Cargando...</td></tr> : 
                        users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{user.name || user['nombre']}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{ROLE_LABELS[user.role] || user.role}</span></td>
                                <td className="px-6 py-4 text-sm text-gray-600">{getEmpresaName(user.tenantId)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => { setSelectedUser(user); setModalOpen(true); }} className="text-indigo-600 mr-3">Editar</button>
                                    <button onClick={() => handleDelete(user.id)} className="text-red-600">Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal title={selectedUser ? "Editar Usuario" : "Nuevo Usuario"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <AddEditUserForm user={selectedUser || undefined} empresas={empresas} onSave={handleSave} onCancel={() => setModalOpen(false)} saving={saving} />
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminUsuarios;
