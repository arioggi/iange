import React, { useState, useEffect } from 'react';
import { Propiedad, Propietario, Comprador, OfferData } from '../../types';
import { pdf } from '@react-pdf/renderer'; 
import FichaTecnicaPDF from '../../components/PDF/FichaTecnicaPDF'; 
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0, 
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
    
    // --- ESTADOS DE INTERACCIÓN ---
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [offerToDeleteId, setOfferToDeleteId] = useState<number | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    // Estados para feedback visual (Tooltips temporales)
    const [linkCopied, setLinkCopied] = useState(false);
    const [captionCopied, setCaptionCopied] = useState(false);

    // --- LOGICA DE OFERTAS ---
    const ofertasDisponibles = compradores.flatMap(c => {
        if (c.intereses && Array.isArray(c.intereses)) {
            const interesEnEsta = c.intereses.find((i: any) => String(i.propiedadId) === String(propiedad.id));
            if (interesEnEsta && interesEnEsta.ofertaFormal) {
                return [{ id: c.id, cliente: c.nombreCompleto, datos: interesEnEsta.ofertaFormal }];
            }
        }
        if (String(c.propiedadId) === String(propiedad.id) && c.ofertaFormal) {
             return [{ id: c.id, cliente: c.nombreCompleto, datos: c.ofertaFormal }];
        }
        return [];
    });
    const isSold = propiedad.status === 'Vendida';
    const winnerIndex = isSold ? ofertasDisponibles.findIndex(o => String(o.id) === String(propiedad.compradorId)) : -1;
    const hasOffers = ofertasDisponibles.length > 0;
    const currentOfferObj = hasOffers ? ofertasDisponibles[currentOfferIndex] : null;
    const isWinningOffer = isSold && currentOfferObj && String(currentOfferObj.id) === String(propiedad.compradorId);
    
    const badgeText = isWinningOffer ? '⭐ OFERTA GANADORA' : 'Oferta Vigente';
    const bgLight = isWinningOffer ? 'bg-amber-50' : 'bg-green-50';
    const bgMedium = isWinningOffer ? 'bg-amber-100' : 'bg-green-100';
    const bgDark = isWinningOffer ? 'bg-amber-200' : 'bg-green-200';
    const borderCol = isWinningOffer ? 'border-amber-200' : 'border-green-200';
    const textLight = isWinningOffer ? 'text-amber-600' : 'text-green-600';
    const textDark = isWinningOffer ? 'text-amber-900' : 'text-green-900';
    const textMedium = isWinningOffer ? 'text-amber-800' : 'text-green-800';

    const images = (propiedad.imageUrls && propiedad.imageUrls.length > 0) 
        ? propiedad.imageUrls 
        : (propiedad.fotos && propiedad.fotos.length > 0) 
            ? propiedad.fotos.map(f => URL.createObjectURL(f)) 
            : [];

    const hasImages = images.length > 0;

    useEffect(() => {
        setCurrentImageIndex(0);
        setImageLoading(true);
        if (winnerIndex !== -1) setCurrentOfferIndex(winnerIndex);
        else setCurrentOfferIndex(0);
    }, [propiedad.id, winnerIndex]);

    const nextImage = () => { setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1)); setImageLoading(true); };
    const prevImage = () => { setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1)); setImageLoading(true); };
    const nextOffer = () => { setCurrentOfferIndex((prev) => (prev === ofertasDisponibles.length - 1 ? 0 : prev + 1)); };
    const prevOffer = () => { setCurrentOfferIndex((prev) => (prev === 0 ? ofertasDisponibles.length - 1 : prev - 1)); };

    const handleDeleteClick = (buyerId: number) => { setOfferToDeleteId(buyerId); setDeleteConfirmOpen(true); };
    const confirmDelete = () => { if (offerToDeleteId && onDeleteOffer) { onDeleteOffer(offerToDeleteId); setDeleteConfirmOpen(false); setOfferToDeleteId(null); } };

    // --- GENERADOR DE PDF ---
    const generatePdfBlob = async () => {
        return await pdf(<FichaTecnicaPDF propiedad={propiedad} images={images} />).toBlob();
    };

    const handleDownloadPDF = async () => {
        setIsGeneratingPdf(true);
        try {
            const blob = await generatePdfBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const safeName = (propiedad.calle + '_' + propiedad.numero_exterior).replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.download = `Ficha_${safeName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); 
        } catch (error) {
            console.error("Error PDF:", error);
            // Fallback silencioso o pequeño log, pero evitamos alert si no es crítico
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // --- FUNCIÓN: COPIAR LINK PÚBLICO (Sin Alertas) ---
    const handleCopyUrl = () => {
        const identifier = propiedad.token_publico || propiedad.id; 
        const path = propiedad.token_publico ? 'preview' : 'p';
        const domain = import.meta.env.VITE_APP_URL || window.location.origin;
        
        const publicUrl = `${domain}/${path}/${identifier}`;
        
        navigator.clipboard.writeText(publicUrl).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000); // Reset después de 2s
        }).catch(err => console.error("Error copiando", err));
    };

    // --- FUNCIÓN: COPIAR CAPTION (Sin Alertas) ---
    const handleCopyCaption = () => {
        const features = [];
        if(propiedad.recamaras) features.push(`🛏️ ${propiedad.recamaras} Recámaras`);
        if(propiedad.banos_completos) features.push(`🚿 ${propiedad.banos_completos} Baños`);
        if(propiedad.cochera_autos) features.push(`🚗 Cochera ${propiedad.cochera_autos} autos`);
        if(propiedad.terreno_m2) features.push(`📏 ${propiedad.terreno_m2} m² Terreno`);

        const caption = `
🏡 ¡NUEVA OPORTUNIDAD EN VENTA! 🏡

📍 Ubicación: ${propiedad.colonia}, ${propiedad.municipio}
💲 Precio: ${formatCurrency(propiedad.valor_operacion)}

${propiedad.descripcion_breve || 'Propiedad única con excelente ubicación y gran plusvalía.'}

✨ Características principales:
${features.join('\n')}

📲 ¡Contáctanos para agendar tu visita!
#BienesRaices #Venta #${propiedad.municipio.replace(/\s/g, '')} #${propiedad.colonia.replace(/\s/g, '')} #RealEstate
`.trim();

        navigator.clipboard.writeText(caption).then(() => {
            setCaptionCopied(true);
            setTimeout(() => setCaptionCopied(false), 2000); // Reset después de 2s
        });
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            
            {/* GALERÍA */}
            <div className="relative w-full h-[50vh] bg-gray-900 group shrink-0">
                {onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/80 transition-colors">
                        <span className="text-2xl leading-none">&times;</span>
                    </button>
                )}
                {!hasImages ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500"><span>Sin imágenes</span></div>
                ) : (
                    <>
                        {imageLoading && <div className="absolute inset-0 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}
                        <img src={images[currentImageIndex]} className={`w-full h-full object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setImageLoading(false)}/>
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

            {/* INFO */}
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
                                    'bg-blue-50 text-blue-700 border border-blue-200'
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

                {/* --- SECCIÓN OFERTAS --- */}
                {hasOffers && currentOfferObj && (
                    <div className={`mb-8 ${bgLight} border ${borderCol} rounded-xl p-5 shadow-sm relative overflow-hidden transition-all duration-300`}>
                        <div className={`absolute top-0 right-0 ${bgDark} ${textMedium} text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider`}>{badgeText}</div>
                        <div className={`flex justify-between items-start mb-4 border-b ${isWinningOffer ? 'border-amber-200' : 'border-green-200'} pb-3`}>
                            <div className="flex items-center gap-3">
                                <h3 className={`text-lg font-bold ${textDark}`}>{isWinningOffer ? 'Venta Cerrada' : 'Propuesta'}</h3>
                                <p className={`text-xs ${textMedium}`}>De: <strong>{currentOfferObj.cliente}</strong></p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={prevOffer} disabled={ofertasDisponibles.length <= 1} className="w-6 h-6 flex items-center justify-center rounded-full bg-white border">‹</button>
                                <button onClick={nextOffer} disabled={ofertasDisponibles.length <= 1} className="w-6 h-6 flex items-center justify-center rounded-full bg-white border">›</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-xs uppercase font-semibold">Precio</p><p className="font-bold">{formatCurrency(currentOfferObj.datos.precioOfrecido)}</p></div>
                            <div><p className="text-xs uppercase font-semibold">Pago</p><p>{currentOfferObj.datos.formaPago}</p></div>
                        </div>
                        {!isSold && (
                            <div className="mt-4 flex justify-end gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onEditOffer && onEditOffer(currentOfferObj.datos, currentOfferObj.id); }} className="px-3 py-1 text-xs font-bold border border-green-300 text-green-700 rounded bg-white">Editar</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(currentOfferObj.id); }} className="px-3 py-1 text-xs font-bold border border-red-300 text-red-600 rounded bg-white">Borrar</button>
                            </div>
                        )}
                    </div>
                )}

                {/* DETALLES */}
                {propiedad.descripcion_breve && <div className="mb-8"><p className="text-gray-700 text-sm">{propiedad.descripcion_breve}</p></div>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mb-8">
                    <DetailItem label="Terreno" value={propiedad.terreno_m2 ? `${propiedad.terreno_m2} m²` : undefined} />
                    <DetailItem label="Construcción" value={propiedad.construccion_m2 ? `${propiedad.construccion_m2} m²` : undefined} />
                    <DetailItem label="Recámaras" value={propiedad.recamaras} />
                    <DetailItem label="Baños" value={`${propiedad.banos_completos || 0}`} />
                </div>
                
                {/* --- BOTONERA DE ACCIONES (NUEVO DISEÑO 3 BOTONES) --- */}
                <div className="mt-4 pt-6 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 text-center">Herramientas de Venta</h4>
                    <div className="flex flex-wrap justify-center gap-3">
                        
                        {/* 1. COPIAR LINK */}
                        <button 
                            onClick={handleCopyUrl} 
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 ${
                                linkCopied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                            title="Copiar enlace para redes sociales"
                        >
                            {linkCopied ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    ¡Link Copiado!
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    Copiar Link
                                </>
                            )}
                        </button>

                        {/* 2. COPIAR CAPTION */}
                        <button 
                            onClick={handleCopyCaption}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 ${
                                captionCopied ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-pink-600 text-white hover:bg-pink-700'
                            }`}
                            title="Copiar texto con emojis"
                        >
                            {captionCopied ? (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    ¡Texto Copiado!
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    Copiar Caption
                                </>
                            )}
                        </button>

                        {/* 3. DESCARGAR PDF */}
                        <button 
                            onClick={handleDownloadPDF} 
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gray-800 text-white font-bold text-sm hover:bg-gray-900 transition-all shadow-sm active:scale-95 disabled:bg-gray-300"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Descargar PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL ELIMINAR */}
            {isDeleteConfirmOpen && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 text-center">
                        <h3 className="text-lg font-bold mb-2">¿Eliminar Propuesta?</h3>
                        <div className="flex justify-center gap-3 mt-4">
                            <button onClick={() => setDeleteConfirmOpen(false)} className="px-4 py-2 bg-gray-100 rounded">Cancelar</button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetailModal;