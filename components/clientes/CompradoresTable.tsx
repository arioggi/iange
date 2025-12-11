import React from 'react';
import { Comprador, Propiedad, User } from '../../types'; // <--- Importamos User

interface CompradoresTableProps {
    compradores: Comprador[];
    onEdit: (comprador: Comprador) => void;
    onDelete: (comprador: Comprador) => void;
    propiedades: Propiedad[];
    asesores: User[]; // <--- NUEVA PROP: Lista de asesores para buscar el nombre
}

const CompradoresTable: React.FC<CompradoresTableProps> = ({ compradores, onEdit, onDelete, propiedades, asesores }) => {
    
    const getPropertyDetails = (propiedadId: number | null | undefined) => {
        if (!propiedadId) return null;
        return propiedades.find(p => p.id === propiedadId);
    };

    // Helper para obtener el nombre del asesor
    const getAsesorName = (id?: number | string) => {
        if (!id) return null;
        // Convertimos a string para asegurar la comparación (ya que id puede ser number o string)
        const asesor = asesores.find(a => String(a.id) === String(id));
        return asesor ? asesor.name : null;
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
        <div className="overflow-x-auto border rounded-lg shadow-sm"> 
            <table className="min-w-full bg-white">
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
                    {compradores.map((comprador) => {
                        const prop = getPropertyDetails(comprador.propiedadId);
                        const tipoRelacion = (comprador as any).tipoRelacion || 'Propuesta de compra';
                        const asesorNombre = getAsesorName(comprador.asesorId); // <--- Buscamos el nombre aquí

                        return (
                            <tr key={comprador.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</div>
                                    {/* --- MOSTRAR ASESOR --- */}
                                    {asesorNombre && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            <span className="font-semibold text-gray-400">Asesor:</span> {asesorNombre}
                                        </div>
                                    )}
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
                                
                                <td className="px-6 py-4 align-top">
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
                                                <div 
                                                    className="col-span-2 mt-1 pl-7 cursor-help group"
                                                    title={comprador.notasCita}
                                                >
                                                    <p className="text-[11px] text-gray-500 italic truncate max-w-[150px] border-b border-dotted border-gray-300 hover:text-gray-800 hover:border-gray-500 transition-colors">
                                                        <span className="mr-1 not-italic">📝</span>
                                                        "{comprador.notasCita}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic pl-2">-- Sin cita --</span>
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
                         <tr><td colSpan={5} className="text-center py-10 text-gray-500 italic">No se encontraron clientes registrados.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CompradoresTable;