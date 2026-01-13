import React, { useState, useEffect, useMemo } from 'react';
import { Propiedad, Propietario, User, ChecklistStatus, KycData } from '../../types';
import { FLUJO_PROGRESO, initialKycState } from '../../constants';
import KycPldForm from './KycPldForm';
import PhotoSorter from '../ui/PhotoSorter';
import { CurrencyInput } from '../ui/CurrencyInput';
import { createContact } from '../../Services/api';
import { useAuth } from '../../authContext';

// === COMPONENTES REUSABLES ===
const LabeledInput: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void; type?: string; placeholder?: string; }> = ({ label, name, value, onChange, type = 'text', placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input 
            type={type} 
            name={name} 
            id={name} 
            value={value || ''} 
            onChange={onChange} 
            placeholder={placeholder} 
            className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500 focus:ring-iange-orange focus:border-iange-orange sm:text-sm" 
        />
    </div>
);

const LabeledSelect: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }> = ({ label, name, value, onChange, children }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select 
            name={name} 
            id={name} 
            value={String(value || '')} 
            onChange={onChange} 
            className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500 focus:ring-iange-orange focus:border-iange-orange sm:text-sm"
        >
            {children}
        </select>
    </div>
);

const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);
const calculateProgress = (checklist: ChecklistStatus): number => {
    if (totalChecklistItems === 0) return 0;
    const checkedCount = Object.values(checklist).filter(value => value === true).length;
    return Math.round((checkedCount / totalChecklistItems) * 100);
};

const getStatusFromChecklist = (checklist: ChecklistStatus, compradorId: number | null | undefined): Propiedad['status'] => {
    if (checklist.ventaConcluida) return 'Vendida';
    if (checklist.propiedadSeparada || compradorId) return 'Separada';
    if (checklist.propiedadVerificada) return 'En Promoción';
    return 'Validación Pendiente';
};

const PhotoIcon = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

interface EditPropiedadFormProps {
    propiedad: Propiedad;
    propietario: Propietario;
    onSave: (updatedPropiedad: Propiedad, updatedPropietario?: Propietario | null) => void;
    onCancel: () => void;
    asesores: User[];
    viewMode?: 'progressOnly';
    onNavigateToEdit?: () => void;
}

const TABS = ['Datos de la Propiedad', 'Datos del Propietario', 'Progreso'];

