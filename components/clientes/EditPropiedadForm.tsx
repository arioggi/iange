import React, { useState, useEffect, useMemo } from 'react';
import { Propiedad, Propietario, User, ChecklistStatus, KycData } from '../../types';
import { FLUJO_PROGRESO } from '../../constants';
import KycPldForm from './KycPldForm';
import PhotoSorter from '../ui/PhotoSorter';
// [1] IMPORTAMOS EL COMPONENTE CURRENCY INPUT
import { CurrencyInput } from '../ui/CurrencyInput';

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

// Helper: Calculate progress percentage
const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);
const calculateProgress = (checklist: ChecklistStatus): number => {
    if (totalChecklistItems === 0) return 0;
    const checkedCount = Object.values(checklist).filter(value => value === true).length;
    return Math.round((checkedCount / totalChecklistItems) * 100);
};

// Helper: Determine property status
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
    onSave: (updatedPropiedad: Propiedad, updatedPropietario: Propietario) => void;
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
    const [activeTab, setActiveTab] = useState(viewMode === 'progressOnly' ? TABS[2] : TABS[0]);
    const [editedPropiedad, setEditedPropiedad] = useState<Propiedad>(propiedad);
    const [editedPropietario, setEditedPropietario] = useState<Propietario>(propietario);
    
    const [photos, setPhotos] = useState<Array<File | string>>([
        ...(propiedad.imageUrls || []), 
        ...(propiedad.fotos || []),
    ]);

    useEffect(() => {
        setEditedPropiedad(propiedad);
        setEditedPropietario(propietario);
        setPhotos([
            ...(propiedad.imageUrls || []), 
            ...(propiedad.fotos || []), 
        ]);
    }, [propiedad, propietario]);
    
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

    const handlePropiedadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        const numericFields = [
            'asesorId', 'recamaras', 'banos_completos', 'medios_banos', 'cochera_autos',
            // OJO: 'comisionCaptacionOficina', etc. se manejan en handleCurrencyChange ahora
        ];

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

    // [2] MANEJADOR ESPECIAL PARA INPUTS DE MONEDA
    const handleCurrencyChange = (fieldName: string, value: string) => {
        // 'valor_operacion' es string en tu DB, así que lo guardamos tal cual (limpio de comas)
        if (fieldName === 'valor_operacion') {
            setEditedPropiedad(prev => ({ ...prev, [fieldName]: value }));
        } else {
            // Las comisiones son numéricas, convertimos
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

    const handleFinalSave = () => {
        const existingImageUrls = photos.filter(f => typeof f === 'string') as string[];
        const newFilesToUpload = photos.filter(f => f instanceof File) as File[];

        const finalPropiedad = { 
            ...editedPropiedad, 
            fotos: newFilesToUpload,
            imageUrls: existingImageUrls,
        };
        onSave(finalPropiedad, editedPropietario);
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
                    {/* COLUMNA 1: CAPTACIÓN */}
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
                            <div className="pt-2 border-t border-blue-200 mt-2 flex justify-between items-center">
                                <p className="text-xs text-gray-500">Subtotal Captación</p>
                                <p className="font-bold text-blue-900">
                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((editedPropiedad.comisionCaptacionOficina || 0) + (editedPropiedad.comisionCaptacionAsesor || 0))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA 2: VENTA */}
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
                            <div className="pt-2 border-t border-green-200 mt-2 flex justify-between items-center">
                                <p className="text-xs text-gray-500">Subtotal Venta</p>
                                <p className="font-bold text-green-900">
                                    {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((editedPropiedad.comisionVentaOficina || 0) + (editedPropiedad.comisionVentaAsesor || 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-gray-100 rounded-lg flex justify-between items-center border border-gray-200">
                    <div className="text-xs text-gray-500">
                        * La comisión compartida se restará del ingreso final en reportes.
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-medium text-gray-600 mr-2">COMISIÓN TOTAL OPERACIÓN:</span>
                        <span className="text-xl font-extrabold text-gray-900">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(comisionTotalOperacion)}
                        </span>
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
                        {/* [3] VALOR OPERACIÓN CON CURRENCY INPUT */}
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
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-gray-600 my-2">
                    <strong>Arrastra y suelta</strong> para ordenar. La primera foto es la <strong>PORTADA</strong>. Haz clic en '×' para eliminar.
                </p>
                
                {/* COMPONENTE DRAG & DROP */}
                <div className="mb-4">
                    <PhotoSorter 
                        photos={photos} 
                        onChange={handleReorderPhotos} 
                        onRemove={removePhoto} 
                    />
                </div>
                
                {/* Input de Carga */}
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
                return <KycPldForm formData={editedPropietario} onFormChange={handlePropietarioChange} onSave={() => setActiveTab(TABS[0])} onCancel={() => {}} userType="Propietario" isEmbedded={true} />;
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
            {/* CORRECCIÓN FINAL: Usamos px-4 para mantener el ancho, pero py-4 para dar aire vertical */}
            <div className="max-h-[calc(90vh-15rem)] overflow-y-auto px-4 py-4 custom-scrollbar">
                {viewMode === 'progressOnly' ? renderProgressView() : renderFullEditView()}
            </div>
            <div className="flex-shrink-0 flex justify-end mt-6 pt-4 border-t space-x-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300">
                    Cancelar
                </button>
                <button type="button" onClick={handleFinalSave} className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600">
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
};

export default EditPropiedadForm;