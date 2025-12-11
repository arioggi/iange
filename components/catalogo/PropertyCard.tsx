import React from 'react';
import { Propiedad, Propietario } from '../../types';
import { SparklesIcon, PencilIcon } from '../../components/Icons';

// Icono de dinero (Signo de pesos)
const CurrencyDollarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.768 0-1.536.219-1.969.932-.431.713-.431 2.137 0 2.818zm0-12.818l-.879-.659c-1.171-.879-3.07-.879-4.242 0-1.172.879-1.172 2.303 0 3.182C7.464 11.781 8.232 12 9 12c.768 0 1.536-.219 1.969-.932.431-.713.431-2.137 0-2.818z" />
  </svg>
);

interface PropertyCardProps {
    propiedad: Propiedad;
    propietario?: Propietario;
    onVisitaClick?: () => void;
    onEditClick?: () => void;
    onOfferClick?: () => void;
}

const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const PropertyCard: React.FC<PropertyCardProps> = ({ propiedad, propietario, onVisitaClick, onEditClick, onOfferClick }) => {
    const imageUrl = 
        propiedad.fotos && propiedad.fotos.length > 0 
            ? URL.createObjectURL(propiedad.fotos[0]) 
            : (propiedad.imageUrls && propiedad.imageUrls.length > 0)
                ? propiedad.imageUrls[0]
                : 'https://via.placeholder.com/400x300.png?text=Sin+Imagen';

    const handleButtonClick = (e: React.MouseEvent, action?: () => void) => {
        e.stopPropagation();
        if (action) action();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1 relative group">
            
            {/* Badges de Estatus */}
            {propiedad.status === 'Vendida' && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-md tracking-wider">
                    VENDIDA
                </div>
            )}
            {propiedad.status === 'Separada' && (
                <div className="absolute top-3 left-3 z-10 bg-yellow-500 text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-md tracking-wider">
                    SEPARADA
                </div>
            )}

            {/* --- BOTONES FLOTANTES (CÍRCULOS BLANCOS) --- */}
            {/* Solo se muestran si NO está vendida */}
            {propiedad.status !== 'Vendida' && (
                <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    
                    {/* Botón Editar (Lápiz) */}
                    <button 
                        onClick={(e) => handleButtonClick(e, onEditClick)}
                        className="bg-white text-gray-600 p-2 rounded-full shadow-md hover:bg-gray-100 hover:text-indigo-600 transition-colors border border-gray-100"
                        title="Editar"
                    >
                        <PencilIcon className="h-5 w-5" />
                    </button>
                    
                    {/* Botón Interés Rápido (Destello) */}
                    <button 
                        onClick={(e) => handleButtonClick(e, onVisitaClick)}
                        className="bg-white text-gray-600 p-2 rounded-full shadow-md hover:bg-gray-100 hover:text-iange-orange transition-colors border border-gray-100"
                        title="Registrar Visita"
                    >
                        <SparklesIcon className="h-5 w-5" />
                    </button>

                    {/* NUEVO: Botón Oferta (Signo de Pesos) */}
                    {/* Fondo blanco, icono verde por defecto */}
                    <button 
                        onClick={(e) => handleButtonClick(e, onOfferClick)}
                        className="bg-white text-green-600 p-2 rounded-full shadow-md hover:bg-green-50 transition-colors border border-gray-100"
                        title="Registrar Oferta"
                    >
                        <CurrencyDollarIcon className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Imagen con efecto grayscale si está vendida */}
            <div 
                className={`h-48 bg-cover bg-center ${propiedad.status === 'Vendida' ? 'grayscale opacity-80' : ''}`} 
                style={{ backgroundImage: `url(${imageUrl})` }}
            ></div>
            
            {/* Contenido de texto */}
            <div className="p-4">
                <p className="text-sm font-semibold text-iange-orange">{propiedad.tipo_inmueble} en Venta</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(propiedad.valor_operacion)}</h3>
                <p className="text-sm text-gray-600 mt-2 h-10 overflow-hidden">
                    {`${propiedad.calle} ${propiedad.numero_exterior}, ${propiedad.colonia}, ${propiedad.municipio}`}
                </p>
                 <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <p>Propietario: <span className="font-medium text-gray-700">{propietario?.nombreCompleto || 'No asignado'}</span></p>
                    <p className="mt-1">Fecha de alta: <span className="font-medium text-gray-700">{formatDate(propiedad.fecha_captacion)}</span></p>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;