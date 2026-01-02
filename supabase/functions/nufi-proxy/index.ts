import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { action, payload } = body
    
    // Asumimos que NUFI_KEY_GENERAL es tu Ocp-Apim-Subscription-Key o API Key principal
    const KEY_GENERAL = Deno.env.get('NUFI_KEY_GENERAL')
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST')

    let nufiUrl = ''
    let nufiHeaders = { 'Content-Type': 'application/json' }
    let nufiBody = {}

    switch (action) {
      // --- 1. VALIDAR INE (Según tu doc) ---
      case 'validate-ine':
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        // La documentación dice que para validar usa este header específico:
        nufiHeaders['Ocp-Apim-Subscription-Key'] = KEY_GENERAL 
        
        // Mapeo exacto de campos según tu ejemplo de docs
        nufiBody = {
            tipo_identificacion: payload.tipo_identificacion,
            ocr: payload.ocr,
            clave_de_elector: payload.clave_de_elector,
            numero_de_emision: payload.numero_de_emision || "00"
        }
        // Agregamos condicionales para modelos nuevos (E,F,G,H)
        if (payload.cic) nufiBody["cic"] = payload.cic;
        if (payload.identificador_del_ciudadano) nufiBody["identificador_del_ciudadano"] = payload.identificador_del_ciudadano;
        break;

      // --- 2. OCR (FRENTE Y REVERSO) ---
      case 'extract-ocr':
        // URL Dinámica: .../ocr/v4/frente o .../ocr/v4/reverso
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        
        // La documentación del OCR dice que usa 'NUFI-API-KEY'
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        
        // Limpieza de imagen
        let rawImg = payload.image_data || '';
        if (rawImg.includes(',')) rawImg = rawImg.split(',').pop();

        if (rawImg.length < 100) throw new Error("Imagen vacía recibida en backend");

        // --- AQUÍ ESTABA EL ERROR, CORREGIDO SEGÚN DOCS ---
        if (payload.side === 'frente') {
            nufiBody = {
                "base64_credencial_frente": rawImg
            }
        } else {
            nufiBody = {
                "base64_credencial_reverso": rawImg
            }
        }
        break;

      // --- 3. BLACKLIST (PLD) ---
      case 'check-blacklist':
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        nufiHeaders['NUFI-API-KEY'] = KEY_BLACKLIST
        nufiBody = payload.body || payload
        break;

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

  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  }
})