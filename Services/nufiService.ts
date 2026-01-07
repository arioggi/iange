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
// 🔥 FIX: Agregamos entityId (opcional) para que viaje al log de Supabase
const callNufiProxy = async (
  action: 'check-blacklist' | 'validate-ine' | 'biometric-match' | 'extract-ocr', 
  payload: any, 
  tenantId: string,
  entityId?: string // <--- NUEVO ARGUMENTO
) => {
  
  // Debug para ver si llegan los IDs antes de salir
  if (!tenantId) console.warn("⚠️ callNufiProxy: tenantId es null o undefined");

  const { data, error } = await supabase.functions.invoke('nufi-proxy', {
    body: {
      action,
      payload,
      tenant_id: tenantId,
      entity_id: entityId // <--- AQUI SE AGREGA AL ENVÍO
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

// 1. PLD / LISTAS NEGRAS
export const checkBlacklist = async (nombreCompleto: string, entityId: string, tenantId: string) => {
  const payload = {
    "nombre_completo": nombreCompleto,
    "primer_nombre": "",
    "segundo_nombre": "",
    "apellidos": "",
    "fecha_nacimiento": "",
    "lugar_nacimiento": ""
  };
  
  console.log("📤 Enviando a PLD:", payload);
  // 🔥 FIX: Pasamos entityId al final
  return await callNufiProxy('check-blacklist', payload, tenantId, entityId);
};

// 2. VALIDAR VIGENCIA INE
export const validateIneData = async (datosIne: InePayload, entityId: string, tenantId: string) => {
  // 🔥 FIX: Pasamos entityId al final
  return await callNufiProxy('validate-ine', datosIne, tenantId, entityId);
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
  // 🔥 FIX: Pasamos entityId al final
  return await callNufiProxy('biometric-match', payload, tenantId, entityId);
};

// 4. OCR (Extracción de Datos)
export const extractFromImage = async (
  base64Image: string, 
  side: 'frente' | 'reverso', 
  tenantId: string,
  entityId?: string // Opcional aquí también por si acaso
) => {
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',').pop() || base64Image : base64Image;
  
  console.log(`🔍 [${side}] Enviando a Proxy... (${cleanBase64.length} chars)`);

  const payload = {
      side: side,
      image_data: cleanBase64 
  };
  
  // 🔥 FIX: Pasamos entityId al final
  return await callNufiProxy('extract-ocr', payload, tenantId, entityId);
};