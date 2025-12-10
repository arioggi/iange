import React from 'react';
import { Comprador, Propiedad } from '../../types';

interface CompradoresTableProps {
    compradores: Comprador[];
    onEdit: (comprador: Comprador) => void;
    onDelete: (comprador: Comprador) => void;
    propiedades: Propiedad[];
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
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        // CAMBIO CRÍTICO 1: overflow-visible para permitir que el tooltip "salga" de la tabla
        // NOTA: Si necesitas scroll horizontal en móviles, esto podría conflictuar, pero en desktop arregla el corte.
        // Si necesitas scroll, la solución perfecta requiere usar Portals para el tooltip, pero probemos esto primero que es más simple.
        <div className="overflow-visible"> 
            <table className="min-w-full bg-white border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-medium border-b">
                    <tr>
                        <th className="px-6 py-3 text-left tracking-wider">Cliente</th>
                        <th className="px-6 py-3 text-left tracking-wider">Propiedad de Interés</th>
                        <th className="px-6 py-3 text-left tracking-wider">Cita / Visita</th>
                        <th className="px-6 py-3 text-left tracking-wider">Contacto</th>
                        <th className="px-6 py-3 text-right tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {compradores.map((comprador, index) => {
                        const prop = getPropertyDetails(comprador.propiedadId);
                        const tipoRelacion = (comprador as any).tipoRelacion || 'Propuesta de compra';

                        return (
                            // CAMBIO CRÍTICO 2: z-index dinámico decreciente.
                            // Esto asegura que la fila 1 esté "encima" de la fila 2.
                            // Así, si el tooltip baja, tapa la fila de abajo en lugar de ser tapado por ella.
                            <tr 
                                key={comprador.id} 
                                className="hover:bg-gray-50 transition-colors relative"
                                style={{ zIndex: 100 - index }} 
                            >
                                <td className="px-6 py-4 relative">
                                    <div className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</div>
                                </td>
                                <td className="px-6 py-4 relative">
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
                                
                                <td className="px-6 py-4 align-top relative">
                                    {comprador.fechaCita ? (
                                        <div className="grid grid-cols-[20px_1fr] gap-x-2 gap-y-1 items-center">
                                            <span className="text-sm text-center">📅</span>
                                            <span className="text-sm font-bold text-blue-800">
                                                {formatDate(comprador.fechaCita)}
                                            </span>
                                            
                                            <span className="text-sm text-center text-gray-500">🕒</span>
                                            <span className="text-xs text-gray-600 font-medium">
                                                {comprador.horaCita || 'Sin hora'}
                                            </span>

                                            {comprador.notasCita && (
                                                // CAMBIO 3: Tooltip ajustado
                                                <div className="col-span-2 mt-1 pl-7 relative group">
                                                    <p className="text-[11px] text-gray-500 italic truncate max-w-[150px] cursor-help">
                                                        <span className="mr-1">📝</span>
                                                        "{comprador.notasCita}"
                                                    </p>
                                                    
                                                    {/* El Globo Flotante */}
                                                    <div className="absolute left-0 top-6 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-xs rounded-md shadow-2xl border border-gray-700 whitespace-normal z-[9999]">
                                                        <div className="font-semibold mb-1 text-gray-300 border-b border-gray-600 pb-1">Notas de la visita:</div>
                                                        "{comprador.notasCita}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic pl-2">-- Sin cita --</span>
                                    )}
                                </td>

                                <td className="px-6 py-4 relative">
                                    <div className="text-sm text-gray-600">{comprador.email}</div>
                                    <div className="text-sm text-gray-600">{comprador.telefono}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative">
                                    <button onClick={() => onEdit(comprador)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Editar</button>
                                    <button onClick={() => onDelete(comprador)} className="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                                </td>
                            </tr>
                        );
                    })}
                    {compradores.length === 0 && (
                         <tr><td colSpan={5} className="text-center py-10 text-gray-500 italic">No se encontraron clientes registrados.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CompradoresTable;