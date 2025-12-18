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
  // Manejo de peticiones preliminares (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { priceId, tenantId, email } = body

    // LOG de depuración para ver qué llega desde el frontend
    console.log("Datos recibidos en la función:", { priceId, tenantId, email });

    // Validación básica de datos
    if (!priceId) throw new Error("Falta el priceId (ID del plan)");
    if (!tenantId) throw new Error("Falta el tenantId (ID de la inmobiliaria)");

    // Creación de la sesión de Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId.trim(), quantity: 1 }], // .trim() elimina espacios accidentales
      mode: 'subscription',
      success_url: `http://localhost:3000/progreso`,
      cancel_url: `http://localhost:3000/configuraciones/facturacion`,
      customer_email: email || undefined,
      metadata: { tenantId },
    })

    console.log("Sesión de Stripe creada exitosamente:", session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    // ESTE LOG ES VITAL: Ahora verás el error real en tu Dashboard de Supabase
    console.error("CRITICAL ERROR EN PAYMENT-SHEET:", error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})