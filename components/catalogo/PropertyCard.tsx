import React from 'react';
import { Propiedad, Propietario } from '../../types';

interface PropertyCardProps {
    propiedad: Propiedad;
    propietario?: Propietario;
}

const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(number);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const PropertyCard: React.FC<PropertyCardProps> = ({ propiedad, propietario }) => {
    const imageUrl = propiedad.fotos.length > 0 ? URL.createObjectURL(propiedad.fotos[0]) : 'https://via.placeholder.com/400x300.png?text=Sin+Imagen';

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }}></div>
            <div className="p-4">
                <p className="text-sm font-semibold text-iange-orange">{propiedad.tipo_inmueble} en Venta</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(propiedad.valor_operacion)}</h3>
                <p className="text-sm text-gray-600 mt-2 h-10 overflow-hidden">
                    {`${propiedad.calle} ${propiedad.numero_exterior}, ${propiedad.colonia}, ${propiedad.municipio}`}
                </p>
                 <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                    <p>Propietario: <span className="font-medium text-gray-700">{propietario?.nombreCompleto || 'No asignado'}</span></p>
                    {/* FIX: Corrected property name from 'fecha_alta' to 'fecha_captacion' to align with the Propiedad type. */}
                    <p className="mt-1">Fecha de alta: <span className="font-medium text-gray-700">{formatDate(propiedad.fecha_captacion)}</span></p>
                </div>
            </div>
        </div>
    );
};

export default PropertyCard;