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

    // 🔍 LOG DE DIAGNÓSTICO: Esto aparecerá en tu panel de Supabase
    console.log("🔔 [Payment-Sheet] Datos recibidos:", { priceId, tenantId, email, trialDays, planId });

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

      // URLs de retorno
      success_url: `http://localhost:3000/progreso`, 
      cancel_url: `http://localhost:3000/configuraciones/facturacion`,
      customer_email: email || undefined,
      
      // ✅ PASO CRÍTICO: Guardamos los datos en la metadata de Stripe
      // Stripe los devolverá al Webhook después del pago.
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