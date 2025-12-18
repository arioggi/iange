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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // --- CAMBIO: Ahora recibimos también planId ---
    const { priceId, tenantId, email, trialDays, planId } = body

    console.log("🔔 Datos recibidos en la función:", { priceId, tenantId, email, trialDays, planId });

    if (!priceId) throw new Error("Falta el priceId (ID del plan de Stripe)");
    if (!tenantId) throw new Error("Falta el tenantId (ID de la inmobiliaria)");
    if (!planId) throw new Error("Falta el planId (ID numérico del plan)");

    // Creación de la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId.trim(), quantity: 1 }], 
      mode: 'subscription',
      
      // Mantenemos los 30 días de regalo
      subscription_data: {
        trial_period_days: trialDays || 30,
      },

      success_url: `http://localhost:3000/progreso`, 
      cancel_url: `http://localhost:3000/configuraciones/facturacion`,
      customer_email: email || undefined,
      
      // --- CAMBIO CRÍTICO EN METADATA ---
      metadata: { 
        tenantId,
        planId: planId.toString() // Guardamos el número (1, 2 o 3) como texto para Stripe
      },
    })

    console.log("✅ Sesión de Stripe creada exitosamente:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error("💥 ERROR EN PAYMENT-SHEET:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})