const EditPropiedadForm: React.FC<EditPropiedadFormProps> = ({
    propiedad,
    propietario,
    onSave,
    onCancel,
    asesores,
    viewMode,
    onNavigateToEdit
}) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(viewMode === 'progressOnly' ? TABS[2] : TABS[0]);
    const [editedPropiedad, setEditedPropiedad] = useState<Propiedad>(propiedad);
    
    // Inicialización del propietario
    const [editedPropietario, setEditedPropietario] = useState<Propietario>(
        propietario || { ...initialKycState, id: 0 } as Propietario
    );
    
    // ✅ NUEVO: Estado explícito para omitir (Igual que en AddForm)
    // Se activa por defecto si el ID es 0 o null
    const [omitirPropietario, setOmitirPropietario] = useState(!propietario || propietario.id === 0);
    const [isSaving, setIsSaving] = useState(false);

    const [photos, setPhotos] = useState<Array<File | string>>([
        ...(propiedad.imageUrls || []), 
        ...(propiedad.fotos || []),
    ]);

    useEffect(() => {
        setEditedPropiedad(propiedad);
        if (propietario && propietario.id !== 0) {
            setEditedPropietario(propietario);
            setOmitirPropietario(false);
        } else {
            setEditedPropietario({ ...initialKycState, id: 0 } as Propietario);
            setOmitirPropietario(true);
        }
        
        setPhotos([
            ...(propiedad.imageUrls || []), 
            ...(propiedad.fotos || []), 
        ]);
    }, [propiedad, propietario]);
    
    // --- MANEJO DE FOTOS ---
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];
            for (const file of newFiles as File[]) {
                if (file.size > MAX_SIZE_BYTES) {
                    alert(`El archivo "${file.name}" excede el tamaño máximo de ${MAX_SIZE_MB}MB.`);
                } else {
                    validFiles.push(file);
                }
            }
            setPhotos(prev => [...prev, ...validFiles]); 
        }
    };
    
    const removePhoto = (indexToRemove: number) => {
        setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleReorderPhotos = (newPhotos: Array<File | string>) => {
        setPhotos(newPhotos);
    };

    // --- MANEJO DE INPUTS ---
    const handlePropiedadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const numericFields = ['asesorId', 'recamaras', 'banos_completos', 'medios_banos', 'cochera_autos'];

        if (type === 'checkbox') {
             setEditedPropiedad(prev => ({ ...prev, [name]: checked }));
        } else if (numericFields.includes(name)) {
            const numericValue = parseFloat(value);
            if (name === 'asesorId') {
                 setEditedPropiedad(prev => ({ ...prev, [name]: value === '0' ? 0 : value }));
            } else {
                 setEditedPropiedad(prev => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
            }
        } else {
            setEditedPropiedad(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCurrencyChange = (fieldName: string, value: string) => {
        if (fieldName === 'valor_operacion') {
            setEditedPropiedad(prev => ({ ...prev, [fieldName]: value }));
        } else {
            const numVal = parseFloat(value);
            setEditedPropiedad(prev => ({ ...prev, [fieldName]: isNaN(numVal) ? 0 : numVal }));
        }
    };

    const handlePropietarioChange = (data: KycData) => {
        setEditedPropietario(prev => ({ ...prev, ...data }));
    };

    const handleChecklistChange = (key: keyof ChecklistStatus, checked: boolean) => {
        setEditedPropiedad(prev => {
            let newCompradorId = prev.compradorId;
            if ((key === 'propiedadSeparada' || key === 'ventaConcluida') && !checked) {
                newCompradorId = null; 
            }
            const newChecklist = { ...prev.checklist, [key]: checked };
            const newProgress = calculateProgress(newChecklist);
            const newStatus = getStatusFromChecklist(newChecklist, newCompradorId);
            
            return {
                ...prev,
                checklist: newChecklist,
                progreso: newProgress,
                status: newStatus,
                compradorId: newCompradorId, 
            };
        });
    };

    // ✅ LOGICA DE GUARDADO ESPEJO AL ADDFORM
    const handleFinalSave = async () => {
        setIsSaving(true);
        try {
            const existingImageUrls = photos.filter(f => typeof f === 'string') as string[];
            const newFilesToUpload = photos.filter(f => f instanceof File) as File[];

            // Clones
            let finalPropietario = { ...editedPropietario };
            let finalPropiedad = { ...editedPropiedad };
            
            // Variable final para el padre (null si omitimos, objeto si existe)
            let propietarioParaGuardar: Propietario | null | undefined = finalPropietario;

            // CASO 1: SE MARCÓ OMITIR PROPIETARIO
            if (omitirPropietario) {
                propietarioParaGuardar = null; // Indicamos explícitamente null
                finalPropiedad.propietarioId = null;
                // Ajustamos estatus si es necesario
                if (finalPropiedad.status !== 'Incompleto') {
                     // Opcional: Podrías forzar a 'Incompleto' o dejarlo como está
                }
            } 
            // CASO 2: NO SE OMITIÓ -> Validar y Crear/Actualizar
            else {
                // Validación básica espejo
                if (!finalPropietario.nombreCompleto) {
                    alert("Si desmarcas 'Añadir datos más tarde', debes escribir al menos el nombre del propietario.");
                    setIsSaving(false);
                    return;
                }

                // Si es un propietario nuevo (ID 0) hay que crearlo antes
                if (!finalPropietario.id || finalPropietario.id === 0) {
                    const tenantId = user?.user_metadata?.tenant_id;
                    if (tenantId) {
                        const ownerPayload = { ...finalPropietario };
                        delete (ownerPayload as any).id;

                        const nuevoContactoDb = await createContact(ownerPayload, tenantId, 'propietario');
                        
                        finalPropietario.id = nuevoContactoDb.id;
                        finalPropiedad.propietarioId = nuevoContactoDb.id;
                        propietarioParaGuardar = { ...finalPropietario };

                        if (finalPropiedad.status === 'Incompleto' || finalPropiedad.status === 'Falta Propietario') {
                            finalPropiedad.status = 'En Promoción';
                        }
                    } else {
                         alert("Error de sesión (Tenant ID). Recarga la página.");
                         setIsSaving(false);
                         return;
                    }
                }
                // Si ya tiene ID > 0, se usa propietarioParaGuardar tal cual
            }

            const propiedadParaEnviar = { 
                ...finalPropiedad, 
                fotos: newFilesToUpload,
                imageUrls: existingImageUrls,
            };

            await onSave(propiedadParaEnviar, propietarioParaGuardar);

        } catch (error) {
            console.error("Error en handleFinalSave:", error);
            alert("Hubo un error al guardar. Revisa la consola.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const comisionTotalOperacion = useMemo(() => {
        return (editedPropiedad.comisionCaptacionOficina || 0) + 
               (editedPropiedad.comisionCaptacionAsesor || 0) +
               (editedPropiedad.comisionVentaOficina || 0) + 
               (editedPropiedad.comisionVentaAsesor || 0);
    }, [editedPropiedad]);

    const renderProgressView = () => (
        <div className="space-y-6">
            {FLUJO_PROGRESO.map((etapa) => (
                <section key={etapa.nombre}>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">{etapa.nombre}</h3>
                    <div className="space-y-3">
                        {etapa.items.map((item) => (
                            <label key={item.key} className="flex items-center cursor-pointer p-2 rounded-md hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={!!editedPropiedad.checklist[item.key]}
                                    onChange={(e) => handleChecklistChange(item.key, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-iange-orange focus:ring-iange-orange"
                                />
                                <span className="ml-3 text-sm text-gray-700">{item.label}</span>
                            </label>
                        ))}
                    </div>
                </section>
            ))}
            {viewMode === 'progressOnly' && onNavigateToEdit && (
                <div className="text-center mt-6 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onNavigateToEdit}
                        className="text-sm font-semibold text-iange-orange hover:underline"
                    >
                        Ir a edición completa de propiedad y propietario
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderPropiedadDetailsForm = () => (
        <div className="space-y-6">
            {/* ... (SECCIÓN IDÉNTICA DE DATOS DE PROPIEDAD) ... */}
            <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dirección del Inmueble</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledInput label="Calle" name="calle" value={editedPropiedad.calle} onChange={handlePropiedadChange} placeholder="Ej. Av. Fundidora" />
                    <LabeledInput label="Número exterior" name="numero_exterior" value={editedPropiedad.numero_exterior || ''} onChange={handlePropiedadChange} placeholder="Ej. 501" />
                    <LabeledInput label="Colonia" name="colonia" value={editedPropiedad.colonia} onChange={handlePropiedadChange} placeholder="Ej. Obrera" />
                    <LabeledInput label="Municipio / Alcaldía" name="municipio" value={editedPropiedad.municipio} onChange={handlePropiedadChange} placeholder="Ej. Monterrey" />
                    <LabeledInput label="Estado" name="estado" value={editedPropiedad.estado} onChange={handlePropiedadChange} placeholder="Ej. Nuevo León" />
                    <LabeledInput label="Código Postal" name="codigo_postal" value={editedPropiedad.codigo_postal} onChange={handlePropiedadChange} placeholder="Ej. 64010" />
                </div>
            </section>
             <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dimensiones y Distribución</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <LabeledInput label="Terreno (m²)" name="terreno_m2" value={editedPropiedad.terreno_m2 || ''} onChange={handlePropiedadChange} placeholder="120" />
                    <LabeledInput label="Construcción (m²)" name="construccion_m2" value={editedPropiedad.construccion_m2 || ''} onChange={handlePropiedadChange} placeholder="150" />
                    <LabeledInput label="Recámaras" name="recamaras" type="number" value={editedPropiedad.recamaras || ''} onChange={handlePropiedadChange} placeholder="3" />
                    <LabeledInput label="Baños completos" name="banos_completos" type="number" value={editedPropiedad.banos_completos || ''} onChange={handlePropiedadChange} placeholder="2" />
                    <LabeledInput label="Medios baños" name="medios_banos" type="number" value={editedPropiedad.medios_banos || ''} onChange={handlePropiedadChange} placeholder="1" />
                    <LabeledInput label="Cochera (autos)" name="cochera_autos" type="number" value={editedPropiedad.cochera_autos || ''} onChange={handlePropiedadChange} placeholder="2" />
                </div>
            </section>
            <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Desglose de Comisiones</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-3 uppercase text-sm flex items-center">
                            <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">1</span>
                            Captación (Listing)
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <CurrencyInput
                                    label="Comisión Oficina"
                                    name="comisionCaptacionOficina"
                                    value={editedPropiedad.comisionCaptacionOficina || ''}
                                    onChange={(val) => handleCurrencyChange('comisionCaptacionOficina', val)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <CurrencyInput
                                    label="Comisión Asesor"
                                    name="comisionCaptacionAsesor"
                                    value={editedPropiedad.comisionCaptacionAsesor || ''}
                                    onChange={(val) => handleCurrencyChange('comisionCaptacionAsesor', val)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex items-center pt-2">
                                <input 
                                    type="checkbox" 
                                    id="checkCaptacion" 
                                    name="compartirComisionCaptacion" 
                                    checked={!!editedPropiedad.compartirComisionCaptacion} 
                                    onChange={handlePropiedadChange} 
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                                />
                                <label htmlFor="checkCaptacion" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">¿Comisión Compartida?</label>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h4 className="font-bold text-green-800 mb-3 uppercase text-sm flex items-center">
                            <span className="bg-green-200 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">2</span>
                            Venta (Selling)
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <CurrencyInput
                                    label="Comisión Oficina"
                                    name="comisionVentaOficina"
                                    value={editedPropiedad.comisionVentaOficina || ''}
                                    onChange={(val) => handleCurrencyChange('comisionVentaOficina', val)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <CurrencyInput
                                    label="Comisión Asesor"
                                    name="comisionVentaAsesor"
                                    value={editedPropiedad.comisionVentaAsesor || ''}
                                    onChange={(val) => handleCurrencyChange('comisionVentaAsesor', val)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex items-center pt-2">
                                <input 
                                    type="checkbox" 
                                    id="checkVenta" 
                                    name="compartirComisionVenta" 
                                    checked={!!editedPropiedad.compartirComisionVenta} 
                                    onChange={handlePropiedadChange} 
                                    className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500" 
                                />
                                <label htmlFor="checkVenta" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">¿Comisión Compartida?</label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
             <section>
                 <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Detalles Adicionales</h3>
                <div className="space-y-4">
                    <div className="md:col-span-2">
                         <label htmlFor="descripcion_breve" className="block text-sm font-medium text-gray-700 mb-1">Descripción breve</label>
                         <textarea id="descripcion_breve" name="descripcion_breve" value={editedPropiedad.descripcion_breve || ''} onChange={handlePropiedadChange} rows={3} placeholder="Descripción breve..." className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500 focus:ring-iange-orange focus:border-iange-orange sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CurrencyInput
                            label="Valor de la operación (MXN)"
                            name="valor_operacion"
                            value={editedPropiedad.valor_operacion || ''}
                            onChange={(val) => handleCurrencyChange('valor_operacion', val)}
                            placeholder="2,500,000"
                        />
                         <LabeledSelect label="Asesor/a Asignado/a" name="asesorId" value={editedPropiedad.asesorId} onChange={handlePropiedadChange as any}>
                            <option value={0}>Seleccione un asesor</option>
                            {asesores.map(asesor => (
                                <option key={asesor.id} value={String(asesor.id)}>{asesor.name}</option>
                            ))}
                        </LabeledSelect>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <LabeledSelect 
                            label="Tipo de Operación" 
                            name="tipoOperacion" 
                            value={editedPropiedad.tipoOperacion || 'Venta'} 
                            onChange={handlePropiedadChange as any}
                        >
                            <option value="Venta">Venta</option>
                            <option value="Renta">Renta</option>
                        </LabeledSelect>
                         <LabeledSelect label="Tipo de Inmueble" name="tipo_inmueble" value={editedPropiedad.tipo_inmueble} onChange={handlePropiedadChange as any}>
                            <option>Casa</option>
                            <option>Departamento</option>
                            <option>Terreno</option>
                            <option>Local Comercial</option>
                            <option>Oficina</option>
                        </LabeledSelect>
                         <LabeledSelect label="Fuente de Captación" name="fuente_captacion" value={editedPropiedad.fuente_captacion} onChange={handlePropiedadChange as any}>
                            <option>Portal Web</option>
                            <option>Recomendación</option>
                            <option>Redes Sociales</option>
                            <option>Otro</option>
                        </LabeledSelect>
                    </div>
                </div>
            </section>
             <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Fotografías ({photos.length})</h3>
                <div className="mb-4">
                    <PhotoSorter photos={photos} onChange={handleReorderPhotos} onRemove={removePhoto} />
                </div>
                 <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                    <div className="space-y-1 text-center">
                        <PhotoIcon />
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-iange-orange hover:text-orange-500 focus-within:outline-none">
                                <span>Añadir más fotos</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                            </label>
                             <p className="pl-1">o arrástralas aquí</p>
                        </div>
                         <p className="text-xs text-gray-500">Imágenes hasta 5MB</p>
                    </div>
                </div>
            </section>
        </div>
    );
    
    const renderFullEditViewContent = () => {
        switch (activeTab) {
            case 'Datos de la Propiedad':
                return renderPropiedadDetailsForm();
            case 'Datos del Propietario':
                return (
                    <div className="space-y-4">
                        {/* ✅ CHECKBOX PARA OMITIR (Espejo de AddForm) */}
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4 flex items-start gap-3">
                            <input 
                                type="checkbox" 
                                id="omitirPropietario" 
                                checked={omitirPropietario}
                                onChange={(e) => setOmitirPropietario(e.target.checked)}
                                className="mt-1 h-5 w-5 text-iange-orange border-gray-300 rounded focus:ring-iange-orange"
                            />
                            <div>
                                <label htmlFor="omitirPropietario" className="font-medium text-yellow-800 block cursor-pointer select-none">
                                    Añadir datos del propietario más tarde (Bypass)
                                </label>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Si marcas esta opción, la propiedad quedará sin propietario asignado.
                                </p>
                            </div>
                        </div>

                        {/* Bloqueamos visualmente el form si se omite */}
                        <div className={`transition-opacity duration-300 ${omitirPropietario ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <KycPldForm 
                                formData={editedPropietario} 
                                onFormChange={handlePropietarioChange} 
                                onSave={() => setActiveTab(TABS[0])} 
                                onCancel={() => {}} 
                                userType="Propietario" 
                                isEmbedded={true} 
                            />
                        </div>
                    </div>
                );
            case 'Progreso':
                return renderProgressView();
            default:
                return null;
        }
    };
    
    const renderFullEditView = () => (
        <>
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${activeTab === tab ? 'border-iange-orange text-iange-orange' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>
            {renderFullEditViewContent()}
        </>
    );

    return (
        <div>
            <div className="max-h-[calc(90vh-15rem)] overflow-y-auto px-4 py-4 custom-scrollbar">
                {viewMode === 'progressOnly' ? renderProgressView() : renderFullEditView()}
            </div>
            <div className="flex-shrink-0 flex justify-end mt-6 pt-4 border-t space-x-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300" disabled={isSaving}>
                    Cancelar
                </button>
                <button type="button" onClick={handleFinalSave} className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSaving}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>
        </div>
    );
};

export default EditPropiedadForm;