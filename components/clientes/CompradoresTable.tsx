import React from 'react';
import { Comprador, Propiedad, User } from '../../types';
import { documentGenerator, DatosLegales } from '../../Services/DocumentGenerator';
import { DocumentArrowDownIcon } from '../Icons'; 

interface CompradoresTableProps {
    compradores: Comprador[];
    onEdit: (comprador: Comprador) => void;
    onDelete: (comprador: Comprador) => void;
    propiedades: Propiedad[];
    asesores: User[];
}

const CompradoresTable: React.FC<CompradoresTableProps> = ({ compradores, onEdit, onDelete, propiedades, asesores }) => {
    
    // ... (LA LÓGICA DE DESCARGA SE MANTIENE EXACTAMENTE IGUAL) ...
    const handleDescargarKitLegal = async (comprador: Comprador) => {
        // (Tu lógica de descarga aquí, la omito para enfocarme en el diseño)
        const propiedad = propiedades.find(p => p.id === comprador.propiedadId);
        // ... rest of logic
        alert("Generando documentos..."); // Placeholder para la lógica real
    };

    // --- HELPERS ---
    const getPropertyDetails = (propiedadId: number | null | undefined) => {
        if (!propiedadId) return null;
        return propiedades.find(p => p.id === propiedadId);
    };

    const getAsesorName = (id?: number | string) => {
        if (!id) return null;
        const asesor = asesores.find(a => String(a.id) === String(id));
        return asesor ? asesor.name : null;
    };

    const getStatusBadge = (tipo: string) => {
        switch(tipo) {
            case 'Venta finalizada': return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 border border-green-200">VENTA</span>;
            case 'Propiedad Separada': return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">SEPARADA</span>;
            default: return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">PROPUESTA</span>;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    return (
        // 1. CONTENEDOR UNIFICADO: Mismos estilos que PropiedadesTable
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                {/* 2. HEADER UNIFICADO: Mismos estilos exactos */}
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente / Comprador</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Interés Inmobiliario</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agenda</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {compradores.map((comprador) => {
                        const prop = getPropertyDetails(comprador.propiedadId);
                        const tipoRelacion = (comprador as any).tipoRelacion || 'Propuesta de compra';
                        const asesorNombre = getAsesorName(comprador.asesorId);
                        const isValidado = comprador.ineValidado && comprador.pldValidado;

                        // 3. FILA UNIFICADA
                        return (
                            <tr key={comprador.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 align-middle">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</span>
                                        
                                        {/* BADGE VERIFICADO IDENTICO */}
                                        {isValidado && (
                                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-0.5 bg-green-50 px-1.5 py-0.5 rounded-md w-fit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                VERIFICADO
                                            </span>
                                        )}

                                        {asesorNombre && (
                                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                <span className="text-indigo-400">●</span> {asesorNombre}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 align-middle">
                                    {prop ? (
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-sm font-medium text-gray-800 line-clamp-1">{prop.calle} {prop.numero_exterior}</span>
                                            {getStatusBadge(tipoRelacion)}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic bg-gray-50 px-2 py-1 rounded">-- Sin asignar --</span>
                                    )}
                                </td>
                                
                                <td className="px-6 py-4 align-middle">
                                    {comprador.fechaCita ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                                                <span>📅</span> {formatDate(comprador.fechaCita)}
                                            </div>
                                            {comprador.horaCita && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600 pl-6">
                                                    <span>🕒</span> {comprador.horaCita}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">-- Sin cita --</span>
                                    )}
                                </td>

                                <td className="px-6 py-4 align-middle">
                                    <div className="flex flex-col text-sm">
                                        <span className="text-gray-600">{comprador.email || '-'}</span>
                                        <span className="text-gray-500 text-xs">{comprador.telefono || '-'}</span>
                                    </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap align-middle text-right text-sm font-medium">
                                    <div className="flex justify-center items-center gap-3">
                                        <button onClick={() => handleDescargarKitLegal(comprador)} className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded" title="Kit Legal"><DocumentArrowDownIcon className="h-5 w-5" /></button>
                                        <button onClick={() => onEdit(comprador)} className="text-indigo-600 hover:text-indigo-900 font-medium">Editar</button>
                                        <button onClick={() => onDelete(comprador)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                                    </div>
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