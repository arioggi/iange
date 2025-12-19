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
    
    // 1. EXTRACCIÓN SEGURA: 
    // Quitamos 'trialDays' de aquí para no leerlo del frontend.
    const { priceId, tenantId, email, planId } = body

    // ---------------------------------------------------------
    // CONFIGURACIÓN DINÁMICA DE LA URL
    // ---------------------------------------------------------
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000';

    // 2. LOG LIMPIO (PRIVACIDAD):
    // Solo mostramos IDs, nunca el email ni datos personales.
    console.log("🔔 [Payment-Sheet] Solicitud de pago iniciada:", { 
      tenantId, 
      planId, 
      priceId 
    });
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
      
      // 3. LÓGICA DE NEGOCIO BLINDADA:
      // Forzamos 30 días aquí. El frontend ya no tiene control sobre esto.
      subscription_data: {
        trial_period_days: 30, 
      },

      // URLs de retorno dinámicas
      success_url: `${FRONTEND_URL}/progreso`, 
      cancel_url: `${FRONTEND_URL}/configuraciones/facturacion`,
      
      customer_email: email || undefined,
      
      // Guardamos los datos en la metadata de Stripe
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