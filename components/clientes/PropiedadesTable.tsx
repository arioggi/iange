import React from 'react';
import { Propiedad, Propietario } from '../../types';
import { documentGenerator, DatosLegales } from '../../Services/DocumentGenerator';
import { DocumentArrowDownIcon } from '../Icons'; 

interface PropiedadesTableProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    onEdit: (propiedad: Propiedad) => void;
    onDelete: (propiedad: Propiedad) => void;
}

const PropiedadesTable: React.FC<PropiedadesTableProps> = ({ propiedades, propietarios, onEdit, onDelete }) => {
    
    // ... (LA LÓGICA DE DESCARGA SE MANTIENE EXACTAMENTE IGUAL) ...
    // Para ahorrar espacio en el chat, asumo que dejas la función handleDescargarKitLegal 
    // y los helpers (formatCurrency, getThumbnail, etc) intactos aquí.
    // Solo cambiaré el RETURN (el renderizado).

    // --- REPEATING LOGIC FOR CONTEXT (Copy logic from previous version if needed) ---
    const handleDescargarKitLegal = async (propiedad: Propiedad) => {
        const propietario = propietarios.find(p => p.id === propiedad.propietarioId);
        if (!propietario) { alert("Datos no encontrados"); return; }
        // ... (Lógica original de generación de documentos) ...
        // (Simplemente mantén tu lógica de descarga aquí)
    };

    const getPropietarioName = (propietarioId: number) => {
        const propietario = propietarios.find(p => p.id === propietarioId);
        return propietario ? propietario.nombreCompleto : 'N/A';
    };

    const renderPropietarioCell = (propietarioId: number) => {
        const propietario = propietarios.find(p => p.id === propietarioId);
        if (!propietario) return <span className="text-gray-400 italic">No asignado</span>;
        const isValidado = propietario.ineValidado && propietario.pldValidado;
        return (
            <div className="flex flex-col">
                <span className="text-gray-900 font-medium">{propietario.nombreCompleto}</span>
                {isValidado && (
                    <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 mt-0.5 bg-green-50 px-1.5 py-0.5 rounded-md w-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        VERIFICADO
                    </span>
                )}
            </div>
        );
    };

    const formatCurrency = (value: string | undefined) => {
        if (!value) return 'N/A';
        const number = parseFloat(value.replace(/,/g, ''));
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
    };

    const getThumbnail = (propiedad: Propiedad) => {
        if (propiedad.fotos && propiedad.fotos.length > 0) return URL.createObjectURL(propiedad.fotos[0]);
        if (propiedad.imageUrls && propiedad.imageUrls.length > 0) return propiedad.imageUrls[0];
        return 'https://via.placeholder.com/100x100.png?text=No+Img';
    };
    
    return (
        // 1. CONTENEDOR UNIFICADO: Borde gris, sombra suave, fondo blanco
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
                {/* 2. HEADER UNIFICADO: Fondo gris suave, texto gris medio, mayúsculas, fuente semibold */}
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Portada</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Detalles Inmueble</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Propietario</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {propiedades.map(propiedad => (
                        // 3. FILA UNIFICADA: Hover suave
                        <tr key={propiedad.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                                <img src={getThumbnail(propiedad)} alt="Propiedad" className="h-12 w-16 object-cover rounded border border-gray-200 shadow-sm"/>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900 line-clamp-1">{propiedad.calle} {propiedad.numero_exterior}</span>
                                    <span className="text-xs text-gray-500">{propiedad.colonia}, {propiedad.municipio}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 align-middle">
                                {renderPropietarioCell(propiedad.propietarioId)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle text-sm font-medium text-gray-900">
                                {formatCurrency(propiedad.valor_operacion)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                                <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-bold rounded-full border ${
                                    propiedad.status === 'Vendida' ? 'bg-green-100 text-green-800 border-green-200' : 
                                    propiedad.status === 'Separada' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                    propiedad.status === 'En Promoción' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                    'bg-gray-100 text-gray-800 border-gray-200'
                                }`}>
                                    {propiedad.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap align-middle text-right text-sm font-medium">
                                <div className="flex justify-center items-center gap-3">
                                    <button onClick={() => handleDescargarKitLegal(propiedad)} className="text-gray-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded" title="Kit Legal"><DocumentArrowDownIcon className="h-5 w-5" /></button>
                                    <button onClick={() => onEdit(propiedad)} className="text-indigo-600 hover:text-indigo-900 font-medium">Editar</button>
                                    <button onClick={() => onDelete(propiedad)} className="text-red-500 hover:text-red-700 font-medium">Eliminar</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PropiedadesTable;