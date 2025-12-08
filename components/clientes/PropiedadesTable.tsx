import React from 'react';
import { Propiedad, Propietario } from '../../types';

interface PropiedadesTableProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    onEdit: (propiedad: Propiedad) => void;
    onDelete: (propiedad: Propiedad) => void;
}

const PropiedadesTable: React.FC<PropiedadesTableProps> = ({ propiedades, propietarios, onEdit, onDelete }) => {
    
    const getPropietarioName = (propietarioId: number) => {
        const propietario = propietarios.find(p => p.id === propietarioId);
        return propietario ? propietario.nombreCompleto : 'N/A';
    };

    const formatCurrency = (value: string | undefined) => {
        if (!value) return 'N/A';
        const number = parseFloat(value.replace(/,/g, ''));
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    };

    // Helper para obtener imagen
    const getThumbnail = (propiedad: Propiedad) => {
        if (propiedad.fotos && propiedad.fotos.length > 0) {
            return URL.createObjectURL(propiedad.fotos[0]);
        }
        if (propiedad.imageUrls && propiedad.imageUrls.length > 0) {
            return propiedad.imageUrls[0];
        }
        return 'https://via.placeholder.com/100x100.png?text=N/A';
    };
    
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                    <tr>
                        {/* NUEVA COLUMNA */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portada</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propietario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {propiedades.map(propiedad => (
                        <tr key={propiedad.id} className="hover:bg-gray-50">
                            {/* CELDA DE IMAGEN */}
                            <td className="px-6 py-4">
                                <img 
                                    src={getThumbnail(propiedad)} 
                                    alt="Miniatura" 
                                    className="h-12 w-16 object-cover rounded-md border border-gray-200"
                                />
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{`${propiedad.calle} ${propiedad.numero_exterior}`}</div>
                                <div className="text-sm text-gray-500">{`${propiedad.colonia}, ${propiedad.municipio}`}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800">
                                {getPropietarioName(propiedad.propietarioId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(propiedad.valor_operacion)}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    propiedad.status === 'Vendida' ? 'bg-green-100 text-green-800' : 
                                    propiedad.status === 'Separada' ? 'bg-yellow-100 text-yellow-800' :
                                    propiedad.status === 'En Promoción' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {propiedad.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button onClick={() => onEdit(propiedad)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar / Ver</button>
                                <button onClick={() => onDelete(propiedad)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                    {propiedades.length === 0 && (
                         <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500">
                                No se encontraron propiedades.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PropiedadesTable;