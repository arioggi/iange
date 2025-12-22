// components/settings/PerfilEmpresa.tsx
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { 
    getTenantById, 
    updateTenant, 
    uploadCompanyLogo 
} from '../../Services/api';

// Componentes UI (Reutilizamos los mismos estilos que MiPerfil)
const FormSection: React.FC<{ title: string; children: React.ReactNode, description?: string }> = ({ title, children, description }) => (
    <section className="py-8 border-b border-gray-200 last:border-0">
        <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
                {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="space-y-6">
                    {children}
                </div>
            </div>
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; placeholder?: string }> = ({ label, name, value, onChange, disabled, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type="text" 
            name={name} 
            id={name} 
            value={value} 
            onChange={onChange} 
            disabled={disabled}
            placeholder={placeholder}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm disabled:bg-gray-100 disabled:text-gray-500" 
        />
    </div>
);

// ✅ INTERFAZ ACTUALIZADA
interface PerfilEmpresaProps {
    user: User;
    onDataChange?: () => void; // <--- Agregado para actualizar Sidebar
}

const PerfilEmpresa: React.FC<PerfilEmpresaProps> = ({ user, onDataChange }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Estado del formulario
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        rfc: '', // Solo lectura usualmente
        logo_url: ''
    });

    // 1. Cargar datos de la empresa al entrar
    useEffect(() => {
        const loadTenantData = async () => {
            if (!user.tenantId) {
                setPageLoading(false);
                return;
            }

            try {
                const data = await getTenantById(user.tenantId);
                if (data) {
                    setFormData({
                        nombre: data.name || data.nombre || '', 
                        telefono: data.telefono || '',
                        direccion: data.direccion || '',
                        rfc: data.rfc || '',
                        logo_url: data.logo_url || ''
                    });
                }
            } catch (error) {
                console.error("Error cargando empresa:", error);
                setMessage({ type: 'error', text: 'No se pudo cargar la información de la empresa.' });
            } finally {
                setPageLoading(false);
            }
        };

        loadTenantData();
    }, [user.tenantId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    // --- SUBIDA DE LOGO ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user.tenantId) return;

        setLoading(true);
        setMessage(null);

        try {
            // 1. Subir imagen
            const publicUrl = await uploadCompanyLogo(user.tenantId, file);
            
            // 2. Cache busting
            const timestampedUrl = `${publicUrl}?t=${new Date().getTime()}`;

            // 3. Guardar URL
            await updateTenant(user.tenantId, { logo_url: timestampedUrl });

            // 4. Actualizar estado local
            setFormData(prev => ({ ...prev, logo_url: timestampedUrl }));
            
            setMessage({ type: 'success', text: 'Logo actualizado correctamente.' });

            // ✅ NOTIFICAR CAMBIO AL PADRE (APP.TSX)
            if (onDataChange) onDataChange();

        } catch (error: any) {
            console.error("Error subiendo logo:", error);
            setMessage({ type: 'error', text: 'Error al subir el logo.' });
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- ELIMINAR LOGO ---
    const handleDeleteLogo = async () => {
        if (!user.tenantId) return;
        
        if (!window.confirm("¿Seguro que quieres eliminar el logo y volver al original?")) return;

        setLoading(true);
        setMessage(null);

        try {
            await updateTenant(user.tenantId, { logo_url: null } as any); 
            
            setFormData(prev => ({ ...prev, logo_url: '' }));
            setMessage({ type: 'success', text: 'Logo eliminado.' });

            // ✅ NOTIFICAR CAMBIO AL PADRE
            if (onDataChange) onDataChange();

        } catch (error) {
            console.error("Error eliminando logo:", error);
            setMessage({ type: 'error', text: 'Error al eliminar el logo.' });
        } finally {
            setLoading(false);
        }
    };

    // --- GUARDAR TEXTOS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user.tenantId) return;

        setLoading(true);
        setMessage(null);

        try {
            await updateTenant(user.tenantId, {
                nombre: formData.nombre,
                telefono: formData.telefono,
                direccion: formData.direccion
            });

            setMessage({ type: 'success', text: 'Información guardada.' });

            // ✅ NOTIFICAR CAMBIO AL PADRE (Por si cambió el nombre de la empresa)
            if (onDataChange) onDataChange();

        } catch (error: any) {
            console.error("Error guardando empresa:", error);
            setMessage({ type: 'error', text: 'Error al guardar cambios.' });
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <div className="p-8 text-center text-gray-500">Cargando información de la empresa...</div>;
    }

    if (!user.tenantId) {
        return <div className="p-8 text-center text-red-500">No tienes una empresa asignada.</div>;
    }

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Perfil de Empresa</h2>
                    <p className="text-sm text-gray-500 mt-1">Configura la identidad de tu inmobiliaria.</p>
                </div>
                {loading && (
                    <div className="flex items-center text-iange-orange font-medium animate-pulse">
                         <span className="mr-2">💾</span> Guardando...
                    </div>
                )}
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <FormSection title="Logotipo" description="Este logo aparecerá en tus reportes y en el panel.">
                    <div className="flex items-center gap-6">
                        <div className="relative group bg-gray-50 rounded-lg p-2 border border-gray-200">
                            {formData.logo_url ? (
                                <img 
                                    src={formData.logo_url} 
                                    alt="Logo Empresa" 
                                    className="h-24 w-24 object-contain"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            
                            <div className={`h-24 w-24 flex items-center justify-center text-gray-400 ${formData.logo_url ? 'hidden' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleFileChange}
                            />
                            
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={handleLogoClick}
                                    disabled={loading}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    {loading ? 'Subiendo...' : 'Subir Logo'}
                                </button>

                                {formData.logo_url && (
                                    <button 
                                        type="button" 
                                        onClick={handleDeleteLogo}
                                        disabled={loading}
                                        className="px-4 py-2 bg-red-50 border border-red-200 rounded-md shadow-sm text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </div>
                            
                            <p className="mt-2 text-xs text-gray-500">Recomendado: PNG transparente, 500x500px.</p>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Datos Generales" description="Información de contacto y fiscal.">
                    <div className="grid grid-cols-1 gap-6">
                        <Input label="Nombre de la Inmobiliaria" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Ej. Inmobiliaria Regia" />
                        <Input label="Teléfono de Contacto" name="telefono" value={formData.telefono} onChange={handleChange} placeholder="Ej. 81 8888 8888" />
                        <Input label="Dirección Física" name="direccion" value={formData.direccion} onChange={handleChange} placeholder="Ej. Av. Siempre Viva 123, Monterrey" />
                        <div className="opacity-75">
                            <Input label="RFC (Identificador Fiscal)" name="rfc" value={formData.rfc} onChange={handleChange} disabled={true} />
                            <p className="text-xs text-gray-400 mt-1">El RFC no se puede editar directamente.</p>
                        </div>
                    </div>
                </FormSection>

                <div className="pt-6 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`py-2 px-8 rounded-md text-white font-medium shadow-sm transition-all ${loading ? 'bg-gray-400' : 'bg-iange-orange hover:bg-orange-600'}`}
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PerfilEmpresa;