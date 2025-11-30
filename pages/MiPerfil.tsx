import React, { useState } from 'react';
import { User } from '../types';

const FormSection: React.FC<{ title: string; children: React.ReactNode, description?: string }> = ({ title, children, description }) => (
    <section className="py-8">
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

const Input: React.FC<{ label: string; type?: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; autoComplete?: string; }> = ({ label, type = 'text', name, value, onChange, autoComplete }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            value={value} 
            onChange={onChange} 
            autoComplete={autoComplete} 
            className="mt-1 bg-gray-50 focus:ring-iange-orange focus:border-iange-orange block w-full shadow-sm sm:text-sm border-gray-300 rounded-md text-gray-900 placeholder-gray-500" 
        />
    </div>
);


interface MiPerfilProps {
    user: User;
    onUserUpdated: (user: User) => void;
}

const MiPerfil: React.FC<MiPerfilProps> = ({ user, onUserUpdated }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        phone: user.phone,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedUser = {
            ...user,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
        };
        onUserUpdated(updatedUser);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-iange-dark mb-2">Configuración de mi perfil</h2>
            <p className="text-sm text-gray-500 mb-6">Aquí puedes actualizar tu información personal y contraseña.</p>
            
            <form onSubmit={handleSubmit} className="divide-y divide-gray-200">
                <FormSection title="Información Personal" description="Esta información será visible para otros miembros de la empresa.">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Foto de perfil</label>
                        <div className="mt-2 flex items-center space-x-4">
                             <div className="w-16 h-16 bg-iange-salmon rounded-full flex items-center justify-center text-iange-orange font-bold text-3xl">
                                {user.photo}
                            </div>
                            <button type="button" className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Cambiar
                            </button>
                        </div>
                    </div>
                    <Input label="Nombre completo" name="name" value={formData.name} onChange={handleChange} />
                    <Input label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} />
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                        <p className="mt-1 text-sm text-gray-800">{formData.email} (No se puede cambiar)</p>
                    </div>

                </FormSection>

                 <FormSection title="Cambiar Contraseña" description="Asegúrate de usar una contraseña segura para proteger tu cuenta.">
                     <Input label="Contraseña actual" name="currentPassword" type="password" value={formData.currentPassword} onChange={handleChange} autoComplete="current-password" />
                     <Input label="Nueva contraseña" name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} autoComplete="new-password" />
                     <Input label="Confirmar nueva contraseña" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} autoComplete="new-password" />
                 </FormSection>

                 <div className="pt-6 flex justify-end">
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MiPerfil;