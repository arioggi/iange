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
    
    // 1. OBTENER LLAVES
    // Lista de rotación para operaciones generales (OCR, INE, Biometría)
    const keysString = Deno.env.get('NUFI_API_KEYS') || Deno.env.get('NUFI_KEY_GENERAL') || '';
    const generalKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Llave específica para Blacklist (si es única, la dejamos aparte)
    const blacklistKey = Deno.env.get('NUFI_KEY_BLACKLIST') || '';

    // Variables de configuración para la petición
    let nufiUrl = ''
    let nufiBody: Record<string, unknown> = {}
    let headerKeyName = 'NUFI-API-KEY'; 
    let keysToUse = generalKeys; 

    // 2. PREPARAR LA PETICIÓN SEGÚN EL CASO
    switch (action) {
      // --- 1. VALIDAR INE ---
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

      // --- 2. OCR (FRENTE Y REVERSO) ---
      case 'extract-ocr': { 
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${payload.side}`
        
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
        keysToUse = [blacklistKey]; 
        nufiBody = payload.body || payload
        break;

      // --- 4. BIOMETRÍA (INE vs SELFIE) ---
      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        nufiBody = payload.body || payload
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    console.log(`🚀 [Proxy] Iniciando ${action}. Keys disponibles: ${keysToUse.length}`)

    // 3. BUCLE DE ROTACIÓN (Failover Logic)
    let finalResponse = null;
    let success = false;
    let usedKeyIndex = -1; // Para el chivato

    for (let i = 0; i < keysToUse.length; i++) {
        const currentKey = keysToUse[i];
        
        // Preparamos headers dinámicos
        const currentHeaders: Record<string, string> = { 
            'Content-Type': 'application/json',
            [headerKeyName]: currentKey 
        };

        try {
            const response = await fetch(nufiUrl, {
                method: 'POST',
                headers: currentHeaders,
                body: JSON.stringify(nufiBody)
            });

            const data = await response.json();

            // Lógica de fallo por Quota/Forbidden
            if (response.status === 403 || response.status === 401 || response.status === 402 || data.code === 403) {
                console.warn(`⚠️ Key #${i + 1} falló (Status ${response.status}). Rotando...`);
                continue; // Intentar siguiente llave
            }

            // Si llegamos aquí, la petición técnica funcionó
            finalResponse = data;
            usedKeyIndex = i + 1; // Guardamos índice (basado en 1)
            success = true;
            break; // Salimos del bucle

        } catch (err) {
            console.error(`Error de red con Key #${i + 1}:`, err);
            if (i === keysToUse.length - 1) throw err;
        }
    }

    if (!success || !finalResponse) {
        return new Response(JSON.stringify({ 
            status: 'error', 
            message: 'Todas las API Keys se han agotado o fallado.' 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403, 
        });
    }

    // 4. INYECCIÓN DEL CHIVATO (Para el Trigger de Supabase)
    if (typeof finalResponse === 'object' && finalResponse !== null) {
        // Solo inyectamos si usamos la lista general
        if (action !== 'check-blacklist') {
            // deno-lint-ignore no-explicit-any
            (finalResponse as any)._meta_usage = {
                key_used: usedKeyIndex,
                timestamp: new Date().toISOString()
            };
        }
    }

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    let msg = 'Error desconocido del servidor';
    if (error instanceof Error) msg = error.message;
    else if (typeof error === 'string') msg = error;

    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})