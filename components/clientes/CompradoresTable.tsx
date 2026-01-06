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
    
    // ✅ LÓGICA DE GENERACIÓN DE DOCUMENTOS (MANTENIDA)
    const handleDescargarKitLegal = async (comprador: Comprador) => {
        const propiedad = propiedades.find(p => p.id === comprador.propiedadId);

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
            inmueble: {
                calle: propiedad?.calle || '',
                numero_exterior: propiedad?.numero_exterior || '',
                colonia: propiedad?.colonia || '',
                municipio: propiedad?.municipio || '',
                estado: propiedad?.estado || 'Nuevo León',
                cp: propiedad?.codigo_postal || '' 
            },
            transaccion: {
                monto_operacion: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(propiedad?.valor_operacion?.replace(/,/g, '') || 0)),
                fecha_operacion: new Date().toLocaleDateString('es-MX'),
                metodo_pago: 'Transferencia Electrónica',
                banco_origen: '',
                cuenta_origen: ''
            },
            beneficiario: undefined 
        };

        alert("⏳ Iniciando descargas para el Comprador... Revisa los bloqueos de ventana emergente.");

        try {
            console.log("⬇️ Descargando Entrevista...");
            await documentGenerator.generarWord(
                '/templates/001_FORMATO_ENTREVISTA.docx', 
                `001_Entrevista_${comprador.nombreCompleto}`, 
                datosParaDocumentos
            );
        } catch (e) { console.error("❌ Fallo 001:", e); }
        
        setTimeout(async () => {
            try {
                const rfcLimpio = (comprador.rfc || '').trim();
                const esMoral = rfcLimpio.length === 12;
                const plantillaKYC = esMoral ? '/templates/002_KYC_MORAL.docx' : '/templates/002_KYC_FISICA.docx'; 
                console.log(`⬇️ Descargando KYC...`);
                await documentGenerator.generarWord(plantillaKYC, `002_KYC_${esMoral ? 'Moral' : 'Fisica'}_${comprador.nombreCompleto}`, datosParaDocumentos);
            } catch (e) { console.error("❌ Fallo 002:", e); }
        }, 1000);
        
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

    // ✨ DISEÑO PETITE (Más limpio y pequeño)
    const getStatusBadge = (tipo: string) => {
        switch(tipo) {
            case 'Venta finalizada': 
                return <span className="px-2 py-0.5 inline-flex text-[9px] font-semibold rounded-full bg-green-50 text-green-700 border border-green-100 tracking-wide">VENTA</span>;
            case 'Propiedad Separada': 
                return <span className="px-2 py-0.5 inline-flex text-[9px] font-semibold rounded-full bg-yellow-50 text-yellow-700 border border-yellow-100 tracking-wide">SEPARADA</span>;
            default: 
                return <span className="px-2 py-0.5 inline-flex text-[9px] font-semibold rounded-full bg-blue-50 text-blue-600 border border-blue-100 tracking-wide">PROPUESTA</span>;
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    // ✨ NUEVA LÓGICA DE ESTADOS DE VERIFICACIÓN (DISEÑO PETITE)
    const renderVerificationBadge = (comprador: Comprador) => {
        const inePldOk = comprador.ineValidado && comprador.pldValidado;
        const biometriaOk = comprador.biometricStatus === 'Verificado';

        // 1. TODO CORRECTO (VERDE SUAVE & REDONDO)
        if (inePldOk && biometriaOk) {
            return (
                <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1 mt-1 bg-emerald-50 px-2 py-0.5 rounded-full w-fit border border-emerald-100 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    VERIFICADO
                </span>
            );
        }

        // 2. FALTA BIOMETRÍA (NARANJA SUAVE & REDONDO)
        if (inePldOk && !biometriaOk) {
            return (
                <span className="text-[9px] text-orange-600 font-semibold flex items-center gap-1 mt-1 bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100" title="El cliente debe completar la selfie">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0-3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    FALTA SELFIE
                </span>
            );
        }

        // 3. FALTA INE/PLD (GRIS MINIMALISTA)
        return (
            <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1 mt-1 bg-gray-50 px-2 py-0.5 rounded-full w-fit border border-gray-100">
                PENDIENTE
            </span>
        );
    };

    return (
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
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

                        return (
                            <tr key={comprador.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 align-middle">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-900">{comprador.nombreCompleto}</span>
                                        
                                        {/* ✅ AQUÍ USAMOS LA NUEVA FUNCIÓN PETITE */}
                                        {renderVerificationBadge(comprador)}

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