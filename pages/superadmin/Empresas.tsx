import React, { useState, useMemo } from 'react';
import { Tenant } from '../../types';
import Modal from '../../components/ui/Modal';
import adapter from '../../data/localStorageAdapter';

interface AddEditEmpresaFormProps {
    tenant?: Tenant;
    onSave: (tenantData: Pick<Tenant, 'nombre' | 'ownerEmail' | 'telefono'> & { initialPassword?: string, mustChangePassword?: boolean }) => void;
    onCancel: () => void;
}

const AddEditEmpresaForm: React.FC<AddEditEmpresaFormProps> = ({ tenant, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nombre: tenant?.nombre || '',
        ownerEmail: tenant?.ownerEmail || '',
        telefono: tenant?.telefono || '',
        initialPassword: '',
        confirmPassword: '',
        mustChangePassword: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant && formData.initialPassword.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (!tenant && formData.initialPassword !== formData.confirmPassword) {
            alert('Las contraseñas no coinciden.');
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nombre de empresa*</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Email del owner (Cuenta de Empresa)*</label>
                <input type="email" name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Teléfono (Opcional)</label>
                <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
            </div>

            {!tenant && (
                <div className="pt-4 border-t space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña inicial*</label>
                        <input type="password" name="initialPassword" value={formData.initialPassword} onChange={handleChange} required minLength={8} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Confirmar contraseña*</label>
                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={8} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    </div>
                     <label className="flex items-center space-x-2">
                        <input type="checkbox" name="mustChangePassword" checked={formData.mustChangePassword} onChange={handleChange} className="h-4 w-4 text-iange-orange border-gray-300 rounded focus:ring-iange-orange"/>
                        <span className="text-sm text-gray-700">Requerir cambio de contraseña al primer login</span>
                     </label>
                </div>
            )}
            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    {tenant ? 'Guardar Cambios' : 'Crear Empresa'}
                </button>
            </div>
        </form>
    );
};


interface SuperAdminEmpresasProps {
    showToast: (msg: string, type?: 'success' | 'error') => void;
    onImpersonate: (tenantId: string) => void;
}

const SuperAdminEmpresas: React.FC<SuperAdminEmpresasProps> = ({ showToast, onImpersonate }) => {
    const [tenants, setTenants] = useState<Tenant[]>(adapter.listTenants());
    const [isModalOpen, setModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const refreshTenants = () => {
        setTenants(adapter.listTenants());
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => t.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tenants, searchTerm]);

    const handleSave = (tenantData: Pick<Tenant, 'nombre' | 'ownerEmail' | 'telefono'> & { initialPassword?: string, mustChangePassword?: boolean }) => {
        if (selectedTenant) {
            adapter.updateTenant(selectedTenant.id, tenantData);
            showToast('Empresa actualizada exitosamente.');
        } else {
            try {
                adapter.createTenant(tenantData);
                showToast('Empresa creada exitosamente.');
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
        refreshTenants();
        setModalOpen(false);
        setSelectedTenant(null);
    };

    const handleDelete = () => {
        if (selectedTenant) {
            adapter.updateTenant(selectedTenant.id, { estado: 'Suspendido' });
            showToast('Empresa suspendida.', 'error');
            refreshTenants();
            setDeleteModalOpen(false);
            setSelectedTenant(null);
        }
    };
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Gestión de Empresas</h2>
                <button onClick={() => { setSelectedTenant(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    + Crear Empresa
                </button>
            </div>
            <input 
                type="text"
                placeholder="Buscar por nombre de empresa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full max-w-md mb-4 p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500"
            />
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propiedades</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTenants.map(tenant => {
                            const userCount = adapter.listUsers(tenant.id).length;
                            const propertyCount = adapter.listProperties(tenant.id).length;
                            return (
                                <tr key={tenant.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{tenant.nombre}</td>
                                    <td className="px-6 py-4 text-gray-800 break-all">{tenant.ownerEmail}</td>
                                    <td className="px-6 py-4 text-gray-800 text-center">{userCount}</td>
                                    <td className="px-6 py-4 text-gray-800 text-center">{propertyCount}</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(tenant.fechaRegistro).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tenant.estado === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {tenant.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => onImpersonate(tenant.id)} className="font-bold text-iange-orange hover:text-orange-600">Entrar como</button>
                                            <button onClick={() => { setSelectedTenant(tenant); setModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                            <button onClick={() => { setSelectedTenant(tenant); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-900">Suspender</button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal title={selectedTenant ? "Editar Empresa" : "Crear Nueva Empresa"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <AddEditEmpresaForm 
                        tenant={selectedTenant || undefined}
                        onSave={handleSave} 
                        onCancel={() => { setModalOpen(false); setSelectedTenant(null); }} 
                    />
                </Modal>
            )}

            {isDeleteModalOpen && (
                <Modal title="Confirmar Suspensión" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <p className="text-gray-700">¿Estás seguro de que quieres suspender la empresa "{selectedTenant?.nombre}"? Los usuarios no podrán iniciar sesión.</p>
                    <div className="flex justify-end space-x-4 mt-4">
                        <button onClick={() => setDeleteModalOpen(false)} className="bg-gray-200 py-2 px-4 rounded-md">Cancelar</button>
                        <button onClick={handleDelete} className="bg-red-600 text-white py-2 px-4 rounded-md">Suspender</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminEmpresas;
