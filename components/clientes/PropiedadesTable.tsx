import React from 'react';
import { Propiedad, Propietario } from '../../types';
import { documentGenerator, DatosLegales } from '../../Services/DocumentGenerator';
import { DocumentArrowDownIcon } from '../Icons'; 
// ✅ NUEVOS IMPORTS PARA EL CERTIFICADO
import { supabase } from '../../supabaseClient';
import { pdf } from '@react-pdf/renderer';
import { CertificadoKYCPDF } from '../PDF/CertificadoKYCPDF';
import { saveAs } from 'file-saver';

interface PropiedadesTableProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    onEdit: (propiedad: Propiedad) => void;
    onDelete: (propiedad: Propiedad) => void;
}

const PropiedadesTable: React.FC<PropiedadesTableProps> = ({ propiedades, propietarios, onEdit, onDelete }) => {
    
    // ✅ FUNCIÓN CORREGIDA: Extrae con seguridad la clave "selfie" del JSON de evidencia
    const handleDownloadKYCReport = async (propietario: Propietario) => {
        try {
            const { data, error } = await supabase
                .from('kyc_validations')
                .select('validation_type, api_response, validation_evidence')
                .eq('entity_id', propietario.id)
                .eq('status', 'success');

            if (error || !data || data.length === 0) {
                alert("No hay datos técnicos suficientes para generar este certificado todavía.");
                return;
            }

            // Buscamos el registro biométrico
            const bioRecord = data.find(v => v.validation_type === 'BIOMETRIC_MATCH');
            
            // ✅ EXTRACCIÓN ROBUSTA DE LA SELFIE (Evita fallos si el JSON viene como string)
            let extractedSelfie = null;
            if (bioRecord && bioRecord.validation_evidence) {
                const evidence = bioRecord.validation_evidence;
                const parsedEvidence = typeof evidence === 'string' ? JSON.parse(evidence) : evidence;
                extractedSelfie = parsedEvidence.selfie; 
            }

            const kycData = {
                ine: data.find(v => v.validation_type === 'VALIDATE_INE')?.api_response,
                pld: data.find(v => v.validation_type === 'CHECK_BLACKLIST')?.api_response,
                bio: bioRecord?.api_response,
                selfieUrl: extractedSelfie // ✅ Pasamos la URL final al PDF
            };

            const blob = await pdf(
                <CertificadoKYCPDF 
                    kycData={kycData} 
                    nombre={propietario.nombreCompleto} 
                />
            ).toBlob();
            
            saveAs(blob, `Certificado_KYC_${propietario.nombreCompleto.replace(/\s/g, '_')}.pdf`);
        } catch (err) {
            console.error("Error generando PDF:", err);
            alert("Hubo un error al generar el PDF.");
        }
    };

    // ✅ LÓGICA DE GENERACIÓN DE DOCUMENTOS WORD
    const handleDescargarKitLegal = async (propiedad: Propiedad) => {
        const propietario = propietarios.find(p => p.id === propiedad.propietarioId);

        if (!propietario) {
            alert("⚠️ No se encontraron los datos del propietario.");
            return;
        }

        const datosParaDocumentos: DatosLegales = {
            cliente: {
                nombre: propietario.nombreCompleto,
                rfc: propietario.rfc || 'XAXX010101000', 
                curp: propietario.curp || '', 
                nacionalidad: propietario.nacionalidad || 'Mexicana',
                fecha_nacimiento: propietario.fechaNacimiento || '', 
                pais_nacimiento: 'México',
                estado_civil: propietario.estadoCivil || '',
                ocupacion: propietario.ocupacion || 'Empresario', 
                telefono: propietario.telefono || '',
                email: propietario.email || '',
                calle: propietario.calle || '',
                numero_exterior: propietario.numeroExterior || '',
                numero_interior: '', 
                colonia: propietario.colonia || '',
                cp: propietario.codigoPostal || '', 
                ciudad: propietario.municipio || '',
                municipio: propietario.municipio || '',
                estado: propietario.estado || 'Nuevo León', 
                pais: 'México'
            },
            representante: { nombre: '', rfc: '', telefono: '' },
            inmueble: {
                calle: propiedad.calle || '',
                numero_exterior: propiedad.numero_exterior || '',
                colonia: propiedad.colonia || '',
                municipio: propiedad.municipio || '',
                estado: propiedad.estado || 'Nuevo León',
                cp: propiedad.codigo_postal || '' 
            },
            transaccion: {
                monto_operacion: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(propiedad.valor_operacion?.replace(/,/g, '') || 0)),
                fecha_operacion: new Date().toLocaleDateString('es-MX'),
                metodo_pago: 'Transferencia Electrónica',
                banco_origen: '',
                cuenta_origen: ''
            },
            beneficiario: undefined 
        };

        alert("⏳ Iniciando descargas... Revisa si el navegador bloqueó las ventanas emergentes.");

        try {
            await documentGenerator.generarWord('/templates/001_FORMATO_ENTREVISTA.docx', `001_Entrevista_${propietario.nombreCompleto}`, datosParaDocumentos);
        } catch (e) { console.error("❌ Fallo 001:", e); }
        
        setTimeout(async () => {
            try {
                const rfcLimpio = (propietario.rfc || '').trim();
                const esMoral = rfcLimpio.length === 12;
                const plantillaKYC = esMoral ? '/templates/002_KYC_MORAL.docx' : '/templates/002_KYC_FISICA.docx'; 
                await documentGenerator.generarWord(plantillaKYC, `002_KYC_${esMoral ? 'Moral' : 'Fisica'}_${propietario.nombreCompleto}`, datosParaDocumentos);
            } catch (e) { console.error("❌ Fallo 002:", e); }
        }, 1000);
        
        setTimeout(async () => {
            try {
                await documentGenerator.generarWord('/templates/003_AVISO_PLD.docx', `003_Aviso_PLD_${propietario.nombreCompleto}`, datosParaDocumentos);
            } catch (e) { console.error("❌ Fallo 003:", e); }
        }, 2000);
    };

    const renderVerificationBadge = (propietario: Propietario) => {
        const inePldOk = propietario.ineValidado && propietario.pldValidado;
        const biometriaOk = propietario.biometricStatus === 'Verificado';

        if (inePldOk && biometriaOk) {
            return (
                <div className="flex flex-col gap-1 mt-0.5">
                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full w-fit border border-emerald-100 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        VERIFICADO
                    </span>
                    <button 
                        onClick={() => handleDownloadKYCReport(propietario)}
                        className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 px-1 hover:underline text-left"
                    >
                        <DocumentArrowDownIcon className="h-3 w-3" />
                        DESCARGAR CERTIFICADO
                    </button>
                </div>
            );
        }

        if (inePldOk && !biometriaOk) {
            return (
                <span className="text-[9px] text-orange-600 font-semibold flex items-center gap-1 mt-0.5 bg-orange-50 px-2 py-0.5 rounded-full w-fit border border-orange-100" title="El propietario debe completar la selfie">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0-3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    FALTA SELFIE
                </span>
            );
        }

        return (
            <span className="text-[9px] text-gray-400 font-medium flex items-center gap-1 mt-1 bg-gray-50 px-2 py-0.5 rounded-full w-fit border border-gray-100">
                PENDIENTE
            </span>
        );
    };

    const renderPropietarioCell = (propietarioId: number) => {
        const propietario = propietarios.find(p => p.id === propietarioId);
        if (!propietario) return <span className="text-gray-400 italic">No asignado</span>;
        
        return (
            <div className="flex flex-col">
                <span className="text-gray-900 font-medium">{propietario.nombreCompleto}</span>
                {renderVerificationBadge(propietario)}
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
        <div className="overflow-hidden border border-gray-200 rounded-lg shadow-sm bg-white">
            <table className="min-w-full divide-y divide-gray-200">
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