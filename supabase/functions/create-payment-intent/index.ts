/**
 * RIFT / Supabase Edge Function
 * Création d'un PaymentIntent Stripe pour achat premium
 * 
 * Déploiement :
 *   supabase functions deploy create-payment-intent
 * 
 * Variables Secrets (à définir dans Supabase Dashboard → Edge Functions → Secrets) :
 *   STRIPE_SECRET_KEY = sk_test_... (à remplacer par clé live en prod)
 */

import Stripe from 'https://esm.sh/stripe@14.3.0?target=deno';

// Récupère la clé Stripe depuis les secrets Supabase
const secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
if (!secretKey.startsWith('sk_')) {
  console.error('[RIFT] STRIPE_SECRET_KEY non configuré ou invalide');
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Catalogue des produits autorisés — prix définis côté serveur uniquement
const PRODUCT_CATALOG: Record<string, { amount: number; label: string }> = {
  'rift-premium':      { amount: 299, label: 'RIFT Premium' },
  'rift-theme-blood':  { amount: 99,  label: 'Thème Sang' },
  'rift-theme-ice':    { amount: 99,  label: 'Thème Glace' },
  'rift-theme-void':   { amount: 99,  label: 'Thème Néant' },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handler principal
export default async (req: Request) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let body: { productId?: string; deviceId?: string; email?: string } = {};
    try { body = await req.json(); } catch (_) { /* corps vide OK */ }

    const productId = body.productId ?? 'rift-premium';
    const deviceId  = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : 'unknown';

    // Le montant est TOUJOURS lu depuis le catalogue serveur — jamais depuis le client
    const product = PRODUCT_CATALOG[productId];
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Produit inconnu' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clé d'idempotence : évite les doublons si le client retry
    const idempotencyKey = `${deviceId}-${productId}-${new Date().toISOString().slice(0, 13)}`;

    // Crée un PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount:   product.amount,
        currency: 'eur',
        payment_method_types: ['card'],
        metadata: {
          productId,
          deviceId,
          ...(body.email ? { email: body.email } : {}),
        },
        description: `RIFT - ${product.label}`,
      },
      { idempotencyKey },
    );

    return new Response(
      JSON.stringify({
        clientSecret:    paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[RIFT] Stripe Error:', error);
    const isDev = !secretKey.startsWith('sk_live_');
    return new Response(
      JSON.stringify({ error: isDev ? error.message : 'Paiement échoué, réessaie.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};
