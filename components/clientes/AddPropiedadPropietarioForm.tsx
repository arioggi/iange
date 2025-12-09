import React, { useState, useMemo } from 'react';
import { Propiedad, Propietario, ChecklistStatus, User } from '../../types';
import KycPldForm from './KycPldForm';
import { initialKycState as initialKycPropietarioState } from '../../constants';

declare const jspdf: any;

const TABS = ['Datos de la Propiedad', 'Datos del Propietario'];

const initialChecklist: ChecklistStatus = {
    propiedadRegistrada: false, propietarioRegistrado: false, documentacionCompleta: false, entrevistaPLD: false, propiedadVerificada: false,
    fichaTecnicaGenerada: false, publicadaEnPortales: false, campanasMarketing: false, seguimientoEnCurso: false,
    compradorInteresado: false, documentosCompradorCompletos: false, propiedadSeparada: false, checklistTramitesIniciado: false,
    contratoGenerado: false, firmaCompletada: false, ventaConcluida: false, seguimientoPostventa: false,
};

const initialPropiedadState: Omit<Propiedad, 'id' | 'propietarioId' | 'fecha_captacion' | 'fichaTecnicaPdf' | 'status' | 'fecha_venta'> = {
    calle: '', numero_exterior: '', colonia: '', municipio: '', estado: '', codigo_postal: '', pais: 'México',
    tipo_inmueble: 'Casa', valor_operacion: '', fotos: [],
    terreno_m2: '', construccion_m2: '', recamaras: 0, banos_completos: 0, medios_banos: 0, cochera_autos: 0,
    descripcion_breve: '',
    progreso: 0,
    checklist: initialChecklist,
    fuente_captacion: 'Portal Web',
    asesorId: 0,
    visitas: [],
    comisionOficina: 0,
    comisionAsesor: 0,
    comisionCompartida: 0,
};

interface AddPropiedadPropietarioFormProps {
    onSave: (propiedad: Omit<Propiedad, 'id' | 'propietarioId' | 'fecha_captacion' | 'status' | 'fecha_venta'>, propietario: Omit<Propietario, 'id'>) => void;
    onCancel: () => void;
    asesores: User[];
}

