import { supabase } from '../supabaseClient';

// --- TIPOS DE DATOS (Para que TypeScript te ayude) ---

interface InePayload {
  tipo_identificacion: 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  ocr: string; // Los 13 dígitos verticales
  clave_de_elector?: string;
  numero_de_emision?: string;
  cic?: string; 
  identificador_del_ciudadano?: string; 
}

interface BiometricsPayload {
  imagen_rostro: string;      // Base64 limpia
  credencial_frente: string;  // Base64 limpia
  credencial_reverso: string; // Base64 limpia
}

// --- FUNCIÓN PRINCIPAL (El cartero) ---
const callNufiProxy = async (
  // Agregamos 'extract-ocr' a las acciones permitidas
  action: 'check-blacklist' | 'validate-ine' | 'biometric-match' | 'extract-ocr', 
  payload: any, 
  entityId: string, 
  entityType: 'propietario' | 'comprador', 
  tenantId: string
) => {
  console.log(`📡 Solicitando servicio NuFi: ${action}...`);
  
  const { data, error } = await supabase.functions.invoke('nufi-proxy', {
    body: {
      action,
      payload,
      tenant_id: tenantId,
      entity_id: entityId,
      entity_type: entityType
    }
  });

  if (error) {
    console.error("❌ Error en Edge Function:", error);
    throw error;
  }

  return data;
};

// --- MÉTODOS PÚBLICOS (Lo que usarás en tus botones) ---

// 1. Validar Listas Negras (PLD) - REAL
export const checkBlacklist = async (nombreCompleto: string, entityId: string, tenantId: string) => {
  const payload = {
    nombre_completo: nombreCompleto,
    fuzzy_enabled: true // Permite encontrar coincidencias aunque haya errores de dedo leves
  };
  // Asumimos 'comprador' por defecto
  return await callNufiProxy('check-blacklist', payload, entityId, 'comprador', tenantId);
};

// 2. Validar INE ante Gobierno (Datos OCR) - REAL
export const validateIneData = async (datosIne: InePayload, entityId: string, tenantId: string) => {
  return await callNufiProxy('validate-ine', datosIne, entityId, 'propietario', tenantId);
};

// 3. Biometría (Selfie vs INE) - REAL
export const verifyBiometrics = async (
  selfieBase64: string, 
  ineFrenteBase64: string, 
  ineReversoBase64: string,
  entityId: string, 
  tenantId: string
) => {
  // Función auxiliar para quitar el prefijo "data:image/jpg;base64," si existe
  const clean = (str: string) => str.replace(/^data:image\/[a-z]+;base64,/, "");

  const payload: BiometricsPayload = {
    imagen_rostro: clean(selfieBase64),
    credencial_frente: clean(ineFrenteBase64),
    credencial_reverso: clean(ineReversoBase64)
  };
  
  return await callNufiProxy('biometric-match', payload, entityId, 'propietario', tenantId);
};

// 4. NUEVO: OCR Automático (Extraer datos de la foto)
export const extractFromImage = async (
  base64Image: string, 
  side: 'frente' | 'reverso', 
  tenantId: string
) => {
  // Limpiamos el base64
  const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");
  
  // Enviamos al proxy
  return await callNufiProxy(
    'extract-ocr', 
    { 
      side, 
      body: { imagen: cleanBase64 } // Estructura que pide NuFi OCR v4
    }, 
    'OCR-TEMP', // ID temporal ya que es solo lectura
    'propietario', 
    tenantId
  );
};