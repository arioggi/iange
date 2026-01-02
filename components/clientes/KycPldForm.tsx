import React, { useState } from 'react';
import { KycData, Propiedad, User } from '../../types'; 
import { checkBlacklist, validateIneData, extractFromImage } from '../../Services/nufiService'; 
import { useAuth } from '../../authContext';

// --- UTILIDAD: Convertir Archivo a Base64 ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- COMPONENTES INTERNOS ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; fullWidth?: boolean; placeholder?: string; helpText?: string }> = ({ label, name, value, onChange, type = 'text', fullWidth, placeholder, helpText }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} id={name} value={value} onChange={onChange} placeholder={placeholder} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900" />
        {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
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
            <input type="checkbox" name={name} id={name} checked={checked} onChange={onChange} className="peer relative h-4 w-4 cursor-pointer appearance-none rounded border border-gray-300 transition-all checked:border-iange-orange checked:bg-iange-orange group-hover:border-iange-orange focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-iange-orange" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </div>
        </div>
        <span className="ml-2 block text-sm text-gray-900">{label}</span>
    </label>
);

const SelectPropiedad: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select name={name} id={name} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">
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
    asesores?: User[]; 
}

const KycPldForm: React.FC<KycPldFormProps> = ({ onSave, onCancel, formData, onFormChange, userType, isEmbedded = false, propiedades, asesores = [] }) => {
    const { user } = useAuth();
    
    // Estados
    const [loadingPld, setLoadingPld] = useState(false);
    const [loadingIne, setLoadingIne] = useState(false);
    
    // Almacenamos los archivos seleccionados
    const [files, setFiles] = useState<{ front: File | null; back: File | null }>({ front: null, back: null });

    // Estado visual de los datos de la INE
    const [ineDetails, setIneDetails] = useState({
        ocr: '', cic: '', claveElector: '', emision: '00', tipo: 'C'
    });

    const handleIneChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setIneDetails({ ...ineDetails, [e.target.name]: e.target.value });
    };

    // Al seleccionar archivo, SOLO guardamos en el estado "files" para usarlo después
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            setFiles(prev => ({ ...prev, [side]: file }));
        }
    };

    // --- LÓGICA MAESTRA DEL BOTÓN VALIDAR ---
    const ejecutarValidacionIne = async () => {
        // 1. Verificar Tenant
        const tenantId = user?.user_metadata?.tenant_id || "ID-TEMPORAL-PRUEBAS";
        console.log("🚀 Iniciando validación con Tenant:", tenantId);

        setLoadingIne(true);
        try {
            // Creamos una copia local de los datos para ir llenándola
            let datosActuales = { ...ineDetails };

            // 2. ¿Faltan datos y tenemos fotos? -> Ejecutar OCR ahora mismo
            const faltaFrente = !datosActuales.claveElector && files.front;
            const faltaReverso = !datosActuales.ocr && files.back;

            if (faltaFrente || faltaReverso) {
                // alert("📷 Procesando fotos antes de validar..."); // Descomenta si quieres aviso visual
                
                if (faltaFrente && files.front) {
                    try {
                        const base64 = await fileToBase64(files.front);
                        const res = await extractFromImage(base64, 'frente', tenantId);
                        if (res.status === 'success' && res.data?.ocr) {
                            datosActuales.claveElector = res.data.ocr.clave || datosActuales.claveElector;
                            datosActuales.emision = res.data.ocr.emision || datosActuales.emision;
                            datosActuales.tipo = res.data.tipo || datosActuales.tipo;
                            // Actualizar UI y Formulario Global
                            onFormChange({
                                ...formData,
                                nombreCompleto: `${res.data.ocr.nombre || ''} ${res.data.ocr.apellido_paterno || ''}`.trim(),
                                curp: res.data.ocr.curp || formData.curp,
                                identificacionOficialNumero: res.data.ocr.clave || formData.identificacionOficialNumero
                            });
                        }
                    } catch (e) { console.error("Error OCR Frente", e); }
                }

                if (faltaReverso && files.back) {
                    try {
                        const base64 = await fileToBase64(files.back);
                        const res = await extractFromImage(base64, 'reverso', tenantId);
                        if (res.status === 'success' && res.data?.ocr) {
                            datosActuales.ocr = res.data.ocr.ocr || res.data.ocr.id_mex || datosActuales.ocr;
                            datosActuales.cic = res.data.ocr.cic || datosActuales.cic;
                        }
                    } catch (e) { console.error("Error OCR Reverso", e); }
                }

                // Actualizamos el estado visual para que el usuario vea lo que se extrajo
                setIneDetails(datosActuales);
            }

            // 3. Revisar si AHORA sí tenemos los datos
            if (!datosActuales.claveElector || !datosActuales.ocr) {
                alert(`⚠️ No se puede validar aún.\n\nDatos faltantes:\n${!datosActuales.claveElector ? '- Clave de Elector (Frente)' : ''}\n${!datosActuales.ocr ? '- OCR (Reverso)' : ''}\n\nPor favor intenta subir fotos más claras o escribe los datos manualmente.`);
                setLoadingIne(false);
                return;
            }

            // 4. Mandar a Validar Vigencia (Supabase -> NuFi)
            const payloadIne: any = {
                tipo_identificacion: datosActuales.tipo as any,
                ocr: datosActuales.ocr,
                clave_de_elector: datosActuales.claveElector,
                numero_de_emision: datosActuales.emision
            };
            
            // Ajustes para modelos nuevos
            if (['E', 'F', 'G', 'H'].includes(datosActuales.tipo)) {
                payloadIne.cic = datosActuales.cic;
                payloadIne.identificador_del_ciudadano = datosActuales.cic;
            }

            const resultado = await validateIneData(payloadIne, "TEMP-ID", tenantId);
            const dataRes = resultado.data?.[0];

            if (resultado.status === 'Success' && dataRes?.activa) {
                alert("✅ INE VIGENTE y ACTIVA en lista nominal.");
                // Aseguramos que el dato clave quede guardado
                onFormChange({ ...formData, identificacionOficialNumero: datosActuales.claveElector });
            } else {
                alert(`❌ INE NO VÁLIDA: ${dataRes?.estado || 'No encontrada o datos incorrectos.'}`);
            }

        } catch (error: any) {
            console.error("Error completo:", error);
            alert(`Error en el proceso: ${error.message || "Revisa tu conexión o el backend"}`);
        } finally {
            setLoadingIne(false);
        }
    };

    // --- VALIDACIÓN LISTAS NEGRAS ---
    const ejecutarValidacionListas = async () => {
        if (!formData.nombreCompleto || formData.nombreCompleto.length < 3) { alert("Ingresa nombre completo."); return; }
        setLoadingPld(true);
        try {
            const tenantId = user?.user_metadata?.tenant_id || "ID-TEMPORAL-PRUEBAS";
            const resultado = await checkBlacklist(formData.nombreCompleto, "TEMP-ID", tenantId);
            const hayRiesgo = resultado.data?.has_sanction_match || resultado.data?.has_crimelist_match;
            if (hayRiesgo) alert(`⚠️ ALERTA: ${formData.nombreCompleto} aparece en listas de riesgo.`);
            else alert(`✅ APROBADO: ${formData.nombreCompleto} no está en listas negras.`);
        } catch (error) { console.error(error); alert("Error PLD."); } finally { setLoadingPld(false); }
    };

    // --- ESTADOS ORIGINALES ---
    const currentPropId = String((formData as any).propiedadId || '');
    const [selectedPropiedadId, setSelectedPropiedadId] = useState(currentPropId);
    const [tipoRelacion, setTipoRelacion] = useState((formData as any).tipoRelacion || 'Propuesta de compra');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        onFormChange({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handlePropiedadChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        if (newId === "") { setSelectedPropiedadId(""); return; }
        const selectedProp = propiedades?.find(p => String(p.id) === newId);
        if (selectedProp) {
            const status = selectedProp.status ? selectedProp.status.toLowerCase() : '';
            const isBlocked = status === 'separada' || status === 'vendida';
            const isMyCurrentProperty = newId === currentPropId;
            if (isBlocked && !isMyCurrentProperty) {
                alert(`🚫 ACCIÓN DENEGADA\nPropiedad ${selectedProp.status.toUpperCase()}.`);
                setTimeout(() => setSelectedPropiedadId(currentPropId), 0);
                return; 
            }
        }
        setSelectedPropiedadId(newId);
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(selectedPropiedadId ? Number(selectedPropiedadId) : undefined, selectedPropiedadId ? tipoRelacion : undefined);
    };

    return (
        <form onSubmit={handleSubmit}>
            {userType === 'Comprador' && (
                <FormSection title="Vincular a Propiedad">
                    <div className="md:col-span-2 space-y-4">
                        {propiedades && propiedades.length > 0 ? (
                            <>
                                <SelectPropiedad label="Selecciona una propiedad" name="propiedadId" value={selectedPropiedadId} onChange={handlePropiedadChange}>
                                    <option value="">-- No vincular por ahora --</option>
                                    {propiedades.map(prop => {
                                        const status = prop.status ? prop.status.toLowerCase() : '';
                                        const isDisabled = (status === 'separada' || status === 'vendida') && String(prop.id) !== currentPropId;
                                        let labelPrefix = status === 'separada' ? '🔒 [SEPARADA] ' : status === 'vendida' ? '🛑 [VENDIDA] ' : '';
                                        return <option key={prop.id} value={prop.id} disabled={isDisabled} className={isDisabled ? 'bg-gray-100 text-gray-400' : ''}>{`${labelPrefix}${prop.calle} ${prop.numero_exterior}`}</option>
                                    })}
                                </SelectPropiedad>
                                {selectedPropiedadId && (
                                    <div className="bg-gray-50 p-4 rounded border mt-2">
                                        <label className="block text-sm font-medium mb-2">Estatus</label>
                                        {['Propuesta de compra', 'Propiedad Separada', 'Venta finalizada'].map(tipo => (
                                            <label key={tipo} className="flex items-center gap-2 mb-1"><input type="radio" name="tipoRelacion" value={tipo} checked={tipoRelacion === tipo} onChange={e => setTipoRelacion(e.target.value)} /> <span className="text-sm">{tipo}</span></label>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : <div className="p-4 bg-gray-100 text-center text-sm">No hay propiedades disponibles</div>}
                    </div>
                </FormSection>
            )}

            {userType === 'Comprador' && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-6">
                    <h3 className="text-blue-800 font-bold text-sm uppercase mb-3">📅 Agendar Visita / Cita</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Fecha" name="fechaCita" type="date" value={formData.fechaCita || ''} onChange={handleChange} />
                        <Input label="Hora" name="horaCita" type="time" value={formData.horaCita || ''} onChange={handleChange} />
                        <Input label="Notas" name="notasCita" value={formData.notasCita || ''} onChange={handleChange} placeholder="Ej. Interesado..." />
                    </div>
                </div>
            )}
            
            <FormSection title={`Datos de Identificación del ${userType}`}>
                {asesores.length > 0 && (
                    <div className="md:col-span-2 bg-yellow-50 p-3 rounded border border-yellow-200 mb-2">
                        <label className="block text-sm font-bold text-yellow-800 mb-1">Asesor Responsable</label>
                        <select name="asesorId" value={formData.asesorId || ''} onChange={handleChange as any} className="w-full text-sm rounded border-yellow-300">
                            <option value="">-- Seleccionar --</option>
                            {asesores.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="md:col-span-2">
                    <Input label="Nombre completo" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} fullWidth placeholder="Se llenará auto. al validar INE" />
                    <button type="button" onClick={ejecutarValidacionListas} disabled={loadingPld || !formData.nombreCompleto} className="text-xs text-indigo-600 underline mt-1 hover:text-indigo-800">
                        {loadingPld ? 'Consultando...' : '🔍 Verificar en Listas Negras'}
                    </button>
                </div>

                <Input label="CURP" name="curp" value={formData.curp} onChange={handleChange} />
                <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleChange} />
                <Input label="Fecha nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
                <Input label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} type="tel"/>
                <Input label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
                
                <Select label="Identificación Oficial" name="identificacionOficialTipo" value={formData.identificacionOficialTipo} onChange={handleChange}>
                    <option>INE</option><option>Pasaporte</option><option>Cédula Profesional</option>
                </Select>
                <Input label="Número de Identificación" name="identificacionOficialNumero" value={formData.identificacionOficialNumero} onChange={handleChange} />
            </FormSection>

            {/* --- SECCIÓN VALIDACIÓN INE (CON FLUJO UNIFICADO) --- */}
            <div className="mb-8 border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                        🪪 Herramienta de Validación INE (OCR + Vigencia)
                    </h3>
                    {loadingIne && <span className="text-xs font-bold text-indigo-600 animate-pulse">🔄 Procesando imágenes y validando...</span>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">1. Cargar Frente INE</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-200 hover:file:bg-gray-300"/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">2. Cargar Reverso INE</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-gray-200 hover:file:bg-gray-300"/>
                    </div>
                </div>

                <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Datos extraídos / manuales:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                            <select name="tipo" value={ineDetails.tipo} onChange={handleIneChange} className="w-full text-xs border-gray-300 rounded">
                                <option value="C">Modelo C</option><option value="D">Modelo D</option><option value="E">Modelo E</option><option value="F">Modelo F</option><option value="G">Modelo G</option><option value="H">Modelo H</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <input type="text" name="claveElector" value={ineDetails.claveElector} onChange={handleIneChange} className="w-full text-xs border-gray-300 rounded uppercase" placeholder="Clave Elector (18 carac.)"/>
                        </div>
                        <div>
                            <input type="text" name="ocr" value={ineDetails.ocr} onChange={handleIneChange} className="w-full text-xs border-gray-300 rounded" placeholder="OCR (13 dígitos)"/>
                        </div>
                        <div>
                            <input type="text" name="cic" value={ineDetails.cic} onChange={handleIneChange} className="w-full text-xs border-gray-300 rounded" placeholder="CIC (9 dígitos)"/>
                        </div>
                        <div>
                            <input type="text" name="emision" value={ineDetails.emision} onChange={handleIneChange} className="w-full text-xs border-gray-300 rounded" placeholder="Emisión (00)"/>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <button type="button" onClick={ejecutarValidacionIne} disabled={loadingIne} className={`text-xs px-4 py-2 rounded font-medium text-white transition-colors ${loadingIne ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-sm'}`}>
                            {loadingIne ? '🔄 Procesando y Validando...' : '✅ Validar Vigencia'}
                        </button>
                    </div>
                </div>
            </div>

            <FormSection title="Otros Datos">
                <Input label="Origen Recursos" name="origenRecursos" value={formData.origenRecursos} onChange={handleChange} />
                <Checkbox label="¿Es PEP?" name="esPep" checked={formData.esPep} onChange={handleChange} />
                {formData.esPep && <Input label="Nombre PEP" name="pepNombre" value={formData.pepNombre || ''} onChange={handleChange} />}
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
                    <button type="button" onClick={onCancel} className="bg-gray-200 py-2 px-6 rounded hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded hover:bg-orange-600">Guardar</button>
                </div>
            )}
        </form>
    );
};

export default KycPldForm;