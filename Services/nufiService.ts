import { supabase } from '../supabaseClient';

// --- TIPOS DE DATOS ---
interface InePayload {
  tipo_identificacion: 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  ocr: string;
  clave_de_elector?: string;
  numero_de_emision?: string;
  cic?: string; 
  identificador_del_ciudadano?: string; 
}

interface BiometricsPayload {
  imagen_rostro: string;
  credencial_frente: string;
  credencial_reverso: string;
}

// --- FUNCIÓN PRINCIPAL ---
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

  if (data && (data.status === 'error' || data.status === 'failure')) {
      console.warn(`⚠️ NuFi Error (${action}):`, data.message);
      // Esto nos ayudará a ver si el error es del Proxy o de NuFi
      if (data.message.includes('Proxy:')) alert(data.message); 
  }

  return data;
};

// --- MÉTODOS PÚBLICOS ---

export const checkBlacklist = async (nombreCompleto: string, entityId: string, tenantId: string) => {
  const payload = { nombres: [nombreCompleto], buscar_en: "todos" };
  return await callNufiProxy('check-blacklist', payload, tenantId);
};

export const validateIneData = async (datosIne: InePayload, entityId: string, tenantId: string) => {
  return await callNufiProxy('validate-ine', datosIne, tenantId);
};

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

// --- OCR FIX FINAL ---
export const extractFromImage = async (
  base64Image: string, 
  side: 'frente' | 'reverso', 
  tenantId: string
) => {
  // 1. Limpieza
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',').pop() || base64Image : base64Image;
  
  console.log(`🔍 [${side}] Enviando... (${cleanBase64.length} chars)`);

  // 2. Estructura Simple
  // El backend v3 es inteligente y buscará 'image_data'
  const payload = {
      side: side,
      image_data: cleanBase64 
  };
  
  return await callNufiProxy('extract-ocr', payload, tenantId);
};