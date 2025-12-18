import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? ''
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🔔 [Webhook] Evento recibido: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        // 1. Extraemos con limpieza (trim) por si acaso
        const tId = session.metadata?.tenantId?.trim();
        const pId = session.metadata?.planId?.trim();
        const subscriptionId = session.subscription as string;

        console.log("📦 [Webhook] Datos extraídos de Stripe:", { 
          tenantId_recibido: tId, 
          planId_recibido: pId,
          subscriptionId: subscriptionId 
        });

        if (!tId) {
          console.error("❌ [Webhook] Error: No hay tenantId en los metadatos de Stripe");
          break;
        }

        // 2. Intentamos la actualización y pedimos que nos devuelva la fila (.select())
        const { data, error } = await supabaseAdmin
          .from('tenants')
          .update({ 
            subscription_status: 'active',
            plan_id: pId ? parseInt(pId, 10) : null, 
            stripe_subscription_id: subscriptionId,
            current_period_end: new Date().toISOString() 
          })
          .eq('id', tId)
          .select(); // <--- IMPORTANTE: Esto nos dirá si encontró la fila

        if (error) {
          console.error("❌ [Webhook] Error de Supabase al actualizar:", error.message);
          throw error;
        }

        // 3. Verificamos si realmente se actualizó algo
        if (data && data.length > 0) {
          console.log(`✅ [Webhook] ¡ÉXITO! Empresa ${tId} actualizada al Plan ${pId}.`, data[0]);
        } else {
          console.error(`⚠️ [Webhook] OJO: Se ejecutó el comando pero NO se encontró ninguna empresa con el ID: "${tId}" en la tabla tenants.`);
        }
        break;
      }

      // ... resto de casos (invoice.paid, etc) mantener igual
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error(`❌ [Webhook] Error Crítico: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})