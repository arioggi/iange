import React, { useState, useEffect, useMemo } from 'react';
import { Propiedad, Propietario, User, ChecklistStatus, KycData } from '../../types';
import { FLUJO_PROGRESO } from '../../constants';
import KycPldForm from './KycPldForm';

// === COMPONENTES REUSABLES AÑADIDOS/MEJORADOS ===

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

// Helper: Calculate progress percentage from checklist status
const totalChecklistItems = FLUJO_PROGRESO.reduce((acc, etapa) => acc + etapa.items.length, 0);
const calculateProgress = (checklist: ChecklistStatus): number => {
    if (totalChecklistItems === 0) return 0;
    const checkedCount = Object.values(checklist).filter(value => value === true).length;
    return Math.round((checkedCount / totalChecklistItems) * 100);
};

// Helper: Determine property status from checklist and buyer info
const getStatusFromChecklist = (checklist: ChecklistStatus, compradorId: number | null | undefined): Propiedad['status'] => {
    if (checklist.ventaConcluida) return 'Vendida';
    if (checklist.propiedadSeparada || compradorId) return 'Separada';
    if (checklist.propiedadVerificada) return 'En Promoción';
    return 'Validación Pendiente';
};

// Photo Icon for upload area
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
    
    // Inicializar fotos con la combinación de URLs existentes y fotos locales
    const [photos, setPhotos] = useState<Array<File | string>>([
        ...(propiedad.imageUrls || []), 
        ...(propiedad.fotos || []),
    ]);

    useEffect(() => {
        setEditedPropiedad(propiedad);
        setEditedPropietario(propietario);
        
        // Sincronizar el estado 'photos' con las URLs y objetos File al cargar
        setPhotos([
            ...(propiedad.imageUrls || []), 
            ...(propiedad.fotos || []), 
        ]);
    }, [propiedad, propietario]);
    
    // --- Photo Management ---
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
            
            // Añadimos solo los nuevos objetos File al estado existente
            setPhotos(prev => [...prev, ...validFiles]); 
        }
    };
    
    // Función para eliminar fotos
    const removePhoto = (indexToRemove: number) => {
        setPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // --- State Handlers ---
    const handlePropiedadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const numericFields = [
            'asesorId', 'recamaras', 'banos_completos', 'medios_banos', 'cochera_autos',
            'comisionOficina', 'comisionAsesor', 'comisionCompartida'
        ];

        if (numericFields.includes(name)) {
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

    const handlePropietarioChange = (data: KycData) => {
        setEditedPropietario(prev => ({ ...prev, ...data }));
    };

    const handleChecklistChange = (key: keyof ChecklistStatus, checked: boolean) => {
        setEditedPropiedad(prev => {
            const newChecklist = { ...prev.checklist, [key]: checked };
            const newProgress = calculateProgress(newChecklist);
            const newStatus = getStatusFromChecklist(newChecklist, prev.compradorId);
            return {
                ...prev,
                checklist: newChecklist,
                progreso: newProgress,
                status: newStatus,
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
    
    const comisionTotal = useMemo(() => {
        const oficina = Number(editedPropiedad.comisionOficina) || 0;
        const asesor = Number(editedPropiedad.comisionAsesor) || 0;
        const compartida = Number(editedPropiedad.comisionCompartida) || 0;
        return oficina + asesor + compartida;
    }, [editedPropiedad.comisionOficina, editedPropiedad.comisionAsesor, editedPropiedad.comisionCompartida]);

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
            {/* Address */}
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
            {/* Dimensions & Distribution */}
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
            {/* Commission */}
            <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Comisión</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <LabeledInput label="Comisión Oficina" name="comisionOficina" type="number" value={editedPropiedad.comisionOficina || ''} onChange={handlePropiedadChange} placeholder="25000" />
                    <LabeledInput label="Comisión Asesor/a" name="comisionAsesor" type="number" value={editedPropiedad.comisionAsesor || ''} onChange={handlePropiedadChange} placeholder="25000" />
                    <LabeledInput label="Comisión Compartida" name="comisionCompartida" type="number" value={editedPropiedad.comisionCompartida || ''} onChange={handlePropiedadChange} placeholder="50000" />
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                        <p className="w-full px-3 py-2 bg-gray-100 border rounded-md text-gray-800 font-bold">
                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(comisionTotal)}
                        </p>
                    </div>
                </div>
            </section>
            {/* Details */}
             <section>
                 <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Detalles Adicionales</h3>
                <div className="space-y-4">
                    <div className="md:col-span-2">
                         <label htmlFor="descripcion_breve" className="block text-sm font-medium text-gray-700 mb-1">Descripción breve</label>
                         <textarea id="descripcion_breve" name="descripcion_breve" value={editedPropiedad.descripcion_breve || ''} onChange={handlePropiedadChange} rows={3} placeholder="Descripción breve..." className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500 focus:ring-iange-orange focus:border-iange-orange sm:text-sm" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <LabeledInput label="Valor de la operación (MXN)" name="valor_operacion" value={editedPropiedad.valor_operacion || ''} onChange={handlePropiedadChange} placeholder="2,500,000" />
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
            
            {/* Photos (Galería Interactiva con Eliminación Mejorada) */}
             <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Fotografías ({photos.length})</h3>
                <p className="text-sm text-gray-600 my-2">La primera foto será la portada. Haz clic en '×' para eliminar una foto (el cambio se guardará al presionar "Guardar Cambios").</p>
                
                {/* Visualización de Galería Horizontal */}
                {photos.length > 0 && (
                    <div className="flex space-x-3 overflow-x-auto pb-4 custom-scrollbar">
                        {photos.map((file, index) => {
                             const imageUrl = file instanceof File ? URL.createObjectURL(file) : file;
                             return (
                                 <div 
                                     key={index} 
                                     className={`relative flex-shrink-0 w-32 h-24 rounded-md overflow-hidden group border ${index === 0 ? 'border-2 border-iange-orange' : 'border-gray-200'}`}
                                 >
                                    <img src={imageUrl} alt={`preview ${index}`} className="w-full h-full object-cover" />
                                    {index === 0 && <div className="absolute top-0 left-0 bg-iange-orange text-white text-xs font-bold px-1 rounded-br-md">Portada</div>}
                                    
                                    {/* Botón de Eliminar CORREGIDO: Gris, más grande y centrado */}
                                    <button 
                                        type="button"
                                        onClick={() => removePhoto(index)} 
                                        className="absolute top-1 right-1 bg-gray-500 text-white rounded-full h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700 z-10"
                                        title="Eliminar foto"
                                    >
                                        <span className="text-xl font-bold leading-none pb-1">&times;</span>
                                    </button>
                                 </div>
                             );
                        })}
                    </div>
                )}
                
                {/* Zona de Arrastrar y Soltar para Añadir */}
                 <div className="mt-4 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <PhotoIcon />
                        <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-iange-orange hover:text-orange-500 focus-within:outline-none">
                                <span>Añadir fotos</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                            </label>
                             <p className="pl-1">o arrástralos aquí</p>
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
            <div className="max-h-[calc(90vh-15rem)] overflow-y-auto pr-4 custom-scrollbar">
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