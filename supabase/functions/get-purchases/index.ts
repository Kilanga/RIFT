/**
 * RIFT / Supabase Edge Function — Get Purchases
 *
 * Retourne la liste des produits achetés pour un device donné.
 * Le client envoie son deviceId, reçoit ses product_ids confirmés par Stripe.
 *
 * Déploiement :
 *   supabase functions deploy get-purchases --project-ref lvjtaduugtrdbuwpyvmw
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')              ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let deviceId: string;
  try {
    const body = await req.json();
    deviceId   = typeof body.deviceId === 'string' ? body.deviceId : '';
  } catch (_) {
    deviceId = '';
  }

  if (!deviceId || deviceId.length < 8 || deviceId.length > 64) {
    return new Response(
      JSON.stringify({ error: 'deviceId invalide' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { data, error } = await supabase
    .from('device_purchases')
    .select('product_id')
    .eq('device_id', deviceId);

  if (error) {
    console.error('[get-purchases] DB error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const products = (data ?? []).map((r: { product_id: string }) => r.product_id);

  return new Response(
    JSON.stringify({ products }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
};
