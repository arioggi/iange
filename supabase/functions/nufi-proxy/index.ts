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
    
    // Llaves
    const KEY_GENERAL = Deno.env.get('NUFI_KEY_GENERAL')
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST')

    let nufiUrl = ''
    let nufiHeaders = { 'Content-Type': 'application/json' }
    let nufiBody = {}
    
    console.log(`📡 [Proxy v3] Acción: ${action}`)

    switch (action) {
      case 'check-blacklist':
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        nufiHeaders['NUFI-API-KEY'] = KEY_BLACKLIST
        nufiBody = payload.body || payload
        break;

      case 'validate-ine':
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        nufiHeaders['Ocp-Apim-Subscription-Key'] = KEY_GENERAL
        nufiBody = payload.body || payload
        break;

      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        nufiBody = payload.body || payload
        break;

      case 'extract-ocr':
        // URL Dinámica
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        nufiHeaders['NUFI-API-KEY'] = KEY_GENERAL
        
        // --- BÚSQUEDA DE LA IMAGEN ---
        // Buscamos la imagen en cualquier lugar posible
        let rawImg = payload.image_data || payload.imagen || (payload.body ? payload.body.imagen : '') || '';
        
        // Limpieza de seguridad (quitar 'data:image...')
        if (rawImg.includes(',')) {
            rawImg = rawImg.split(',').pop();
        }

        console.log(`🕵️ [Proxy OCR] Imagen encontrada. Longitud: ${rawImg.length}`)

        if (!rawImg || rawImg.length < 100) {
            throw new Error("Proxy: No se encontró la imagen en el payload.")
        }

        // --- TÉCNICA DE LA ESCOPETA ---
        // Enviamos con todos los nombres posibles por si acaso
        nufiBody = {
            imagen: rawImg,
            image: rawImg,
            base64: rawImg
        }
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    // console.log(`🚀 Enviando a NuFi...`)

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
    console.error("❌ [Proxy Error]", error.message)
    return new Response(JSON.stringify({ 
        status: 'error', 
        message: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Devolvemos 200 para que el frontend pueda leer el mensaje
    })
  }
})