// --- FUNCIONES AUXILIARES ---
const PhotoIcon = () => (
    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const generatePdf = async (propiedad: any, fotos: File[]): Promise<string> => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - (margin * 2);

    const formatCurrency = (value?: string) => {
        if (!value) return 'N/A';
        const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
        if (isNaN(number)) return 'N/A';
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(number);
    };

    // --- Page 1: Cover Photo ---
    if (fotos[0]) {
        const fotoDataUrl = await fileToDataUrl(fotos[0]);
        const imgProps = doc.getImageProperties(fotoDataUrl);
        const imgRatio = imgProps.width / imgProps.height;
        let imgWidth = pageWidth;
        let imgHeight = imgWidth / imgRatio;
        
        if (imgHeight < pageHeight) {
            imgHeight = pageHeight;
            imgWidth = imgHeight * imgRatio;
        }
        const xOffset = (pageWidth - imgWidth) / 2;
        const yOffset = (pageHeight - imgHeight) / 2;
        doc.addImage(fotoDataUrl, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
    } else {
        doc.setFontSize(20);
        doc.text("Sin Imagen de Portada", pageWidth / 2, pageHeight / 2, { align: 'center' });
    }

    // --- Page 2: Details and Description ---
    doc.addPage();
    let y = margin + 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`${propiedad.tipo_inmueble} en Venta`.toUpperCase(), margin, y);
    y += 8;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);
    const addressLines = doc.splitTextToSize(`${propiedad.calle} ${propiedad.numero_exterior}`, usableWidth);
    doc.text(addressLines, margin, y);
    y += (addressLines.length * 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text(`${propiedad.colonia}, ${propiedad.municipio}, ${propiedad.estado}`, margin, y);
    y += 15;
    
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text("Detalles de la Propiedad", margin, y);
    y += 10;
    
    const details = [
        { label: "Valor de Operación", value: formatCurrency(propiedad.valor_operacion) },
        { label: "Terreno", value: propiedad.terreno_m2 ? `${propiedad.terreno_m2} m²` : 'N/A' },
        { label: "Construcción", value: propiedad.construccion_m2 ? `${propiedad.construccion_m2} m²` : 'N/A' },
        { label: "Recámaras", value: propiedad.recamaras || 'N/A' },
        { label: "Baños Completos", value: propiedad.banos_completos || 'N/A' },
        { label: "Medios Baños", value: propiedad.medios_banos || 'N/A' },
        { label: "Cochera", value: propiedad.cochera_autos ? `${propiedad.cochera_autos} autos` : 'N/A' },
    ];

    const col1X = margin;
    const col2X = pageWidth / 2;
    let initialY = y;
    let currentY = initialY;
    let col = 1;

    details.forEach(detail => {
        let x = col === 1 ? col1X : col2X;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(detail.label, x, currentY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text(String(detail.value), x, currentY + 7);
        
        if (col === 1) { col = 2; } else { col = 1; currentY += 20; }
    });

    y = currentY > initialY ? currentY : initialY + 20;

    if (propiedad.descripcion_breve) {
        if (y > pageHeight - 60) {
             doc.addPage();
             y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(30, 30, 30);
        doc.text("Descripción", margin, y);
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(propiedad.descripcion_breve, usableWidth);
        doc.text(descLines, margin, y);
    }

    return doc.output('datauristring');
};

const AddPropiedadPropietarioForm: React.FC<AddPropiedadPropietarioFormProps> = ({ onSave, onCancel, asesores }) => {
    const [activeTab, setActiveTab] = useState(TABS[0]);
    const [propiedadData, setPropiedadData] = useState(initialPropiedadState);
    const [propietarioData, setPropietarioData] = useState<Omit<Propietario, 'id'>>(initialKycPropietarioState);
    const [photos, setPhotos] = useState<File[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const handlePropiedadChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // El campo 'asesorId' no debe estar en numericFields
        const numericFields = [
            'recamaras', 'banos_completos', 'medios_banos', 'cochera_autos',
            'comisionOficina', 'comisionAsesor', 'comisionCompartida'
        ];

        if (numericFields.includes(name)) {
            const numericValue = parseFloat(value);
            setPropiedadData(prev => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
        } else {
            setPropiedadData(prev => ({ ...prev, [name]: value }));
        }
    };

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

    const comisionTotal = useMemo(() => {
        const oficina = Number(propiedadData.comisionOficina) || 0;
        const asesor = Number(propiedadData.comisionAsesor) || 0;
        const compartida = Number(propiedadData.comisionCompartida) || 0;
        return oficina + asesor + compartida;
    }, [propiedadData.comisionOficina, propiedadData.comisionAsesor, propiedadData.comisionCompartida]);

    const handleSavePropietario = () => {
        setActiveTab(TABS[0]);
    };
    
    const isPropietarioDataComplete = !!(propietarioData.nombreCompleto && propietarioData.email);
    const arePhotosSufficient = photos.length >= 1;

    const handleFinalSave = async () => {
        if (!arePhotosSufficient) {
            alert('Por favor, sube un mínimo de 1 fotografía.');
            setActiveTab(TABS[0]);
            return;
        }
        if (!propiedadData.asesorId || propiedadData.asesorId === 0) {
            alert('Por favor, asigna un asesor a la propiedad.');
            setActiveTab(TABS[0]);
            return;
        }
        if (propiedadData.calle && isPropietarioDataComplete) {
            setIsSaving(true);
            try {
                const pdfDataUrl = await generatePdf(propiedadData, photos);
                const finalPropiedadData = { ...propiedadData, fotos: photos, fichaTecnicaPdf: pdfDataUrl };
                onSave(finalPropiedadData, propietarioData);
            } catch (error) {
                console.error("Error generando PDF:", error);
                alert("Hubo un error al generar la ficha técnica. La propiedad se guardará sin ella.");
                const finalPropiedadData = { ...propiedadData, fotos: photos, fichaTecnicaPdf: '' };
                onSave(finalPropiedadData, propietarioData);
            } finally {
                setIsSaving(false);
            }
        } else {
             let message = 'Por favor, completa los siguientes campos antes de guardar:\n';
            if (!propiedadData.calle) message += '- Calle de la propiedad (en "Datos de la Propiedad")\n';
            if (!isPropietarioDataComplete) message += '- Nombre y email del propietario (en "Datos del Propietario")\n';
            alert(message);
        }
    };

    return (
        <div>
            {/* Sección de pestañas sin padding */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${
                                activeTab === tab
                                    ? 'border-iange-orange text-iange-orange'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab} {tab === 'Datos del Propietario' && isPropietarioDataComplete && '✓'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenedor principal del contenido con scrollbar y padding horizontal uniforme (px-4) */}
            <div className="max-h-[70vh] overflow-y-auto px-4 custom-scrollbar">

                {activeTab === 'Datos de la Propiedad' && (
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dirección del Inmueble</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                <label htmlFor="calle" className="block text-sm font-medium text-gray-700 mb-1">Calle</label>
                                <input id="calle" name="calle" value={propiedadData.calle} onChange={handlePropiedadChange} placeholder="Ej. Av. Fundidora" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="numero_exterior" className="block text-sm font-medium text-gray-700 mb-1">Número exterior</label>
                                    <input id="numero_exterior" name="numero_exterior" value={propiedadData.numero_exterior || ''} onChange={handlePropiedadChange} placeholder="Ej. 501" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="colonia" className="block text-sm font-medium text-gray-700 mb-1">Colonia</label>
                                    <input id="colonia" name="colonia" value={propiedadData.colonia} onChange={handlePropiedadChange} placeholder="Ej. Obrera" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="municipio" className="block text-sm font-medium text-gray-700 mb-1">Municipio / Alcaldía</label>
                                    <input id="municipio" name="municipio" value={propiedadData.municipio} onChange={handlePropiedadChange} placeholder="Ej. Monterrey" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <input id="estado" name="estado" value={propiedadData.estado} onChange={handlePropiedadChange} placeholder="Ej. Nuevo León" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="codigo_postal" className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                                    <input id="codigo_postal" name="codigo_postal" value={propiedadData.codigo_postal} onChange={handlePropiedadChange} placeholder="Ej. 64010" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                            </div>
                        </section>

                        {/* Sección de Dimensiones */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Dimensiones</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                    <label htmlFor="terreno_m2" className="block text-sm font-medium text-gray-700 mb-1">Terreno (m²)</label>
                                    <input id="terreno_m2" name="terreno_m2" value={propiedadData.terreno_m2} onChange={handlePropiedadChange} placeholder="Ej. 200" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            <div>
                                    <label htmlFor="construccion_m2" className="block text-sm font-medium text-gray-700 mb-1">Construcción (m²)</label>
                                    <input id="construccion_m2" name="construccion_m2" value={propiedadData.construccion_m2} onChange={handlePropiedadChange} placeholder="Ej. 180" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            </div>
                        </section>
                        
                        {/* Sección de Distribución */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Distribución</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                    <label htmlFor="recamaras" className="block text-sm font-medium text-gray-700 mb-1">Recámaras</label>
                                    <input id="recamaras" name="recamaras" type="number" min="0" value={propiedadData.recamaras} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            <div>
                                    <label htmlFor="banos_completos" className="block text-sm font-medium text-gray-700 mb-1">Baños completos</label>
                                    <input id="banos_completos" name="banos_completos" type="number" min="0" value={propiedadData.banos_completos} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            <div>
                                    <label htmlFor="medios_banos" className="block text-sm font-medium text-gray-700 mb-1">Medios baños</label>
                                    <input id="medios_banos" name="medios_banos" type="number" min="0" value={propiedadData.medios_banos} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            <div>
                                    <label htmlFor="cochera_autos" className="block text-sm font-medium text-gray-700 mb-1">Cochera (autos)</label>
                                    <input id="cochera_autos" name="cochera_autos" type="number" min="0" value={propiedadData.cochera_autos} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                            </div>
                            </div>
                        </section>
                        
                        {/* Sección de Comisión */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Comisión</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                <div>
                                    <label htmlFor="comisionOficina" className="block text-sm font-medium text-gray-700 mb-1">Comisión Oficina</label>
                                    <input id="comisionOficina" name="comisionOficina" type="number" min="0" value={propiedadData.comisionOficina} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="comisionAsesor" className="block text-sm font-medium text-gray-700 mb-1">Comisión Asesor/a</label>
                                    <input id="comisionAsesor" name="comisionAsesor" type="number" min="0" value={propiedadData.comisionAsesor} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label htmlFor="comisionCompartida" className="block text-sm font-medium text-gray-700 mb-1">Comisión Compartida</label>
                                    <input id="comisionCompartida" name="comisionCompartida" type="number" min="0" value={propiedadData.comisionCompartida} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Comisión Total</label>
                                    <p className="w-full px-3 py-2 bg-gray-100 border rounded-md text-gray-800 font-bold">
                                        {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(comisionTotal)}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Sección de Detalles Adicionales */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Detalles Adicionales</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="descripcion_breve" className="block text-sm font-medium text-gray-700 mb-1">Descripción breve (para ficha técnica)</label>
                                    <textarea id="descripcion_breve" name="descripcion_breve" value={propiedadData.descripcion_breve} onChange={handlePropiedadChange} rows={3} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="valor_operacion" className="block text-sm font-medium text-gray-700 mb-1">Valor de la operación (MXN)</label>
                                        <input id="valor_operacion" name="valor_operacion" value={propiedadData.valor_operacion} onChange={handlePropiedadChange} placeholder="Ej. 2500000" className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="fuente_captacion" className="block text-sm font-medium text-gray-700 mb-1">Fuente de Captación</label>
                                        <select id="fuente_captacion" name="fuente_captacion" value={propiedadData.fuente_captacion} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md">
                                            <option>Portal Web</option>
                                            <option>Recomendación</option>
                                            <option>Redes Sociales</option>
                                            <option>Otro</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="tipo_inmueble" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Inmueble</label>
                                        <select id="tipo_inmueble" name="tipo_inmueble" value={propiedadData.tipo_inmueble} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md">
                                            <option>Casa</option>
                                            <option>Departamento</option>
                                            <option>Terreno</option>
                                            <option>Local Comercial</option>
                                            <option>Oficina</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="asesorId" className="block text-sm font-medium text-gray-700 mb-1">Asesor/a Asignado/a</label>
                                        <select id="asesorId" name="asesorId" value={propiedadData.asesorId} onChange={handlePropiedadChange} className="w-full px-3 py-2 bg-gray-50 border rounded-md">
                                            <option value={0}>Seleccione un asesor</option>
                                            {asesores.map(asesor => (
                                                <option key={asesor.id} value={asesor.id}>{asesor.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Sección de Fotos (Galería/Grid) */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Fotografías del Inmueble</h3>
                            <p className="text-sm text-gray-600 my-2">La primera foto será la portada. Sube un mínimo de 1. Sugerimos 12 para una mejor presentación.</p>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <PhotoIcon />
                                    <div className="flex text-sm text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-iange-orange hover:text-orange-500 focus-within:outline-none">
                                            <span>Selecciona tus archivos</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                                        </label>
                                        <p className="pl-1">o arrástralos aquí</p>
                                    </div>
                                    <p className="text-xs text-gray-500">Imágenes hasta 5MB</p>
                                </div>
                            </div>
                        {photos.length > 0 && (
                            <div className="mt-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-2">
                                    {photos.map((file, index) => (
                                        <div key={URL.createObjectURL(file)} className={`relative group ${index === 0 ? 'border-2 border-iange-orange rounded-md p-1' : ''}`}>
                                            <img src={URL.createObjectURL(file)} alt={`preview ${index}`} className="h-24 w-full object-cover rounded-md" />
                                            {index === 0 && <div className="absolute top-0 left-0 bg-iange-orange text-white text-xs font-bold px-1 rounded-br-md">Portada</div>}
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-opacity">
                                                <button onClick={() => removePhoto(index)} className="text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </section>
                    </div>
                )}

                {activeTab === 'Datos del Propietario' && (
                    <KycPldForm 
                        formData={propietarioData}
                        onFormChange={setPropietarioData}
                        onSave={handleSavePropietario}
                        onCancel={()=>{}} 
                        userType="Propietario" 
                        isEmbedded={true}
                    />
                )}
            </div>
            {/* Fin Contenedor principal del contenido */}

            <div className="flex justify-end mt-8 space-x-4 pt-4 border-t px-4">
                 <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-md hover:bg-gray-300">
                    Cancelar
                </button>
                <button 
                    type="button" 
                    onClick={handleFinalSave} 
                    className="bg-iange-orange text-white py-2 px-6 rounded-md hover:bg-orange-600 disabled:bg-gray-400"
                    disabled={isSaving}
                >
                    {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    );
};

export default AddPropiedadPropietarioForm;