/**
 * RIFT — Stripe Service
 * - Crée des PaymentIntents via la Supabase Edge Function.
 * - Récupère les achats vérifiés côté serveur au démarrage.
 * - Génère et persiste un deviceId anonyme unique par appareil.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const DEVICE_ID_KEY = 'rift-device-id';

/** Retourne le deviceId persistant, en génère un si absent. */
export async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // UUID v4 simple sans dépendance externe
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function _invokePaymentIntent(productId) {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { productId, deviceId },
  });
  if (error) throw new Error(error.message || 'Erreur Edge Function');
  if (!data?.clientSecret) throw new Error('Pas de clientSecret reçu');
  return data.clientSecret;
}

/** Pack Premium — 2,99 € */
export function createPaymentIntent() {
  return _invokePaymentIntent('rift-premium');
}

/** Thème cosmétique individuel — 0,99 € */
export function createThemePaymentIntent(themeId) {
  return _invokePaymentIntent(`rift-theme-${themeId}`);
}

/**
 * Récupère les achats confirmés par Stripe pour cet appareil.
 * Retourne { isPremium: bool, purchasedThemes: string[] }
 * ou null si offline.
 */
export async function fetchServerPurchases() {
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await supabase.functions.invoke('get-purchases', {
      body: { deviceId },
    });
    if (error || !data?.products) return null;

    const products       = data.products;
    const isPremium      = products.includes('rift-premium');
    const purchasedThemes = products
      .filter(p => p.startsWith('rift-theme-'))
      .map(p => p.replace('rift-theme-', ''));

    return { isPremium, purchasedThemes };
  } catch {
    return null; // offline — on garde l'état local
  }
}
