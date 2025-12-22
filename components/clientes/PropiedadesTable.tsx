// components/clientes/PropiedadesTable.tsx
import React from 'react';
import { Propiedad, Propietario } from '../../types';
import { documentGenerator, DatosLegales } from '../../Services/DocumentGenerator';
// ✅ Importamos desde tu archivo de iconos local
import { DocumentArrowDownIcon } from '../Icons'; 

interface PropiedadesTableProps {
    propiedades: Propiedad[];
    propietarios: Propietario[];
    onEdit: (propiedad: Propiedad) => void;
    onDelete: (propiedad: Propiedad) => void;
}

const PropiedadesTable: React.FC<PropiedadesTableProps> = ({ propiedades, propietarios, onEdit, onDelete }) => {
    
    // --- LÓGICA DE GENERACIÓN DE DOCUMENTOS ---
    const handleDescargarKitLegal = async (propiedad: Propiedad) => {
        // 1. Buscar al propietario
        const propietario = propietarios.find(p => p.id === propiedad.propietarioId);

        if (!propietario) {
            alert("⚠️ No se encontraron los datos del propietario. Verifica la asignación.");
            return;
        }

        // 2. Preparar TODOS los datos
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

        // 3. Ejecutar descargas
        alert("⏳ Iniciando descargas... Revisa si el navegador bloqueó las ventanas emergentes (ícono arriba a la derecha).");

        try {
            // A) Archivo 001: Entrevista
            console.log("⬇️ Descargando 001_FORMATO_ENTREVISTA.docx");
            await documentGenerator.generarWord(
                '/templates/001_FORMATO_ENTREVISTA.docx', 
                `001_Entrevista_${propietario.nombreCompleto}`, 
                datosParaDocumentos
            );
        } catch (e) { console.error("❌ Fallo 001:", e); }
        
        // B) Archivo 002: KYC (Física o Moral)
        setTimeout(async () => {
            try {
                const rfcLimpio = (propietario.rfc || '').trim();
                const esMoral = rfcLimpio.length === 12;
                
                // ⚠️ AQUÍ ESTABA EL ERROR: Asegúrate que tus archivos se llamen EXACTAMENTE así:
                const plantillaKYC = esMoral 
                    ? '/templates/002_KYC_MORAL.docx' 
                    : '/templates/002_KYC_FISICA.docx'; // <--- Ojo, corregí "FISCA" a "FISICA"

                console.log(`⬇️ Descargando KYC (${esMoral ? 'Moral' : 'Física'}): ${plantillaKYC}`);
                await documentGenerator.generarWord(plantillaKYC, `002_KYC_${esMoral ? 'Moral' : 'Fisica'}_${propietario.nombreCompleto}`, datosParaDocumentos);
            } catch (e) { console.error("❌ Fallo 002:", e); }
        }, 1000);
        
        // C) Archivo 003: Aviso PLD
        setTimeout(async () => {
            try {
                console.log("⬇️ Descargando 003_AVISO_PLD.docx");
                await documentGenerator.generarWord(
                    '/templates/003_AVISO_PLD.docx', 
                    `003_Aviso_PLD_${propietario.nombreCompleto}`, 
                    datosParaDocumentos
                );
            } catch (e) { console.error("❌ Fallo 003:", e); }
        }, 2000);
    };

    // --- HELPERS ---
    const getPropietarioName = (propietarioId: number) => {
        const propietario = propietarios.find(p => p.id === propietarioId);
        return propietario ? propietario.nombreCompleto : 'N/A';
    };

    const formatCurrency = (value: string | undefined) => {
        if (!value) return 'N/A';
        const number = parseFloat(value.replace(/,/g, ''));
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(number);
    };

    const getThumbnail = (propiedad: Propiedad) => {
        if (propiedad.fotos && propiedad.fotos.length > 0) return URL.createObjectURL(propiedad.fotos[0]);
        if (propiedad.imageUrls && propiedad.imageUrls.length > 0) return propiedad.imageUrls[0];
        return 'https://via.placeholder.com/100x100.png?text=N/A';
    };
    
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                    <tr>
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
                            <td className="px-6 py-4"><img src={getThumbnail(propiedad)} alt="Miniatura" className="h-12 w-16 object-cover rounded-md border border-gray-200"/></td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{`${propiedad.calle} ${propiedad.numero_exterior}`}</div>
                                <div className="text-sm text-gray-500">{`${propiedad.colonia}, ${propiedad.municipio}`}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800">{getPropietarioName(propiedad.propietarioId)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(propiedad.valor_operacion)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${propiedad.status === 'Vendida' ? 'bg-green-100 text-green-800' : propiedad.status === 'Separada' ? 'bg-yellow-100 text-yellow-800' : propiedad.status === 'En Promoción' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{propiedad.status}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center">
                                <button onClick={() => handleDescargarKitLegal(propiedad)} className="text-gray-500 hover:text-blue-700 mr-4 transition-colors" title="Descargar Kit Legal"><DocumentArrowDownIcon className="h-5 w-5" /></button>
                                <button onClick={() => onEdit(propiedad)} className="text-indigo-600 hover:text-indigo-900 mr-4">Editar / Ver</button>
                                <button onClick={() => onDelete(propiedad)} className="text-red-600 hover:text-red-900">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PropiedadesTable;