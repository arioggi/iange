import { supabase } from '../supabaseClient';

// --- TIPOS DE DATOS (Alineados a la Documentación NuFi) ---
interface InePayload {
  tipo_identificacion: string; // 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
  ocr: string;
  clave_de_elector: string;
  numero_de_emision: string;
  cic?: string; 
  identificador_del_ciudadano?: string; 
}

interface BiometricsPayload {
  imagen_rostro: string;
  credencial_frente: string;
  credencial_reverso: string;
}

// --- FUNCIÓN PRINCIPAL (El cartero) ---
const callNufiProxy = async (
  action: 'check-blacklist' | 'validate-ine' | 'biometric-match' | 'extract-ocr', 
  payload: any, 
  tenantId: string
) => {
  const { data, error } = await supabase.functions.invoke('nufi-proxy', {
    body: {
      action,
      payload,
      tenant_id: tenantId
    }
  });

  if (error) {
    console.error("❌ Error CRÍTICO Edge Function:", error);
    throw error;
  }

  // Diagnóstico de errores que vienen de NuFi (Status 200 pero logical error)
  if (data && (data.status === 'error' || data.status === 'failure')) {
      console.warn(`⚠️ NuFi Error (${action}):`, data.message);
      
      // Si el backend nos mandó debug info, la mostramos
      if (data._debug_sent_key) {
        console.log(`🔑 Backend intentó usar la llave: ${data._debug_sent_key}`);
      }
  }

  return data;
};

// --- MÉTODOS PÚBLICOS ---

// 1. PLD / LISTAS NEGRAS
export const checkBlacklist = async (nombreCompleto: string, entityId: string, tenantId: string) => {
  // Estructura para el endpoint /aml
  const payload = { 
    nombres: [nombreCompleto], 
    buscar_en: "todos" 
  };
  return await callNufiProxy('check-blacklist', payload, tenantId);
};

// 2. VALIDAR VIGENCIA INE
export const validateIneData = async (datosIne: InePayload, entityId: string, tenantId: string) => {
  // Enviamos datos puros, el backend los estructura
  return await callNufiProxy('validate-ine', datosIne, tenantId);
};

// 3. BIOMETRÍA (Selfie vs INE)
export const verifyBiometrics = async (
  selfieBase64: string, 
  ineFrenteBase64: string, 
  ineReversoBase64: string,
  entityId: string, 
  tenantId: string
) => {
  const clean = (str: string) => str.includes(',') ? str.split(',').pop() || str : str;
  
  const payload = {
      imagen_rostro: clean(selfieBase64),
      credencial_frente: clean(ineFrenteBase64),
      credencial_reverso: clean(ineReversoBase64)
  };
  return await callNufiProxy('biometric-match', payload, tenantId);
};

// 4. OCR (Extracción de Datos) - EL FIX MAESTRO
export const extractFromImage = async (
  base64Image: string, 
  side: 'frente' | 'reverso', 
  tenantId: string
) => {
  // 1. Limpieza Local: Aseguramos que no vaya basura
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',').pop() || base64Image : base64Image;
  
  console.log(`🔍 [${side}] Enviando a Proxy... (${cleanBase64.length} chars)`);

  // 2. Estructura Genérica:
  // Enviamos 'image_data'. El Backend decidirá si ponerle "base64_credencial_frente"
  // o "base64_credencial_reverso" basándose en el campo 'side'.
  const payload = {
      side: side,
      image_data: cleanBase64 
  };
  
  return await callNufiProxy('extract-ocr', payload, tenantId);
};