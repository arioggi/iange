import React, { useState, useEffect } from 'react';
import { KycData, Propiedad, User } from '../../types'; 
import { checkBlacklist, validateIneData, extractFromImage } from '../../Services/nufiService'; 
import { useAuth } from '../../authContext';
import { supabase } from '../../supabaseClient'; 
import DeleteConfirmationModal from '../ui/DeleteConfirmationModal'; 
// Added icons for the new section
import { 
    ShieldCheckIcon, 
    ShareIcon, 
    ClipboardDocumentCheckIcon, 
    CheckCircleIcon 
} from '../Icons';

// --- UTILIDADES ---
const cleanNameForNufi = (text: string): string => {
    if (!text) return "";
    return text
        .toUpperCase()
        .replace(/Ñ/g, "N")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Z\s]/g, "")
        .replace(/\s+/g, " ")
        .trim();
};

// 📅 FIX FECHA: Convierte DD/MM/YYYY a YYYY-MM-DD
const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return "";
    const clean = dateStr.trim().replace(/-/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const MAX_WIDTH = 1200;
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const parseMrz = (fullText: string) => {
    if (!fullText) return null;
    const cleanText = fullText.toUpperCase();
    const match = cleanText.match(/IDMEX(\d+)<+(\d+)/);
    if (match) {
        return {
            cic: match[1].substring(0, 9),
            ocrNumber: match[2], 
            identificador: match[2].slice(-9)
        };
    }
    return null;
};

// --- COMPONENTES UI INTERNOS ---
const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
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
        <select name={name} id={name} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">{children}</select>
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
        <select name={name} id={name} value={value} onChange={onChange} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-iange-orange focus:border-iange-orange sm:text-sm text-gray-900">{children}</select>
    </div>
);

