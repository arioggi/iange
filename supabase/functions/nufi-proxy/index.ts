import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, payload, tenant_id, entity_id, entity_type } = await req.json()

    // Llaves
    const KEY_GENERAL = Deno.env.get('NUFI_KEY_GENERAL')
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST')

    let nufiUrl = ''
    let nufiHeaders = { 'Content-Type': 'application/json' }
    
    switch (action) {
      case 'check-blacklist':
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        nufiHeaders['NUFI-API-KEY'] = KEY_BLACKLIST
        break;

      case 'validate-ine':
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        nufiHeaders['Ocp-Apim-Subscription-Key'] = KEY_GENERAL
        break;

      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        break;

      // --- NUEVO CASO: OCR AUTOMÁTICO ---
      case 'extract-ocr':
        // payload.side debe ser 'frente' o 'reverso'
        // La URL base es .../ocr/v4/ine/frente
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/ine/${payload.side}`
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    console.log(`📡 Conectando a NuFi: ${action}...`)

    const nufiResponse = await fetch(nufiUrl, {
      method: 'POST',
      headers: nufiHeaders,
      body: JSON.stringify(payload.body) // Enviamos el cuerpo que viene del front
    })

    const nufiData = await nufiResponse.json()

    // Guardar auditoría (Opcional: solo si no es OCR para no llenar la BD de lecturas)
    if (action !== 'extract-ocr') {
        let finalStatus = 'rejected'
        if (action === 'check-blacklist' && !nufiData.data?.has_sanction_match) finalStatus = 'approved'
        if (action === 'biometric-match' && nufiData.data?.resultado_verificacion_rostro === "True") finalStatus = 'approved'
        if (action === 'validate-ine' && nufiData.status === 'Success' && nufiData.data?.[0]?.activa) finalStatus = 'approved'

        await supabaseClient.from('kyc_validations').insert({
            tenant_id, entity_id, entity_type, validation_type: action, 
            status: finalStatus, api_response: nufiData,
            nufi_transaction_id: nufiData.uuid || 'N/A'
        })
    }

    return new Response(JSON.stringify(nufiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})