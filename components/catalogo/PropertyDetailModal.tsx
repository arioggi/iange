import React, { useState } from 'react';
import { Propiedad, Propietario } from '../../types';

interface PropertyDetailModalProps {
    propiedad: Propiedad;
    propietario?: Propietario;
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
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800">{value || 'N/A'}</p>
    </div>
);

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ propiedad, propietario }) => {
    const [mainImageIndex, setMainImageIndex] = useState(0);

    const imageUrls = propiedad.fotos.map(file => URL.createObjectURL(file));

    return (
        <div className="max-h-[75vh] overflow-y-auto pr-2">
            {/* Photo Gallery */}
            <section className="mb-6">
                <div className="w-full h-80 rounded-lg bg-gray-200 mb-2 overflow-hidden">
                    {imageUrls.length > 0 ? (
                        <img 
                            src={imageUrls[mainImageIndex]} 
                            alt={`Propiedad ${mainImageIndex + 1}`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                         <div className="flex items-center justify-center h-full text-gray-500">Sin imágenes</div>
                    )}
                </div>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                    {imageUrls.map((url, index) => (
                        <button key={index} onClick={() => setMainImageIndex(index)} className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${index === mainImageIndex ? 'border-iange-orange' : 'border-transparent'}`}>
                            <img src={url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </section>

            {/* Download Button */}
            {propiedad.fichaTecnicaPdf && (
                 <a 
                    href={propiedad.fichaTecnicaPdf} 
                    download={`Ficha-Tecnica-${propiedad.calle.replace(/\s/g, '-')}.pdf`}
                    className="w-full block text-center bg-iange-orange text-white py-3 px-6 rounded-md hover:bg-orange-600 transition-colors shadow-sm font-bold text-lg mb-6"
                >
                    Descargar Ficha Técnica (PDF)
                </a>
            )}

            {/* Property Details */}
            <section>
                <h3 className="text-xl font-bold text-iange-dark mb-4 border-b pb-2">Detalles de la Propiedad</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <DetailItem label="Valor de Operación" value={formatCurrency(propiedad.valor_operacion)} />
                    <DetailItem label="Tipo de Inmueble" value={propiedad.tipo_inmueble} />
                    <DetailItem label="Propietario" value={propietario?.nombreCompleto} />
                     <DetailItem 
                        label="Status" 
                        value={propiedad.compradorId ? 'Vendida' : 'Disponible'} 
                    />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <DetailItem label="Terreno" value={propiedad.terreno_m2 ? `${propiedad.terreno_m2} m²` : 'N/A'} />
                    <DetailItem label="Construcción" value={propiedad.construccion_m2 ? `${propiedad.construccion_m2} m²` : 'N/A'} />
                    <DetailItem label="Recámaras" value={propiedad.recamaras} />
                    <DetailItem label="Baños" value={`${propiedad.banos_completos || 0} completos, ${propiedad.medios_banos || 0} medios`} />
                    <DetailItem label="Cochera" value={propiedad.cochera_autos ? `${propiedad.cochera_autos} autos` : 'N/A'} />
                </div>

                {propiedad.descripcion_breve && (
                    <div className="text-sm text-gray-700 bg-iange-salmon p-4 rounded-md">
                        <h4 className="font-bold mb-1">Descripción</h4>
                        <p>{propiedad.descripcion_breve}</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PropertyDetailModal;