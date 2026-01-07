// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Manejo Preflight CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, payload, entity_id, tenant_id, entity_type } = body
    
    // --- 1. ESTRATEGIA DE LLAVES: USAR SOLO LA GENERAL ---
    const generalKey = Deno.env.get('NUFI_KEY_GENERAL') || ''
    
    // Creamos el pool solo con esta llave
    const keysPool = [generalKey.trim()].filter(k => k.length > 5)

    if (keysPool.length === 0) {
        throw new Error("No se encontró la variable NUFI_KEY_GENERAL en Supabase Secrets.")
    }

    // --- 2. CONFIGURACIÓN DEL FETCH ---
    let nufiUrl = ''
    let headerKeyName = 'NUFI-API-KEY'
    let nufiBody: Record<string, unknown> = {}

    if (action === 'validate-ine') {
      nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
      headerKeyName = 'Ocp-Apim-Subscription-Key'
      
      const cleanNum = (val: unknown) => String(val || '').replace(/\D/g, '').trim();
      const ocrVal = cleanNum(payload.ocr);
      const cicVal = cleanNum(payload.cic || payload.identificador_del_ciudadano || ocrVal);

      // Limpieza para evitar Error 500 en Azure
      const baseBody: Record<string, unknown> = {
          tipo_identificacion: String(payload.tipo_identificacion || 'C').toUpperCase(),
          clave_de_elector: String(payload.clave_de_elector || '').toUpperCase().trim(),
          numero_de_emision: String(payload.numero_de_emision || "00").padStart(2, '0')
      }

      if (ocrVal.length > 0) baseBody.ocr = ocrVal;
      if (cicVal.length > 0) {
          baseBody.cic = cicVal;
          baseBody.identificador_del_ciudadano = cicVal;
      }

      nufiBody = baseBody;

    } else if (action === 'extract-ocr') {
      nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
      const img = payload.image_data?.includes(',') ? payload.image_data.split(',').pop() : payload.image_data
      nufiBody = payload.side === 'frente' ? { "base64_credencial_frente": img } : { "base64_credencial_reverso": img }
    } else {
      nufiUrl = action === 'check-blacklist' ? 'https://nufi.azure-api.net/perfilamiento/v1/aml' : 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie';
      nufiBody = payload;
    }

    // --- 3. EJECUCIÓN (SIN TIMEOUT MANUAL) ---
    // Hemos eliminado el AbortController y setTimeout.
    // Ahora depende exclusivamente del tiempo máximo que permita Supabase Edge Functions.
    
    let finalData = null
    let lastStatus = 500
    const currentKey = keysPool[0];

    try {
        console.log(`🚀 Ejecutando ${action} con NUFI_KEY_GENERAL (Sin límite de tiempo)...`)

        const response = await fetch(nufiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', [headerKeyName]: currentKey },
          body: JSON.stringify(nufiBody)
          // signal: ELIMINADO
        })
        
        // Verificamos si la respuesta es OK antes de parsear
        if (!response.ok) {
            throw new Error(`Error HTTP NuFi: ${response.status} ${response.statusText}`);
        }

        const data = await response.json()
        
        finalData = data;
        lastStatus = response.status;

    } catch (e) {
        // Corrección de tipos para el catch
        const errMessage = e instanceof Error ? e.message : String(e);
        console.error(`❌ Error de comunicación con Nufi:`, errMessage)
        throw new Error(`Error de comunicación con Nufi: ${errMessage}`);
    }

    // --- 4. LOGGING (CORREGIDO PARA TS) ---
    if (entity_id && tenant_id) {
      try {
          const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
          const validationTypeMap: Record<string, string> = {
              'validate-ine': 'INE_CHECK',
              'check-blacklist': 'PLD_CHECK',
              'biometric-match': 'BIOMETRIC_CHECK',
              'extract-ocr': 'OCR_EXTRACT'
          };
          
          const { error: logError } = await adminClient.from('kyc_validations').insert({
            tenant_id, 
            entity_id, 
            entity_type: entity_type || 'Cliente',
            validation_type: validationTypeMap[action] || action.toUpperCase(),
            status: lastStatus === 200 ? 'success' : 'error',
            api_response: finalData, 
            api_key_usage: 99 
          });

          if (logError) {
              console.error("Error guardando log en BD:", logError);
          }
            
      } catch (err) { 
          const errMessage = err instanceof Error ? err.message : String(err);
          console.error("Error cliente DB:", errMessage) 
      }
    }

    return new Response(JSON.stringify(finalData), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ ERROR CRÍTICO:", errorMessage)
    
    return new Response(JSON.stringify({ status: 'error', message: errorMessage }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})