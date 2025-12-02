import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../types';
import Modal from '../../components/ui/Modal';
import { createTenant, getAllTenants } from '../../Services/api'; 
import { supabase } from '../../supabaseClient';

interface AddEditEmpresaFormProps {
    tenant?: Tenant;
    onSave: (data: any) => void;
    onCancel: () => void;
}

const AddEditEmpresaForm: React.FC<AddEditEmpresaFormProps> = ({ tenant, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nombre: tenant?.nombre || '',
        ownerEmail: tenant?.ownerEmail || '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                <label className="block text-sm font-medium text-gray-700">Nombre de la Empresa *</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900" placeholder="Ej. Inmobiliaria Regia" />
            </div>
            
            {!tenant && (
                <>
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                        <p className="text-xs text-blue-800 font-semibold mb-1">Datos del Dueño / Administrador</p>
                        <p className="text-xs text-blue-600">Se creará un usuario automáticamente con estos datos.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email del Dueño *</label>
                        <input type="email" name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} required className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900" placeholder="admin@inmobiliaria.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña Inicial *</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} className="w-full mt-1 p-2 bg-gray-50 border rounded-md text-gray-900" placeholder="Mínimo 6 caracteres" />
                    </div>
                </>
            )}
            
            <div className="flex justify-end space-x-4 pt-4 border-t mt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    {tenant ? 'Guardar Cambios' : 'Crear Empresa y Usuario'}
                </button>
            </div>
        </form>
    );
};

const SuperAdminEmpresas: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void; onImpersonate: (id: string) => void }> = ({ showToast }) => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        refreshTenants();
    }, []);

    const refreshTenants = async () => {
        try {
            setLoading(true);
            const data = await getAllTenants();
            
            const mappedTenants: Tenant[] = data.map((t: any) => ({
                id: t.id,
                nombre: t.name,
                ownerEmail: t.owner_email,
                fechaRegistro: t.created_at,
                // Normalizamos el estado para que siempre sea 'Activo' o 'Suspendido' visualmente
                estado: (t.status === 'active' || t.status === 'Activo') ? 'Activo' : 'Suspendido',
                telefono: '' 
            }));
            setTenants(mappedTenants);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (formData: any) => {
        // Evitamos que se quede cargando si algo falla
        setLoading(true); // Bloqueo visual leve opcional, o manejado en el botón
        
        try {
            if (selectedTenant) {
                // MODO EDICIÓN
                const { error } = await supabase
                    .from('tenants')
                    .update({ name: formData.nombre })
                    .eq('id', selectedTenant.id);
                if (error) throw error;
                showToast('Empresa actualizada.');
            } else {
                // MODO CREACIÓN (Lógica Blindada)
                
                // 1. Crear la Empresa PRIMERO (Esto rara vez falla)
                const tenantData = await createTenant(formData.nombre, formData.ownerEmail);
                if (!tenantData) throw new Error("No se pudo crear la empresa.");

                console.log("Empresa creada:", tenantData);

                // 2. Intentar crear el Usuario
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.ownerEmail,
                    password: formData.password,
                    options: {
                        data: { full_name: `Admin ${formData.nombre}` }
                    }
                });

                if (authError) {
                    // Si falla el usuario (ej. por los 7 segundos), NO borramos la empresa.
                    // Avisamos al admin.
                    console.error("Error Auth:", authError);
                    alert(`✅ Empresa "${formData.nombre}" creada con éxito.\n\n⚠️ PERO el usuario no se pudo crear por seguridad de Supabase (espera unos segundos).\n\nVe a la pestaña "Usuarios" y crea el usuario manualmente para asignarlo a esta empresa.`);
                } else if (authData.user) {
                    // Si el usuario se creó, lo vinculamos a la empresa
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .update({
                            tenant_id: tenantData.id,
                            role: 'adminempresa',
                            full_name: `Admin ${formData.nombre}`
                        })
                        .eq('id', authData.user.id);
                    
                    if (!profileError) {
                        showToast('¡Empresa y Usuario creados correctamente!', 'success');
                    }
                }
            }
            
            // Refrescamos y cerramos
            await refreshTenants();
            setModalOpen(false);
            setSelectedTenant(null);

        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false); // IMPORTANTE: Liberar la pantalla de carga
        }
    };

    const handleDelete = async () => {
        if (selectedTenant) {
            try {
                const { error } = await supabase
                    .from('tenants')
                    .update({ status: 'Suspendido' })
                    .eq('id', selectedTenant.id);
                
                if (error) throw error;
                
                showToast('Empresa suspendida.', 'success');
                refreshTenants();
                setDeleteModalOpen(false);
                setSelectedTenant(null);
            } catch (error: any) {
                showToast('Error: ' + error.message, 'error');
            }
        }
    };

    const filteredTenants = useMemo(() => {
        return tenants.filter(t => t.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [tenants, searchTerm]);
    
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-iange-dark">Gestión de Empresas</h2>
                <button onClick={() => { setSelectedTenant(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600">
                    + Nueva Empresa
                </button>
            </div>
            
            <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md mb-6 p-2 bg-gray-50 border rounded-md" />
            
            {loading ? <p className="text-center py-8">Cargando...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium">
                            <tr>
                                <th className="px-6 py-3 text-left">Empresa</th>
                                <th className="px-6 py-3 text-left">Dueño / Email</th>
                                <th className="px-6 py-3 text-left">Fecha Alta</th>
                                <th className="px-6 py-3 text-left">Estado</th>
                                <th className="px-6 py-3 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTenants.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-bold text-gray-800">{t.nombre}</td>
                                    <td className="px-6 py-4 text-gray-600">{t.ownerEmail}</td>
                                    <td className="px-6 py-4 text-gray-500">{new Date(t.fechaRegistro).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        {/* Corrección visual del badge Activo */}
                                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${t.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button onClick={() => { setSelectedTenant(t); setModalOpen(true); }} className="text-blue-600 hover:underline text-sm font-medium">Editar</button>
                                        <button onClick={() => { setSelectedTenant(t); setDeleteModalOpen(true); }} className="text-red-600 hover:underline text-sm font-medium">Suspender</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay empresas.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <Modal title={selectedTenant ? "Editar Empresa" : "Nueva Empresa"} isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
                    <AddEditEmpresaForm tenant={selectedTenant || undefined} onSave={handleSave} onCancel={() => setModalOpen(false)} />
                </Modal>
            )}

            {isDeleteModalOpen && (
                <Modal title="Confirmar Suspensión" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <p className="text-gray-700">¿Estás seguro de que quieres suspender la empresa "{selectedTenant?.nombre}"?</p>
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