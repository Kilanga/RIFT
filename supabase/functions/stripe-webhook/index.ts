/**
 * RIFT / Supabase Edge Function — Stripe Webhook
 *
 * Écoute l'événement `payment_intent.succeeded` envoyé par Stripe.
 * Insère l'achat confirmé dans la table `device_purchases`.
 *
 * Déploiement :
 *   supabase functions deploy stripe-webhook --project-ref lvjtaduugtrdbuwpyvmw
 *
 * Secrets requis (Supabase Dashboard → Edge Functions → Secrets) :
 *   STRIPE_SECRET_KEY      = sk_live_... (ou sk_test_...)
 *   STRIPE_WEBHOOK_SECRET  = whsec_...   (depuis Stripe Dashboard → Webhooks)
 *
 * Enregistrement dans Stripe Dashboard :
 *   URL : https://lvjtaduugtrdbuwpyvmw.supabase.co/functions/v1/stripe-webhook
 *   Événement : payment_intent.succeeded
 */

import Stripe from 'https://esm.sh/stripe@14.3.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe        = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

// Client Supabase avec la clé service (bypass RLS pour l'écriture)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const VALID_PRODUCTS = new Set([
  'rift-premium',
  'rift-theme-blood',
  'rift-theme-ice',
  'rift-theme-void',
]);

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig  = req.headers.get('stripe-signature') ?? '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature invalide:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    // Ignorer les autres événements sans erreur
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const pi        = event.data.object as Stripe.PaymentIntent;
  const productId = pi.metadata?.productId ?? '';
  const deviceId  = pi.metadata?.deviceId  ?? '';

  if (!VALID_PRODUCTS.has(productId)) {
    console.warn('[webhook] productId inconnu:', productId);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  if (!deviceId || deviceId.length < 8) {
    console.warn('[webhook] deviceId manquant ou invalide');
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const { error } = await supabase
    .from('device_purchases')
    .upsert(
      {
        device_id:                deviceId,
        product_id:               productId,
        stripe_payment_intent_id: pi.id,
      },
      { onConflict: 'stripe_payment_intent_id' },
    );

  if (error) {
    console.error('[webhook] Erreur DB:', error.message);
    // Retourner 500 pour que Stripe retente
    return new Response(JSON.stringify({ error: 'DB error' }), { status: 500 });
  }

  console.log(`[webhook] Achat enregistré: ${productId} → device ${deviceId.slice(0, 8)}...`);
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
