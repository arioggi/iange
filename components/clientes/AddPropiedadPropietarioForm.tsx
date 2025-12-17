import React, { useState, useMemo } from 'react';
import { Propiedad, Propietario, ChecklistStatus, User } from '../../types';
import KycPldForm from './KycPldForm';
import { initialKycState as initialKycPropietarioState } from '../../constants';
import PhotoSorter from '../ui/PhotoSorter'; 
// [1] IMPORTAMOS EL COMPONENTE CURRENCY INPUT
import { CurrencyInput } from '../ui/CurrencyInput';

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
    
    // --- CAMPOS NUEVOS DE COMISIÓN ---
    comisionCaptacionOficina: 0,
    comisionCaptacionAsesor: 0,
    compartirComisionCaptacion: false,
    comisionVentaOficina: 0,
    comisionVentaAsesor: 0,
    compartirComisionVenta: false,
    
    // Legacy
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
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        const numericFields = [
            'recamaras', 'banos_completos', 'medios_banos', 'cochera_autos',
            // OJO: Ya no incluimos las comisiones aquí, las maneja handleCurrencyChange
        ];

        if (type === 'checkbox') {
             setPropiedadData(prev => ({ ...prev, [name]: checked }));
        } else if (numericFields.includes(name)) {
            const numericValue = parseFloat(value);
            setPropiedadData(prev => ({ ...prev, [name]: isNaN(numericValue) ? 0 : numericValue }));
        } else {
            setPropiedadData(prev => ({ ...prev, [name]: value }));
        }
    };

    // [2] MANEJADOR ESPECIAL PARA INPUTS DE MONEDA
    const handleCurrencyChange = (fieldName: string, value: string) => {
        // 'valor_operacion' es string en tu DB, así que lo guardamos tal cual (limpio de comas)
        if (fieldName === 'valor_operacion') {
             setPropiedadData(prev => ({ ...prev, [fieldName]: value }));
        } else {
            // Las comisiones son numéricas, convertimos
            const numVal = parseFloat(value);
            setPropiedadData(prev => ({ ...prev, [fieldName]: isNaN(numVal) ? 0 : numVal }));
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

    const handleReorderPhotos = (newPhotos: Array<File | string>) => {
        setPhotos(newPhotos as File[]);
    };

    // Cálculo Total Operación
    const comisionTotalOperacion = useMemo(() => {
        return (propiedadData.comisionCaptacionOficina || 0) + 
               (propiedadData.comisionCaptacionAsesor || 0) +
               (propiedadData.comisionVentaOficina || 0) + 
               (propiedadData.comisionVentaAsesor || 0);
    }, [propiedadData]);

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

            <div className="max-h-[70vh] overflow-y-auto p-6 custom-scrollbar">

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
                        
                        {/* [3] Sección de Comisión CON CURRENCY INPUT */}
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
                                                value={propiedadData.comisionCaptacionOficina || ''} 
                                                onChange={(val) => handleCurrencyChange('comisionCaptacionOficina', val)}
                                                placeholder="0.00" 
                                            />
                                        </div>
                                        <div>
                                            <CurrencyInput 
                                                label="Comisión Asesor"
                                                name="comisionCaptacionAsesor" 
                                                value={propiedadData.comisionCaptacionAsesor || ''} 
                                                onChange={(val) => handleCurrencyChange('comisionCaptacionAsesor', val)}
                                                placeholder="0.00" 
                                            />
                                        </div>
                                        <div className="flex items-center pt-2">
                                            <input 
                                                type="checkbox" 
                                                id="checkCaptacion" 
                                                name="compartirComisionCaptacion" 
                                                checked={!!propiedadData.compartirComisionCaptacion} 
                                                onChange={handlePropiedadChange} 
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                                            />
                                            <label htmlFor="checkCaptacion" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">¿Comisión Compartida?</label>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 mt-2 flex justify-between items-center">
                                            <p className="text-xs text-gray-500">Subtotal Captación</p>
                                            <p className="font-bold text-blue-900">
                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((propiedadData.comisionCaptacionOficina || 0) + (propiedadData.comisionCaptacionAsesor || 0))}
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
                                                value={propiedadData.comisionVentaOficina || ''} 
                                                onChange={(val) => handleCurrencyChange('comisionVentaOficina', val)}
                                                placeholder="0.00" 
                                            />
                                        </div>
                                        <div>
                                            <CurrencyInput 
                                                label="Comisión Asesor"
                                                name="comisionVentaAsesor" 
                                                value={propiedadData.comisionVentaAsesor || ''} 
                                                onChange={(val) => handleCurrencyChange('comisionVentaAsesor', val)}
                                                placeholder="0.00" 
                                            />
                                        </div>
                                        <div className="flex items-center pt-2">
                                            <input 
                                                type="checkbox" 
                                                id="checkVenta" 
                                                name="compartirComisionVenta" 
                                                checked={!!propiedadData.compartirComisionVenta} 
                                                onChange={handlePropiedadChange} 
                                                className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500" 
                                            />
                                            <label htmlFor="checkVenta" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">¿Comisión Compartida?</label>
                                        </div>
                                        <div className="pt-2 border-t border-green-200 mt-2 flex justify-between items-center">
                                            <p className="text-xs text-gray-500">Subtotal Venta</p>
                                            <p className="font-bold text-green-900">
                                                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format((propiedadData.comisionVentaOficina || 0) + (propiedadData.comisionVentaAsesor || 0))}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TOTAL OPERACIÓN */}
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
                                <div>
                                    <label htmlFor="descripcion_breve" className="block text-sm font-medium text-gray-700 mb-1">Descripción breve (para ficha técnica)</label>
                                    <textarea id="descripcion_breve" name="descripcion_breve" value={propiedadData.descripcion_breve} onChange={handlePropiedadChange} rows={3} className="w-full px-3 py-2 bg-gray-50 border rounded-md text-gray-900 placeholder-gray-500" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        {/* [4] VALOR DE OPERACIÓN CON CURRENCY INPUT */}
                                        <CurrencyInput 
                                            label="Valor de la operación (MXN)"
                                            name="valor_operacion" 
                                            value={propiedadData.valor_operacion} 
                                            onChange={(val) => handleCurrencyChange('valor_operacion', val)}
                                            placeholder="Ej. 2500000" 
                                        />
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

                        {/* Sección de Fotos con Drag & Drop */}
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2 border-b pb-2">Fotografías del Inmueble</h3>
                            <p className="text-sm text-gray-600 my-2">
                                <strong>Arrastra y suelta</strong> las fotos para cambiar el orden. La foto en la posición #1 será la <strong>PORTADA</strong>.
                            </p>
                            
                            {/* Input de Carga */}
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md mb-4 hover:bg-gray-50 transition-colors">
                                <div className="space-y-1 text-center">
                                    <PhotoIcon />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-iange-orange hover:text-orange-500 focus-within:outline-none">
                                            <span>Selecciona tus archivos</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handlePhotoChange} />
                                        </label>
                                        <p className="pl-1">o arrástralos aquí</p>
                                    </div>
                                    <p className="text-xs text-gray-500">Imágenes hasta 5MB</p>
                                </div>
                            </div>

                            {/* COMPONENTE DRAG & DROP */}
                            <PhotoSorter 
                                photos={photos} 
                                onChange={handleReorderPhotos} 
                                onRemove={removePhoto} 
                            />
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