// --- COMPONENTE PRINCIPAL ---

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
    
    // Estados de Flujo
    const [statusIne, setStatusIne] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [pldResult, setPldResult] = useState<{ status: 'clean' | 'risk' | null, msg: string }>({ status: null, msg: '' });
    const [loadingPld, setLoadingPld] = useState(false); 

    // Estados para Eliminar
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<'INE' | 'PLD' | null>(null);

    // Archivos y Datos
    const [files, setFiles] = useState<{ front: File | null; back: File | null }>({ front: null, back: null });
    const [ineDetails, setIneDetails] = useState({ ocr: '', cic: '', claveElector: '', emision: '00', tipo: 'C' });

    // --- 1. RESTAURAR ESTADO AL MONTAR ---
    useEffect(() => {
        if (formData.ineValidado) {
            setStatusIne('success');
            setStatusMessage("✅ INE Verificada");
        }
        if (formData.pldValidado) {
            setPldResult({ status: 'clean', msg: 'Sin antecedentes' });
        }

        const fetchValidations = async () => {
            const entityId = (formData as any).id; 
            if (!entityId) return;

            try {
                const { data, error } = await supabase
                    .from('kyc_validations')
                    .select('*')
                    .eq('entity_id', entityId)
                    .eq('entity_type', userType)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const lastIne = data.find(v => v.validation_type === 'INE_CHECK' && v.status === 'success');
                    if (lastIne && !formData.ineValidado) {
                        setStatusIne('success');
                        onFormChange({ ...formData, ineValidado: true, ineValidationId: lastIne.id });
                    }

                    const lastPld = data.find(v => v.validation_type === 'PLD_CHECK');
                    if (lastPld && !formData.pldValidado) {
                        if (lastPld.status === 'success') {
                             const hayRiesgo = lastPld.api_response?.data?.has_match;
                             setPldResult({ status: hayRiesgo ? 'risk' : 'clean', msg: hayRiesgo ? 'Riesgo detectado' : 'Sin antecedentes' });
                             onFormChange({ ...formData, pldValidado: true, pldValidationId: lastPld.id });
                        }
                    }
                }
            } catch (err) {
                console.error("Error al cargar validaciones:", err);
            }
        };

        fetchValidations();
    }, [(formData as any).id, userType]); 


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
        const file = e.target.files?.[0];
        if (file) setFiles(prev => ({ ...prev, [side]: file }));
    };

    // --- 📸 SUBIR FOTOS A STORAGE ---
    const uploadEvidence = async (file: File, entityId: string, side: 'frente' | 'reverso') => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `kyc/${entityId}/${Date.now()}_${side}.${fileExt}`;

            // ⚠️ IMPORTANTE: El nombre del bucket debe coincidir EXACTAMENTE con el de Supabase
            const { error: uploadError } = await supabase.storage
                .from('documentos-identidad') 
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('documentos-identidad')
                .getPublicUrl(fileName);

            console.log(`✅ Imagen subida (${side}):`, data.publicUrl);
            return data.publicUrl;

        } catch (error: any) {
            console.error(`❌ Error subiendo imagen ${side}:`, error);
            // Si el error es RLS, lo mostramos en un alert para debuggear
            if (error.message && error.message.includes("row-level security")) {
                alert(`Error de Permisos: No se pudo subir la foto (${side}). Revisa las políticas del Bucket en Supabase.`);
            }
            return null; 
        }
    };

    // --- FUNCIÓN DE LOGGING Y PERSISTENCIA ---
    const logToSupabaseAndPersist = async (
        tipo: 'INE_CHECK' | 'PLD_CHECK', 
        status: 'success' | 'error', 
        response: any, 
        currentData: KycData 
    ) => {
        const tenantId = user?.user_metadata?.tenant_id;
        const entityId = (currentData as any).id || null;

        const { data, error } = await supabase.from('kyc_validations').insert({
            tenant_id: tenantId,
            entity_type: userType, 
            entity_id: entityId, 
            validation_type: tipo,
            status: status,
            api_response: response, 
        }).select().single();

        if (error) console.error("❌ Error log Supabase:", error);
        
        if (status === 'success' && data) {
            if (tipo === 'INE_CHECK') {
                const newData = { ...currentData, ineValidado: true, ineValidationId: data.id };
                onFormChange(newData); 
                return newData;
            } else if (tipo === 'PLD_CHECK') {
                const newData = { ...currentData, pldValidado: true, pldValidationId: data.id };
                onFormChange(newData); 
                return newData;
            }
        }
        return currentData;
    };

    // --- RESETEAR VALIDACIÓN ---
    const confirmDelete = (target: 'INE' | 'PLD') => {
        setDeleteTarget(target);
        setDeleteModalOpen(true);
    };

    const handleResetValidation = async () => {
        if (!deleteTarget) return;
        
        const idToDelete = deleteTarget === 'INE' ? formData.ineValidationId : formData.pldValidationId;

        if (idToDelete) {
            const { error } = await supabase.from('kyc_validations').delete().eq('id', idToDelete);
            if (error) alert("Error al eliminar de BD, pero se reseteará localmente.");
        }

        if (deleteTarget === 'INE') {
            setStatusIne('idle');
            setStatusMessage("");
            setFiles({ front: null, back: null });
            setIneDetails({ ocr: '', cic: '', claveElector: '', emision: '00', tipo: 'C' });
            onFormChange({ ...formData, ineValidado: false, ineValidationId: undefined });
        } else {
            setPldResult({ status: null, msg: '' });
            onFormChange({ ...formData, pldValidado: false, pldValidationId: undefined });
        }
        
        setDeleteModalOpen(false);
    };

    // --- PROCESO DE VALIDACIÓN ---
    const ejecutarValidacionCompleta = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        const tenantId = user?.user_metadata?.tenant_id || "ID-TEMPORAL-PRUEBAS";
        const entityIdForStorage = (formData as any).id ? String((formData as any).id) : `temp_${Date.now()}`;
        const entityIdForDb = (formData as any).id ? String((formData as any).id) : "TEMP-NEW-USER";
        
        let workingData = { ...formData }; 
        let datosParaValidar = { ...ineDetails };
        
        if (pldResult.status === null) setPldResult({ status: null, msg: '' });

        try {
            // 1. OCR
            const faltaFrente = !datosParaValidar.claveElector && files.front;
            const faltaReverso = !datosParaValidar.ocr && files.back;
            
            if (faltaFrente || faltaReverso) {
                setStatusIne('scanning');
                setStatusMessage("📷 Paso 1/3: Escaneando credencial...");

                if (faltaFrente && files.front) {
                    try {
                        const base64 = await fileToBase64(files.front);
                        const res = await extractFromImage(base64, 'frente', tenantId);
                        const extracted = res.data?.data?.ocr || res.data?.ocr || res.data; 

                        if (res.status === 'success' && extracted) {
                            datosParaValidar.claveElector = extracted.clave || extracted.clave_elector || datosParaValidar.claveElector;
                            datosParaValidar.emision = extracted.emision || datosParaValidar.emision;
                            datosParaValidar.tipo = res.data?.data?.tipo || res.data?.tipo || 'C';

                            const nombre = `${extracted.nombre || ''} ${extracted.apellido_paterno || ''} ${extracted.apellido_materno || ''}`.trim();
                            
                            if (nombre) workingData.nombreCompleto = nombre;
                            if (extracted.curp) workingData.curp = extracted.curp;

                            // 📅 APLICAMOS FIX FECHA (DD/MM/YYYY -> YYYY-MM-DD)
                            if (extracted.fecha_nacimiento) {
                                workingData.fechaNacimiento = formatDateForInput(extracted.fecha_nacimiento);
                            }
                            
                            const calle = extracted.calle_numero || extracted.calle || '';
                            const col = extracted.colonia || '';
                            const cp = extracted.codigo_postal || extracted.cp || '';
                            
                            if (calle || col) {
                                workingData.domicilio = `${calle}, ${col}`.trim();
                                workingData.colonia = col;
                                workingData.municipio = extracted.municipio || '';
                                workingData.estado = extracted.estado || '';
                                workingData.cp = cp;
                                workingData.codigoPostal = cp;
                            }
                            
                            workingData.identificacionOficialTipo = 'INE';
                            workingData.identificacionOficialNumero = datosParaValidar.claveElector;

                            onFormChange(workingData);
                        }
                    } catch (e) { console.error("Error OCR Frente", e); }
                }

                if (faltaReverso && files.back) {
                    try {
                        const base64 = await fileToBase64(files.back);
                        const res = await extractFromImage(base64, 'reverso', tenantId);
                        const extracted = res.data?.data?.ocr || res.data?.ocr;
                        
                        if (res.status === 'success' && extracted) {
                            const rawOcr = extracted.ocr || extracted.id_mex || extracted.mrz || '';
                            const rawCic = extracted.cic || ''; 
                            datosParaValidar.ocr = rawOcr || datosParaValidar.ocr;
                            datosParaValidar.cic = rawCic || datosParaValidar.cic;
                        }
                    } catch (e) { console.error("Error OCR Reverso", e); }
                }
                setIneDetails(datosParaValidar);
            }

            // 2. VALIDACIÓN INE
            setStatusIne('validating');
            setStatusMessage("🚀 Validando Identidad...");

            if (!datosParaValidar.claveElector || (!datosParaValidar.ocr && !datosParaValidar.cic)) {
                setStatusIne('idle'); 
                alert("⚠️ Faltan datos clave (CIC/OCR).");
                return;
            }

            let tipoFinal = datosParaValidar.tipo;
            const anioEmision = parseInt(datosParaValidar.emision || "0");
            if (anioEmision >= 2019 && ['A', 'B', 'C'].includes(tipoFinal)) tipoFinal = 'H'; 
            else if (anioEmision >= 2014 && ['A', 'B', 'C'].includes(tipoFinal)) tipoFinal = 'E'; 

            const payloadIne: any = {
                tipo_identificacion: tipoFinal,
                clave_de_elector: datosParaValidar.claveElector,
                numero_de_emision: datosParaValidar.emision
            };
            const ocrLimpio = datosParaValidar.ocr ? datosParaValidar.ocr.replace(/\D/g, '') : '';
            if (ocrLimpio.length === 13) payloadIne.ocr = ocrLimpio;

            if (['E', 'F', 'G', 'H'].includes(tipoFinal)) {
                let cicFinal = datosParaValidar.cic ? datosParaValidar.cic.replace(/\D/g, '') : '';
                let idCiudadanoFinal = "";
                if (datosParaValidar.ocr && !payloadIne.ocr) {
                    const rescatados = parseMrz(datosParaValidar.ocr);
                    if (rescatados) {
                        if (!cicFinal) cicFinal = rescatados.cic;
                        payloadIne.ocr = rescatados.ocrNumber;
                        idCiudadanoFinal = rescatados.identificador;
                    }
                }
                if (cicFinal) payloadIne.cic = cicFinal;
                if (idCiudadanoFinal) payloadIne.identificador_del_ciudadano = idCiudadanoFinal;
                else if (cicFinal) payloadIne.identificador_del_ciudadano = cicFinal; 
            } else if (tipoFinal === 'C' && !payloadIne.ocr) {
                 throw new Error("Para Modelo C, el OCR de 13 dígitos es obligatorio.");
            }
            if ((['E', 'F', 'G', 'H'].includes(tipoFinal) && !payloadIne.cic) || !payloadIne.clave_de_elector) {
                 throw new Error(`Faltan datos obligatorios para el modelo ${tipoFinal}.`);
            }

            // --- EJECUCIÓN PARALELA ---
            const inePromise = validateIneData(payloadIne, entityIdForDb, tenantId);

            const nombreRaw = workingData.nombreCompleto || "";
            const nombreParaPld = cleanNameForNufi(nombreRaw); 
            
            let pldPromise = null;
            if (nombreParaPld && nombreParaPld.length >= 3) {
                console.log(`⚡️ PLD Auto: Buscando "${nombreParaPld}"`);
                pldPromise = checkBlacklist(nombreParaPld, entityIdForDb, tenantId);
            }

            const resVigencia = await inePromise;
            const dataVigencia = Array.isArray(resVigencia.data) ? resVigencia.data[0] : resVigencia.data;
            const esVigente = resVigencia.status === 'Success' && dataVigencia?.activa === true;

            if (!esVigente) {
                setStatusIne('error');
                logToSupabaseAndPersist('INE_CHECK', 'error', resVigencia, workingData);
                const motivo = dataVigencia?.estado || dataVigencia?.information || 'Datos incorrectos o vencida.';
                alert(`❌ ALERTA: La INE no es vigente.\n\n${motivo}`);
            } else {
                 setStatusIne('success');
                 setStatusMessage("✅ Identidad Verificada. Guardando evidencia...");
                 
                 // 📸 SUBIR FOTOS Y GUARDAR LINKS
                 let evidenceUrls: any = {};
                 if (files.front) {
                     const url = await uploadEvidence(files.front, entityIdForStorage, 'frente');
                     if (url) evidenceUrls.frente = url;
                 }
                 if (files.back) {
                     const url = await uploadEvidence(files.back, entityIdForStorage, 'reverso');
                     if (url) evidenceUrls.reverso = url;
                 }

                 const finalIneResponse = { ...resVigencia, evidence_urls: evidenceUrls };

                 // Guardar INE
                 workingData = await logToSupabaseAndPersist('INE_CHECK', 'success', finalIneResponse, workingData);

                 if (pldPromise) {
                     const resPld = await pldPromise;
                     if (resPld.code === 400 || resPld.httpStatusCode === 400) {
                         console.warn("⚠️ Nufi PLD 400. Ignorando.");
                     } else {
                         const hayRiesgo = resPld.data?.has_sanction_match || resPld.data?.has_crimelist_match;
                         workingData = await logToSupabaseAndPersist('PLD_CHECK', hayRiesgo ? 'error' : 'success', resPld, workingData);

                         if (hayRiesgo) {
                            setPldResult({ status: 'risk', msg: 'Riesgo detectado' });
                            alert(`⚠️ ADVERTENCIA PLD: Coincidencias encontradas.`);
                        } else {
                            setPldResult({ status: 'clean', msg: 'Sin antecedentes' });
                        }
                     }
                 }
            }

        } catch (error: any) {
            console.error("Error validación:", error);
            setStatusIne('error');
            alert(`Error: ${error.message}`);
        } finally {
            console.log("🏁 Proceso terminado.");
        }
    };

    // --- MANEJO DE FORMULARIO ---
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

    // --- VALIDACIÓN MANUAL PLD ---
    const ejecutarValidacionListasManual = async () => {
        if (!formData.nombreCompleto || formData.nombreCompleto.length < 3) { alert("Ingresa nombre completo."); return; }
        
        setLoadingPld(true);
        try {
            const tenantId = user?.user_metadata?.tenant_id || "ID-TEMPORAL-PRUEBAS";
            const entityId = (formData as any).id ? String((formData as any).id) : "TEMP-MANUAL";
            
            const nombreLimpio = cleanNameForNufi(formData.nombreCompleto);
            console.log(`🔎 Validando manualmente: "${nombreLimpio}"`);

            if (nombreLimpio.length < 3) {
                alert("❌ El nombre es demasiado corto.");
                setLoadingPld(false);
                return;
            }

            const resPld = await checkBlacklist(nombreLimpio, entityId, tenantId);
            
            if (resPld.code === 400 || resPld.httpStatusCode === 400) {
                alert("❌ Error de Formato (400): La API rechazó el nombre.");
                return;
            }

            const hayRiesgo = resPld.data?.has_sanction_match || resPld.data?.has_crimelist_match;
            
            logToSupabaseAndPersist('PLD_CHECK', hayRiesgo ? 'error' : 'success', resPld, formData);

            if (hayRiesgo) {
                setPldResult({ status: 'risk', msg: 'Riesgo detectado' });
                alert(`⚠️ ALERTA: ${formData.nombreCompleto} aparece en listas de riesgo.`);
            } else {
                setPldResult({ status: 'clean', msg: 'Sin antecedentes' });
                alert(`✅ APROBADO: ${formData.nombreCompleto} no está en listas negras.`);
            }

        } catch (error) { 
            console.error(error); 
            alert("Error de conexión con servicio PLD."); 
        } finally { 
            setLoadingPld(false); 
        }
    };

    return (
        <>
            <DeleteConfirmationModal 
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleResetValidation}
                title="Eliminar Validación"
                message={`¿Estás seguro que deseas eliminar esta validación de ${deleteTarget}? Tendrás que volver a escanear/verificar al cliente.`}
                confirmText="Sí, Eliminar y Resetear"
            />

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

                <div className={`mb-8 border-2 border-dashed rounded-xl p-6 ${statusIne === 'success' ? 'border-green-300 bg-green-50' : 'border-indigo-200 bg-indigo-50/50'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                        <div>
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${statusIne === 'success' ? 'text-green-800' : 'text-indigo-900'}`}>
                                🪪 Paso 1: Identificación (INE)
                            </h3>
                            <p className="text-sm text-indigo-600">
                                {statusIne === 'success' ? 'Validación completada correctamente.' : 'Sube las fotos y nosotros llenaremos el formulario por ti.'}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {statusIne === 'success' ? (
                                <>
                                    <span className="px-4 py-2 bg-white text-green-700 font-bold rounded-lg shadow-sm border border-green-200 flex items-center gap-2">
                                        ✅ INE Verificada
                                    </span>
                                    <button 
                                        type="button"
                                        onClick={() => confirmDelete('INE')}
                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar validación y re-escanear"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={(e) => ejecutarValidacionCompleta(e)} disabled={statusIne === 'scanning' || statusIne === 'validating'} className={`px-4 py-2 rounded-lg font-medium text-white transition-all shadow-md flex items-center gap-2 text-sm ${statusIne === 'error' ? 'bg-red-500 hover:bg-red-600' : (statusIne === 'scanning' || statusIne === 'validating') ? 'bg-indigo-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105'}`}>
                                    {statusIne === 'scanning' && '📷 Procesando...'}
                                    {statusIne === 'validating' && '📡 Validando...'}
                                    {statusIne === 'idle' && '🚀 Procesar y Validar Ahora'}
                                    {statusIne === 'error' && '⚠️ Reintentar'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* NEW SECTION: BIOMETRIC VERIFICATION LINK */}
                    {/* Only show this section if we have an ID for the contact, meaning they are saved */}
                    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-5">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <ShieldCheckIcon className="h-5 w-5 text-iange-orange" />
                            Verificación Biométrica (INE vs Selfie)
                        </h3>
                        
                        {!(formData as any).verification_token ? (
                            <div className="text-sm text-orange-800 bg-orange-100 p-3 rounded">
                                ⚠️ <strong>Guarda el contacto</strong> para generar su enlace de verificación seguro.
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Comparte este enlace seguro con el cliente para que realice la prueba de vida.
                                </p>
                                
                                {/* Current Status */}
                                <div className="flex items-center gap-4 mb-4 text-sm">
                                    <div className={`px-3 py-1 rounded-full font-medium border ${
                                        (formData as any).biometricStatus === 'Verificado' 
                                            ? 'bg-green-100 text-green-800 border-green-200' 
                                            : (formData as any).biometricStatus === 'Rechazado'
                                            ? 'bg-red-100 text-red-800 border-red-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                        Estado: {(formData as any).biometricStatus || 'Pendiente'}
                                    </div>
                                    {(formData as any).biometricScore && (
                                        <span className="text-gray-500">Certeza: {((formData as any).biometricScore * 100).toFixed(1)}%</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            readOnly 
                                            value={`${window.location.origin}/verificar-identidad/${(formData as any).verification_token}`} 
                                            className="w-full pl-3 pr-10 py-2 border rounded-md bg-white text-gray-500 text-sm truncate"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/verificar-identidad/${(formData as any).verification_token}`);
                                                alert("Enlace copiado");
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-iange-orange"
                                            title="Copiar enlace"
                                        >
                                            <ClipboardDocumentCheckIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    
                                    {/* WhatsApp Button */}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const link = `${window.location.origin}/verificar-identidad/${(formData as any).verification_token}`;
                                            const phone = formData.telefono ? formData.telefono.replace(/[^0-9]/g, '') : '';
                                            const text = `Hola ${formData.nombreCompleto ? formData.nombreCompleto.split(' ')[0] : ''}, por seguridad necesitamos validar tu identidad. Por favor entra aquí para tomarte una foto rápida: ${link}`;
                                            if (phone) {
                                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
                                            } else {
                                                alert("No hay teléfono registrado para enviar WhatsApp.");
                                            }
                                        }}
                                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 font-medium transition-colors"
                                    >
                                        <ShareIcon className="h-4 w-4" /> WhatsApp
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {(statusIne === 'scanning' || statusIne === 'validating') && (
                        <div className="mb-4 bg-white px-3 py-2 rounded border border-indigo-100 text-xs text-indigo-600 font-mono animate-pulse">{statusMessage}</div>
                    )}
                    
                    {statusIne !== 'success' && (
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
                    )}

                    <div className={`mt-4 overflow-hidden transition-all duration-300 ${statusIne === 'idle' ? 'max-h-0' : 'max-h-96'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs text-gray-400 uppercase font-bold">Datos Técnicos:</p>
                            {pldResult.status && (
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${pldResult.status === 'clean' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {pldResult.status === 'clean' ? '🛡️ PLD: Limpio' : '⚠️ PLD: Riesgo'}
                                    </span>
                                    <button onClick={() => confirmDelete('PLD')} className="text-gray-400 hover:text-red-500" title="Borrar validación PLD">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
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
                        
                        {pldResult.status ? (
                            <div className="mt-1 flex items-center gap-2">
                                <span className={`text-xs font-bold ${pldResult.status === 'clean' ? 'text-green-600' : 'text-red-600'}`}>
                                    {pldResult.status === 'clean' ? '✅ PLD Verificado' : '⚠️ PLD con Riesgo'}
                                </span>
                            </div>
                        ) : (
                            <button type="button" onClick={ejecutarValidacionListasManual} className="text-xs text-indigo-600 underline mt-1 hover:text-indigo-800">
                                {loadingPld ? 'Consultando...' : '🔍 Verificar manualmente en Listas Negras'}
                            </button>
                        )}
                    </div>
                    <Input label="CURP" name="curp" value={formData.curp} onChange={handleChange} placeholder="Se llena auto." />
                    <Input label="RFC" name="rfc" value={formData.rfc} onChange={handleChange} />
                    <Input label="Fecha nacimiento" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} type="date" />
                    <Input label="Nacionalidad" name="nacionalidad" value={formData.nacionalidad} onChange={handleChange} />
                    <Input label="Domicilio (Calle y Num)" name="domicilio" value={formData.domicilio} onChange={handleChange} placeholder="Calle y Número..." />
                    <Input label="Colonia" name="colonia" value={formData.colonia} onChange={handleChange} />
                    <Input label="Municipio / Alcaldía" name="municipio" value={formData.municipio} onChange={handleChange} />
                    <Input label="Estado" name="estado" value={formData.estado} onChange={handleChange} />
                    <Input label="Código Postal" name="cp" value={formData.cp || formData.codigoPostal || ''} onChange={handleChange} />
                    <Input label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} type="tel"/>
                    <Input label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
                    <Select label="Tipo Identificación" name="identificacionOficialTipo" value={formData.identificacionOficialTipo} onChange={handleChange}><option>INE</option><option>Pasaporte</option><option>Cédula Profesional</option></Select>
                    <Input label="Número de ID" name="identificacionOficialNumero" value={formData.identificacionOficialNumero} onChange={handleChange} placeholder="Clave Elector / Pasaporte" />
                </FormSection>

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
                    {!formData.actuaPorCuentaPropia && <Input label="Nombre completo del Beneficiario Final" name="beneficiarioFinalNombre" value={formData.beneficiarioFinalNombre || ''} onChange={handleChange} fullWidth />}
                </FormSection>
                <FormSection title={`Declaración PEP (Persona Políticamente Expuesta)`}>
                    <Checkbox label={`¿El ${userType}, familiar o asociado cercano es PEP?`} name="esPep" checked={formData.esPep} onChange={handleChange} />
                    {formData.esPep && <><Input label="Nombre del PEP" name="pepNombre" value={formData.pepNombre || ''} onChange={handleChange} /><Input label="Cargo/Función" name="pepCargo" value={formData.pepCargo || ''} onChange={handleChange} /></>}
                </FormSection>

                {!isEmbedded && <div className="flex justify-end mt-8 pt-4 border-t space-x-4"><button type="button" onClick={onCancel} className="bg-gray-200 py-2 px-6 rounded hover:bg-gray-300">Cancelar</button><button type="submit" className="bg-iange-orange text-white py-2 px-6 rounded hover:bg-orange-600">Guardar Expediente</button></div>}
            </form>
        </>
    );
};

export default KycPldForm;