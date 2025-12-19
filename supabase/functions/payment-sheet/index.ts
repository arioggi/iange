// supabase/functions/payment-sheet/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  // Manejo de CORS para llamadas desde el navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Extraemos los datos del cuerpo de la petición
    const { priceId, tenantId, email, trialDays, planId } = body

    // ---------------------------------------------------------
    // 1. CONFIGURACIÓN DINÁMICA DE LA URL (El cambio clave)
    // ---------------------------------------------------------
    // Busca la variable 'FRONTEND_URL' en los secretos de Supabase.
    // Si no la encuentra (ej. en local), usa 'http://localhost:3000' por defecto.
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000';

    // 🔍 LOG DE DIAGNÓSTICO
    console.log("🔔 [Payment-Sheet] Datos recibidos:", { priceId, tenantId, email, trialDays, planId });
    console.log("🌍 [Payment-Sheet] URL de retorno configurada:", FRONTEND_URL);

    // Validaciones de seguridad
    if (!priceId) throw new Error("Falta el priceId (ID del plan de Stripe)");
    if (!tenantId) throw new Error("Falta el tenantId (ID de la inmobiliaria)");
    if (!planId) throw new Error("Falta el planId (ID numérico o de texto del plan)");

    // Creación de la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId.trim(), quantity: 1 }], 
      mode: 'subscription',
      
      // Configuramos los 30 días de regalo
      subscription_data: {
        trial_period_days: trialDays || 30,
      },

      // ---------------------------------------------------------
      // 2. APLICACIÓN DE LA URL DINÁMICA
      // ---------------------------------------------------------
      success_url: `${FRONTEND_URL}/progreso`, 
      cancel_url: `${FRONTEND_URL}/configuraciones/facturacion`,
      
      customer_email: email || undefined,
      
      // ✅ PASO CRÍTICO: Guardamos los datos en la metadata de Stripe
      metadata: { 
        tenantId: tenantId.toString(),
        planId: planId.toString() 
      },
    })

    console.log("✅ [Payment-Sheet] Sesión de Stripe creada con éxito:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("💥 [Payment-Sheet] Error crítico:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})