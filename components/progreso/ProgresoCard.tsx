import React from 'react';
import { Propiedad, Propietario } from '../../types';
import { FLUJO_PROGRESO } from '../../constants';

interface ProgresoCardProps {
    propiedad: Propiedad;
    propietario?: Propietario;
    onClick: () => void;
}

const getEtapaActual = (progreso: number): string => {
    if (progreso < 100) {
       const totalItems = FLUJO_PROGRESO.flatMap(e => e.items).length;
       const completedItems = Math.floor((progreso / 100) * totalItems);
       
       let itemsCount = 0;
       for (const etapa of FLUJO_PROGRESO) {
           itemsCount += etapa.items.length;
           if (completedItems < itemsCount) {
               return etapa.nombre;
           }
       }
    }
    return "Venta Concluida";
};

const formatCurrency = (value: string) => {
    if (!value) return 'N/A';
    const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};


const ProgresoCard: React.FC<ProgresoCardProps> = ({ propiedad, propietario, onClick }) => {
    const etapaNombre = getEtapaActual(propiedad.progreso);
    const progressPercentage = propiedad.progreso;

    return (
        <div 
            onClick={onClick}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-shadow duration-200 cursor-pointer"
        >
            <div>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500">{propiedad.tipo_inmueble}</p>
                        <h3 className="font-bold text-gray-800 leading-tight">
                            {`${propiedad.calle} ${propiedad.numero_exterior}`}
                        </h3>
                        <p className="text-sm text-gray-600">{`${propiedad.colonia}, ${propiedad.municipio}`}</p>
                    </div>
                    <span className={`text-xl font-bold ${progressPercentage === 100 ? 'text-green-500' : 'text-iange-orange'}`}>
                        {progressPercentage}%
                    </span>
                </div>
                <p className="text-lg font-bold text-gray-900 mt-3">{formatCurrency(propiedad.valor_operacion)}</p>
                <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className={`${progressPercentage === 100 ? 'bg-green-500' : 'bg-iange-orange'} h-2.5 rounded-full transition-all duration-500`}
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-center font-semibold text-gray-600 mt-2">{etapaNombre}</p>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
                 <p className="text-xs text-gray-500">
                    Propietario: <span className="font-medium text-gray-700">{propietario?.nombreCompleto || 'N/A'}</span>
                </p>
                 <p className="text-xs text-gray-500 mt-1">
                    Captación: <span className="font-medium text-gray-700">{new Date(propiedad.fecha_captacion).toLocaleDateString('es-MX')}</span>
                </p>
            </div>
        </div>
    );
};

export default ProgresoCard;