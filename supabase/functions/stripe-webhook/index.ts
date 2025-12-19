// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Usamos una versión optimizada para Deno (?target=deno)
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno' 
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// 1. Creamos el proveedor de criptografía nativo de Deno
const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  try {
    const body = await req.text()
    
    // 2. USAMOS LA VERSIÓN ASÍNCRONA (Aquí estaba el error)
    // constructEventAsync en lugar de constructEvent
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? '',
      undefined,
      cryptoProvider // Pasamos el proveedor compatible con Deno
    )

    // --- A PARTIR DE AQUÍ TODO SIGUE IGUAL ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`🔔 [Webhook] Evento recibido: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        const tId = session.metadata?.tenantId?.trim();
        const pId = session.metadata?.planId?.trim();
        const subscriptionId = session.subscription as string;

        console.log("📦 [Webhook] Datos de sesión recibidos de Stripe:", { 
          tenantId: tId, 
          planId: pId,
          subscriptionId: subscriptionId 
        });

        if (!tId) {
          console.error("❌ [Webhook] Error: No se encontró el tenantId en la metadata.");
          break;
        }

        const { data, error } = await supabaseAdmin
          .from('tenants')
          .update({ 
            subscription_status: 'active',
            plan_id: pId || null, 
            stripe_subscription_id: subscriptionId,
            current_period_end: new Date().toISOString() 
          })
          .eq('id', tId)
          .select();

        if (error) {
          console.error("❌ [Webhook] Error al actualizar Supabase:", error.message);
          throw error;
        }

        if (data && data.length > 0) {
          console.log(`✅ [Webhook] ÉXITO: La empresa ${tId} ahora tiene el Plan ${pId}.`);
        } else {
          console.error(`⚠️ [Webhook] ATENCIÓN: No se encontró ninguna empresa con el ID: "${tId}" para actualizar.`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string;

        const { error } = await supabaseAdmin
          .from('tenants')
          .update({ 
            subscription_status: 'active',
            current_period_end: new Date(invoice.period_end * 1000).toISOString() 
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) console.error("❌ [Webhook] Error en renovación:", error.message);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        await supabaseAdmin
          .from('tenants')
          .update({ subscription_status: 'canceled', plan_id: null })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    console.error(`❌ [Webhook] Error Crítico: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})