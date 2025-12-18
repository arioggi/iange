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
    // Esto verifica que el mensaje REALMENTE viene de Stripe
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET') ?? ''
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const tenantId = session.metadata.tenantId

      // Conectamos con tu base de datos de Supabase
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // ¡AQUÍ ESTÁ LA MAGIA! Actualizamos el estado del cliente
      const { error } = await supabaseAdmin
        .from('tenants')
        .update({ estado: 'Activo' })
        .eq('id', tenantId)

      if (error) throw error
      console.log(`Empresa ${tenantId} activada con éxito.`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})