import React, { useState } from 'react';
import { KycData, Propiedad } from '../../types';

// --- COMPONENTES INTERNOS (DEFINICIÓN LOCAL PARA QUE FUNCIONE) ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; fullWidth?: boolean }> = ({ label, name, value, onChange, type = 'text', fullWidth }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} id={name} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900" />
    </div>
);

const Select: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select name={name} id={name} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">
            {children}
        </select>
    </div>
);

const Checkbox: React.FC<{ label: string; name: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ label, name, checked, onChange }) => (
    <label htmlFor={name} className="flex items-center cursor-pointer md:col-span-2 group p-1">
        <div className="relative flex items-center">
            <input 
                type="checkbox" 
                name={name} 
                id={name} 
                checked={checked} 
                onChange={onChange} 
                className="peer relative h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:border-iange-orange checked:bg-iange-orange group-hover:border-iange-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange"
            />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            </div>
        </div>
        <span className="ml-2 block text-sm text-gray-900">{label}</span>
    </label>
);

interface KycPldFormProps {
    onSave: (selectedPropiedadId?: number) => void;
    onCancel: () => void;
    formData: KycData;
    onFormChange: (data: KycData) => void;
    userType: 'Propietario' | 'Comprador';
    isEmbedded?: boolean;
    propiedades?: Propiedad[];
}

const KycPldForm: React.FC<KycPldFormProps> = ({ onSave, onCancel, formData, onFormChange, userType, isEmbedded = false, propiedades }) => {
    const [selectedPropiedadId, setSelectedPropiedadId] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        onFormChange({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(selectedPropiedadId ? Number(selectedPropiedadId) : undefined);
    };

    const formClasses = "";

    return (
        <form onSubmit={handleSubmit} className={formClasses}>
            {userType === 'Comprador' && (
                <FormSection title="Vincular a Propiedad">
                    <div className="md:col-span-2">
                        {propiedades && propiedades.length > 0 ? (
                            <>
                                <Select
                                    label="Selecciona una propiedad disponible para este comprador (Opcional)"
                                    name="propiedadId"
                                    value={selectedPropiedadId}
                                    onChange={(e) => setSelectedPropiedadId(e.target.value)}
                                >
                                    <option value="">No vincular por ahora</option>
                                    {propiedades.map(prop => (
                                        <option key={prop.id} value={prop.id}>
                                            {`${prop.calle} ${prop.numero_exterior}, ${prop.colonia}`}
                                        </option>
                                    ))}
                                </Select>
                                <p className="mt-2 text-xs text-gray-500">
                                    Al vincular un comprador, el estatus de la propiedad cambiará a "Vendida" en el catálogo.
                                </p>
                            </>
                        ) : (
                            <div className="p-4 bg-gray-100 rounded-md text-center">
                                <p className="text-sm font-medium text-gray-700">No hay propiedades disponibles</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Para poder vincular un comprador, primero debes dar de alta una propiedad que no tenga un comprador asignado.
                                </p>
                            </div>
                        )}
                    </div>
                </FormSection>
            )}

            <FormSection title={`Datos de Identificación del ${userType} (Persona Física)`}>
                <Input label="Nombre(s) y apellidos" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} fullWidth/>
                <Input label="CURP" name="curp" value={formData.curp} onChange={handleChange} />
                <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleChange} />
                <Input label="Fecha de nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
                <Input label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                <Select label="Estado civil" name="estadoCivil" value={formData.estadoCivil} onChange={handleChange}>
                    <option>Soltero(a)</option>
                    <option>Casado(a)</option>
                </Select>
                <Input label="Profesión/Ocupación" name="profesion" value={formData.profesion} onChange={handleChange} />
                <Input label="Domicilio (Calle y número)" name="domicilio" value={formData.domicilio} onChange={handleChange} fullWidth />
                <Input label="Colonia" name="colonia" value={formData.colonia} onChange={handleChange} />
                <Input label="Municipio/Alcaldía" name="municipio" value={formData.municipio} onChange={handleChange} />
                <Input label="Código Postal" name="cp" value={formData.cp} onChange={handleChange} />
                <Input label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
                <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} type="tel"/>
                <Input label="Correo electrónico" name="email" value={formData.email} onChange={handleChange} type="email" />
                <Select label="Identificación Oficial" name="identificacionOficialTipo" value={formData.identificacionOficialTipo} onChange={handleChange}>
                    <option>INE</option>
                    <option>Pasaporte</option>
                    <option>Cédula Profesional</option>
                </Select>
                 <Input label="Número de Identificación" name="identificacionOficialNumero" value={formData.identificacionOficialNumero} onChange={handleChange} />
            </FormSection>

             <FormSection title={`Beneficiario Final`}>
                <Checkbox label={`El ${userType} actúa por cuenta propia`} name="actuaPorCuentaPropia" checked={formData.actuaPorCuentaPropia} onChange={handleChange} />
                 {!formData.actuaPorCuentaPropia && (
                    <Input label="Nombre completo del Beneficiario Final" name="beneficiarioFinalNombre" value={formData.beneficiarioFinalNombre || ''} onChange={handleChange} fullWidth />
                 )}
            </FormSection>

            <FormSection title={`Origen y Destino de los Recursos`}>
                 <Input label="Origen (salario/ahorros/crédito/otro)" name="origenRecursos" value={formData.origenRecursos} onChange={handleChange} />
                 <Input label="Destino de los recursos (uso previsto)" name="destinoRecursos" value={formData.destinoRecursos} onChange={handleChange} />
            </FormSection>

            <FormSection title={`Declaración PEP (Persona Políticamente Expuesta)`}>
                 <Checkbox label={`¿El ${userType}, familiar o asociado cercano es PEP?`} name="esPep" checked={formData.esPep} onChange={handleChange} />
                 {formData.esPep && <>
                    <Input label="Nombre del PEP" name="pepNombre" value={formData.pepNombre || ''} onChange={handleChange} />
                    <Input label="Cargo/Función" name="pepCargo" value={formData.pepCargo || ''} onChange={handleChange} />
                 </>}
            </FormSection>

            {!isEmbedded && (
                 <div className="flex justify-end mt-8 pt-4 border-t space-x-4">
                    <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300">
                        Cancelar
                    </button>
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600">
                        Añadir {userType}
                    </button>
                </div>
            )}
        </form>
    );
};

export default KycPldForm;