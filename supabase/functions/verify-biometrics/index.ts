// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const NUFI_URL = "https://nufi.azure-api.net/biometrico/v2/ine_vs_selfie";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // 1. Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Recibir las imágenes
    const { imagen_rostro, credencial_frente, credencial_reverso } = await req.json()

    if (!imagen_rostro || !credencial_frente || !credencial_reverso) {
      throw new Error("Faltan imágenes para la verificación")
    }

    // 3. Obtener la Key Segura
    const nufiKey = Deno.env.get('NUFI_KEY_GENERAL')
    if (!nufiKey) {
        throw new Error("Configuración del servidor incompleta (Falta Key)")
    }

    console.log("Enviando petición a NUFI...");

    // 4. Llamar a NUFI
    const nufiResponse = await fetch(NUFI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'NUFI-API-KEY': nufiKey
      },
      body: JSON.stringify({
        imagen_rostro,
        credencial_frente,
        credencial_reverso
      })
    })

    const nufiData = await nufiResponse.json()
    console.log("Respuesta NUFI:", nufiData)

    return new Response(JSON.stringify(nufiData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) { // ✅ CORREGIDO: Usamos unknown en lugar de any
    let msg = 'Error desconocido';
    
    // ✅ CORREGIDO: Verificamos si es un error real para leer el mensaje
    if (error instanceof Error) {
        msg = error.message;
    } else if (typeof error === 'string') {
        msg = error;
    }

    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})