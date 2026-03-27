/**
 * RIFT — App.jsx
 * Point d'entrée de l'application
 * Routage basé sur la phase du store (pas de bibliothèque de navigation externe)
 */

import React, { useEffect } from 'react';
import './utils/i18n';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';

import useGameStore from './store/gameStore';
import { GAME_PHASES, PALETTE } from './constants';

import MenuScreen          from './screens/MenuScreen';
import ShapeSelectScreen   from './screens/ShapeSelectScreen';
import MapScreen           from './screens/MapScreen';
import GameScreen          from './screens/GameScreen';
import GameOverScreen      from './screens/GameOverScreen';
import VictoryScreen       from './screens/VictoryScreen';
import MultiplayerScreen   from './screens/MultiplayerScreen';
import TalentTreeScreen    from './screens/TalentTreeScreen';
import PremiumShopScreen   from './screens/PremiumShopScreen';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App() {
  const phase          = useGameStore(s => s.phase);
  const premiumTheme   = useGameStore(s => s.meta.premiumTheme);
  const syncPurchases  = useGameStore(s => s.syncPurchases);

  // Vérifie les achats côté serveur à chaque démarrage (silencieux si offline)
  useEffect(() => { syncPurchases(); }, []);

  const neon = premiumTheme === 'neon';

  const renderScreen = () => {
    switch (phase) {
      case GAME_PHASES.MENU:           return <MenuScreen />;
      case GAME_PHASES.SHAPE_SELECT:   return <ShapeSelectScreen />;
      case GAME_PHASES.MAP:            return <MapScreen />;
      case GAME_PHASES.BOSS_INTRO:
      case GAME_PHASES.COMBAT:
      case GAME_PHASES.REST_ROOM:
      case GAME_PHASES.SHOP_ROOM:
      case GAME_PHASES.EVENT_ROOM:
      case GAME_PHASES.UPGRADE_CHOICE: return <GameScreen />;
      case GAME_PHASES.TALENT_TREE:    return <TalentTreeScreen />;
      case GAME_PHASES.PREMIUM_SHOP:   return <PremiumShopScreen />;
      case GAME_PHASES.GAME_OVER:      return <GameOverScreen />;
      case GAME_PHASES.VICTORY:        return <VictoryScreen />;
      case GAME_PHASES.MULTIPLAYER:    return <MultiplayerScreen />;
      default:                         return <MenuScreen />;
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      <SafeAreaProvider>
        <View style={[styles.root, neon && styles.rootNeon]}>
          <StatusBar style="light" backgroundColor={neon ? '#08001A' : PALETTE.bg} />
          {renderScreen()}
        </View>
      </SafeAreaProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: PALETTE.bg,
  },
  rootNeon: {
    backgroundColor: '#08001A',
  },
});
