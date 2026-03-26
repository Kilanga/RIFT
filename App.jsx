/**
 * RIFT — App.jsx
 * Point d'entrée de l'application
 * Routage basé sur la phase du store (pas de bibliothèque de navigation externe)
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useGameStore from './store/gameStore';
import { GAME_PHASES, PALETTE } from './constants';

import MenuScreen          from './screens/MenuScreen';
import ShapeSelectScreen   from './screens/ShapeSelectScreen';
import MapScreen           from './screens/MapScreen';
import GameScreen          from './screens/GameScreen';
import GameOverScreen      from './screens/GameOverScreen';
import VictoryScreen       from './screens/VictoryScreen';
import MultiplayerScreen   from './screens/MultiplayerScreen';

export default function App() {
  const phase = useGameStore(s => s.phase);

  const renderScreen = () => {
    switch (phase) {
      case GAME_PHASES.MENU:           return <MenuScreen />;
      case GAME_PHASES.SHAPE_SELECT:   return <ShapeSelectScreen />;
      case GAME_PHASES.MAP:            return <MapScreen />;
      case GAME_PHASES.BOSS_INTRO:
      case GAME_PHASES.COMBAT:
      case GAME_PHASES.REST_ROOM:
      case GAME_PHASES.SHOP_ROOM:
      case GAME_PHASES.UPGRADE_CHOICE: return <GameScreen />;
      case GAME_PHASES.GAME_OVER:      return <GameOverScreen />;
      case GAME_PHASES.VICTORY:        return <VictoryScreen />;
      case GAME_PHASES.MULTIPLAYER:    return <MultiplayerScreen />;
      default:                         return <MenuScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" backgroundColor={PALETTE.bg} />
        {renderScreen()}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: PALETTE.bg,
  },
});
