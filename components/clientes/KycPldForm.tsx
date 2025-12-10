import React, { useState } from 'react';
import { KycData, Propiedad } from '../../types';

// --- COMPONENTES INTERNOS ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; fullWidth?: boolean; placeholder?: string }> = ({ label, name, value, onChange, type = 'text', fullWidth, placeholder }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} id={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900" />
    </div>
);

// Este Select es simple para el resto de los campos
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

// --- COMPONENTE ESPECIAL PARA PROPIEDADES ---
const SelectPropiedad: React.FC<{ 
    label: string; 
    name: string; 
    value: string; 
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
    children: React.ReactNode 
}> = ({ label, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select 
            name={name} 
            id={name} 
            value={value} 
            onChange={onChange} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900"
        >
            {children}
        </select>
    </div>
);

interface KycPldFormProps {
    onSave: (selectedPropiedadId?: number, tipoRelacion?: string) => void;
    onCancel: () => void;
    formData: KycData;
    onFormChange: (data: KycData) => void;
    userType: 'Propietario' | 'Comprador';
    isEmbedded?: boolean;
    propiedades?: Propiedad[];
}

const KycPldForm: React.FC<KycPldFormProps> = ({ onSave, onCancel, formData, onFormChange, userType, isEmbedded = false, propiedades }) => {
    // Obtenemos el ID actual si estamos editando
    const currentPropId = String((formData as any).propiedadId || '');
    
    const [selectedPropiedadId, setSelectedPropiedadId] = useState(currentPropId);
    const [tipoRelacion, setTipoRelacion] = useState((formData as any).tipoRelacion || 'Propuesta de compra');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        onFormChange({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    // --- LÓGICA DE VALIDACIÓN REFORZADA ---
    const handlePropiedadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        
        if (newId === "") {
            setSelectedPropiedadId("");
            return;
        }

        const selectedProp = propiedades?.find(p => String(p.id) === newId);

        if (selectedProp) {
            const status = selectedProp.status ? selectedProp.status.toLowerCase() : '';
            const isBlocked = status === 'separada' || status === 'vendida';
            
            // Permitimos seleccionar SI es la propiedad que YA tiene asignada este usuario (para poder editar su relación)
            const isMyCurrentProperty = newId === currentPropId;

            if (isBlocked && !isMyCurrentProperty) {
                alert(`🚫 ACCIÓN DENEGADA\n\nEsta propiedad ya se encuentra ${selectedProp.status.toUpperCase()}.\nNo puedes asignarla a otro cliente en este momento.`);
                // Forzamos el reset al valor anterior o vacío
                // Usamos un timeout para asegurar que el render del select vuelva atrás
                setTimeout(() => setSelectedPropiedadId(currentPropId), 0);
                return; 
            }
        }

        setSelectedPropiedadId(newId);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(
            selectedPropiedadId ? Number(selectedPropiedadId) : undefined,
            selectedPropiedadId ? tipoRelacion : undefined 
        );
    };

    const formClasses = "";

    return (
        <form onSubmit={handleSubmit} className={formClasses}>
                {userType === 'Comprador' && (
                    <FormSection title="Vincular a Propiedad">
                        <div className="md:col-span-2 space-y-4">
                            {propiedades && propiedades.length > 0 ? (
                                <>
                                    <SelectPropiedad
                                        label="Selecciona una propiedad para asignar"
                                        name="propiedadId"
                                        value={selectedPropiedadId}
                                        onChange={handlePropiedadChange} 
                                    >
                                        <option value="">-- No vincular por ahora --</option>
                                        {propiedades.map(prop => {
                                            const status = prop.status ? prop.status.toLowerCase() : '';
                                            const isBlocked = status === 'separada' || status === 'vendida';
                                            const isMyCurrentProperty = String(prop.id) === currentPropId;
                                            
                                            // BLOQUEO VISUAL (Disabled)
                                            // Se deshabilita SI está bloqueada Y NO es la mía
                                            const isDisabled = isBlocked && !isMyCurrentProperty;
                                            
                                            let labelPrefix = '';
                                            if (status === 'separada') labelPrefix = '🔒 [SEPARADA] ';
                                            else if (status === 'vendida') labelPrefix = '🛑 [VENDIDA] ';
                                            
                                            return (
                                                <option 
                                                    key={prop.id} 
                                                    value={prop.id} 
                                                    disabled={isDisabled}
                                                    className={isDisabled ? 'text-gray-400 bg-gray-100' : 'text-gray-900'}
                                                >
                                                    {`${labelPrefix}${prop.calle} ${prop.numero_exterior} - ${prop.colonia}`}
                                                </option>
                                            );
                                        })}
                                    </SelectPropiedad>
                                    
                                    {selectedPropiedadId && (
                                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 animate-fade-in-down mt-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Estatus de la Asignación</label>
                                            <div className="space-y-2">
                                                {['Propuesta de compra', 'Propiedad Separada', 'Venta finalizada'].map((tipo) => (
                                                    <label key={tipo} className="flex items-center space-x-3 cursor-pointer">
                                                        <input 
                                                            type="radio" 
                                                            name="tipoRelacion" 
                                                            value={tipo}
                                                            checked={tipoRelacion === tipo}
                                                            onChange={(e) => setTipoRelacion(e.target.value)}
                                                            className="h-4 w-4 text-iange-orange focus:ring-iange-orange border-gray-300"
                                                        />
                                                        <span className="text-sm text-gray-700">{tipo}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className={`text-xs mt-3 p-2 rounded border ${
                                                tipoRelacion === 'Venta finalizada' ? 'bg-green-50 border-green-200 text-green-800' :
                                                tipoRelacion === 'Propiedad Separada' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                                'bg-blue-50 border-blue-200 text-blue-800'
                                            }`}>
                                                {tipoRelacion === 'Venta finalizada' 
                                                    ? '⚠️ Cierre Definitivo: La propiedad se marcará como VENDIDA.' 
                                                    : tipoRelacion === 'Propiedad Separada' 
                                                        ? '🔒 Bloqueo Temporal: La propiedad quedará apartada para este cliente.'
                                                        : 'ℹ️ Propuesta: La propiedad sigue visible para otros clientes.'}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-4 bg-gray-100 rounded-md text-center">
                                    <p className="text-sm font-medium text-gray-700">No hay propiedades disponibles</p>
                                </div>
                            )}
                        </div>
                    </FormSection>
                )}

                {/* --- SECCIÓN DE CITA (AHORA SIEMPRE VISIBLE PARA COMPRADORES) --- */}
                {userType === 'Comprador' && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6 animate-fade-in-down">
                        <h3 className="text-blue-800 font-bold text-sm uppercase mb-3 flex items-center gap-2">
                            📅 Agendar Visita / Cita
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                label="Fecha" 
                                name="fechaCita" 
                                type="date" 
                                value={formData.fechaCita || ''} 
                                onChange={handleChange} 
                            />
                            <Input 
                                label="Hora" 
                                name="horaCita" 
                                type="time" 
                                value={formData.horaCita || ''} 
                                onChange={handleChange} 
                            />
                            <Input 
                                label="Notas de la visita" 
                                name="notasCita" 
                                value={formData.notasCita || ''} 
                                onChange={handleChange} 
                                placeholder="Ej. Interesado en el patio..."
                            />
                        </div>
                    </div>
                )}
                
                {/* ... RESTO DEL FORMULARIO SIN CAMBIOS ... */}
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
                        {userType === 'Comprador' && selectedPropiedadId ? 'Vincular y Guardar' : `Añadir ${userType}`}
                    </button>
                </div>
            )}
        </form>
    );
};

export default KycPldForm;