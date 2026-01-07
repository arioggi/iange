// deno-lint-ignore-file no-import-prefix no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- HERRAMIENTAS DE SANITIZACIÓN ---
const cleanNumbersOnly = (val: unknown) => String(val || '').replace(/\D/g, '').trim();
const cleanAlphaNum = (val: unknown) => String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
const cleanText = (val: unknown) => String(val || '').trim().replace(/\s+/g, ' ');

serve(async (req: Request) => {
  // Manejo Preflight CORS
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, payload, entity_id, tenant_id, entity_type } = body
    
    // Auth: Usamos solo la llave GENERAL
    const generalKey = Deno.env.get('NUFI_KEY_GENERAL') || ''
    if (!generalKey || generalKey.length < 5) throw new Error("Falta NUFI_KEY_GENERAL en Supabase Secrets");

    let nufiUrl = ''
    let headerKeyName = 'NUFI-API-KEY'
    let nufiBody: Record<string, unknown> = {}

    // --- SELECCIÓN DE RUTA Y LIMPIEZA ---

    if (action === 'validate-ine') {
      // 1. VALIDACIÓN INE
      nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
      headerKeyName = 'Ocp-Apim-Subscription-Key' 

      const claveElector = cleanAlphaNum(payload.clave_de_elector);
      
      // Emisión: default '00' si viene vacía
      let emision = cleanNumbersOnly(payload.numero_de_emision);
      if (emision.length === 0) emision = "00"; 
      if (emision.length === 1) emision = "0" + emision;

      const tipoId = cleanAlphaNum(payload.tipo_identificacion).substring(0, 1) || "C";
      const cicClean = cleanNumbersOnly(payload.cic);
      const ocrClean = cleanNumbersOnly(payload.ocr);
      const idCiudadanoClean = cleanNumbersOnly(payload.identificador_del_ciudadano);

      console.log(`🔍 [VALIDAR INE] Envío: Tipo=${tipoId}, Emi=${emision}, CIC=${cicClean}`);

      const cleanPayload: Record<string, string> = {
          tipo_identificacion: tipoId,
          clave_de_elector: claveElector,
          numero_de_emision: emision
      };

      // Solo adjuntamos si existen (evita error 500 por enviar "")
      if (cicClean.length > 0) cleanPayload.cic = cicClean;
      if (ocrClean.length > 0) cleanPayload.ocr = ocrClean;
      if (idCiudadanoClean.length > 0) cleanPayload.identificador_del_ciudadano = idCiudadanoClean;

      nufiBody = cleanPayload;

    } else if (action === 'extract-ocr') {
      // 2. OCR
      nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
      headerKeyName = 'NUFI-API-KEY' 

      const img = payload.image_data?.includes(',') ? payload.image_data.split(',').pop() : payload.image_data
      console.log(`📷 [OCR] Procesando ${payload.side} - Tamaño: ${img?.length || 0}`)

      if (payload.side === 'frente') nufiBody = { "base64_credencial_frente": img }
      else nufiBody = { "base64_credencial_reverso": img }

    } else if (action === 'check-blacklist') {
      // 3. PLD
      nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml';
      nufiBody = {
          nombre_completo: cleanText(payload.nombre_completo),
          primer_nombre: cleanText(payload.primer_nombre),
          segundo_nombre: cleanText(payload.segundo_nombre),
          apellidos: cleanText(payload.apellidos),
          fecha_nacimiento: cleanText(payload.fecha_nacimiento), 
          lugar_nacimiento: cleanText(payload.lugar_nacimiento)
      };

    } else {
      // 4. OTROS (Biometría)
      nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie';
      nufiBody = payload;
    }

    // --- EJECUCIÓN ---
    let finalData = null
    let lastStatus = 500

    try {
        console.log(`🚀 Request a NuFi (${action}): ${nufiUrl}`)
        
        const response = await fetch(nufiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json',
            [headerKeyName]: generalKey 
          },
          body: JSON.stringify(nufiBody)
        })

        if (!response.ok) {
             const textResp = await response.text();
             console.error(`🔥 NuFi Error Remoto (${response.status}): ${textResp.substring(0, 200)}`);
             
             let jsonError;
             try { jsonError = JSON.parse(textResp); } catch { jsonError = { message: textResp } }
             
             throw new Error(jsonError.message || `Error remoto ${response.status}`);
        }

        finalData = await response.json()
        lastStatus = response.status;

    } catch (e) {
        const errMessage = e instanceof Error ? e.message : String(e);
        console.error(`❌ Error Fetch Nufi:`, errMessage)
        // Devolvemos el error como JSON 200 para que el front lo muestre sin romper
        finalData = { status: 'error', message: errMessage } 
    }

    // --- LOGGING DB (Resistente a nulos) ---
    if (entity_id) {
      try {
          const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
          
          const logData: any = {
            entity_id, 
            entity_type: entity_type || 'Cliente',
            validation_type: action === 'validate-ine' ? 'INE_CHECK' : action.toUpperCase().replace('-', '_'),
            status: (lastStatus === 200 && finalData?.status !== 'error') ? 'success' : 'error',
            api_response: finalData, 
            api_key_usage: 99 
          };
          
          // Solo agregamos tenant_id si existe, si es null no lo mandamos
          if (tenant_id) logData.tenant_id = tenant_id;

          await adminClient.from('kyc_validations').insert(logData);
      } catch (err) { console.error("Error DB Log:", err) }
    }

    return new Response(JSON.stringify(finalData), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fatal en Proxy";
    console.error(msg);
    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})