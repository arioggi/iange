import React, { useState } from 'react';
import { KycData, Propiedad, User } from '../../types'; 
import { checkBlacklist, validateIneData, extractFromImage } from '../../Services/nufiService'; 
import { useAuth } from '../../authContext';

// --- UTILIDAD MEJORADA: Resize + Compresión para evitar Error 400 ---
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // 1. Redimensionar si es gigante (más de 1200px)
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                // 2. Dibujar en Canvas para cambiar tamaño
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // 3. Comprimir a JPEG calidad 0.7 (reduce el peso drásticamente sin perder texto)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

// --- COMPONENTES UI ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children}
        </div>
    </section>
);

const Input: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; fullWidth?: boolean; placeholder?: string; helpText?: string; disabled?: boolean }> = ({ label, name, value, onChange, type = 'text', fullWidth, placeholder, helpText, disabled }) => (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input type={type} name={name} id={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm placeholder-gray-500 text-gray-900 ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50'}`} />
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
    
    // --- ESTADOS DE FLUJO ---
    const [statusIne, setStatusIne] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [pldResult, setPldResult] = useState<{ status: 'clean' | 'risk' | null, msg: string }>({ status: null, msg: '' });
    const [loadingPld, setLoadingPld] = useState(false); // Para búsqueda manual si se necesita

    // Archivos
    const [files, setFiles] = useState<{ front: File | null; back: File | null }>({ front: null, back: null });

    // Datos Técnicos INE
    const [ineDetails, setIneDetails] = useState({
        ocr: '', cic: '', claveElector: '', emision: '00', tipo: 'C'
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) {
            setFiles(prev => ({ ...prev, [side]: file }));
        }
    };

    // --- LA "SUPER TUBERÍA" (VERSIÓN DIAGNÓSTICO) ---
    const ejecutarValidacionCompleta = async () => {
        const tenantId = user?.user_metadata?.tenant_id || "ID-TEMPORAL-PRUEBAS";
        let datosParaValidar = { ...ineDetails };
        let datosExtraidos: Partial<KycData> = {};
        
        setPldResult({ status: null, msg: '' });

        try {
            // --------------------------------------------------------
            // PASO 1: OCR (Lectura de Imágenes - Endpoints Dinámicos)
            // --------------------------------------------------------
            const faltaFrente = !datosParaValidar.claveElector && files.front;
            const faltaReverso = !datosParaValidar.ocr && files.back;
            
            if (faltaFrente || faltaReverso) {
                setStatusIne('scanning');
                setStatusMessage("📷 Paso 1/3: Leyendo credencial (OCR)...");

                // --- A) PROCESAR FRENTE (Endpoint: .../ocr/v4/frente) ---
                if (faltaFrente && files.front) {
                    try {
                        const base64 = await fileToBase64(files.front);
                        const res = await extractFromImage(base64, 'frente', tenantId);
                        
                        // 🔍 DIAGNÓSTICO: Ver respuesta exacta en Consola
                        console.log("🔍 DEBUG NUFI FRENTE:", res);

                        if (res.status !== 'success') {
                            alert(`⚠️ Error NuFi (Frente): ${res.message || 'Respuesta fallida. Revisa consola.'}`);
                        }
                        
                        // Ajuste para leer la respuesta de NuFi Frente
                        const extracted = res.data?.data?.ocr || res.data?.ocr || res.data; 

                        if (res.status === 'success' && extracted) {
                            // Extraer Datos Técnicos
                            datosParaValidar.claveElector = extracted.clave || extracted.clave_elector || datosParaValidar.claveElector;
                            datosParaValidar.emision = extracted.emision || datosParaValidar.emision;
                            datosParaValidar.tipo = res.data?.data?.tipo || res.data?.tipo || 'C';

                            // Extraer Datos Personales para el Formulario (Auto-Llenado)
                            const nombre = `${extracted.nombre || ''} ${extracted.apellido_paterno || ''} ${extracted.apellido_materno || ''}`.trim();
                            if (nombre) datosExtraidos.nombreCompleto = nombre;
                            if (extracted.curp) datosExtraidos.curp = extracted.curp;
                            
                            // Dirección (Manejo de calle_numero)
                            const calle = extracted.calle_numero || extracted.calle || '';
                            const col = extracted.colonia || '';
                            const cp = extracted.codigo_postal || extracted.cp || '';
                            
                            if (calle || col) {
                                datosExtraidos.domicilio = `${calle}, ${col}`.trim();
                                datosExtraidos.colonia = col;
                                datosExtraidos.municipio = extracted.municipio || '';
                                datosExtraidos.estado = extracted.estado || '';
                                datosExtraidos.cp = cp;
                                // Compatibilidad con campos legacy
                                datosExtraidos.codigoPostal = cp;
                            }
                        }
                    } catch (e) { console.error("Error OCR Frente", e); }
                }

                // --- B) PROCESAR REVERSO (Endpoint: .../ocr/v4/reverso) ---
                if (faltaReverso && files.back) {
                    try {
                        const base64 = await fileToBase64(files.back);
                        const res = await extractFromImage(base64, 'reverso', tenantId);
                        
                        // 🔍 DIAGNÓSTICO: Ver respuesta exacta en Consola
                        console.log("🔍 DEBUG NUFI REVERSO:", res);

                         if (res.status !== 'success') {
                            alert(`⚠️ Error NuFi (Reverso): ${res.message || 'Respuesta fallida. Revisa consola.'}`);
                        }

                        // Ajuste para leer respuesta NuFi Reverso
                        const extracted = res.data?.data?.ocr || res.data?.ocr;
                        
                        if (res.status === 'success' && extracted) {
                            datosParaValidar.ocr = extracted.ocr || extracted.id_mex || datosParaValidar.ocr;
                            datosParaValidar.cic = extracted.cic || datosParaValidar.cic;
                        }
                    } catch (e) { console.error("Error OCR Reverso", e); }
                }

                // Actualizamos estados visuales y Formulario
                setIneDetails(datosParaValidar);
                if (Object.keys(datosExtraidos).length > 0) {
                    onFormChange({ ...formData, ...datosExtraidos, identificacionOficialTipo: 'INE', identificacionOficialNumero: datosParaValidar.claveElector });
                }
            }

            // --------------------------------------------------------
            // PASO 2: VALIDACIÓN VIGENCIA (Endpoint: .../validar)
            // --------------------------------------------------------
            setStatusIne('validating');
            setStatusMessage("📡 Paso 2/3: Validando vigencia ante INE...");

            // Verificar si tenemos lo mínimo necesario
            if (!datosParaValidar.claveElector || (!datosParaValidar.ocr && !datosParaValidar.cic)) {
                // Si faltan datos, pausamos y pedimos manual, pero no borramos lo avanzado
                setStatusIne('error');
                alert("⚠️ La IA no pudo leer todos los códigos de seguridad (CIC/OCR).\nPor favor, abre la consola (F12) para ver por qué falló NuFi, o ingresa los datos manualmente.");
                return;
            }

            const payloadIne: any = {
                tipo_identificacion: datosParaValidar.tipo as any,
                ocr: datosParaValidar.ocr,
                clave_de_elector: datosParaValidar.claveElector,
                numero_de_emision: datosParaValidar.emision
            };

            if (['E', 'F', 'G', 'H'].includes(datosParaValidar.tipo)) {
                payloadIne.cic = datosParaValidar.cic;
                payloadIne.identificador_del_ciudadano = datosParaValidar.cic;
            }

            const resVigencia = await validateIneData(payloadIne, "TEMP-ID", tenantId);
            const dataVigencia = resVigencia.data?.[0];
            const esVigente = resVigencia.status === 'Success' && dataVigencia?.activa;

            if (!esVigente) {
                setStatusIne('error');
                alert(`❌ ALERTA: La INE no es vigente.\nMotivo: ${dataVigencia?.estado || 'Desconocido'}\n${dataVigencia?.information || ''}`);
                return; // Cortamos aquí si la INE es inválida
            }

            // --------------------------------------------------------
            // PASO 3: VALIDACIÓN PLD (Endpoint: .../aml)
            // --------------------------------------------------------
            setStatusMessage("👮 Paso 3/3: Buscando antecedentes (PLD)...");
            
            const nombreParaBuscar = datosExtraidos.nombreCompleto || formData.nombreCompleto;
            
            if (nombreParaBuscar) {
                const resPld = await checkBlacklist(nombreParaBuscar, "TEMP-ID", tenantId);
                const hayRiesgo = resPld.data?.has_sanction_match || resPld.data?.has_crimelist_match;

                if (hayRiesgo) {
                    setPldResult({ status: 'risk', msg: 'Aparece en listas de riesgo' });
                    alert(`⚠️ ADVERTENCIA PLD: ${nombreParaBuscar} tiene coincidencias en listas de riesgo.`);
                } else {
                    setPldResult({ status: 'clean', msg: 'Sin antecedentes detectados' });
                }
            }

            // --------------------------------------------------------
            // FINAL: ÉXITO TOTAL
            // --------------------------------------------------------
            setStatusIne('success');
            setStatusMessage("✅ Identidad Verificada y Segura");

        } catch (error: any) {
            console.error("Error en flujo de identidad:", error);
            setStatusIne('error');
            alert(`Error en el proceso: ${error.message}`);
        } finally {
            if (statusIne !== 'success' && statusIne !== 'error') setStatusIne('idle');
        }
    };

    // --- MANEJO DE OTROS CAMPOS ---
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

    const ejecutarValidacionListasManual = async () => {
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

    return (
        <form onSubmit={handleSubmit}>
            {/* 1. SELECCIÓN DE PROPIEDAD (Solo Compradores) */}
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

            {/* 2. ZONA DE VALIDACIÓN INTELIGENTE (INE) */}
            <div className="mb-8 border-2 border-dashed border-indigo-200 rounded-xl p-6 bg-indigo-50/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                    <div>
                        <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                            🪪 Paso 1: Carga de Identificación (INE)
                        </h3>
                        <p className="text-sm text-indigo-600">Sube las fotos y nosotros llenaremos el formulario por ti.</p>
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={ejecutarValidacionCompleta} 
                        disabled={statusIne === 'scanning' || statusIne === 'validating'} 
                        className={`
                            px-4 py-2 rounded-lg font-medium text-white transition-all shadow-md flex items-center gap-2 text-sm
                            ${statusIne === 'success' ? 'bg-green-600 cursor-default ring-2 ring-green-200' : 
                              statusIne === 'error' ? 'bg-red-500 hover:bg-red-600' :
                              (statusIne === 'scanning' || statusIne === 'validating') ? 'bg-indigo-400 cursor-wait' : 
                              'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}
                        `}
                    >
                        {statusIne === 'scanning' && '📷 Procesando...'}
                        {statusIne === 'validating' && '📡 Validando...'}
                        {statusIne === 'success' && '✅ Verificado y Cargado'}
                        {statusIne === 'idle' && '🚀 Procesar y Validar Ahora'}
                        {statusIne === 'error' && '⚠️ Reintentar'}
                    </button>
                </div>

                {/* Mensaje de progreso */}
                {(statusIne === 'scanning' || statusIne === 'validating') && (
                    <div className="mb-4 bg-white px-3 py-2 rounded border border-indigo-100 text-xs text-indigo-600 font-mono animate-pulse">
                        {statusMessage}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 mb-2">1. Frente de la INE</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 mb-2">2. Reverso de la INE</label>
                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                    </div>
                </div>

                {/* Resultados Técnicos (Colapsables) */}
                <div className={`mt-4 overflow-hidden transition-all duration-300 ${statusIne === 'idle' ? 'max-h-0' : 'max-h-96'}`}>
                    <div className="flex justify-between items-center mb-1">
                        <p className="text-xs text-gray-400 uppercase font-bold">Datos Técnicos:</p>
                        {pldResult.status && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${pldResult.status === 'clean' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {pldResult.status === 'clean' ? '🛡️ PLD: Limpio' : '⚠️ PLD: Riesgo'}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 opacity-75">
                        <input type="text" disabled value={ineDetails.tipo} className="text-xs bg-gray-100 border-none rounded p-1 text-center" title="Modelo"/>
                        <input type="text" disabled value={ineDetails.claveElector} className="col-span-2 text-xs bg-gray-100 border-none rounded p-1" placeholder="Clave Elector"/>
                        <input type="text" disabled value={ineDetails.ocr} className="text-xs bg-gray-100 border-none rounded p-1" placeholder="OCR"/>
                        <input type="text" disabled value={ineDetails.cic} className="text-xs bg-gray-100 border-none rounded p-1" placeholder="CIC"/>
                    </div>
                </div>
            </div>

            {/* 3. DATOS PERSONALES (AUTO-COMPLETADO) */}
            <FormSection title={`Paso 2: Datos del ${userType} (Autocompletado)`}>
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
                    <Input label="Nombre completo" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} fullWidth placeholder="Se llenará automáticamente al escanear" />
                    <button type="button" onClick={ejecutarValidacionListasManual} className="text-xs text-indigo-600 underline mt-1 hover:text-indigo-800">
                        {loadingPld ? 'Consultando...' : '🔍 Verificar manualmente en Listas Negras'}
                    </button>
                </div>

                <Input label="CURP" name="curp" value={formData.curp} onChange={handleChange} placeholder="Se llena auto." />
                <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleChange} />
                <Input label="Fecha nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
                <Input label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                
                {/* Campos de Dirección Desglosados */}
                <Input label="Domicilio (Calle y Num)" name="domicilio" value={formData.domicilio} onChange={handleChange} placeholder="Calle y Número..." />
                <Input label="Colonia" name="colonia" value={formData.colonia} onChange={handleChange} />
                <Input label="Municipio / Alcaldía" name="municipio" value={formData.municipio} onChange={handleChange} />
                <Input label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
                <Input label="Código Postal" name="cp" value={formData.cp || formData.codigoPostal || ''} onChange={handleChange} />

                <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} type="tel"/>
                <Input label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
                
                <Select label="Tipo Identificación" name="identificacionOficialTipo" value={formData.identificacionOficialTipo} onChange={handleChange}>
                    <option>INE</option><option>Pasaporte</option><option>Cédula Profesional</option>
                </Select>
                <Input label="Número de ID" name="identificacionOficialNumero" value={formData.identificacionOficialNumero} onChange={handleChange} placeholder="Clave Elector / Pasaporte" />
            </FormSection>

            {/* SECCIÓN VISITAS (Solo Compradores) */}
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

            <FormSection title="Otros Datos (PLD)">
                <Input label="Origen Recursos" name="origenRecursos" value={formData.origenRecursos} onChange={handleChange} placeholder="Ej. Ahorros, Crédito..." />
                <Input label="Destino Recursos" name="destinoRecursos" value={formData.destinoRecursos} onChange={handleChange} placeholder="Ej. Compra de vivienda..." />
            </FormSection>

            <FormSection title={`Beneficiario Final`}>
                <Checkbox label={`El ${userType} actúa por cuenta propia`} name="actuaPorCuentaPropia" checked={formData.actuaPorCuentaPropia} onChange={handleChange} />
                {!formData.actuaPorCuentaPropia && (
                    <Input label="Nombre completo del Beneficiario Final" name="beneficiarioFinalNombre" value={formData.beneficiarioFinalNombre || ''} onChange={handleChange} fullWidth />
                )}
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
                    <button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded hover:bg-orange-600">Guardar Expediente</button>
                </div>
            )}
        </form>
    );
};

export default KycPldForm;