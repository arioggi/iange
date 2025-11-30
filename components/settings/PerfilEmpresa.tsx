import React, { useState, useEffect } from 'react';
import { Tenant, User, CompanySettings } from '../../types';
import adapter from '../../data/localStorageAdapter';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; fullWidth?: boolean; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, type = 'text', required, placeholder, name, fullWidth, value, onChange }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <input type={type} name={name} id={name} placeholder={placeholder} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900" />
    </div>
);

const Select: React.FC<{ label: string; required?: boolean; name: string; children: React.ReactNode; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; }> = ({ label, required, name, children, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <select name={name} id={name} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">
            {children}
        </select>
    </div>
);

const FileInput: React.FC<{ label: string; name: string, accept?: string }> = ({ label, name, accept }) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type="file" name={name} id={name} accept={accept} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-iange-salmon file:text-iange-orange hover:file:bg-orange-100"/>
    </div>
);

const Toggle: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => {
    return (
        <label htmlFor={name} className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-50 md:col-span-2">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="relative">
                <input type="checkbox" id={name} name={name} checked={checked} onChange={onChange} className="sr-only" />
                <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-iange-orange' : 'bg-gray-200'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
            </div>
        </label>
    );
};

interface PerfilEmpresaProps {
    user: User;
}

const PerfilEmpresa: React.FC<PerfilEmpresaProps> = ({ user }) => {
    const [tenant, setTenant] = useState<Partial<Tenant> | null>(null);
    const [settings, setSettings] = useState<Partial<CompanySettings> | null>(null);

    useEffect(() => {
        if (user.tenantId) {
            setTenant(adapter.listTenants().find(t => t.id === user.tenantId) || {});
            setSettings(adapter.getTenantSettings(user.tenantId));
        }
    }, [user.tenantId]);
    
    const handleTenantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTenant(prev => prev ? { ...prev, [name]: value } : { [name]: value });
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSettings(prev => prev ? { ...prev, [name]: checked } : { [name]: checked });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user.tenantId && tenant) {
            adapter.updateTenant(user.tenantId, tenant);
        }
        if (user.tenantId && settings) {
            adapter.updateTenantSettings(user.tenantId, settings);
        }
        alert('Perfil de empresa guardado (simulación).');
    };

    if (!tenant || !settings) {
        return <div className="bg-white p-8 rounded-lg shadow-sm">Cargando...</div>;
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-iange-dark mb-6">Perfil de la Empresa</h2>
            <form onSubmit={handleSubmit}>
                <FormSection title="Información básica">
                    <Input label="Nombre de la empresa" name="nombre" value={tenant.nombre || ''} onChange={handleTenantChange} required fullWidth/>
                    <Input label="Correo electrónico del propietario" name="ownerEmail" value={tenant.ownerEmail || ''} onChange={handleTenantChange} required />
                    <Input label="Teléfono de contacto" name="telefono" value={tenant.telefono || ''} onChange={handleTenantChange} />
                    <FileInput label="Logo de la empresa" name="logo" accept="image/*" />
                </FormSection>

                <FormSection title="Configuraciones de Operación">
                    <Toggle label="Requerir aprobación para publicar propiedades" name="requiereAprobacionPublicar" checked={settings.requiereAprobacionPublicar || false} onChange={handleSettingsChange} />
                    <Toggle label="Requerir aprobación para cerrar ventas" name="requiereAprobacionCerrar" checked={settings.requiereAprobacionCerrar || false} onChange={handleSettingsChange} />
                </FormSection>
                
                 <FormSection title="Integraciones">
                    <Toggle label="Integración con WhatsApp" name="integracionWhatsapp" checked={settings.integracionWhatsapp || false} onChange={handleSettingsChange} />
                    <Toggle label="Integración con Correo Electrónico" name="integracionCorreo" checked={settings.integracionCorreo || false} onChange={handleSettingsChange} />
                    <Toggle label="Integración con Portales Inmobiliarios" name="integracionPortales" checked={settings.integracionPortales || false} onChange={handleSettingsChange} />
                </FormSection>

                <div className="flex justify-end mt-8">
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PerfilEmpresa;