// Services/DocumentGenerator.ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ✅ ESTRUCTURA MEJORADA Y COMPLETA
export interface DatosLegales {
  cliente: {
    nombre: string;
    rfc: string;
    curp: string;
    nacionalidad: string;
    fecha_nacimiento: string; // También sirve como fecha constitución
    pais_nacimiento: string; 
    estado_civil: string;
    ocupacion: string; // Giro o Actividad
    telefono: string;
    email: string;
    // Domicilio Cliente
    calle: string;
    numero_exterior: string;
    numero_interior: string;
    colonia: string;
    cp: string;
    ciudad: string;
    municipio: string;
    estado: string;
    pais: string;
  };
  // ✅ NUEVO: Para Persona Moral (Empresas)
  representante?: {
    nombre: string;
    rfc?: string;
    fecha_nacimiento?: string;
    nacionalidad?: string;
    telefono?: string;
    email?: string;
  };
  // ✅ NUEVO: Datos de la Propiedad (Requerido para Aviso PLD)
  inmueble: {
    calle: string;
    numero_exterior: string;
    colonia: string;
    cp: string;
    municipio: string;
    estado: string;
  };
  transaccion: {
    monto_operacion: string; 
    fecha_operacion: string;
    metodo_pago: string;
    banco_origen?: string;
    cuenta_origen?: string;
  };
  beneficiario?: {
    nombre: string;
    relacion: string;
  };
}

