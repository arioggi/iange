import React, { useState, useEffect, useMemo } from 'react';
import { Propiedad, Propietario, User, ChecklistStatus, KycData } from '../../types';
import { FLUJO_PROGRESO } from '../../constants';
import KycPldForm from './KycPldForm';

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
    const [photos, setPhotos] = useState<File[]>(propiedad.fotos || []);

    useEffect(() => {
        setEditedPropiedad(propiedad);
        setEditedPropietario(propietario);
        setPhotos(propiedad.fotos || []);
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
            
            setPhotos(prev => [...prev, ...validFiles]);
        }
    };
    
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
            setEditedPropiedad(prev => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
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
        const finalPropiedad = { ...editedPropiedad, fotos: photos };
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
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dirección</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="calle" value={editedPropiedad.calle} onChange={handlePropiedadChange} placeholder="Calle" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="numero_exterior" value={editedPropiedad.numero_exterior || ''} onChange={handlePropiedadChange} placeholder="Número exterior" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="colonia" value={editedPropiedad.colonia} onChange={handlePropiedadChange} placeholder="Colonia" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="municipio" value={editedPropiedad.municipio} onChange={handlePropiedadChange} placeholder="Municipio" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="estado" value={editedPropiedad.estado} onChange={handlePropiedadChange} placeholder="Estado" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="codigo_postal" value={editedPropiedad.codigo_postal} onChange={handlePropiedadChange} placeholder="Código Postal" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                </div>
            </section>
            {/* Dimensions & Distribution */}
             <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dimensiones y Distribución</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <input name="terreno_m2" value={editedPropiedad.terreno_m2 || ''} onChange={handlePropiedadChange} placeholder="Terreno m²" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="construccion_m2" value={editedPropiedad.construccion_m2 || ''} onChange={handlePropiedadChange} placeholder="Construcción m²" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="recamaras" type="number" min="0" value={editedPropiedad.recamaras || ''} onChange={handlePropiedadChange} placeholder="Recámaras" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="banos_completos" type="number" min="0" value={editedPropiedad.banos_completos || ''} onChange={handlePropiedadChange} placeholder="Baños completos" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="medios_banos" type="number" min="0" value={editedPropiedad.medios_banos || ''} onChange={handlePropiedadChange} placeholder="Medios baños" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="cochera_autos" type="number" min="0" value={editedPropiedad.cochera_autos || ''} onChange={handlePropiedadChange} placeholder="Cochera (autos)" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                </div>
            </section>
            {/* Commission */}
            <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Comisión</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <input name="comisionOficina" type="number" min="0" value={editedPropiedad.comisionOficina || ''} onChange={handlePropiedadChange} placeholder="Comisión Oficina" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="comisionAsesor" type="number" min="0" value={editedPropiedad.comisionAsesor || ''} onChange={handlePropiedadChange} placeholder="Comisión Asesor/a" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <input name="comisionCompartida" type="number" min="0" value={editedPropiedad.comisionCompartida || ''} onChange={handlePropiedadChange} placeholder="Comisión Compartida" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
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
                    <textarea name="descripcion_breve" value={editedPropiedad.descripcion_breve || ''} onChange={handlePropiedadChange} rows={3} placeholder="Descripción breve..." className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input name="valor_operacion" value={editedPropiedad.valor_operacion || ''} onChange={handlePropiedadChange} placeholder="Valor de operación (MXN)" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                         <select name="asesorId" value={editedPropiedad.asesorId} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md">
                            <option value={0}>Seleccione un asesor</option>
                            {asesores.map(asesor => (
                                <option key={asesor.id} value={asesor.id}>{asesor.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>
            {/* Photos */}
             <section>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Fotografías</h3>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <PhotoIcon />
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-iange-orange hover:text-orange-500">
                            <span>Añadir fotos</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                        </label>
                    </div>
                </div>
             {photos.length > 0 && (
                <div className="mt-4">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-2">
                        {photos.map((file, index) => (
                            <div key={index} className={`relative group ${index === 0 ? 'border-2 border-iange-orange p-1 rounded-md' : ''}`}>
                                <img src={URL.createObjectURL(file)} alt={`preview ${index}`} className="h-24 w-full object-cover rounded-md" />
                                {index === 0 && <div className="absolute top-0 left-0 bg-iange-orange text-white text-xs px-1 rounded-br-md">Portada</div>}
                                <button onClick={() => removePhoto(index)} className="absolute top-0 right-0 m-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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