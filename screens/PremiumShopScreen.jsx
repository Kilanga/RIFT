/**
 * RIFT — PremiumShopScreen
 * Boutique premium — achat unique via Stripe PaymentSheet.
 * Débloque : classe Spectre, mode Hardcore, thème Néon.
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';

import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';
import { createPaymentIntent, createThemePaymentIntent } from '../services/stripeService';
import { GRID_THEMES_LIST } from '../utils/cosmeticCatalog';

const PREMIUM_COLOR = '#9966FF';
const PRICE_EUR     = '2,99 €';

const FEATURES = [
  {
    icon:  '👻',
    title: 'Classe Spectre',
    desc:  'Éthéré : ignore la défense ennemie, immune aux pièges. PV réduits, attaque élevée.',
  },
  {
    icon:  '💀',
    title: 'Mode Hardcore',
    desc:  'La mort réinitialise toute la méta-progression. Pour les joueurs qui cherchent l\'ultime défi.',
  },
  {
    icon:  '🌌',
    title: 'Thème Néon',
    desc:  'Interface violet néon — fond plus sombre, ambiance rift.',
  },
];

export default function PremiumShopScreen() {
  const goToMenu          = useGameStore(s => s.goToMenu);
  const setPremium        = useGameStore(s => s.setPremium);
  const isPremium         = useGameStore(s => s.meta.isPremium);
  const gridTheme         = useGameStore(s => s.meta.gridTheme ?? 'default');
  const purchasedThemes   = useGameStore(s => s.meta.purchasedThemes ?? []);
  const setGridTheme      = useGameStore(s => s.setGridTheme);
  const addPurchasedTheme = useGameStore(s => s.addPurchasedTheme);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleBuy = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Récupère le clientSecret via Edge Function
      const clientSecret = await createPaymentIntent();

      // 2. Initialise le PaymentSheet Stripe
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName:       'RIFT',
        style:                     'alwaysDark',
      });
      if (initError) throw new Error(initError.message);

      // 3. Affiche la feuille de paiement
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') {
          throw new Error(payError.message);
        }
        // Annulé par l'utilisateur — pas d'erreur à afficher
        return;
      }

      // 4. Succès — débloque le premium
      setPremium();

    } catch (err) {
      setErrorMsg(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTheme = async (themeId) => {
    setLoadingTheme(themeId);
    setErrorMsg('');
    try {
      const clientSecret = await createThemePaymentIntent(themeId);
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName:       'RIFT',
        style:                     'alwaysDark',
      });
      if (initError) throw new Error(initError.message);
      const { error: payError } = await presentPaymentSheet();
      if (payError) {
        if (payError.code !== 'Canceled') throw new Error(payError.message);
        return;
      }
      addPurchasedTheme(themeId);
    } catch (err) {
      setErrorMsg(err.message || 'Une erreur est survenue.');
    } finally {
      setLoadingTheme('');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goToMenu} activeOpacity={0.7}>
            <Text style={styles.backTxt}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>PREMIUM</Text>
          <View style={{ width: 72 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

          {isPremium ? (
            /* ── Déjà premium ───────────────────────────────────────────── */
            <View style={styles.alreadyBox}>
              <Text style={styles.alreadyIcon}>★</Text>
              <Text style={styles.alreadyTitle}>PREMIUM ACTIVÉ</Text>
              <Text style={styles.alreadySub}>Merci pour ton soutien !</Text>
            </View>
          ) : (
            /* ── Bandeau prix ───────────────────────────────────────────── */
            <View style={styles.priceBox}>
              <Text style={styles.priceAmount}>{PRICE_EUR}</Text>
              <Text style={styles.priceSub}>Paiement unique · Débloqué pour toujours</Text>
            </View>
          )}

          {/* ── Features ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>CONTENU INCLUS</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureInfo}>
                <View style={styles.featureRow}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  {isPremium && <Text style={styles.checkBadge}>✓</Text>}
                </View>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}

          {/* ── Bouton achat ──────────────────────────────────────────── */}
          {!isPremium && (
            <View style={styles.buySection}>
              {!!errorMsg && (
                <Text style={styles.errorTxt}>{errorMsg}</Text>
              )}
              <TouchableOpacity
                style={[styles.buyBtn, loading && styles.buyBtnDisabled]}
                onPress={handleBuy}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.buyBtnTxt}>DÉBLOQUER PREMIUM</Text>
                    <Text style={styles.buyBtnPrice}>{PRICE_EUR}</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.secureTxt}>🔒 Paiement sécurisé via Stripe</Text>
              <Text style={styles.noSubscriptionTxt}>Aucun abonnement · Pas de publicités</Text>
            </View>
          )}

          {/* ── Thèmes cosmétiques (achat séparé) ──────────────────────── */}
          <Text style={[styles.sectionLabel, { marginTop: 14 }]}>THÈMES DU PLATEAU</Text>
          <Text style={styles.themeSectionSub}>Achats indépendants · 0,99 € chacun</Text>
          {!!errorMsg && <Text style={styles.errorTxt}>{errorMsg}</Text>}
          {GRID_THEMES_LIST.map(t => {
            const isFree     = t.id === 'default';
            const isPurchased = purchasedThemes.includes(t.id);
            const isActive   = gridTheme === t.id;
            const isBuying   = loadingTheme === t.id;
            return (
              <View key={t.id} style={[styles.themeRow, isActive && styles.themeRowActive]}>
                <View style={[styles.themePreview, { backgroundColor: t.floor0, borderColor: t.wallLine }]} />
                <View style={styles.themeInfo}>
                  <Text style={styles.themeEmoji}>{t.emoji} {t.name}</Text>
                  {isFree && <Text style={styles.themeFreeTag}>Gratuit</Text>}
                </View>
                {isFree || isPurchased ? (
                  <TouchableOpacity
                    style={[styles.themeUseBtn, isActive && styles.themeUseBtnActive]}
                    onPress={() => setGridTheme(t.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.themeUseBtnTxt}>{isActive ? '✓ Actif' : 'Utiliser'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.themeBuyBtn, isBuying && styles.buyBtnDisabled]}
                    onPress={() => handleBuyTheme(t.id)}
                    disabled={!!loadingTheme}
                    activeOpacity={0.85}
                  >
                    {isBuying
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.themeBuyBtnTxt}>0,99 €</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, padding: 20, gap: 16 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingTop:     6,
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderWidth:       1,
    borderColor:       PALETTE.borderLight,
    borderRadius:      10,
    backgroundColor:   PALETTE.bgCard,
    minWidth:          72,
    alignItems:        'center',
  },
  backTxt:  { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  title: {
    color:       PREMIUM_COLOR,
    fontSize:    14,
    fontWeight:  'bold',
    letterSpacing: 4,
  },

  alreadyBox: {
    alignItems:      'center',
    backgroundColor: PREMIUM_COLOR + '22',
    borderWidth:     1,
    borderColor:     PREMIUM_COLOR,
    borderRadius:    14,
    padding:         24,
    gap:             6,
  },
  alreadyIcon:  { fontSize: 36 },
  alreadyTitle: { color: PREMIUM_COLOR, fontSize: 18, fontWeight: 'bold', letterSpacing: 2 },
  alreadySub:   { color: PALETTE.textMuted, fontSize: 13 },

  priceBox: {
    alignItems:      'center',
    backgroundColor: PREMIUM_COLOR + '18',
    borderWidth:     1,
    borderColor:     PREMIUM_COLOR + '88',
    borderRadius:    14,
    padding:         20,
    gap:             4,
  },
  priceAmount: { color: PREMIUM_COLOR, fontSize: 32, fontWeight: 'bold' },
  priceSub:    { color: PALETTE.textMuted, fontSize: 12, textAlign: 'center' },

  sectionLabel: {
    color:         PALETTE.textMuted,
    fontSize:      10,
    fontWeight:    'bold',
    letterSpacing: 3,
    marginBottom:  4,
  },

  featureCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             14,
    marginBottom:    10,
  },
  featureIcon:  { fontSize: 30, width: 38, textAlign: 'center', marginTop: 2 },
  featureInfo:  { flex: 1, gap: 4 },
  featureRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  featureTitle: { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  featureDesc:  { color: PALETTE.textMuted, fontSize: 12, lineHeight: 17 },
  checkBadge:   { color: PREMIUM_COLOR, fontSize: 14, fontWeight: 'bold' },

  buySection: { gap: 10, marginTop: 6 },
  errorTxt:   { color: '#FF4444', fontSize: 12, textAlign: 'center' },

  buyBtn: {
    backgroundColor: PREMIUM_COLOR,
    borderRadius:    14,
    paddingVertical: 18,
    alignItems:      'center',
    gap:             2,
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnTxt:   { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  buyBtnPrice: { color: '#FFFFFF99', fontSize: 13 },

  secureTxt:         { color: PALETTE.textDim, fontSize: 11, textAlign: 'center' },
  noSubscriptionTxt: { color: PALETTE.textDim, fontSize: 11, textAlign: 'center' },

  themeSectionSub: { color: PALETTE.textDim, fontSize: 11, marginBottom: 10, marginTop: -2 },

  themeRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         12,
    gap:             12,
    marginBottom:    8,
  },
  themeRowActive: {
    borderColor:     PREMIUM_COLOR,
    backgroundColor: PREMIUM_COLOR + '12',
  },
  themePreview: {
    width:        40,
    height:       40,
    borderRadius: 6,
    borderWidth:  1,
  },
  themeInfo:    { flex: 1, gap: 3 },
  themeEmoji:   { color: PALETTE.textPrimary, fontSize: 14, fontWeight: 'bold' },
  themeFreeTag: { color: PALETTE.textDim, fontSize: 10 },

  themeUseBtn: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       PALETTE.borderLight,
    backgroundColor:   PALETTE.bgDark,
  },
  themeUseBtnActive: {
    borderColor:     PREMIUM_COLOR,
    backgroundColor: PREMIUM_COLOR + '22',
  },
  themeUseBtnTxt: { color: PALETTE.textPrimary, fontSize: 12, fontWeight: 'bold' },

  themeBuyBtn: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      8,
    backgroundColor:   PREMIUM_COLOR,
    minWidth:          58,
    alignItems:        'center',
  },
  themeBuyBtnTxt: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
