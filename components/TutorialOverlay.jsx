/**
 * RIFT — TutorialOverlay
 * Guide interactif pour les nouveaux joueurs (pages glissantes)
 */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import Svg, { Polygon, Circle, Rect, G, Line } from 'react-native-svg';
import { PALETTE } from '../constants';

// ─── Contenu des pages ────────────────────────────────────────────────────────

const PAGES = [
  {
    key: 'goal',
    title: 'BIENVENUE DANS LE RIFT',
    visual: <GoalVisual />,
    lines: [
      'Le Rift est un donjon procédural en 3 actes.',
      'Chaque acte : 5 à 7 salles + un boss.\nActe I → mini-boss · Acte II → boss · Acte III → boss final.',
      'Construis ton build au fil des salles.\nChaque mort débloque un bonus permanent.',
    ],
  },
  {
    key: 'classes',
    title: 'CHOISIS TA CLASSE',
    visual: <ShapesVisual />,
    lines: [
      '🗡 Assassin — Ignore 50 % de l\'armure ennemie.\nRapide, mortel, fragile.',
      '🔮 Arcaniste — Frappe tous les ennemis adjacents.\nContrôle de foule, AoE.',
      '🛡 Colosse — Réduit 50 % des dégâts reçus\net renvoie 50 % ATK à l\'attaquant.',
    ],
  },
  {
    key: 'combat',
    title: 'COMMENT COMBATTRE',
    visual: <CombatVisual />,
    lines: [
      'Swipe sur la grille pour te déplacer,\nou tape directement une cellule adjacente.',
      'Les flèches autour de toi indiquent les cases libres.\nUne bordure rouge signale un ennemi attaquable.',
      'Vide la salle de tous ses ennemis\npour débloquer l\'issue et continuer.',
    ],
  },
  {
    key: 'rooms',
    title: 'TYPES DE SALLES',
    visual: <RoomsVisual />,
    lines: [
      '⚔ COMBAT — Bats tous les ennemis.\n+ REPOS — Récupère des PV.',
      '◆ SHOP — Achète des upgrades\ncontre des fragments (◈).',
      '☠ MINI-BOSS · ★ BOSS · 💀 BOSS FINAL\nChaque fin d\'acte = boss de plus en plus fort.',
    ],
  },
  {
    key: 'score',
    title: 'COMMENT MARQUER DES POINTS',
    visual: <ScoreVisual />,
    lines: [
      'Kills : chaque ennemi vaut des points.\nCombo : tuer plusieurs ennemis en un tour multiplie le score.',
      '⚡ Rapidité : finir une salle en < 5 tours\ndonne jusqu\'à +50 pts de bonus.',
      '✦ Sans dégâts : traverser une salle intacte = +25 pts.\n❤ PV restants : jusqu\'à +15 pts selon ta vie.',
    ],
  },
  {
    key: 'upgrades',
    title: 'UPGRADES ET SYNERGIES',
    visual: <UpgradesVisual />,
    lines: [
      'Après chaque salle de combat, choisis\nun upgrade parmi 3 propositions.',
      '🔴 Rouge = Offensif  🔵 Bleu = Défense/Util\n🟢 Vert = Soin/Support',
      'Accumule 3 upgrades de la même couleur\npour activer une synergie ✦ bonus !',
    ],
  },
  {
    key: 'meta',
    title: 'PROGRESSION PERMANENTE',
    visual: <MetaVisual />,
    lines: [
      'Chaque mort débloque 1 upgrade permanent\n(victoire = 2 upgrades) si la condition est remplie.',
      'Ces bonus s\'appliquent à tous tes runs suivants.\nPlus tu joues, plus ton personnage est fort au départ.',
      'Les Daily Runs partagent le même seed entre joueurs :\nseul le skill fait la différence au leaderboard.',
    ],
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function TutorialOverlay({ visible, onClose }) {
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  const goNext = () => {
    if (isLast) { onClose(); setPage(0); }
    else setPage(p => p + 1);
  };
  const goPrev = () => setPage(p => Math.max(0, p - 1));

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── En-tête ── */}
          <View style={styles.header}>
            <Text style={styles.pageIndicator}>{page + 1} / {PAGES.length}</Text>
            <TouchableOpacity onPress={() => { onClose(); setPage(0); }} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Titre ── */}
          <Text style={styles.title}>{current.title}</Text>

          {/* ── Visuel ── */}
          <View style={styles.visualBox}>
            {current.visual}
          </View>

          {/* ── Contenu texte ── */}
          <ScrollView style={styles.linesScroll} showsVerticalScrollIndicator={false}>
            {current.lines.map((line, i) => (
              <Text key={i} style={styles.line}>{line}</Text>
            ))}
          </ScrollView>

          {/* ── Points de pagination ── */}
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setPage(i)}>
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Navigation ── */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, page === 0 && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={page === 0}
            >
              <Text style={[styles.navBtnTxt, page === 0 && styles.navBtnTxtDisabled]}>← PRÉC</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={goNext}>
              <Text style={styles.navBtnTxtPrimary}>
                {isLast ? 'JOUER !' : 'SUIVANT →'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─── Visuels illustratifs ─────────────────────────────────────────────────────

function GoalVisual() {
  return (
    <Svg width={180} height={80} viewBox="0 0 180 80">
      {/* 6 couches simplifiées */}
      {[0,1,2,3,4,5].map(i => (
        <G key={i}>
          <Rect
            x={4 + i * 29} y={20} width={24} height={40}
            fill={i < 2 ? PALETTE.triangle + '33' : PALETTE.bgDark}
            stroke={i < 2 ? PALETTE.triangle : PALETTE.border}
            strokeWidth={1} rx={4}
          />
          {i < 5 && (
            <Line
              x1={28 + i * 29} y1={40}
              x2={33 + i * 29} y2={40}
              stroke={PALETTE.border} strokeWidth={1}
            />
          )}
          {i === 5 && (
            <Polygon
              points={`${16 + i*29},${28} ${26 + i*29},${52} ${6 + i*29},${52}`}
              fill={PALETTE.roomBoss || '#FF4466'}
              opacity={0.8}
            />
          )}
        </G>
      ))}
    </Svg>
  );
}

function ShapesVisual() {
  return (
    <Svg width={200} height={80} viewBox="0 0 200 80">
      {/* Triangle */}
      <Polygon points="40,18 20,62 60,62" fill="none" stroke={PALETTE.triangle} strokeWidth={2.5} />
      <Circle cx={40} cy={70} r={3} fill={PALETTE.triangle} />
      {/* Cercle */}
      <Circle cx={100} cy={40} r={22} fill="none" stroke={PALETTE.circle} strokeWidth={2.5} />
      <Circle cx={100} cy={70} r={3} fill={PALETTE.circle} />
      {/* Hexagone */}
      <Polygon
        points={hexPts(160, 40, 22)}
        fill="none" stroke={PALETTE.hexagon} strokeWidth={2.5}
      />
      <Circle cx={160} cy={70} r={3} fill={PALETTE.hexagon} />
    </Svg>
  );
}

function CombatVisual() {
  const S = 28;
  return (
    <Svg width={180} height={90} viewBox="0 0 180 90">
      {/* Grille 5x3 simplifiée */}
      {[0,1,2,3,4].map(col =>
        [0,1,2].map(row => (
          <Rect
            key={`${col}_${row}`}
            x={10 + col * (S+2)} y={5 + row * (S+2)}
            width={S} height={S}
            fill={PALETTE.bgDark} stroke={PALETTE.border} strokeWidth={0.5} rx={3}
          />
        ))
      )}
      {/* Joueur (triangle) au centre */}
      <Polygon
        points={triPts(10 + 2*(S+2) + S/2, 5 + 1*(S+2) + S/2, 9)}
        fill={PALETTE.triangle}
      />
      {/* Ennemi à droite */}
      <Circle cx={10 + 3*(S+2) + S/2} cy={5 + 1*(S+2) + S/2} r={8} fill={PALETTE.upgradeRed + 'CC'} />
      {/* Flèche d'attaque */}
      <Line
        x1={10 + 2*(S+2) + S}
        y1={5 + 1*(S+2) + S/2}
        x2={10 + 3*(S+2) + 2}
        y2={5 + 1*(S+2) + S/2}
        stroke={PALETTE.triangle} strokeWidth={2}
      />
    </Svg>
  );
}

function RoomsVisual() {
  const rooms = [
    { label: '⚔', color: PALETTE.roomCombat || '#FF7755', x: 24 },
    { label: '+', color: PALETTE.roomRest   || '#44FF88', x: 72 },
    { label: '◆', color: PALETTE.roomShop   || '#FFCC44', x: 120 },
    { label: '★', color: PALETTE.roomBoss   || '#FF4466', x: 168 },
  ];
  return (
    <Svg width={210} height={80} viewBox="0 0 210 80">
      {rooms.map(r => (
        <G key={r.x}>
          <Circle cx={r.x} cy={36} r={24} fill={r.color + '20'} stroke={r.color} strokeWidth={2} />
        </G>
      ))}
    </Svg>
  );
}

function UpgradesVisual() {
  const colors = [PALETTE.upgradeRed, PALETTE.upgradeBlue, PALETTE.upgradeGreen];
  return (
    <Svg width={200} height={80} viewBox="0 0 200 80">
      {colors.map((c, i) => (
        <G key={i}>
          <Rect x={20 + i * 60} y={15} width={44} height={50} rx={8}
            fill={c + '22'} stroke={c} strokeWidth={2} />
          <Circle cx={42 + i * 60} cy={38} r={8} fill={c} opacity={0.8} />
          {/* 3 dots pour montrer l'accumulation */}
          {[0,1,2].map(d => (
            <Circle key={d} cx={28 + d*8 + i*60} cy={55} r={3}
              fill={d === 0 ? c : PALETTE.border} />
          ))}
        </G>
      ))}
      {/* Synergie étoile */}
      <Polygon points={triPts(100, 10, 8)} fill={PALETTE.charge} opacity={0.9} />
    </Svg>
  );
}

function ScoreVisual() {
  const bars = [
    { label: 'Kills',      value: 0.5,  color: PALETTE.upgradeRed  },
    { label: 'Rapidité',   value: 0.75, color: PALETTE.charge       },
    { label: 'Sans dégât', value: 0.35, color: PALETTE.upgradeBlue  },
    { label: 'PV',         value: 0.6,  color: PALETTE.hp           },
  ];
  return (
    <Svg width={200} height={80} viewBox="0 0 200 80">
      {bars.map((b, i) => (
        <G key={i}>
          <Rect x={10} y={8 + i * 17} width={120} height={10} rx={5}
            fill={PALETTE.bgDark} stroke={PALETTE.border} strokeWidth={0.5} />
          <Rect x={10} y={8 + i * 17} width={120 * b.value} height={10} rx={5} fill={b.color} opacity={0.85} />
        </G>
      ))}
      {/* Score total */}
      <Rect x={148} y={20} width={42} height={40} rx={6} fill={PALETTE.bgDark} stroke={PALETTE.charge} strokeWidth={1} />
      <Circle cx={169} cy={34} r={8} fill={PALETTE.charge} opacity={0.8} />
      <Rect x={154} y={46} width={30} height={6} rx={3} fill={PALETTE.charge + '55'} />
    </Svg>
  );
}

function MetaVisual() {
  return (
    <Svg width={200} height={80} viewBox="0 0 200 80">
      {/* Barre de progression méta */}
      <Rect x={20} y={30} width={160} height={14} rx={7}
        fill={PALETTE.bgDark} stroke={PALETTE.border} strokeWidth={1} />
      <Rect x={20} y={30} width={90} height={14} rx={7}
        fill={PALETTE.charge + 'AA'} />
      {/* Étoiles débloquées */}
      {[0,1,2,3].map(i => (
        <Circle key={i} cx={34 + i * 20} cy={37} r={5}
          fill={i < 3 ? PALETTE.charge : PALETTE.bgDark}
          stroke={i < 3 ? PALETTE.charge : PALETTE.border}
          strokeWidth={1} opacity={0.9} />
      ))}
    </Svg>
  );
}

// ─── Helpers géométriques ─────────────────────────────────────────────────────

const triPts = (cx, cy, r) =>
  `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;

function hexPts(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         20,
  },
  card: {
    width:           '100%',
    maxWidth:        400,
    backgroundColor: PALETTE.bgCard,
    borderRadius:    18,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    padding:         22,
    gap:             14,
  },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  pageIndicator: { color: PALETTE.textDim, fontSize: 11, letterSpacing: 2 },
  closeBtn:      { color: PALETTE.textMuted, fontSize: 18, paddingLeft: 10 },

  title: {
    color:       PALETTE.textPrimary,
    fontSize:    16,
    fontWeight:  'bold',
    letterSpacing: 3,
    textAlign:   'center',
  },

  visualBox: {
    alignItems:      'center',
    backgroundColor: PALETTE.bgDark,
    borderRadius:    12,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    paddingVertical: 10,
    minHeight:       90,
    justifyContent:  'center',
  },

  linesScroll: { maxHeight: 140 },
  line: {
    color:        PALETTE.textMuted,
    fontSize:     13,
    lineHeight:   20,
    marginBottom: 10,
    textAlign:    'center',
  },

  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            8,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 4,
    backgroundColor: PALETTE.border,
  },
  dotActive: { backgroundColor: PALETTE.triangle, width: 18 },

  navRow: {
    flexDirection: 'row',
    gap:           10,
  },
  navBtn: {
    flex:            1,
    alignItems:      'center',
    paddingVertical: 13,
    borderRadius:    11,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    backgroundColor: PALETTE.bgDark,
  },
  navBtnDisabled:  { opacity: 0.3 },
  navBtnPrimary: {
    borderColor:     PALETTE.triangle,
    backgroundColor: '#001A10',
  },
  navBtnTxt:         { color: PALETTE.textMuted,  fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
  navBtnTxtDisabled: { color: PALETTE.textDim },
  navBtnTxtPrimary:  { color: PALETTE.triangle,   fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
});
