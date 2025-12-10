import React from 'react';
import { Comprador, Propiedad } from '../../types';

interface CompradoresTableProps {
    compradores: Comprador[];
    onEdit: (comprador: Comprador) => void;
    onDelete: (comprador: Comprador) => void;
    propiedades: Propiedad[]; // <--- Necesitamos las propiedades para buscar la dirección
}

const CompradoresTable: React.FC<CompradoresTableProps> = ({ compradores, onEdit, onDelete, propiedades }) => {
    
    const getPropertyDetails = (propiedadId: number | null | undefined) => {
        if (!propiedadId) return null;
        return propiedades.find(p => p.id === propiedadId);
    };

    const getStatusBadge = (tipo: string) => {
        switch(tipo) {
            case 'Venta finalizada': return <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">VENTA</span>;
            case 'Propiedad Separada': return <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">SEPARADA</span>;
            default: return <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">PROPUESTA</span>;
        }
    }

    return (
        <div className="overflow-x-auto border rounded-lg shadow-sm">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium border-b">
                    <tr>
                        <th className="px-6 py-3 text-left tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left tracking-wider">Propiedad de Interés</th>
                        <th className="px-6 py-3 text-left tracking-wider">Contacto</th>
                        <th className="px-6 py-3 text-right tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {compradores.map(comprador => {
                        const prop = getPropertyDetails(comprador.propiedadId);
                        const tipoRelacion = (comprador as any).tipoRelacion || 'Propuesta de compra';

                        return (
                            <tr key={comprador.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {prop ? (
                                        <div className="flex flex-col items-start">
                                            <span className="text-sm font-medium text-gray-800">{prop.calle} {prop.numero_exterior}</span>
                                            <span className="text-xs text-gray-500 mb-1">{prop.colonia}</span>
                                            {getStatusBadge(tipoRelacion)}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">-- Sin asignar --</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600">{comprador.email}</div>
                                    <div className="text-sm text-gray-600">{comprador.telefono}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => onEdit(comprador)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Editar</button>
                                    <button onClick={() => onDelete(comprador)} className="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                                </td>
                            </tr>
                        );
                    })}
                    {compradores.length === 0 && (
                         <tr><td colSpan={4} className="text-center py-10 text-gray-500 italic">No se encontraron clientes registrados.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CompradoresTable;