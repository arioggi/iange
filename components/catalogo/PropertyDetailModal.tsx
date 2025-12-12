import React, { useState, useEffect } from 'react';
import { Propiedad, Propietario, Comprador, OfferData } from '../../types';
import { pdf } from '@react-pdf/renderer'; // <--- CAMBIO: Usamos 'pdf' para generación manual
import FichaTecnicaPDF from '../../components/PDF/FichaTecnicaPDF'; // <--- Tu componente PDF
import Modal from '../ui/Modal'; 

interface PropertyDetailModalProps {
    propiedad: Propiedad;
    propietario?: Propietario;
    onClose?: () => void;
    compradores?: Comprador[];
    onEditOffer?: (offer: OfferData, buyerId: number) => void;
    onDeleteOffer?: (buyerId: number) => void;
}

const formatCurrency = (value?: string | number) => {
    if (!value) return 'N/A';
    const number = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g,"")) : value;
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(number);
};

const DetailItem: React.FC<{ label: string, value?: string | number }> = ({ label, value }) => (
    <div className="border-b border-gray-100 py-2">
        <p className="text-xs text-gray-500 uppercase">{label}</p>
        <p className="font-medium text-gray-800">{value || 'N/A'}</p>
    </div>
);

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ 
    propiedad, 
    propietario, 
    onClose, 
    compradores = [],
    onEditOffer,
    onDeleteOffer
}) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoading, setImageLoading] = useState(true);
    const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
    
    // --- ESTADOS ---
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [offerToDeleteId, setOfferToDeleteId] = useState<number | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // <--- NUEVO ESTADO PARA EL PDF

    // --- 1. OBTENER Y MAPEAR OFERTAS ---
    const ofertasDisponibles = compradores.flatMap(c => {
        if (c.intereses && Array.isArray(c.intereses)) {
            const interesEnEsta = c.intereses.find((i: any) => String(i.propiedadId) === String(propiedad.id));
            if (interesEnEsta && interesEnEsta.ofertaFormal) {
                return [{
                    id: c.id,
                    cliente: c.nombreCompleto,
                    datos: interesEnEsta.ofertaFormal
                }];
            }
        }
        
        if (String(c.propiedadId) === String(propiedad.id) && c.ofertaFormal) {
             return [{
                id: c.id,
                cliente: c.nombreCompleto,
                datos: c.ofertaFormal
            }];
        }

        return [];
    });

    // --- 2. LOGICA DE GANADOR ---
    const isSold = propiedad.status === 'Vendida';
    const winnerIndex = isSold 
        ? ofertasDisponibles.findIndex(o => String(o.id) === String(propiedad.compradorId)) 
        : -1;

    const hasOffers = ofertasDisponibles.length > 0;
    const currentOfferObj = hasOffers ? ofertasDisponibles[currentOfferIndex] : null;
    const isWinningOffer = isSold && currentOfferObj && String(currentOfferObj.id) === String(propiedad.compradorId);

    // --- 3. ESTILOS ---
    const badgeText = isWinningOffer ? '⭐ OFERTA GANADORA' : 'Oferta Vigente';
    const bgLight = isWinningOffer ? 'bg-amber-50' : 'bg-green-50';
    const bgMedium = isWinningOffer ? 'bg-amber-100' : 'bg-green-100';
    const bgDark = isWinningOffer ? 'bg-amber-200' : 'bg-green-200';
    const borderCol = isWinningOffer ? 'border-amber-200' : 'border-green-200';
    const textLight = isWinningOffer ? 'text-amber-600' : 'text-green-600';
    const textDark = isWinningOffer ? 'text-amber-900' : 'text-green-900';
    const textMedium = isWinningOffer ? 'text-amber-800' : 'text-green-800';

    // --- IMÁGENES ---
    const images = (propiedad.imageUrls && propiedad.imageUrls.length > 0) 
        ? propiedad.imageUrls 
        : (propiedad.fotos && propiedad.fotos.length > 0) 
            ? propiedad.fotos.map(f => URL.createObjectURL(f)) 
            : [];

    const hasImages = images.length > 0;

    useEffect(() => {
        setCurrentImageIndex(0);
        setImageLoading(true);
        if (winnerIndex !== -1) {
            setCurrentOfferIndex(winnerIndex);
        } else {
            setCurrentOfferIndex(0);
        }
    }, [propiedad.id, winnerIndex]);

    const nextImage = () => { setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1)); setImageLoading(true); };
    const prevImage = () => { setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1)); setImageLoading(true); };

    const nextOffer = () => { setCurrentOfferIndex((prev) => (prev === ofertasDisponibles.length - 1 ? 0 : prev + 1)); };
    const prevOffer = () => { setCurrentOfferIndex((prev) => (prev === 0 ? ofertasDisponibles.length - 1 : prev - 1)); };

    const handleDeleteClick = (buyerId: number) => {
        setOfferToDeleteId(buyerId);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (offerToDeleteId && onDeleteOffer) {
            onDeleteOffer(offerToDeleteId);
            setDeleteConfirmOpen(false);
            setOfferToDeleteId(null);
        }
    };

    // --- NUEVA FUNCIÓN: GENERAR Y DESCARGAR PDF ---
    const handleDownloadPDF = async () => {
        setIsGeneratingPdf(true);
        try {
            // 1. Generamos el documento en memoria (Blob)
            const blob = await pdf(
                <FichaTecnicaPDF propiedad={propiedad} images={images} />
            ).toBlob();
            
            // 2. Creamos un link temporal para forzar la descarga
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Limpieza del nombre de archivo
            const safeName = (propiedad.calle + '_' + propiedad.numero_exterior).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `Ficha_${safeName}.pdf`;
            
            // 3. Simular clic y limpiar
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); 

        } catch (error) {
            console.error("Error generando PDF:", error);
            alert("Hubo un error al generar la ficha técnica. Por favor intenta de nuevo.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            
            {/* --- SECCIÓN GALERÍA --- */}
            <div className="relative w-full h-[50vh] bg-gray-900 group shrink-0">
                {onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/80 transition-colors" title="Cerrar">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                )}
                {!hasImages ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500"><span>Sin imágenes</span></div>
                ) : (
                    <>
                        {imageLoading && <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}
                        <img src={images[currentImageIndex]} alt={`Imagen ${currentImageIndex + 1}`} className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setImageLoading(false)}/>
                        {images.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-0 top-0 bottom-0 px-4 hover:bg-black/20 text-white font-bold text-2xl">‹</button>
                                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-0 top-0 bottom-0 px-4 hover:bg-black/20 text-white font-bold text-2xl">›</button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs">{currentImageIndex + 1} / {images.length}</div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* --- SECCIÓN INFO --- */}
            <div className="p-6 md:p-8 overflow-y-auto">
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{propiedad.calle} {propiedad.numero_exterior}</h2>
                        <p className="text-gray-500">{propiedad.colonia}, {propiedad.municipio}</p>
                        <div className="mt-2 flex items-center gap-2">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{propiedad.tipo_inmueble}</span>
                             <span className={`inline-flex items-center px-3 py-[3px] rounded-full text-[10px] font-extrabold uppercase tracking-widest leading-none shadow-sm ${
                                    propiedad.status === 'Vendida' ? 'bg-green-50 text-green-700 border border-green-200' : 
                                    propiedad.status === 'Separada' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                    propiedad.status === 'En Promoción' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-gray-50 text-gray-700 border border-gray-200'
                                }`}>
                                    {propiedad.status}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase mb-1">Valor Lista</p>
                        <p className="text-3xl font-extrabold text-gray-900 leading-tight">{formatCurrency(propiedad.valor_operacion)}</p>
                    </div>
                </div>

                {/* --- SECCIÓN DE OFERTAS --- */}
                {hasOffers && currentOfferObj && (
                    <div className={`mb-8 ${bgLight} border ${borderCol} rounded-xl p-5 shadow-sm relative overflow-hidden transition-all duration-300 group/offer`}>
                        <div className={`absolute top-0 right-0 ${bgDark} ${textMedium} text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider`}>
                            {badgeText}
                        </div>
                        
                        <div className={`flex justify-between items-start mb-4 border-b ${isWinningOffer ? 'border-amber-200' : 'border-green-200'} pb-3`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 ${bgMedium} rounded-full ${textLight}`}>
                                    {isWinningOffer ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <h3 className={`text-lg font-bold ${textDark}`}>
                                        {isWinningOffer ? 'Venta Cerrada con' : 'Propuesta Recibida'}
                                    </h3>
                                    <p className={`text-xs ${textMedium}`}>De: <strong>{currentOfferObj.cliente}</strong></p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${textMedium} uppercase mr-1`}>
                                    {currentOfferIndex + 1} de {ofertasDisponibles.length}
                                </span>
                                <button 
                                    onClick={prevOffer}
                                    disabled={ofertasDisponibles.length <= 1}
                                    className={`w-7 h-7 flex items-center justify-center rounded-full bg-white border ${borderCol} ${textLight} hover:${bgMedium} disabled:opacity-50 transition-colors shadow-sm`}
                                >
                                    ‹
                                </button>
                                <button 
                                    onClick={nextOffer}
                                    disabled={ofertasDisponibles.length <= 1}
                                    className={`w-7 h-7 flex items-center justify-center rounded-full bg-white border ${borderCol} ${textLight} hover:${bgMedium} disabled:opacity-50 transition-colors shadow-sm`}
                                >
                                    ›
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-fade-in">
                            <div>
                                <p className={`text-xs ${textLight} uppercase font-semibold`}>Precio Ofrecido</p>
                                <p className={`font-bold ${textDark} text-lg`}>{formatCurrency(currentOfferObj.datos.precioOfrecido)}</p>
                            </div>
                            <div>
                                <p className={`text-xs ${textLight} uppercase font-semibold`}>Forma de Pago</p>
                                <p className={`font-semibold ${textMedium}`}>{currentOfferObj.datos.formaPago}</p>
                                {currentOfferObj.datos.institucionFinanciera && <p className={`text-xs ${textMedium} opacity-75`}>({currentOfferObj.datos.institucionFinanciera})</p>}
                            </div>
                            <div>
                                <p className={`text-xs ${textLight} uppercase font-semibold`}>Apartado</p>
                                <p className={`font-semibold ${textMedium}`}>{formatCurrency(currentOfferObj.datos.montoApartado)}</p>
                            </div>
                            <div>
                                <p className={`text-xs ${textLight} uppercase font-semibold`}>Vigencia</p>
                                <p className={`font-semibold ${textMedium}`}>{currentOfferObj.datos.vigenciaOferta || 'N/A'}</p>
                            </div>
                        </div>
                        
                        {currentOfferObj.datos.observaciones && (
                            <div className={`mt-4 pt-3 border-t ${borderCol} animate-fade-in`}>
                                <p className={`text-xs ${textLight} uppercase mb-1 font-semibold`}>Condiciones / Observaciones</p>
                                <p className={`text-sm ${textMedium} italic`}>"{currentOfferObj.datos.observaciones}"</p>
                            </div>
                        )}

                        {!isSold && (
                            <div className={`mt-4 pt-3 border-t ${borderCol} flex justify-end gap-2`}>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        onEditOffer && onEditOffer(currentOfferObj.datos, currentOfferObj.id);
                                    }}
                                    className="px-3 py-1.5 bg-white border border-green-300 text-green-700 text-xs font-bold rounded shadow-sm hover:bg-green-50 flex items-center gap-1 transition-all active:scale-95"
                                >
                                    <span>✎</span> Editar
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(currentOfferObj.id);
                                    }}
                                    className="px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-bold rounded shadow-sm hover:bg-red-50 flex items-center gap-1 transition-all active:scale-95"
                                >
                                    <span>🗑️</span> Borrar
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* DESCRIPCIÓN Y DETALLES */}
                {propiedad.descripcion_breve && (
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Descripción</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{propiedad.descripcion_breve}</p>
                    </div>
                )}
                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider border-b pb-2">Detalles Técnicos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                    <DetailItem label="Terreno" value={propiedad.terreno_m2 ? `${propiedad.terreno_m2} m²` : undefined} />
                    <DetailItem label="Construcción" value={propiedad.construccion_m2 ? `${propiedad.construccion_m2} m²` : undefined} />
                    <DetailItem label="Recámaras" value={propiedad.recamaras} />
                    <DetailItem label="Baños" value={`${propiedad.banos_completos || 0} / ${propiedad.medios_banos || 0}`} />
                    <DetailItem label="Cochera" value={propiedad.cochera_autos} />
                    <DetailItem label="Propietario" value={propietario?.nombreCompleto} />
                </div>
                
                {/* --- SECCIÓN DE DESCARGA PDF (NUEVA) --- */}
                <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
                    
                    {/* Botón Mágico Generador de PDF */}
                    <button 
                        onClick={handleDownloadPDF} 
                        disabled={isGeneratingPdf}
                        className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg shadow-md transition-all font-bold text-white ${
                            isGeneratingPdf 
                            ? 'bg-gray-400 cursor-wait' 
                            : 'bg-gray-900 hover:bg-black hover:-translate-y-0.5'
                        }`}
                    >
                        {isGeneratingPdf ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generando PDF...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Descargar Ficha Técnica PDF
                            </>
                        )}
                    </button>

                    {/* (Opcional) Link al PDF original si existe */}
                    {propiedad.fichaTecnicaPdf && (
                         <a href={propiedad.fichaTecnicaPdf} download className="text-xs text-gray-400 hover:text-gray-600 underline">
                             Descargar archivo original subido
                         </a>
                    )}
                </div>
            </div>

            {/* --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100 animate-fade-in-down">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Eliminación</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                ¿Estás seguro de que quieres borrar esta propuesta? Esta acción no se puede deshacer.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setDeleteConfirmOpen(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium text-sm transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm shadow-sm transition-colors"
                                >
                                    Borrar Propuesta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetailModal;