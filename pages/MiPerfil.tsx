import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { useAuth } from '../authContext'; 
import { 
    updateUserProfile, 
    uploadProfileAvatar, 
    updateUserPassword 
} from '../Services/api';

// Componente auxiliar para secciones (Sin cambios, funciona bien)
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

// Componente Input (Sin cambios, funciona bien)
const Input: React.FC<{ label: string; type?: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; autoComplete?: string; }> = ({ label, type = 'text', name, value, onChange, autoComplete }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            value={value} 
            onChange={onChange} 
            autoComplete={autoComplete} 
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm" 
        />
    </div>
);

interface MiPerfilProps {
    user: User; 
}

const MiPerfil: React.FC<MiPerfilProps> = ({ user }) => {
    const { refreshUser } = useAuth(); 
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    // Estado local del formulario
    const [formData, setFormData] = useState({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // EFFECT: Sincronizar formulario si el usuario cambia (ej. al subir foto nueva)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || ''
        }));
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    // --- LÓGICA DE SUBIDA DE IMAGEN CORREGIDA ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMessage(null);

        try {
            // 1. Subir a Storage y obtener URL pública
            // NOTA: Asegúrate de que uploadProfileAvatar en api.ts tenga { upsert: true }
            const publicUrl = await uploadProfileAvatar(user.id.toString(), file);

            // 2. Agregar timestamp para evitar cache del navegador (Cache busting)
            // Esto fuerza al navegador a ver la imagen como "nueva" sin romper el link
            const timestampedUrl = `${publicUrl}?t=${new Date().getTime()}`;

            // 3. Actualizar la referencia en la base de datos de usuarios
            await updateUserProfile(user.id.toString(), { avatar_url: timestampedUrl });

            // 4. Refrescar el contexto global para que el sidebar y header se actualicen
            await refreshUser();

            setMessage({ type: 'success', text: 'Foto de perfil actualizada correctamente.' });
        } catch (error: any) {
            console.error("Error subiendo avatar:", error);
            setMessage({ type: 'error', text: 'Error al actualizar la foto. Intenta de nuevo.' });
        } finally {
            setLoading(false);
            // Limpiar el input para permitir subir la misma foto si falló antes
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Actualizar Info Básica
            if (formData.name !== user.name || formData.phone !== user.phone) {
                await updateUserProfile(user.id.toString(), {
                    full_name: formData.name,
                    phone: formData.phone
                });
            }

            // Actualizar Password
            if (formData.newPassword) {
                if (formData.newPassword.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
                if (formData.newPassword !== formData.confirmPassword) throw new Error("Las contraseñas no coinciden.");
                
                await updateUserPassword(formData.newPassword);
            }

            await refreshUser();
            
            setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: error.message || 'Error al guardar los cambios.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm relative max-w-4xl mx-auto">
            
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Configuración de mi perfil</h2>
                    <p className="text-sm text-gray-500 mt-1">Gestiona tu información personal y seguridad.</p>
                </div>
                {loading && (
                    <div className="flex items-center text-iange-orange font-medium animate-pulse">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-iange-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando...
                    </div>
                )}
            </div>

            {/* Mensajes de Feedback */}
            {message && (
                <div className={`mb-6 p-4 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                <FormSection title="Avatar Público" description="Haz clic en cambiar foto para subir una nueva imagen. (JPG, PNG o WEBP)">
                    <div className="flex items-center gap-6">
                        {/* --- ÁREA DE LA FOTO BLINDADA CONTRA ERRORES --- */}
                        <div className="relative group">
                            {user.photo && user.photo.length > 10 ? (
                                <img 
                                    src={user.photo} 
                                    alt={`Avatar de ${user.name}`} 
                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-gray-100"
                                    onError={(e) => {
                                        // Si la imagen falla al cargar, mostramos un placeholder
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const nextSibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                                        if (nextSibling) nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            
                            {/* Fallback visual: Iniciales (se muestra si no hay foto o si falla la carga) */}
                            <div 
                                className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center text-iange-orange font-bold text-3xl border-4 border-white shadow-md"
                                style={{ display: (user.photo && user.photo.length > 10) ? 'none' : 'flex' }}
                            >
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                        </div>

                        {/* Input invisible y Botón */}
                        <div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                            />
                            <button 
                                type="button" 
                                onClick={handlePhotoClick}
                                disabled={loading}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange transition-colors"
                            >
                                {loading ? 'Subiendo...' : 'Cambiar Foto'}
                            </button>
                            <p className="mt-2 text-xs text-gray-500">Recomendado: Cuadrada, máx 2MB.</p>
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Información Personal" description="Esta información será visible para la administración y tus compañeros.">
                    <div className="grid grid-cols-1 gap-6">
                        <Input label="Nombre completo" name="name" value={formData.name} onChange={handleChange} />
                        <Input label="Teléfono / WhatsApp" name="phone" value={formData.phone} onChange={handleChange} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-gray-500 text-sm select-none cursor-not-allowed">
                                {formData.email}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">Contacta a soporte si necesitas cambiar tu email.</p>
                        </div>
                    </div>
                </FormSection>

                 <FormSection title="Seguridad" description="Asegúrate de usar una contraseña segura si decides cambiarla.">
                     <div className="grid grid-cols-1 gap-6">
                        <Input label="Nueva contraseña" name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} autoComplete="new-password" />
                        <Input label="Confirmar nueva contraseña" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                     </div>
                 </FormSection>

                 <div className="pt-6 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`py-2 px-8 rounded-md text-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-iange-orange hover:bg-orange-600'}`}
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MiPerfil;