// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. MANEJO DE CORS (Para que no te de error en el navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, payload } = body
    
    // 2. OBTENER TODAS LAS LLAVES DISPONIBLES (ROTACIÓN)
    // Usamos NUFI_API_KEYS para todo, separadas por coma.
    const keysString = Deno.env.get('NUFI_API_KEYS') || Deno.env.get('NUFI_KEY_GENERAL') || '';
    const keysToUse = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keysToUse.length === 0) {
        throw new Error("No hay API KEYS configuradas en Supabase (NUFI_API_KEYS).");
    }

    // Variables dinámicas según la acción
    let nufiUrl = ''
    let nufiBody: Record<string, unknown> = {}
    let headerKeyName = 'NUFI-API-KEY' // Valor por defecto para OCR y PLD
    
    // Funciones de limpieza auxiliares
    const cleanStr = (s: unknown) => s ? String(s).trim().toUpperCase() : '';
    const cleanNum = (s: unknown) => s ? String(s).replace(/\D/g, '') : '';
    const getBase64 = (s: string) => s.includes(',') ? s.split(',').pop() || s : s;

    // 3. CONFIGURACIÓN SEGÚN EL SERVICIO (SEGÚN TUS CURLS)
    switch (action) {
      
      // --- CASO 1: VALIDACIÓN INE (Azure) ---
      // Header: Ocp-Apim-Subscription-Key
      case 'validate-ine': {
        nufiUrl = 'https://nufi.azure-api.net/v1/lista_nominal/validar'
        headerKeyName = 'Ocp-Apim-Subscription-Key' 
        
        // Payload "Goloso" (manda todo lo que tengas)
        nufiBody = {
            tipo_identificacion: cleanStr(payload.tipo_identificacion),
            clave_de_elector: cleanStr(payload.clave_de_elector),
            numero_de_emision: cleanNum(payload.numero_de_emision) || "00"
        }
        
        // Opcionales que Azure agradece
        const ocrLimpio = cleanNum(payload.ocr);
        if (ocrLimpio.length > 0) nufiBody["ocr"] = ocrLimpio;

        const cicLimpio = cleanNum(payload.cic);
        if (cicLimpio.length > 0) nufiBody["cic"] = cicLimpio;
        
        const idCiudadano = cleanNum(payload.identificador_del_ciudadano);
        if (idCiudadano.length > 0) nufiBody["identificador_del_ciudadano"] = idCiudadano;
        
        break;
      }

      // --- CASO 2: OCR (Frente y Reverso) ---
      // Header: NUFI-API-KEY
      case 'extract-ocr': {
        const side = payload.side === 'frente' ? 'frente' : 'reverso';
        nufiUrl = `https://nufi.azure-api.net/ocr/v4/${side}` // v4/frente o v4/reverso
        headerKeyName = 'NUFI-API-KEY'

        const rawImg = getBase64(payload.image_data || '');
        if (rawImg.length < 100) throw new Error("Imagen vacía o corrupta.");

        // Estructura exacta de tu CURL de OCR
        if (side === 'frente') {
            nufiBody = { "base64_credencial_frente": rawImg }
        } else {
            nufiBody = { "base64_credencial_reverso": rawImg }
        }
        break;
      }

      // --- CASO 3: PLD / AML (Listas Negras) ---
      // Header: NUFI-API-KEY
      case 'check-blacklist': {
        nufiUrl = 'https://nufi.azure-api.net/perfilamiento/v1/aml'
        headerKeyName = 'NUFI-API-KEY'

        // Estructura exacta de tu CURL de PLD
        // Nota: Enviamos strings vacíos "" si no hay datos, tal como en el ejemplo.
        nufiBody = {
          "nombre_completo": payload.nombre_completo || payload.nombreCompleto || "",
          "primer_nombre": payload.primer_nombre || "",
          "segundo_nombre": payload.segundo_nombre || "",
          "apellidos": payload.apellidos || "",
          "fecha_nacimiento": payload.fecha_nacimiento || "",
          "lugar_nacimiento": payload.lugar_nacimiento || ""
        }
        break;
      }

      // --- CASO 4: BIOMETRÍA (Si la usas) ---
      case 'biometric-match':
        nufiUrl = 'https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie'
        headerKeyName = 'NUFI-API-KEY' // Asumo este header por consistencia con OCR
        nufiBody = payload.body || payload
        break;

      default:
        throw new Error(`Acción desconocida: ${action}`)
    }

    console.log(`🚀 [Proxy] Ejecutando ${action} hacia ${nufiUrl}`)
    
    // 4. BUCLE DE ROTACIÓN DE LLAVES (REINTENTOS)
    let finalResponse = null;
    let success = false;
    let lastError = null;

    for (let i = 0; i < keysToUse.length; i++) {
        const currentKey = keysToUse[i];
        
        // Headers dinámicos
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

            // Si falla la red o el JSON es inválido, caerá al catch.
            // Pero si Nufi responde, debemos ver el status.
            
            const data = await response.json();

            // Lógica de Rotación: Si es error de Auth/Quota (401, 402, 403), probamos la siguiente llave.
            // Si es 200 (OK) o 500/400 (Error de lógica de negocio), devolvemos la respuesta tal cual.
            if (response.status === 401 || response.status === 402 || response.status === 403 || data.code === 403) {
                console.warn(`⚠️ Key #${i + 1} agotada o rechazada. Rotando...`);
                continue; 
            }

            finalResponse = data;
            success = true;
            break; // ¡Éxito! Salimos del bucle.

        } catch (err) {
            console.error(`Error de conexión con Key #${i + 1}:`, err);
            lastError = err;
            // Si es la última llave y falló, lanzamos el error
            if (i === keysToUse.length - 1) break;
        }
    }

    // 5. RESPUESTA FINAL
    if (!success) {
        return new Response(JSON.stringify({ 
            status: 'error', 
            message: 'Todas las API Keys fallaron o se agotaron.',
            details: lastError ?String(lastError) : 'Sin respuesta de Nufi'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 503, 
        });
    }

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    let msg = 'Error interno';
    if (error instanceof Error) msg = error.message;

    return new Response(JSON.stringify({ status: 'error', message: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, 
    })
  }
})