// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. MANEJO DE CORS
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
    
    // 2. OBTENER LLAVES (Soporta ambos nombres de variable por seguridad)
    const rawKeys = Deno.env.get('NUFI_KEY_GENERAL') || Deno.env.get('NUFI_API_KEYS') || ''
    const keysToUse = rawKeys.split(',').map(k => k.trim()).filter(k => k.length > 5)
    const KEY_BLACKLIST = Deno.env.get('NUFI_KEY_BLACKLIST') || ''

    if (keysToUse.length === 0) {
        throw new Error("No hay API KEYS configuradas en las variables de entorno.");
    }

    // Variables dinámicas
    let nufiUrl = ''
    let nufiBody: Record<string, unknown> = {}
    let headerKeyName = 'NUFI-API-KEY'
    let currentPool = keysToUse

    // Funciones de limpieza auxiliares (Evitan el Error 500 de Azure)
    const cleanStr = (s: unknown) => s ? String(s).trim().toUpperCase() : '';
    const cleanNum = (s: unknown) => s ? String(s).replace(/\D/g, '') : '';
    const getBase64 = (s: string) => s.includes(',') ? s.split(',').pop() || s : s;

    // 3. CONFIGURACIÓN SEGÚN ACCIÓN
    switch (action) {
      case 'validate-ine': {
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        headerKeyName = 'Ocp-Apim-Subscription-Key'
        nufiBody = {
            tipo_identificacion: cleanStr(payload.tipo_identificacion) || 'C',
            clave_de_elector: cleanStr(payload.clave_de_elector),
            numero_de_emision: cleanNum(payload.numero_de_emision).padStart(2, '0') || "00",
            ocr: cleanNum(payload.ocr),
            cic: cleanNum(payload.cic || payload.ocr),
            identificador_del_ciudadano: cleanNum(payload.identificador_del_ciudadano || payload.cic || payload.ocr)
        }
        break;
      }

      case 'extract-ocr': {
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        headerKeyName = 'NUFI-API-KEY'
        const rawImg = getBase64(payload.image_data || '');
        if (payload.side === 'frente') nufiBody = { "base64_credencial_frente": rawImg }
        else nufiBody = { "base64_credencial_reverso": rawImg }
        break;
      }

      case 'check-blacklist': {
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        headerKeyName = 'NUFI-API-KEY'
        currentPool = [KEY_BLACKLIST]
        nufiBody = {
          "nombre_completo": cleanStr(payload.nombre_completo || payload.nombreCompleto),
          "primer_nombre": payload.primer_nombre || "",
          "segundo_nombre": payload.segundo_nombre || "",
          "apellidos": payload.apellidos || "",
          "fecha_nacimiento": payload.fecha_nacimiento || "",
          "lugar_nacimiento": payload.lugar_nacimiento || ""
        }
        break;
      }

      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        headerKeyName = 'NUFI-API-KEY'
        nufiBody = payload.body || payload
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    // 4. BUCLE DE ROTACIÓN (Failover)
    let finalData = null
    let lastStatus = 500
    let usedKeyIndex = 0

    for (let i = 0; i < currentPool.length; i++) {
        usedKeyIndex = i + 1
        const currentKey = currentPool[i]
        
        try {
            const response = await fetch(nufiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', [headerKeyName]: currentKey },
                body: JSON.stringify(nufiBody)
            })

            const data = await response.json()

            // Si es error de créditos o permisos, rotar a la siguiente llave
            if ((response.status === 403 || response.status === 401 || data.code === 403) && i < currentPool.length - 1) {
                console.warn(`⚠️ Llave #${usedKeyIndex} falló. Rotando...`)
                continue 
            }

            finalData = data
            lastStatus = response.status
            break 

        } catch (err) {
            if (i === currentPool.length - 1) throw err
        }
    }

    // 5. GUARDADO AUTOMÁTICO EN kyc_validations
    if (entity_id && tenant_id) {
        await supabaseAdmin.from('kyc_validations').insert({
            tenant_id,
            entity_id,
            entity_type: entity_type || 'Cliente',
            validation_type: action.toUpperCase().replace('-', '_'),
            status: (lastStatus === 200 && finalData?.status !== 'error') ? 'success' : 'error',
            api_response: finalData,
            api_key_usage: usedKeyIndex
        })
    }

    // Inyectar info de uso para el Frontend
    if (finalData) finalData._meta_usage = { key_index: usedKeyIndex };

    return new Response(JSON.stringify(finalData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Siempre 200 para que el front capture el JSON de error
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  }
})