import { supabase } from '../supabaseClient';

export const stripeService = {
  /**
   * Llama a la Edge Function para obtener una URL de Checkout de Stripe
   */
  createCheckoutSession: async (priceId: string, tenantId: string, email: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('payment-sheet', {
        body: { 
          priceId, 
          tenantId, 
          email, 
          userId 
        },
      });

      if (error) throw error;
      
      // La función nos devuelve una URL de Stripe
      if (data?.url) {
        // Redirigimos al usuario a la página de pago de Stripe
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error al iniciar el pago:', error);
      throw error;
    }
  }
};