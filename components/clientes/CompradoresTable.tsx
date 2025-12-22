// components/clientes/CompradoresTable.tsx
import React from 'react';
import { Comprador, Propiedad, User } from '../../types';
import { documentGenerator, DatosLegales } from '../../Services/DocumentGenerator';
// ✅ Importamos el icono
import { DocumentArrowDownIcon } from '../Icons'; 

interface CompradoresTableProps {
    compradores: Comprador[];
    onEdit: (comprador: Comprador) => void;
    onDelete: (comprador: Comprador) => void;
    propiedades: Propiedad[];
    asesores: User[];
}

const CompradoresTable: React.FC<CompradoresTableProps> = ({ compradores, onEdit, onDelete, propiedades, asesores }) => {
    
    // --- LÓGICA DE GENERACIÓN DE DOCUMENTOS (KIT LEGAL COMPRADOR) ---
    const handleDescargarKitLegal = async (comprador: Comprador) => {
        
        // 1. Buscar la propiedad de interés (para llenar el Aviso PLD)
        const propiedad = propiedades.find(p => p.id === comprador.propiedadId);

        // 2. Preparar TODOS los datos
        // Mapeamos los campos del Comprador a la estructura del DocumentGenerator
        const datosParaDocumentos: DatosLegales = {
            cliente: {
                nombre: comprador.nombreCompleto,
                rfc: comprador.rfc || 'XAXX010101000', 
                curp: comprador.curp || '', 
                nacionalidad: comprador.nacionalidad || 'Mexicana',
                fecha_nacimiento: comprador.fechaNacimiento || '', 
                pais_nacimiento: 'México',
                estado_civil: comprador.estadoCivil || '',
                ocupacion: comprador.ocupacion || 'Empleado/Empresario', 
                telefono: comprador.telefono || '',
                email: comprador.email || '',
                
                // Dirección del Comprador
                calle: comprador.calle || '',
                numero_exterior: comprador.numeroExterior || '',
                numero_interior: comprador.numeroInterior || '', 
                colonia: comprador.colonia || '',
                cp: comprador.codigoPostal || '', 
                ciudad: comprador.municipio || '',
                municipio: comprador.municipio || '',
                estado: comprador.estado || 'Nuevo León', 
                pais: 'México'
            },
            representante: { nombre: '', rfc: '', telefono: '' },
            
            // Datos del Inmueble (Si tiene propiedad asignada, si no, va vacío)
            inmueble: {
                calle: propiedad?.calle || '',
                numero_exterior: propiedad?.numero_exterior || '',
                colonia: propiedad?.colonia || '',
                municipio: propiedad?.municipio || '',
                estado: propiedad?.estado || 'Nuevo León',
                cp: propiedad?.codigo_postal || '' 
            },
            
            transaccion: {
                // Si hay propiedad, usamos su valor, si no 0
                monto_operacion: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(propiedad?.valor_operacion?.replace(/,/g, '') || 0)),
                fecha_operacion: new Date().toLocaleDateString('es-MX'),
                metodo_pago: 'Transferencia Electrónica',
                banco_origen: '',
                cuenta_origen: ''
            },
            beneficiario: undefined 
        };

        // 3. Ejecutar descargas
        alert("⏳ Iniciando descargas para el Comprador... Revisa los bloqueos de ventana emergente.");

        try {
            // A) Entrevista
            console.log("⬇️ Descargando Entrevista...");
            await documentGenerator.generarWord(
                '/templates/001_FORMATO_ENTREVISTA.docx', 
                `001_Entrevista_${comprador.nombreCompleto}`, 
                datosParaDocumentos
            );
        } catch (e) { console.error("❌ Fallo 001:", e); }
        
        // B) KYC (Física o Moral)
        setTimeout(async () => {
            try {
                const rfcLimpio = (comprador.rfc || '').trim();
                const esMoral = rfcLimpio.length === 12;
                
                const plantillaKYC = esMoral 
                    ? '/templates/002_KYC_MORAL.docx' 
                    : '/templates/002_KYC_FISICA.docx'; 

                console.log(`⬇️ Descargando KYC (${esMoral ? 'Moral' : 'Física'})...`);
                await documentGenerator.generarWord(plantillaKYC, `002_KYC_${esMoral ? 'Moral' : 'Fisica'}_${comprador.nombreCompleto}`, datosParaDocumentos);
            } catch (e) { console.error("❌ Fallo 002:", e); }
        }, 1000);
        
        // C) Aviso PLD
        setTimeout(async () => {
            try {
                console.log("⬇️ Descargando Aviso PLD...");
                await documentGenerator.generarWord(
                    '/templates/003_AVISO_PLD.docx', 
                    `003_Aviso_PLD_${comprador.nombreCompleto}`, 
                    datosParaDocumentos
                );
            } catch (e) { console.error("❌ Fallo 003:", e); }
        }, 2000);
    };

    // --- HELPERS EXISTENTES ---
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
            case 'Venta finalizada': return <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">VENTA</span>;
            case 'Propiedad Separada': return <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">SEPARADA</span>;
            default: return <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">PROPUESTA</span>;
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
                        const asesorNombre = getAsesorName(comprador.asesorId);

                        return (
                            <tr key={comprador.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</div>
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
                                                <div className="col-span-2 mt-1 pl-7 cursor-help group" title={comprador.notasCita}>
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
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center">
                                    {/* ✅ BOTÓN DESCARGAR KIT LEGAL */}
                                    <button 
                                        onClick={() => handleDescargarKitLegal(comprador)} 
                                        className="text-gray-500 hover:text-blue-700 mr-4 transition-colors"
                                        title="Descargar Kit Legal (3 Archivos Word)"
                                    >
                                        <DocumentArrowDownIcon className="h-5 w-5" />
                                    </button>

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