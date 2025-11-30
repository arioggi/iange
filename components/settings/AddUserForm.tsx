import React, { useState, useEffect } from 'react';
import { User, UserPermissions } from '../../types';
import { ROLES, ROLE_DEFAULT_PERMISSIONS } from '../../constants';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-6">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; type?: string; required?: boolean; placeholder?: string; name: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; minLength?: number; }> = ({ label, type = 'text', required, placeholder, name, value, onChange, minLength }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <input type={type} name={name} id={name} placeholder={placeholder} required={required} value={value} onChange={onChange} minLength={minLength} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900" />
    </div>
);

const Select: React.FC<{ label: string; required?: boolean; name: string; children: React.ReactNode, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }> = ({ label, required, name, children, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
        <select name={name} id={name} required={required} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">
            {children}
        </select>
    </div>
);

const Toggle: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => (
    <label htmlFor={name} className="flex items-center justify-between cursor-pointer p-2 rounded-md hover:bg-gray-50">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="relative">
            <input type="checkbox" id={name} name={name} checked={checked} onChange={onChange} className="sr-only" />
            <div className={`block w-14 h-8 rounded-full ${checked ? 'bg-iange-orange' : 'bg-gray-200'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'transform translate-x-6' : ''}`}></div>
        </div>
    </label>
);

interface AddUserFormProps {
    onUserAdded: (newUser: Omit<User, 'id'>) => void;
    currentUser: User;
}

const AddUserForm: React.FC<AddUserFormProps> = ({ onUserAdded, currentUser }) => {
    const [role, setRole] = useState('asesor');
    const [permissions, setPermissions] = useState<UserPermissions>(ROLE_DEFAULT_PERMISSIONS['asesor']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mustChangePassword, setMustChangePassword] = useState(true);

    useEffect(() => {
        setPermissions(ROLE_DEFAULT_PERMISSIONS[role] || {} as UserPermissions);
    }, [role]);

    const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setPermissions(prev => ({ ...prev, [name]: checked }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (password.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden.');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const name = formData.get('nombre_completo') as string || 'Nuevo Usuario';
        
        const newUser: Omit<User, 'id'> = {
            photo: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2),
            name: name,
            email: formData.get('email') as string,
            phone: formData.get('telefono') as string,
            zona: formData.get('zona') as string,
            role: role,
            permissions: permissions,
            password: password,
            mustChangePassword: mustChangePassword,
        };
        onUserAdded(newUser);
        e.currentTarget.reset();
        setPassword('');
        setConfirmPassword('');
        setRole('asesor');
    };

    return (
         <form onSubmit={handleSubmit}>
            <FormSection title="Datos del usuario">
                <Input label="Nombre completo" name="nombre_completo" required placeholder="Ej. Juan Pérez" />
                <Input label="Correo electrónico" name="email" type="email" required placeholder="ej. juan.perez@empresa.com" />
                <Input label="Teléfono" name="telefono" type="tel" placeholder="81 1234 5678" />
                <Input label="Zona (manual)" name="zona" placeholder="Ej. Monterrey Centro" />
                <Select label="Rol" name="rol" required value={role} onChange={e => setRole(e.target.value)}>
                    <option value="adminempresa">Administrador de Empresa</option>
                    <option value="administrador">Administrador</option>
                    <option value="asesor">Asesor</option>
                    <option value="gestor">Gestor</option>
                    <option value="notaria">Notaría</option>
                </Select>
            </FormSection>

            <FormSection title="Seguridad">
                <Input 
                    label="Contraseña" 
                    name="password" 
                    type="password" 
                    required 
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Input 
                    label="Confirmar contraseña" 
                    name="confirmPassword" 
                    type="password" 
                    required 
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
                 <div className="md:col-span-2">
                    <Toggle 
                        label="Requerir cambio de contraseña al primer login" 
                        name="mustChangePassword" 
                        checked={mustChangePassword}
                        onChange={(e) => setMustChangePassword(e.target.checked)}
                    />
                 </div>
            </FormSection>

            <FormSection title="Permisos">
                <Toggle label="Propiedades" name="propiedades" checked={permissions.propiedades} onChange={handlePermissionChange} />
                <Toggle label="Contactos" name="contactos" checked={permissions.contactos} onChange={handlePermissionChange} />
                <Toggle label="Operaciones" name="operaciones" checked={permissions.operaciones} onChange={handlePermissionChange} />
                <Toggle label="Documentos y KYC" name="documentosKyc" checked={permissions.documentosKyc} onChange={handlePermissionChange} />
                <Toggle label="Reportes" name="reportes" checked={permissions.reportes} onChange={handlePermissionChange} />
                {currentUser.role === ROLES.EMPRESA && (
                  <Toggle label="Equipo (Usuarios)" name="equipo" checked={permissions.equipo} onChange={handlePermissionChange} />
                )}
            </FormSection>

            <div className="flex justify-end items-center mt-8 pt-4 border-t space-x-4">
                <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm">
                    Guardar Usuario
                </button>
            </div>
        </form>
    );
};

export default AddUserForm;