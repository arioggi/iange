import { supabase } from '../supabaseClient';

// --- TIPOS DE DATOS ---
interface InePayload {
  tipo_identificacion: string;
  ocr: string;
  clave_de_elector: string;
  numero_de_emision: string;
  cic?: string; 
  identificador_del_ciudadano?: string; 
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

  // Diagnóstico de errores lógicos de Nufi
  if (data && (data.status === 'error' || data.status === 'failure' || data.code === 400)) {
      console.warn(`⚠️ NuFi Error (${action}):`, data.message);
  }

  return data;
};

// --- MÉTODOS PÚBLICOS ---

// 1. PLD / LISTAS NEGRAS (CORREGIDO SEGÚN TU CURL)
export const checkBlacklist = async (nombreCompleto: string, entityId: string, tenantId: string) => {
  // ⚠️ FIX: Usamos la estructura exacta del CURL que proporcionaste.
  // La llave obligatoria es "nombre_completo".
  const payload = {
    "nombre_completo": nombreCompleto,
    "primer_nombre": "",
    "segundo_nombre": "",
    "apellidos": "",
    "fecha_nacimiento": "",
    "lugar_nacimiento": ""
  };
  
  console.log("📤 Enviando a PLD:", payload);
  return await callNufiProxy('check-blacklist', payload, tenantId);
};

// 2. VALIDAR VIGENCIA INE
export const validateIneData = async (datosIne: InePayload, entityId: string, tenantId: string) => {
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

// 4. OCR (Extracción de Datos)
export const extractFromImage = async (
  base64Image: string, 
  side: 'frente' | 'reverso', 
  tenantId: string
) => {
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',').pop() || base64Image : base64Image;
  
  console.log(`🔍 [${side}] Enviando a Proxy... (${cleanBase64.length} chars)`);

  const payload = {
      side: side,
      image_data: cleanBase64 
  };
  
  return await callNufiProxy('extract-ocr', payload, tenantId);
};