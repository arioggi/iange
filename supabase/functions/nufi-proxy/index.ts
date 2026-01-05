// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, payload } = body
    
    const KEY_GENERAL = Deno.env.get('NUFI_KEY_GENERAL') || ''
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST') || ''

    let nufiUrl = ''
    
    // Definimos el tipo para headers
    const nufiHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    
    // CORRECCIÓN 1: Usamos 'Record<string, unknown>' en lugar de 'any'
    // Esto le dice a TypeScript: "Es un objeto con claves string y valores desconocidos"
    let nufiBody: Record<string, unknown> = {}

    switch (action) {
      // --- 1. VALIDAR INE ---
      case 'validate-ine':
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        nufiHeaders['Ocp-Apim-Subscription-Key'] = KEY_GENERAL 
        
        nufiBody = {
            tipo_identificacion: payload.tipo_identificacion,
            ocr: payload.ocr,
            clave_de_elector: payload.clave_de_elector,
            numero_de_emision: payload.numero_de_emision || "00"
        }
        if (payload.cic) nufiBody["cic"] = payload.cic;
        if (payload.identificador_del_ciudadano) nufiBody["identificador_del_ciudadano"] = payload.identificador_del_ciudadano;
        break;

      // --- 2. OCR (FRENTE Y REVERSO) ---
      case 'extract-ocr': { 
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        
        let rawImg = payload.image_data || '';
        if (rawImg.includes(',')) rawImg = rawImg.split(',').pop();

        if (rawImg.length < 100) throw new Error("Imagen vacía recibida en backend");

        if (payload.side === 'frente') {
            nufiBody = { "base64_credencial_frente": rawImg }
        } else {
            nufiBody = { "base64_credencial_reverso": rawImg }
        }
        break;
      }

      // --- 3. BLACKLIST (PLD) ---
      case 'check-blacklist':
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        nufiHeaders['NUFI-API-KEY'] = KEY_BLACKLIST
        nufiBody = payload.body || payload
        break;

      // --- 4. BIOMETRÍA (INE vs SELFIE) ---
      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        nufiBody = payload.body || payload
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    console.log(`🚀 [Proxy] Enviando a NuFi: ${action}`)

    const nufiResponse = await fetch(nufiUrl, {
      method: 'POST',
      headers: nufiHeaders,
      body: JSON.stringify(nufiBody)
    })

    const nufiData = await nufiResponse.json()

    return new Response(JSON.stringify(nufiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) { // CORRECCIÓN 2: Usamos 'unknown' y validamos el tipo
    let msg = 'Error desconocido del servidor';
    
    if (error instanceof Error) {
        msg = error.message;
    } else if (typeof error === 'string') {
        msg = error;
    }

    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})