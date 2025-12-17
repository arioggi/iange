import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../authContext';
import { getTenantById, updateTenant, uploadCompanyLogo } from '../../Services/api';
import { Tenant } from '../../types';

// Componente auxiliar para Toggles (Interruptores)
const Toggle: React.FC<{ label: string; checked: boolean; onChange: (val: boolean) => void }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`${checked ? 'bg-iange-orange' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
        >
            <span aria-hidden="true" className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
        </button>
    </div>
);

const PerfilEmpresa = () => {
    const { appUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar datos al montar
    useEffect(() => {
        if (appUser?.tenantId) {
            getTenantById(appUser.tenantId)
                .then(data => {
                    setTenant(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error cargando empresa:", err);
                    setLoading(false);
                });
        }
    }, [appUser]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || !appUser?.tenantId) return;
        
        setSaving(true);
        try {
            await updateTenant(appUser.tenantId, {
                nombre: tenant.nombre,
                telefono: tenant.telefono,
                requiereAprobacionPublicar: tenant.requiereAprobacionPublicar,
                requiereAprobacionCerrar: tenant.requiereAprobacionCerrar
                // Agrega dirección aquí si tu BD lo soporta
            });
            alert('Datos de empresa actualizados correctamente');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !appUser?.tenantId) return;

        try {
            // Feedback visual inmediato (opcional) o spinner local
            const newLogoUrl = await uploadCompanyLogo(appUser.tenantId, file);
            
            // Actualizar estado local y BD
            setTenant(prev => prev ? ({ ...prev, logo_url: newLogoUrl }) : null);
            await updateTenant(appUser.tenantId, { logo_url: newLogoUrl });
            
        } catch (error) {
            console.error("Error subiendo logo", error);
            alert("No se pudo subir el logo");
        }
    };

    if (loading) return <div className="p-8">Cargando datos de empresa...</div>;
    if (!tenant) return <div className="p-8">No se encontró información de la empresa.</div>;

    return (
        <div className="max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Perfil de Empresa</h2>
            
            <form onSubmit={handleSave} className="space-y-8 divide-y divide-gray-200">
                {/* SECCIÓN 1: IDENTIDAD */}
                <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Identidad de Marca</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Logo y nombre público de la inmobiliaria.</p>
                    </div>

                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">
                            Logo
                        </label>
                        <div className="mt-1 sm:mt-0 sm:col-span-2">
                            <div className="flex items-center">
                                <span className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                                    {tenant.logo_url ? (
                                        <img src={tenant.logo_url} alt="Logo empresa" className="h-full w-full object-cover" />
                                    ) : (
                                        <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    )}
                                </span>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                >
                                    Cambiar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Nombre Comercial</label>
                        <div className="mt-1 sm:mt-0 sm:col-span-2">
                            <input
                                type="text"
                                value={tenant.nombre}
                                onChange={(e) => setTenant({ ...tenant, nombre: e.target.value })}
                                className="max-w-lg block w-full shadow-sm focus:ring-iange-orange focus:border-iange-orange sm:text-sm border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: CONTACTO */}
                <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Información Fiscal y Contacto</h3>
                    </div>
                    
                    {/* Correo (Solo Lectura) */}
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Correo Dueño/Admin</label>
                        <div className="mt-1 sm:mt-0 sm:col-span-2">
                            <input
                                disabled
                                type="text"
                                value={tenant.ownerEmail}
                                className="max-w-lg block w-full bg-gray-50 shadow-sm sm:text-sm border-gray-300 rounded-md cursor-not-allowed text-gray-500"
                            />
                            <p className="mt-2 text-sm text-gray-500">Contacte a soporte para cambiar el correo titular.</p>
                        </div>
                    </div>

                    <div className="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                        <label className="block text-sm font-medium text-gray-700 sm:mt-px sm:pt-2">Teléfono Público</label>
                        <div className="mt-1 sm:mt-0 sm:col-span-2">
                            <input
                                type="text"
                                value={tenant.telefono || ''}
                                onChange={(e) => setTenant({ ...tenant, telefono: e.target.value })}
                                className="max-w-lg block w-full shadow-sm focus:ring-iange-orange focus:border-iange-orange sm:text-sm border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 3: CONFIGURACIÓN OPERATIVA */}
                <div className="pt-8 space-y-6 sm:pt-10 sm:space-y-5">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Reglas de Negocio</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Controla cómo opera tu equipo.</p>
                    </div>
                    
                    <div className="space-y-4">
                         <Toggle 
                            label="Requerir aprobación para publicar propiedades" 
                            checked={tenant.requiereAprobacionPublicar || false} 
                            onChange={(val) => setTenant({...tenant, requiereAprobacionPublicar: val})} 
                        />
                         <Toggle 
                            label="Requerir aprobación para cerrar ventas" 
                            checked={tenant.requiereAprobacionCerrar || false} 
                            onChange={(val) => setTenant({...tenant, requiereAprobacionCerrar: val})} 
                        />
                    </div>
                </div>

                <div className="pt-5 pb-10">
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-iange-orange hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange"
                        >
                            {saving ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PerfilEmpresa;