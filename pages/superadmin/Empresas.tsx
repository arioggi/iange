import React, { useState, useEffect, useMemo } from 'react';
import { Tenant } from '../../types';
import Modal from '../../components/ui/Modal';
import { createTenant, getAllTenants, deleteTenant } from '../../Services/api'; // services minúscula
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
        telefono: (tenant as any)?.telefono || '', // Mantenemos compatibilidad si el campo no existe aún
        direccion: (tenant as any)?.direccion || '',
        rfc: (tenant as any)?.rfc || '',
        plan: (tenant as any)?.plan || 'basic',
        password: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant && formData.password !== formData.confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="font-bold text-gray-800 border-b pb-2 text-sm uppercase tracking-wide">Datos del Negocio</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nombre Comercial *</label>
                    <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full p-2 bg-gray-50 border rounded-md text-sm" placeholder="Ej. Inmobiliaria Regia" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RFC (Facturación) *</label>
                    <input type="text" name="rfc" value={formData.rfc} onChange={handleChange} className="w-full p-2 bg-gray-50 border rounded-md text-sm" placeholder="AAA010101AAA" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono Contacto</label>
                    <input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-2 bg-gray-50 border rounded-md text-sm" placeholder="81..." />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Plan de Suscripción</label>
                    <select name="plan" value={formData.plan} onChange={handleChange} className="w-full p-2 bg-gray-50 border rounded-md text-sm">
                        <option value="basic">Básico (Gratis)</option>
                        <option value="pro">Pro ($99/mes)</option>
                        <option value="enterprise">Enterprise (Personalizado)</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dirección Fiscal</label>
                <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full p-2 bg-gray-50 border rounded-md text-sm" placeholder="Calle, Número, Colonia, Ciudad" />
            </div>
            
            {!tenant && (
                <>
                    <h3 className="font-bold text-gray-800 border-b pb-2 mt-6 text-sm uppercase tracking-wide">Cuenta del Administrador</h3>
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <p className="text-xs text-blue-800 font-semibold mb-2">Estas credenciales se usarán para el primer acceso.</p>
                        
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email (Usuario) *</label>
                            <input type="email" name="ownerEmail" value={formData.ownerEmail} onChange={handleChange} required className="w-full p-2 border rounded-md bg-white text-sm" placeholder="admin@inmobiliaria.com" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña *</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} className="w-full p-2 border rounded-md bg-white text-sm" placeholder="Mínimo 6 caracteres" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar Contraseña *</label>
                                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={6} className="w-full p-2 border rounded-md bg-white text-sm" placeholder="Repetir contraseña" />
                            </div>
                        </div>
                    </div>
                </>
            )}
            
            <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 font-medium text-sm">Cancelar</button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 font-bold text-sm shadow-sm">
                    {tenant ? 'Guardar Cambios' : 'Crear Empresa y Usuario'}
                </button>
            </div>
        </form>
    );
};

const SuperAdminEmpresas: React.FC<{ showToast: (msg: string, type?: 'success' | 'error') => void; onImpersonate: (id: string) => void }> = ({ showToast, onImpersonate }) => {
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
                estado: (t.status === 'active' || t.status === 'Activo') ? 'Activo' : 'Suspendido',
                telefono: t.telefono || '',
                // @ts-ignore
                rfc: t.rfc,
                // @ts-ignore
                plan: t.plan
            }));
            setTenants(mappedTenants);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (formData: any) => {
        setLoading(true);
        try {
            if (selectedTenant) {
                // MODO EDICIÓN
                const { error } = await supabase
                    .from('tenants')
                    .update({ 
                        name: formData.nombre,
                        telefono: formData.telefono,
                        direccion: formData.direccion,
                        rfc: formData.rfc,
                        plan: formData.plan
                    })
                    .eq('id', selectedTenant.id);
                if (error) throw error;
                showToast('Empresa actualizada.');
            } else {
                // MODO CREACIÓN
                // 1. Crear la Empresa (Ya actualizado en api.ts para recibir todos los campos)
                const tenantData = await createTenant({
                    nombre: formData.nombre, 
                    ownerEmail: formData.ownerEmail,
                    telefono: formData.telefono,
                    direccion: formData.direccion,
                    rfc: formData.rfc,
                    plan: formData.plan
                });

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
                    // Manejo del error de seguridad (7 segundos) que querías conservar
                    console.error("Error Auth:", authError);
                    alert(`✅ Empresa "${formData.nombre}" creada con éxito.\n\n⚠️ PERO el usuario no se pudo crear automáticamente por seguridad de Supabase (espera unos segundos).\n\nVe a la pestaña "Usuarios" y crea el usuario manualmente para asignarlo a esta empresa.`);
                } else if (authData.user) {
                    // Si el usuario se creó, lo vinculamos
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
            
            await refreshTenants();
            setModalOpen(false);
            setSelectedTenant(null);

        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedTenant) {
            try {
                // Usamos la nueva función de borrado real
                await deleteTenant(selectedTenant.id);
                
                showToast('Empresa eliminada permanentemente.', 'success');
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
                <button onClick={() => { setSelectedTenant(null); setModalOpen(true); }} className="bg-iange-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 shadow-sm font-semibold text-sm">
                    + Nueva Empresa
                </button>
            </div>
            
            <input type="text" placeholder="Buscar empresa..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full max-w-md mb-6 p-2 bg-gray-50 border rounded-md text-sm" />
            
            {loading ? <p className="text-center py-8 text-gray-500 animate-pulse">Cargando empresas...</p> : (
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full bg-white text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 text-left tracking-wider">Empresa</th>
                                <th className="px-6 py-3 text-left tracking-wider">Detalles</th>
                                <th className="px-6 py-3 text-left tracking-wider">Dueño</th>
                                <th className="px-6 py-3 text-left tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTenants.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-base">{t.nombre}</div>
                                        <div className="text-xs text-gray-500 mt-1">Alta: {new Date(t.fechaRegistro).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block w-fit">{(t as any).rfc || 'SIN RFC'}</span>
                                            <span className="text-xs font-bold text-iange-orange uppercase tracking-wide">PLAN: {(t as any).plan || 'BASIC'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 break-all">{t.ownerEmail}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-bold ${t.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3 items-center">
                                        <button onClick={() => { setSelectedTenant(t); setModalOpen(true); }} className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors">Editar</button>
                                        <button onClick={() => { setSelectedTenant(t); setDeleteModalOpen(true); }} className="text-red-600 hover:text-red-800 hover:underline font-medium transition-colors">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTenants.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400 italic">No se encontraron empresas.</td></tr>}
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
                <Modal title="Eliminar Empresa" isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                    <div className="text-center p-4">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <p className="text-lg font-bold text-gray-900">¿Eliminar permanentemente?</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Estás a punto de eliminar a <b>"{selectedTenant?.nombre}"</b>.
                            <br/><br/>
                            <span className="font-semibold text-red-600">Esta acción es irreversible</span> y borrará todos los usuarios, propiedades y datos asociados a esta empresa.
                        </p>
                        <div className="flex justify-center gap-4 mt-6">
                            <button onClick={() => setDeleteModalOpen(false)} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">Cancelar</button>
                            <button onClick={handleDelete} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:w-auto sm:text-sm">Sí, Eliminar Todo</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SuperAdminEmpresas;