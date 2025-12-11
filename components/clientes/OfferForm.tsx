import React from 'react';
import { OfferData, Propiedad, Comprador } from '../../types';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6 border-b pb-4">
        <h3 className="text-md font-bold text-gray-700 mb-4 uppercase tracking-wide">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void; type?: string; fullWidth?: boolean; placeholder?: string; prefix?: string }> = ({ label, name, value, onChange, type = 'text', fullWidth, placeholder, prefix }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative rounded-md shadow-sm">
            {prefix && (
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">{prefix}</span>
                </div>
            )}
            <input 
                type={type} 
                name={name} 
                id={name} 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder} 
                className={`w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm ${prefix ? 'pl-8' : ''}`} 
            />
        </div>
    </div>
);

const Select: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; fullWidth?: boolean }> = ({ label, name, value, onChange, children, fullWidth }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select name={name} id={name} value={value} onChange={onChange} className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm">
            {children}
        </select>
    </div>
);

interface OfferFormProps {
    propiedad: Propiedad;
    formData: OfferData;
    onFormChange: (data: OfferData) => void;
    onSave: () => void;
    onCancel: () => void;
    compradores?: Comprador[]; // Hacemos opcional para seguridad
}

const OfferForm: React.FC<OfferFormProps> = ({ 
    propiedad, 
    formData, 
    onFormChange, 
    onSave, 
    onCancel, 
    compradores = [] // Default a array vacío para evitar pantalla blanca
}) => {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onFormChange({ ...formData, [name]: value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.compradorId) {
            alert("Por favor selecciona un cliente comprador.");
            return;
        }
        onSave();
    };

    // Lógica para ocultar institución si es Infonavit o Contado
    const showInstitution = ['Crédito Bancario', 'Cofinavit', 'Otro'].includes(formData.formaPago);

    return (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg">
            
            <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-green-700">
                            Propuesta para: <span className="font-bold">{propiedad.calle} {propiedad.numero_exterior}</span>
                            <br/>Valor lista: <span className="font-semibold">{propiedad.valor_operacion}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 0: VINCULAR COMPRADOR */}
            <FormSection title="Cliente Comprador">
                <Select label="Seleccionar Cliente Registrado" name="compradorId" value={formData.compradorId || ''} onChange={handleChange} fullWidth>
                    <option value="">-- Selecciona un cliente --</option>
                    {compradores.map(c => (
                        <option key={c.id} value={c.id}>{c.nombreCompleto} ({c.email})</option>
                    ))}
                </Select>
            </FormSection>

            <FormSection title="1. Precio y Condiciones">
                <Input label="Precio Ofrecido" name="precioOfrecido" value={formData.precioOfrecido} onChange={handleChange} prefix="$" placeholder="Ej. 2,500,000" />
                
                <Select label="Forma de Pago" name="formaPago" value={formData.formaPago} onChange={handleChange}>
                    <option value="Contado">Contado</option>
                    <option value="Crédito Bancario">Crédito Bancario</option>
                    <option value="Infonavit">Infonavit</option>
                    <option value="Cofinavit">Cofinavit</option>
                    <option value="Otro">Otro</option>
                </Select>

                {showInstitution && (
                    <Input label="Institución Financiera" name="institucionFinanciera" value={formData.institucionFinanciera || ''} onChange={handleChange} placeholder="Ej. BBVA, Santander..." fullWidth />
                )}
            </FormSection>

            <FormSection title="2. Desglose (Flujo)">
                <Input label="Apartado" name="montoApartado" value={formData.montoApartado} onChange={handleChange} prefix="$" />
                <Input label="Enganche" name="montoEnganche" value={formData.montoEnganche} onChange={handleChange} prefix="$" />
                <Input label="Saldo a Firma" name="saldoAFirma" value={formData.saldoAFirma} onChange={handleChange} prefix="$" fullWidth />
            </FormSection>
            
            <FormSection title="3. Vigencia y Observaciones">
                <Input label="Vigencia de la oferta" name="vigenciaOferta" type="date" value={formData.vigenciaOferta} onChange={handleChange} />
                
                <div className="md:col-span-2">
                    <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <textarea 
                        name="observaciones" 
                        id="observaciones" 
                        rows={3} 
                        value={formData.observaciones || ''} 
                        onChange={handleChange} 
                        className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:text-sm"
                    />
                </div>
            </FormSection>

            <div className="flex justify-end mt-8 pt-4 border-t space-x-4">
                <button type="button" onClick={onCancel} className="bg-white text-gray-700 py-2 px-6 rounded-md border border-gray-300 hover:bg-gray-50 font-medium">
                    Cancelar
                </button>
                <button type="submit" className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700 font-medium shadow-sm flex items-center">
                    Guardar Propuesta
                </button>
            </div>
        </form>
    );
};

export default OfferForm;