export const documentGenerator = {
  /**
   * 📄 GENERADOR UNIVERSAL DE WORD
   * Sirve para: 001_Entrevista, 002_KYC (Física/Moral) y 003_Aviso_PLD
   */
  generarWord: async (urlPlantilla: string, nombreSalida: string, datos: DatosLegales) => {
    try {
      console.log(`📥 Descargando plantilla: ${urlPlantilla}`);
      const response = await fetch(urlPlantilla);
      
      if (!response.ok) throw new Error(`No se pudo cargar la plantilla: ${urlPlantilla} (Status: ${response.status})`);
      
      // Verificación de seguridad: Evitar que intente leer index.html como zip
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        throw new Error("⚠️ La ruta apunta a un archivo HTML (posiblemente la página 404). Verifica que el archivo .docx esté realmente en la carpeta /public/templates/");
      }

      const content = await response.arrayBuffer();
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      // Lógica de variables calculadas
      const esPropio = !datos.beneficiario; 
      const metodoPago = datos.transaccion.metodo_pago.toLowerCase();

      // Construcción de dirección completa (para formatos que no piden desglose)
      const domicilioCompleto = `${datos.cliente.calle} ${datos.cliente.numero_exterior}, ${datos.cliente.colonia}, CP ${datos.cliente.cp}, ${datos.cliente.municipio}, ${datos.cliente.estado}`;

      // 📝 MAPEO DE VARIABLES (Lo que escribimos en los {} del Word)
      doc.render({
        // --- DATOS CLIENTE ---
        nombre_cliente: datos.cliente.nombre,
        rfc: datos.cliente.rfc,
        curp: datos.cliente.curp,
        fecha_nacimiento: datos.cliente.fecha_nacimiento,
        fecha_constitucion: datos.cliente.fecha_nacimiento, // Alias para Moral
        nacionalidad: datos.cliente.nacionalidad,
        pais_nacimiento: datos.cliente.pais_nacimiento,
        estado_civil: datos.cliente.estado_civil,
        ocupacion: datos.cliente.ocupacion,
        telefono: datos.cliente.telefono,
        email: datos.cliente.email,
        
        // Domicilio Cliente (Desglosado y Completo)
        calle: datos.cliente.calle,
        num_ext: datos.cliente.numero_exterior,
        num_int: datos.cliente.numero_interior,
        colonia: datos.cliente.colonia,
        cp: datos.cliente.cp,
        municipio: datos.cliente.municipio,
        ciudad: datos.cliente.ciudad,
        estado: datos.cliente.estado,
        pais: datos.cliente.pais,
        domicilio: domicilioCompleto, // Alias para Entrevista
        domicilio_completo: domicilioCompleto,

        // --- DATOS REPRESENTANTE LEGAL (Moral) ---
        rep_nombre: datos.representante?.nombre || "__________________",
        rep_rfc: datos.representante?.rfc || "__________________",
        rep_fecha_nac: datos.representante?.fecha_nacimiento || "__________",
        rep_nacionalidad: datos.representante?.nacionalidad || "__________",
        rep_telefono: datos.representante?.telefono || "__________",
        rep_email: datos.representante?.email || "__________",

        // --- DATOS INMUEBLE (Aviso PLD) ---
        inmueble_calle: datos.inmueble.calle,
        inmueble_ext: datos.inmueble.numero_exterior,
        inmueble_colonia: datos.inmueble.colonia,
        inmueble_cp: datos.inmueble.cp,
        inmueble_municipio: datos.inmueble.municipio,
        inmueble_estado: datos.inmueble.estado,

        // --- TRANSACCIÓN Y BENEFICIARIO ---
        monto_operacion: datos.transaccion.monto_operacion,
        fecha_operacion: datos.transaccion.fecha_operacion,
        metodo_pago: datos.transaccion.metodo_pago,
        banco_origen: datos.transaccion.banco_origen || "N/A",
        cuenta_bancaria: datos.transaccion.cuenta_origen || "****",
        
        nombre_beneficiario: datos.beneficiario?.nombre || "N/A",
        relacion_beneficiario: datos.beneficiario?.relacion || "N/A",

        // --- CHECKBOXES (X o vacío) ---
        check_propio_si: esPropio ? "X" : " ",
        check_propio_no: !esPropio ? "X" : " ",
        check_trans: metodoPago.includes('transferencia') ? "X" : " ",
        check_cheque: metodoPago.includes('cheque') ? "X" : " ",
        check_credito: metodoPago.includes('crédito') || metodoPago.includes('credito') ? "X" : " ",

        // --- FECHAS ---
        fecha_firma: new Date().toLocaleDateString('es-MX')
      });

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveAs(out, `${nombreSalida}.docx`);
    } catch (error) {
      console.error("❌ Error generando Word:", error);
      alert(`Error al generar el documento Word (${nombreSalida}).\n\nPosible causa: No se encuentra el archivo en /public/templates/ o el nombre es incorrecto.`);
    }
  },

  /**
   * 📄 GENERADOR DE WORD (ENTREVISTA LEGACY)
   * Mantenemos este nombre por si tu código lo llama así específicamente,
   * pero redirige internamente a la nueva función universal.
   */
  generarWordEntrevista: async (urlPlantilla: string, datos: DatosLegales) => {
    return documentGenerator.generarWord(urlPlantilla, `001_Entrevista_${datos.cliente.nombre}`, datos);
  },

  /**
   * 📊 GENERADOR DE EXCEL UNIVERSAL
   * (Mantenemos por compatibilidad si decides usar Excel para algo más)
   */
  generarExcelUniversal: async (urlPlantilla: string, nombreSalida: string, datos: DatosLegales) => {
    try {
      const response = await fetch(urlPlantilla);
      if (!response.ok) throw new Error(`No se pudo cargar la plantilla: ${urlPlantilla}`);
      const buffer = await response.arrayBuffer();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const reemplazos: Record<string, string> = {
        '$nombre_cliente': datos.cliente.nombre,
        '$rfc': datos.cliente.rfc,
        '$curp': datos.cliente.curp,
        '$ocupacion': datos.cliente.ocupacion,
        '$calle': datos.cliente.calle,
        '$num_ext': datos.cliente.numero_exterior,
        '$colonia': datos.cliente.colonia,
        '$cp': datos.cliente.cp,
        '$monto': datos.transaccion.monto_operacion,
      };

      workbook.eachSheet((worksheet) => {
        worksheet.eachRow((row) => {
          row.eachCell((cell) => {
            if (cell.value && typeof cell.value === 'string') {
              const textoCelda = cell.value.toString();
              if (reemplazos[textoCelda]) {
                cell.value = reemplazos[textoCelda];
              }
            }
          });
        });
      });

      const bufferSalida = await workbook.xlsx.writeBuffer();
      const blob = new Blob([bufferSalida], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${nombreSalida}.xlsx`);

    } catch (error) {
      console.error("Error Excel:", error);
      alert("Error al generar el archivo Excel.");
    }
  }
};