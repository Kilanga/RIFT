/**
 * RIFT — App.jsx
 * Point d'entrée de l'application
 * Routage basé sur la phase du store (pas de bibliothèque de navigation externe)
 */

import React, { useEffect, useRef } from 'react';
import './utils/i18n';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';

import useGameStore from './store/gameStore';
import { GAME_PHASES, PALETTE } from './constants';
import { initAudio, playMusic, setMusicEnabled, setSfxEnabled, setMusicVolume, setSfxVolume } from './services/audioService';
import i18n from './utils/i18n';

import MenuScreen               from './screens/MenuScreen';
import ShapeSelectScreen        from './screens/ShapeSelectScreen';
import MapScreen                from './screens/MapScreen';
import GameScreen               from './screens/GameScreen';
import GameOverScreen           from './screens/GameOverScreen';
import VictoryScreen            from './screens/VictoryScreen';
import MultiplayerScreen        from './screens/MultiplayerScreen';
import TalentTreeScreen         from './screens/TalentTreeScreen';
import PremiumShopScreen        from './screens/PremiumShopScreen';
import PrologueScreen           from './screens/PrologueScreen';
import OrigineEncounterScreen   from './screens/OrigineEncounterScreen';
import AchievementsScreen       from './screens/AchievementsScreen';
import LoreScreen               from './screens/LoreScreen';
import SettingsScreen           from './screens/SettingsScreen';
import PrivacyScreen            from './screens/PrivacyScreen';
import LegalScreen              from './screens/LegalScreen';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

// Regroupe les phases par "écran actif" pour détecter les vrais changements d'écran
const screenGroup = (p) => {
  const GAME_GROUP = [
    GAME_PHASES.COMBAT, GAME_PHASES.REST_ROOM, GAME_PHASES.SHOP_ROOM,
    GAME_PHASES.EVENT_ROOM, GAME_PHASES.UPGRADE_CHOICE, GAME_PHASES.BOSS_INTRO,
  ];
  return GAME_GROUP.includes(p) ? 'game' : p;
};

const MUSIC_MAP = {
  [GAME_PHASES.MENU]:               'menu',
  [GAME_PHASES.PROLOGUE]:           'menu',
  [GAME_PHASES.SHAPE_SELECT]:       'menu',
  [GAME_PHASES.TALENT_TREE]:        'menu',
  [GAME_PHASES.PREMIUM_SHOP]:       'menu',
  [GAME_PHASES.MULTIPLAYER]:        'menu',
  [GAME_PHASES.ACHIEVEMENTS]:       'menu',
  [GAME_PHASES.LORE]:               'menu',
  [GAME_PHASES.SETTINGS]:           'menu',
  [GAME_PHASES.PRIVACY]:            'menu',
  [GAME_PHASES.LEGAL]:              'menu',
  [GAME_PHASES.MAP]:                'menu',
  [GAME_PHASES.BOSS_INTRO]:         'combat',
  [GAME_PHASES.COMBAT]:             'combat',
  [GAME_PHASES.REST_ROOM]:          'combat',
  [GAME_PHASES.SHOP_ROOM]:          'combat',
  [GAME_PHASES.EVENT_ROOM]:         'combat',
  [GAME_PHASES.UPGRADE_CHOICE]:     'combat',
  [GAME_PHASES.VICTORY]:            'victory',
  [GAME_PHASES.ORIGINE_ENCOUNTER]:  'victory',
  [GAME_PHASES.GAME_OVER]:          'gameover',
};

export default function App() {
  const phase             = useGameStore(s => s.phase);
  const meta              = useGameStore(s => s.meta);
  const premiumTheme      = meta.premiumTheme;
  const syncPurchases     = useGameStore(s => s.syncPurchases);

  // Initialisation audio + vérification des achats au démarrage
  useEffect(() => {
    initAudio();
    syncPurchases();
  }, []);

  // Synchroniser les préférences audio persistées avec le service
  useEffect(() => {
    setMusicEnabled(meta.musicEnabled ?? true);
    setSfxEnabled(meta.sfxEnabled ?? true);
  }, [meta.musicEnabled, meta.sfxEnabled]);

  useEffect(() => { setMusicVolume(meta.musicVolume ?? 0.4); }, [meta.musicVolume]);
  useEffect(() => { setSfxVolume(meta.sfxVolume ?? 0.7);     }, [meta.sfxVolume]);

  // Synchroniser la langue persistée
  useEffect(() => {
    if (meta.preferredLanguage) {
      i18n.changeLanguage(meta.preferredLanguage);
    }
  }, [meta.preferredLanguage]);

  // ── Fondu noir entre les changements d'écran ──────────────────────────────────
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const prevGroup      = useRef(screenGroup(phase));

  useEffect(() => {
    const newGroup = screenGroup(phase);
    if (newGroup === prevGroup.current) return;
    prevGroup.current = newGroup;
    Animated.sequence([
      Animated.timing(transitionAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.timing(transitionAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  // Musique selon la phase
  useEffect(() => {
    const music = MUSIC_MAP[phase];
    if (music) playMusic(music);
  }, [phase]);

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
      case GAME_PHASES.PROLOGUE:       return <PrologueScreen />;
      case GAME_PHASES.ORIGINE_ENCOUNTER: return <OrigineEncounterScreen />;
      case GAME_PHASES.MULTIPLAYER:    return <MultiplayerScreen />;
      case GAME_PHASES.ACHIEVEMENTS:   return <AchievementsScreen />;
      case GAME_PHASES.LORE:           return <LoreScreen />;
      case GAME_PHASES.SETTINGS:       return <SettingsScreen />;
      case GAME_PHASES.PRIVACY:        return <PrivacyScreen />;
      case GAME_PHASES.LEGAL:          return <LegalScreen />;
      default:                         return <MenuScreen />;
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      <SafeAreaProvider>
        <View style={[styles.root, neon && styles.rootNeon]}>
          <StatusBar style="light" backgroundColor={neon ? '#08001A' : PALETTE.bg} />
          {renderScreen()}
          {/* Fondu noir entre changements d'écran */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: transitionAnim }]}
          />
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
