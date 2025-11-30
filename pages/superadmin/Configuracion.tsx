import React, { useState } from 'react';

const FormInput: React.FC<{ label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, value, onChange }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input type="text" name={name} id={name} value={value} onChange={onChange} className="mt-1 w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
    </div>
);

const FormTextarea: React.FC<{ label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }> = ({ label, name, value, onChange }) => (
    <div className="md:col-span-2">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea name={name} id={name} value={value} onChange={onChange} rows={4} className="mt-1 w-full p-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
    </div>
);

const SuperAdminConfiguracion: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
    const [config, setConfig] = useState({
        nombreSistema: 'IANGE',
        urlPrincipal: 'https://iange.com',
        correoSoporte: 'soporte@iange.xyz',
        whatsappSoporte: '+52 81 1234 5678',
        textoLegal: '© 2024 IANGE. Todos los derechos reservados.',
        politicaPrivacidad: 'Aquí va el texto completo de la política de privacidad...',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setConfig(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        showToast('Configuración del sistema guardada.');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-iange-dark">Configuración del Sistema</h2>
                <p className="text-gray-600 mt-1">Modifica los parámetros globales de la aplicación.</p>
            </div>

            <section>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Nombre del sistema" name="nombreSistema" value={config.nombreSistema} onChange={handleChange} />
                    <FormInput label="URL principal" name="urlPrincipal" value={config.urlPrincipal} onChange={handleChange} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Logo global</label>
                        <input type="file" className="mt-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-iange-salmon file:text-iange-orange hover:file:bg-orange-100"/>
                    </div>
                </div>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Contacto y Soporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput label="Correo de soporte" name="correoSoporte" value={config.correoSoporte} onChange={handleChange} />
                    <FormInput label="WhatsApp de soporte" name="whatsappSoporte" value={config.whatsappSoporte} onChange={handleChange} />
                </div>
            </section>

            <section>
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Textos Legales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormTextarea label="Texto legal del pie de página" name="textoLegal" value={config.textoLegal} onChange={handleChange} />
                    <FormTextarea label="Política de privacidad" name="politicaPrivacidad" value={config.politicaPrivacidad} onChange={handleChange} />
                </div>
            </section>
            
            <div className="flex justify-end pt-4">
                <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600">
                    Guardar Cambios
                </button>
            </div>
        </form>
    );
};

export default SuperAdminConfiguracion;