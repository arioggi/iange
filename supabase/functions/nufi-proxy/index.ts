// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- HERRAMIENTAS DE SANITIZACIÓN ---
// 1. Solo números (quita espacios, letras, guiones)
const cleanNumbersOnly = (val: unknown) => String(val || '').replace(/\D/g, '').trim();

// 2. Alfanumérico limpio (Mayúsculas, sin ñ, sin acentos raros, sin espacios)
const cleanAlphaNum = (val: unknown) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

// 3. Texto normal limpio (quita espacios dobles, trim)
const cleanText = (val: unknown) => String(val || '').trim().replace(/\s+/g, ' ');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, payload, entity_id, tenant_id, entity_type } = body
    
    // --- AUTH ---
    const generalKey = Deno.env.get('NUFI_KEY_GENERAL') || ''
    if (!generalKey || generalKey.length < 5) {
        throw new Error("Falta la variable NUFI_KEY_GENERAL en Supabase.")
    }

    let nufiUrl = ''
    let headerKeyName = 'NUFI-API-KEY'
    let nufiBody: Record<string, unknown> = {}

    // --- LÓGICA DE LIMPIEZA POR TIPO DE PETICIÓN ---

    if (action === 'validate-ine') {
      // PROMPT: "Error 500 en Validación de Lista Nominal (INE)"
      // CAUSA: Inconsistencia en formato. SOLUCIÓN: Sanitización estricta.
      
      nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
      headerKeyName = 'Ocp-Apim-Subscription-Key'
      
      // 1. Limpieza de Clave de Elector (Solo letras y números, mayúsculas)
      const claveElector = cleanAlphaNum(payload.clave_de_elector);

      // 2. Número de emisión (Siempre 2 dígitos. Si es vacio o null, asume "00")
      let emision = cleanNumbersOnly(payload.numero_de_emision);
      if (emision.length === 0) emision = "00"; 
      if (emision.length === 1) emision = "0" + emision;

      // 3. Tipo de ID (Limpiar ruido, default a 'C' si falla, tomar solo la primera letra)
      let tipoId = cleanAlphaNum(payload.tipo_identificacion);
      if (tipoId.length === 0) tipoId = "C";
      tipoId = tipoId.substring(0, 1); 

      // 4. Identificadores Numéricos (CIC, OCR, ID Ciudadano)
      // El prompt dice: "El sistema intenta enviar campos que no existen en modelos antiguos... enviando valores null"
      // Solución: Solo agregamos al body lo que tenga valor real después de limpiar.
      
      const cicClean = cleanNumbersOnly(payload.cic);
      const ocrClean = cleanNumbersOnly(payload.ocr);
      const idCiudadanoClean = cleanNumbersOnly(payload.identificador_del_ciudadano);

      // Construcción del objeto limpio para Azure
      const cleanPayload: Record<string, string> = {
          tipo_identificacion: tipoId,
          clave_de_elector: claveElector,
          numero_de_emision: emision
      };

      // Solo inyectamos si existen y no están vacíos para no enviar "" que causa 500
      if (cicClean.length > 0) cleanPayload.cic = cicClean;
      if (ocrClean.length > 0) cleanPayload.ocr = ocrClean;
      if (idCiudadanoClean.length > 0) cleanPayload.identificador_del_ciudadano = idCiudadanoClean;

      // Log de seguridad para ver qué estamos enviando realmente (sin datos sensibles completos)
      console.log(`🧹 INE Sanitizada: Tipo:${tipoId}, Emision:${emision}, TieneCIC:${cicClean.length>0}, TieneOCR:${ocrClean.length>0}`);

      nufiBody = cleanPayload;

    } else if (action === 'check-blacklist') {
      // PROMPT: Request de PLD
      nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
      
      nufiBody = {
          nombre_completo: cleanText(payload.nombre_completo),
          primer_nombre: cleanText(payload.primer_nombre),
          segundo_nombre: cleanText(payload.segundo_nombre),
          apellidos: cleanText(payload.apellidos),
          // Si la fecha viene vacía, no la mandamos o la mandamos vacía según requiera la API. 
          // Usualmente PLD acepta strings vacíos, pero limpiamos espacios.
          fecha_nacimiento: cleanText(payload.fecha_nacimiento), 
          lugar_nacimiento: cleanText(payload.lugar_nacimiento)
      };

    } else if (action === 'extract-ocr') {
      nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
      const img = payload.image_data?.includes(',') ? payload.image_data.split(',').pop() : payload.image_data
      nufiBody = payload.side === 'frente' ? { "base64_credencial_frente": img } : { "base64_credencial_reverso": img }
      
    } else {
      // Biometrico u otros
      nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie';
      nufiBody = payload;
    }

    // --- EJECUCIÓN ---
    let finalData = null
    let lastStatus = 500

    try {
        console.log(`🚀 Request a NuFi: ${action} (Body size: ${JSON.stringify(nufiBody).length})`)

        const response = await fetch(nufiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [headerKeyName]: generalKey },
          body: JSON.stringify(nufiBody)
        })

        if (!response.ok) {
             // Manejo de respuesta NO-JSON (HTML Error de Azure)
             const textResp = await response.text();
             let jsonError;
             try {
                jsonError = JSON.parse(textResp);
             } catch {
                // Si falla el parseo, es que Azure devolvió HTML o texto plano (el Error 500 sucio)
                console.error(`🔥 NuFi Error Crudo (Posible 500/HTML): ${textResp.substring(0, 200)}...`);
                throw new Error(`Error remoto de NuFi (${response.status}): El servicio externo devolvió una respuesta inválida.`);
             }
             throw new Error(jsonError.message || `Error NuFi ${response.status}`);
        }

        finalData = await response.json()
        lastStatus = response.status;

    } catch (e) {
        const errMessage = e instanceof Error ? e.message : String(e);
        console.error(`❌ Error Nufi/Azure:`, errMessage)
        throw new Error(errMessage);
    }

    // --- LOGGING DB (Sin cambios) ---
    if (entity_id && tenant_id) {
      try {
          const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
          const validationTypeMap: Record<string, string> = {
              'validate-ine': 'INE_CHECK',
              'check-blacklist': 'PLD_CHECK',
              'biometric-match': 'BIOMETRIC_CHECK',
              'extract-ocr': 'OCR_EXTRACT'
          };
          
          await adminClient.from('kyc_validations').insert({
            tenant_id, entity_id, entity_type: entity_type || 'Cliente',
            validation_type: validationTypeMap[action] || action.toUpperCase(),
            status: lastStatus === 200 ? 'success' : 'error',
            api_response: finalData, api_key_usage: 99 
          });
      } catch (err) { console.error("Error DB Log:", err) }
    }

    return new Response(JSON.stringify(finalData), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ status: 'error', message: errorMessage }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})