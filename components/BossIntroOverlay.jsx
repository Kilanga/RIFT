/**
 * RIFT — BossDialogueOverlay
 * Dialogue interactif avant chaque combat de boss.
 * Le joueur choisit ses réponses (sans impact sur le combat).
 * Bouton COMBATTRE à la fin pour lancer le combat.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { PALETTE, ENEMY_TYPES, GAME_PHASES } from '../constants';
import { BOSS_DIALOGUES } from '../utils/loreData';
import { playSfx } from '../services/audioService';
import useGameStore from '../store/gameStore';

// ─── Données de présentation par boss ────────────────────────────────────────

const BOSS_META = {
  [ENEMY_TYPES.BOSS_VOID]: {
    name:     "L'Écho",
    subtitle: 'Acte I · Premier niveau',
    color:    '#BB44FF',
    abilities: [
      'PULSE toutes les 3 actions',
      'Dégâts à portée 2',
      'Poursuite si la spirale est bloquée',
    ],
  },
  [ENEMY_TYPES.BOSS_CINDER]: {
    name:     'Le Veilleur de Cendre',
    subtitle: 'Acte I · Brasier dormant',
    color:    '#FF7A2F',
    abilities: [
      'PULSE de braise toutes les 3 actions',
      'Zone de menace à courte portée',
      'Appelle des renforts depuis les bords en phase basse',
    ],
  },
  [ENEMY_TYPES.BOSS_MIRROR]: {
    name:     'La Mère-Écho',
    subtitle: 'Acte I · Résonance',
    color:    '#FF66AA',
    abilities: [
      'Rythme alterné tous les 2 tours',
      'Réagit aux axes du joueur',
      'Se replace sur la position miroir',
    ],
  },
  [ENEMY_TYPES.BOSS_WEAVER]: {
    name:     'Le Tisseur de Ruines',
    subtitle: 'Acte I · Trame brisée',
    color:    '#C48AFF',
    abilities: [
      'Appel de renforts toutes les 3 actions',
      'Pression sans verrouiller la salle',
      'Utilise la distance pour tisser l’étau',
    ],
  },
  [ENEMY_TYPES.BOSS_RUST]: {
    name:     "L'Ange Rouillé",
    subtitle: 'Acte I · Armure oubliée',
    color:    '#B7A588',
    abilities: [
      'Se renforce si ta méta-progression est incomplète',
      'Gagne un bouclier périodique',
      'Devient plus agressif quand il s’use',
    ],
  },
  [ENEMY_TYPES.BOSS_CUTTER]: {
    name:     "Le Fendeur d'Ombres",
    subtitle: 'Acte I · Lignes de rupture',
    color:    '#66D6FF',
    abilities: [
      'Frappe les lignes et colonnes alignées',
      'Désaxe ses approches en deux temps',
      'Punit les couloirs trop prévisibles',
    ],
  },
  [ENEMY_TYPES.BOSS_PULSE]: {
    name:     'Tonnerre Incarné',
    subtitle: 'Acte II · Cœur du Rift',
    color:    '#FF6644',
    abilities: [
      'ONDE tous les 2 tours',
      'Frappe en croix si aligné',
      'Se rapproche quand l’onde est en récupération',
    ],
  },
  [ENEMY_TYPES.BOSS_RIFT]: {
    name:     'Le Dévoreur',
    subtitle: 'Acte III · Les Profondeurs',
    color:    '#FF2266',
    abilities: [
      'RIFT PULSE tous les 3 tours',
      'Dégâts augmentés sous 60% puis 30% PV',
      'Avance plus vite enragé',
    ],
  },
  [ENEMY_TYPES.BOSS_GUARDIAN]: {
    name:     'Le Gardien',
    subtitle: 'Acte III · La Porte',
    color:    '#44CCFF',
    abilities: [
      'ONDE SACRÉE tous les 4 tours',
      'Frappe lourde au contact',
      'Avance lentement mais régulièrement',
    ],
  },
  [ENEMY_TYPES.BOSS_ENTITY]: {
    name:     "L'Entité",
    subtitle: 'Acte III · Au-delà',
    color:    '#FF0044',
    abilities: [
      'DÉFLAGRATION toutes les 3 actions',
      'Dégâts à distance 2–3',
      'Accélère en phase basse PV',
    ],
  },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export default function BossIntroOverlay({ bossType }) {
  const setPhase = useGameStore(s => s.setPhase);

  const data     = BOSS_DIALOGUES[bossType] || BOSS_DIALOGUES[ENEMY_TYPES.BOSS_VOID];
  const meta     = BOSS_META[bossType]      || BOSS_META[ENEMY_TYPES.BOSS_VOID];
  const color    = meta.color;

  const [exchangeIdx,  setExchangeIdx]  = useState(0);
  const [choiceDone,   setChoiceDone]   = useState(false);
  const [response,     setResponse]     = useState('');
  const [showFinal,    setShowFinal]    = useState(false);
  const [showFight,    setShowFight]    = useState(false);

  // Son d'intro boss + animation de pulsation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    playSfx('boss_roar');
    const id = setInterval(() => setTick(t => (t + 1) % 60), 50);
    return () => clearInterval(id);
  }, []);

  // Fade-in pour les boîtes de texte
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [exchangeIdx, choiceDone, showFinal]);

  const exchange   = data.exchanges[exchangeIdx];
  const isLastExch = exchangeIdx >= data.exchanges.length - 1;
  const pulse      = 0.65 + 0.35 * Math.sin(tick * 0.18);

  function handleChoice(choice) {
    setResponse(choice.response);
    setChoiceDone(true);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  function handleNext() {
    if (!isLastExch) {
      setExchangeIdx(i => i + 1);
      setChoiceDone(false);
      setResponse('');
    } else {
      setShowFinal(true);
      setShowFight(true);
    }
  }

  function startCombat() {
    setPhase(GAME_PHASES.COMBAT);
  }

  return (
    <View style={styles.overlay}>

      {/* Fond animé */}
      <View style={[styles.bg, { opacity: 0.06 + 0.03 * Math.sin(tick * 0.12) }]}>
        <Svg width={320} height={320} viewBox="0 0 320 320">
          {[70, 105, 140].map((r, i) => (
            <Circle key={i} cx={160} cy={160} r={r}
              fill="none" stroke={color} strokeWidth={1}
              opacity={0.3 + 0.1 * Math.sin(tick * 0.1 + i)}
            />
          ))}
        </Svg>
      </View>

      {/* Icône boss */}
      <View style={styles.iconArea}>
        <Svg width={80} height={80} viewBox="0 0 80 80">
          <Circle cx={40} cy={40} r={32} fill={color} opacity={0.12 * pulse} />
          <Circle cx={40} cy={40} r={22} fill={color} opacity={0.22 * pulse} />
          <Circle cx={40} cy={40} r={13} fill={color} opacity={pulse} />
          <Polygon points={starPts(40, 40, 34, 14, 6)}
            fill="none" stroke={color} strokeWidth={1.5} opacity={0.5 * pulse} />
        </Svg>
      </View>

      {/* En-tête boss */}
      <View style={styles.header}>
        <Text style={[styles.bossLabel, { color: color + 'CC' }]}>⚠  BOSS</Text>
        <Text style={[styles.bossName, { color }]}>{meta.name}</Text>
        <Text style={styles.bossSub}>{meta.subtitle}</Text>
        <View style={[styles.abilityBox, { borderColor: color + '55' }]}>
          <Text style={[styles.abilityTitle, { color }]}>{'PATTERN'}</Text>
          {meta.abilities.map((ability, index) => (
            <Text key={`${bossType}_${index}`} style={styles.abilityLine}>• {ability}</Text>
          ))}
        </View>
      </View>

      <ScrollView style={styles.dialogScroll} contentContainerStyle={styles.dialogContent} showsVerticalScrollIndicator={false}>

        {/* Réplique du boss */}
        {!showFinal && (
          <Animated.View style={[styles.bossBox, { borderColor: color + '55', opacity: fadeAnim }]}>
            <Text style={[styles.speakerName, { color }]}>{meta.name}</Text>
            <Text style={styles.bossLine}>{exchange.boss}</Text>
          </Animated.View>
        )}

        {/* Réponse choisie */}
        {choiceDone && (
          <Animated.View style={[styles.playerBox, { opacity: fadeAnim }]}>
            <Text style={styles.playerSpeaker}>Toi</Text>
            <Text style={styles.playerLine}>"{response}"</Text>
          </Animated.View>
        )}

        {/* Choix */}
        {!choiceDone && !showFinal && (
          <Animated.View style={[styles.choicesArea, { opacity: fadeAnim }]}>
            {exchange.choices.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.choiceBtn, { borderColor: color + '66' }]}
                onPress={() => handleChoice(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.choiceTxt, { color }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Bouton Continuer après choix */}
        {choiceDone && !showFinal && (
          <TouchableOpacity style={[styles.nextBtn, { borderColor: color + '88' }]} onPress={handleNext} activeOpacity={0.7}>
            <Text style={[styles.nextTxt, { color }]}>Continuer ›</Text>
          </TouchableOpacity>
        )}

        {/* Réplique finale du boss */}
        {showFinal && (
          <Animated.View style={[styles.bossBox, styles.bossBoxFinal, { borderColor: color, opacity: fadeAnim }]}>
            <Text style={[styles.speakerName, { color }]}>{meta.name}</Text>
            <Text style={styles.bossLine}>{data.final}</Text>
          </Animated.View>
        )}

      </ScrollView>

      {/* Bouton COMBATTRE */}
      {showFight && (
        <TouchableOpacity style={[styles.fightBtn, { borderColor: color }]} onPress={startCombat} activeOpacity={0.8}>
          <Text style={[styles.fightTxt, { color }]}>COMBATTRE</Text>
        </TouchableOpacity>
      )}

    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const starPts = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex:              1,
    backgroundColor:   '#05050E',
    alignItems:        'center',
    paddingTop:        24,
    paddingHorizontal: 20,
    paddingBottom:     16,
    gap:               12,
  },
  bg: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconArea: { alignItems: 'center' },
  header: { alignItems: 'center', gap: 4 },
  bossLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 5 },
  bossName:  { fontSize: 30, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center' },
  bossSub:   { color: PALETTE.textMuted, fontSize: 12, letterSpacing: 1 },
  abilityBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#0A0A14',
  },
  abilityTitle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  abilityLine: { color: PALETTE.textPrimary, fontSize: 11, lineHeight: 16 },

  dialogScroll:  { width: '100%', flex: 1 },
  dialogContent: { gap: 12, paddingBottom: 8 },

  bossBox: {
    backgroundColor: '#0A0A14',
    borderWidth:     1,
    borderRadius:    12,
    padding:         14,
    gap:             6,
  },
  bossBoxFinal: {
    borderWidth: 2,
  },
  speakerName: { fontSize: 11, fontWeight: 'bold', letterSpacing: 2 },
  bossLine:    { color: PALETTE.textPrimary, fontSize: 13, lineHeight: 20 },

  playerBox: {
    backgroundColor: '#0A0E0A',
    borderWidth:     1,
    borderColor:     PALETTE.triangle + '44',
    borderRadius:    12,
    padding:         14,
    gap:             4,
    alignSelf:       'flex-end',
    maxWidth:        '85%',
  },
  playerSpeaker: { color: PALETTE.triangle, fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  playerLine:    { color: PALETTE.textPrimary, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  choicesArea: { gap: 8 },
  choiceBtn: {
    borderWidth:       1,
    borderRadius:      10,
    paddingVertical:   12,
    paddingHorizontal: 16,
    backgroundColor:   '#08080F',
  },
  choiceTxt: { fontSize: 13, lineHeight: 18 },

  nextBtn: {
    alignSelf:         'flex-end',
    borderWidth:       1,
    borderRadius:      8,
    paddingVertical:   8,
    paddingHorizontal: 18,
  },
  nextTxt: { fontSize: 13, fontWeight: 'bold' },

  fightBtn: {
    width:           '100%',
    borderWidth:     2,
    borderRadius:    14,
    paddingVertical: 16,
    alignItems:      'center',
    backgroundColor: '#0A0205',
  },
  fightTxt: { fontSize: 18, fontWeight: 'bold', letterSpacing: 5 },
});
