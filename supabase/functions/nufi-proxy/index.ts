// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Inicializar cliente Supabase interno para guardar logs
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    const { action, payload, entity_id, entity_type, tenant_id } = body
    
    const rawKeys = Deno.env.get('NUFI_KEY_GENERAL') || ''
    const keysPool = rawKeys.split(',').map(k => k.trim()).filter(k => k !== '')
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST') || ''

    let nufiUrl = ''
    let headerKeyName = 'NUFI-API-KEY'
    let nufiBody: Record<string, unknown> = {}
    let keysToUse = keysPool

    switch (action) {
      case 'validate-ine':
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        headerKeyName = 'Ocp-Apim-Subscription-Key'
        nufiBody = {
            tipo_identificacion: payload.tipo_identificacion,
            ocr: payload.ocr,
            clave_de_elector: payload.clave_de_elector,
            numero_de_emision: payload.numero_de_emision || "00"
        }
        if (payload.cic) nufiBody["cic"] = payload.cic;
        if (payload.identificador_del_ciudadano) nufiBody["identificador_del_ciudadano"] = payload.identificador_del_ciudadano;
        break;

      case 'extract-ocr':
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        let rawImg = payload.image_data || '';
        if (rawImg.includes(',')) rawImg = rawImg.split(',').pop();
        if (payload.side === 'frente') nufiBody = { "base64_credencial_frente": rawImg }
        else nufiBody = { "base64_credencial_reverso": rawImg }
        break;

      case 'check-blacklist':
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        keysToUse = [KEY_BLACKLIST]
        nufiBody = payload.body || payload
        break;

      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        nufiBody = payload.body || payload
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    let finalData = null
    let lastStatus = 200
    let usedKeyIndex = 0

    // BUCLE DE ROTACIÓN
    for (let i = 0; i < keysToUse.length; i++) {
        usedKeyIndex = i + 1
        const currentKey = keysToUse[i]
        
        try {
            const nufiResponse = await fetch(nufiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', [headerKeyName]: currentKey },
                body: JSON.stringify(nufiBody)
            })

            const nufiData = await nufiResponse.json()

            if ((nufiResponse.status === 403 || nufiData.code === 403) && i < keysToUse.length - 1) {
                console.warn(`⚠️ Key #${usedKeyIndex} agotada. Rotando...`)
                continue 
            }

            finalData = nufiData
            lastStatus = nufiResponse.status
            break 

        } catch (err) {
            if (i === keysToUse.length - 1) throw err
        }
    }

    // --- GUARDADO AUTOMÁTICO EN TABLA kyc_validations ---
    if (entity_id && tenant_id) {
        await supabaseAdmin.from('kyc_validations').insert({
            tenant_id,
            entity_id,
            entity_type: entity_type || 'Cliente',
            validation_type: action.toUpperCase().replace('-', '_'),
            status: (lastStatus === 200 && finalData?.status !== 'error') ? 'success' : 'error',
            api_response: finalData,
            api_key_usage: usedKeyIndex // Registra cuál de las 5 llaves se usó
        })
    }

    // Inyectar info de uso en la respuesta para el Front
    if (finalData) finalData._meta_usage = { key_index: usedKeyIndex };

    return new Response(JSON.stringify(finalData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: lastStatus,
    })

  } catch (error: unknown) {
    let msg = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})