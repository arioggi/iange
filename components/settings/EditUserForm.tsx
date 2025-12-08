import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../../types';
import { ROLES, ROLE_DEFAULT_PERMISSIONS } from '../../constants';
import adapter from '../../data/localStorageAdapter';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; minLength?: number; }> = ({ label, type = 'text', required, placeholder, name, value, onChange, minLength }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <input type={type} name={name} id={name} placeholder={placeholder} required={required} value={value} onChange={onChange} minLength={minLength} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900 placeholder-gray-500" />
    </div>
);

const Select: React.FC<{ label: string; required?: boolean; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, required, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <select name={name} id={name} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900 placeholder-gray-500">
            {children}
        </select>
    </div>
);

// Toggle mejorado con ID único para evitar conflictos de clic
const Toggle: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => (
    <label htmlFor={`toggle-${name}`} className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="relative">
            <input 
                type="checkbox" 
                id={`toggle-${name}`} // ID Único
                name={name} 
                checked={checked} 
                onChange={onChange} 
                className="sr-only" 
            />
            <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ${checked ? 'bg-iange-orange' : 'bg-gray-200'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${checked ? 'transform translate-x-6' : ''}`}></div>
        </div>
    </label>
);

interface EditUserFormProps {
    user: User;
    onUserUpdated: (updatedUser: User) => void;
    onCancel: () => void;
    currentUser: User;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onUserUpdated, onCancel, currentUser }) => {
    const [formData, setFormData] = useState<User>(user);
    
    // CORRECCIÓN: Inicialización robusta de permisos con las nuevas llaves
    const [permissions, setPermissions] = useState<UserPermissions>(() => {
        const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || ROLE_DEFAULT_PERMISSIONS['asesor'];
        const current = user.permissions || {} as Partial<UserPermissions>;
        
        // Mapeo exacto a las llaves definidas en types.ts y constants.ts
        return {
            dashboard: current.dashboard ?? defaults.dashboard,
            contactos: current.contactos ?? defaults.contactos,
            propiedades: current.propiedades ?? defaults.propiedades,
            progreso: current.progreso ?? defaults.progreso,
            reportes: current.reportes ?? defaults.reportes,
            crm: current.crm ?? defaults.crm,
            equipo: current.equipo ?? defaults.equipo,
        };
    });

    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [mustChangeOnNextLogin, setMustChangeOnNextLogin] = useState(false);

    // Definimos si el usuario actual tiene capacidad de gestionar equipo
    const canManageTeam = currentUser.role === ROLES.SUPER_ADMIN || 
                          currentUser.role === ROLES.ADMIN_EMPRESA || 
                          currentUser.role === ROLES.EMPRESA;

    useEffect(() => {
        // Solo reseteamos permisos si el rol cambia visualmente en el formulario
        if(formData.role !== user.role) {
            setPermissions(ROLE_DEFAULT_PERMISSIONS[formData.role] || {} as UserPermissions);
        }
    }, [formData.role]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setPermissions(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (showPasswordReset) {
            if (newPassword.length > 0 && newPassword.length < 8) {
                alert('La nueva contraseña debe tener al menos 8 caracteres.');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                alert('Las nuevas contraseñas no coinciden.');
                return;
            }
            if(newPassword) {
                 adapter.setPassword(user.tenantId || null, user.id as number, newPassword, mustChangeOnNextLogin);
            }
        }

        onUserUpdated({...formData, permissions });
    };

    return (
        <form onSubmit={handleSubmit}>
            <FormSection title="Datos del usuario">
                <Input label="Nombre completo" name="name" required value={formData.name} onChange={handleChange} />
                <Input label="Correo electrónico" name="email" type="email" required value={formData.email} onChange={handleChange} />
                <Input label="Teléfono" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                <Input label="Zona (manual)" name="zona" value={formData.zona || ''} onChange={handleChange} />
                <Select label="Rol" name="role" required value={formData.role} onChange={handleChange}>
                    <option value="adminempresa">Administrador de Empresa</option>
                    <option value="administrador">Administrador</option>
                    <option value="asesor">Asesor</option>
                    <option value="gestor">Gestor</option>
                    <option value="notaria">Notaría</option>
                </Select>
            </FormSection>
            
            <FormSection title="Permisos de Acceso (Barra Lateral)">
                {/* 1. Dashboard */}
                <Toggle label="Dashboard (Oportunidades)" name="dashboard" checked={!!permissions.dashboard} onChange={handlePermissionChange} />
                
                {/* 2. Alta de Clientes */}
                <Toggle label="Alta de Clientes" name="contactos" checked={!!permissions.contactos} onChange={handlePermissionChange} />
                
                {/* 3. Catálogo de Propiedades */}
                <Toggle label="Catálogo de Propiedades" name="propiedades" checked={!!permissions.propiedades} onChange={handlePermissionChange} />
                
                {/* 4. Progreso de Ventas */}
                <Toggle label="Progreso de Ventas" name="progreso" checked={!!permissions.progreso} onChange={handlePermissionChange} />
                
                {/* 5. Reportes */}
                <Toggle label="Reportes Generales" name="reportes" checked={!!permissions.reportes} onChange={handlePermissionChange} />
                
                {/* 6. CRM */}
                <Toggle label="CRM" name="crm" checked={!!permissions.crm} onChange={handlePermissionChange} />

                {/* 7. Personal (Solo visible si el usuario actual es Admin) */}
                {canManageTeam && (
                  <Toggle label="Personal (Configuración)" name="equipo" checked={!!permissions.equipo} onChange={handlePermissionChange} />
                )}
            </FormSection>

            {!showPasswordReset ? (
                <div className="text-center my-6">
                    <button type="button" onClick={() => setShowPasswordReset(true)} className="text-sm font-semibold text-iange-orange hover:underline">
                        Restablecer Contraseña
                    </button>
                </div>
            ) : (
                <FormSection title="Restablecer Contraseña">
                    <Input label="Nueva contraseña" name="newPassword" type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <Input label="Confirmar nueva contraseña" name="confirmNewPassword" type="password" minLength={8} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                    <div className="md:col-span-2">
                        <Toggle 
                            label="Requerir cambio al próximo login" 
                            name="mustChangeOnNextLogin"
                            checked={mustChangeOnNextLogin}
                            onChange={e => setMustChangeOnNextLogin(e.target.checked)}
                        />
                    </div>
                </FormSection>
            )}

            <div className="flex justify-end mt-8 space-x-4">
                 <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300 transition-colors shadow-sm">
                    Cancelar
                </button>
                <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm">
                    Guardar Cambios
                </button>
            </div>
        </form>
    );
};

export default EditUserForm;