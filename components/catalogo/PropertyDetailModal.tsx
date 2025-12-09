import React, { useState, useEffect } from 'react';
import { Propiedad, Propietario } from '../../types';

interface PropertyDetailModalProps {
    propiedad: Propiedad;
    propietario?: Propietario;
    onClose?: () => void;
}

const formatCurrency = (value?: string) => {
    if (!value) return 'N/A';
    const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
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

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ propiedad, propietario, onClose }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoading, setImageLoading] = useState(true);

    const images = (propiedad.imageUrls && propiedad.imageUrls.length > 0) 
        ? propiedad.imageUrls 
        : (propiedad.fotos && propiedad.fotos.length > 0) 
            ? propiedad.fotos.map(f => URL.createObjectURL(f)) 
            : [];

    const hasImages = images.length > 0;

    useEffect(() => {
        setCurrentImageIndex(0);
        setImageLoading(true);
    }, [propiedad.id]);

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
        setImageLoading(true);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
        setImageLoading(true);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            
            {/* --- SECCIÓN GALERÍA (Sin cambios) --- */}
            <div className="relative w-full h-[50vh] bg-gray-900 group shrink-0">
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
                        title="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                )}

                {!hasImages ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <svg className="w-16 h-16 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>Sin imágenes</span>
                    </div>
                ) : (
                    <>
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        )}
                        <img 
                            src={images[currentImageIndex]} 
                            alt={`Imagen ${currentImageIndex + 1}`}
                            className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setImageLoading(false)}
                        />
                        
                        {images.length > 1 && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-0 top-0 bottom-0 px-4 hover:bg-black/20 text-white transition-colors flex items-center">
                                    <svg className="w-8 h-8 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-0 top-0 bottom-0 px-4 hover:bg-black/20 text-white transition-colors flex items-center">
                                    <svg className="w-8 h-8 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs">
                                    {currentImageIndex + 1} / {images.length}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* --- SECCIÓN INFO --- */}
            <div className="p-6 md:p-8 overflow-y-auto">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{propiedad.calle} {propiedad.numero_exterior}</h2>
                        <p className="text-gray-500">{propiedad.colonia}, {propiedad.municipio}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                        <p className="text-3xl font-extrabold text-iange-orange leading-tight">{formatCurrency(propiedad.valor_operacion)}</p>
                        
                        {/* --- AQUÍ ESTÁ EL "DISEÑO TOTALMENTE NUEVO" DEL ESTADO --- */}
                        <div className="mt-2 flex items-center gap-2">
                             <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{propiedad.tipo_inmueble}</span>
                             
                             {/* DISEÑO DE "SELLO PREMIUM" */}
                             {/* - text-[10px]: Letra muy pequeña.
                                 - font-extrabold uppercase tracking-widest: Letra gruesa, mayúscula y separada.
                                 - py-[2px] leading-none: Altura mínima, súper delgada.
                                 - flex items-center: Centrado perfecto.
                             */}
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
                </div>

                {/* DESCRIPCIÓN (Sin cambios) */}
                {propiedad.descripcion_breve && (
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Descripción</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            {propiedad.descripcion_breve}
                        </p>
                    </div>
                )}

                <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider border-b pb-2">Detalles de la Propiedad</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
                    <DetailItem label="Terreno" value={propiedad.terreno_m2 ? `${propiedad.terreno_m2} m²` : undefined} />
                    <DetailItem label="Construcción" value={propiedad.construccion_m2 ? `${propiedad.construccion_m2} m²` : undefined} />
                    <DetailItem label="Recámaras" value={propiedad.recamaras} />
                    <DetailItem label="Baños" value={`${propiedad.banos_completos || 0} / ${propiedad.medios_banos || 0}`} />
                    <DetailItem label="Cochera" value={propiedad.cochera_autos} />
                    <DetailItem label="Propietario" value={propietario?.nombreCompleto} />
                </div>
                
                {propiedad.fichaTecnicaPdf && (
                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <a href={propiedad.fichaTecnicaPdf} download className="text-iange-orange font-bold hover:underline">
                            Descargar Ficha Técnica PDF
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PropertyDetailModal;