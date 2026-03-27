/**
 * RIFT — MapScreen
 * Carte du run : arbre de salles, barre de progression, score, aperçu couche suivante
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { ROOM_TYPES, PALETTE } from '../constants';

const { width: SCREEN_W } = Dimensions.get('window');
const NODE_SIZE = 48;

export default function MapScreen() {
  const { t } = useTranslation();
  const roomMap              = useGameStore(s => s.roomMap);
  const run                  = useGameStore(s => s.run);
  const player               = useGameStore(s => s.player);
  const activeUpgrades       = useGameStore(s => s.activeUpgrades);
  const selectNode           = useGameStore(s => s.selectNode);
  const getSelectableNodeIds = useGameStore(s => s.getSelectableNodeIds);
  const pauseRun             = useGameStore(s => s.pauseRun);
  const abandonRun           = useGameStore(s => s.abandonRun);

  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showUpgradesModal,  setShowUpgradesModal]  = useState(false);

  const selectableIds = getSelectableNodeIds();

  if (!roomMap || roomMap.length === 0) return null;

  const totalLayers = roomMap.length;

  // Aperçu des types de salles de la prochaine couche sélectionnable
  const nextLayerNodes = selectableIds.length > 0
    ? roomMap.find(layer => layer.some(n => selectableIds.includes(n.id))) || []
    : [];
  const nextTypes = [...new Set(nextLayerNodes.map(n => n.type))];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnBack} onPress={pauseRun} activeOpacity={0.7}>
            <Text style={styles.btnBackTxt}>{t('map.back_menu')}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.floorLabel}>
              {run.isDailyRun ? '☀ DAILY' : `SEED #${run.mapSeed || '—'}`}
            </Text>
            <Text style={styles.roomCount}>
              {run.roomsCleared !== 1
                ? t('map.rooms_cleared_plural', { count: run.roomsCleared })
                : t('map.rooms_cleared', { count: run.roomsCleared })}
            </Text>
          </View>
          {!showAbandonConfirm ? (
            <TouchableOpacity style={styles.btnAbandon} onPress={() => setShowAbandonConfirm(true)} activeOpacity={0.7}>
              <Text style={styles.btnAbandonTxt}>{t('map.abandon')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.abandonConfirmRow}>
              <Text style={styles.abandonConfirmTxt}>{t('map.are_you_sure')}</Text>
              <TouchableOpacity style={styles.btnConfirmYes} onPress={abandonRun} activeOpacity={0.7}>
                <Text style={styles.btnConfirmYesTxt}>{t('map.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirmNo} onPress={() => setShowAbandonConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.btnConfirmNoTxt}>{t('map.no')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Actions run ──────────────────────────────────────────────── */}
        <View style={styles.actionRow}>
          <PlayerMiniStats player={player} />
          <View style={styles.actionBtns}>
            {activeUpgrades.length > 0 && (
              <TouchableOpacity style={styles.btnUpgrades} onPress={() => setShowUpgradesModal(true)} activeOpacity={0.7}>
                <Text style={styles.btnUpgradesTxt}>{t('map.upgrades_btn', { count: activeUpgrades.length })}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.scoreBox}>
              <Text style={styles.scoreVal}>{run.score}</Text>
              <Text style={styles.scoreLbl}>{t('map.score_label')}</Text>
            </View>
          </View>
        </View>

        {/* ── Modal upgrades ───────────────────────────────────────────── */}
        <UpgradesModal
          visible={showUpgradesModal}
          upgrades={activeUpgrades}
          onClose={() => setShowUpgradesModal(false)}
        />

        {/* ── Barre de progression du run ─────────────────────────────── */}
        <RunProgress layerIndex={run.currentLayerIndex} total={totalLayers} roomMap={roomMap} run={run} />

        {/* ── Aperçu prochaine couche ─────────────────────────────────── */}
        {nextTypes.length > 0 && (
          <View style={styles.nextRow}>
            <Text style={styles.nextLabel}>{t('map.next_layer')}</Text>
            {nextTypes.map(type => (
              <View key={type} style={[styles.nextBadge, { borderColor: roomColor(type) }]}>
                <Text style={[styles.nextBadgeTxt, { color: roomColor(type) }]}>
                  {roomIcon(type)} {roomLabel(type, t)}
                </Text>
              </View>
            ))}
          </View>
        )}


        {/* ── Carte SVG ───────────────────────────────────────────────── */}
        <ScrollView style={styles.mapScroll} showsVerticalScrollIndicator={false}>
          <MapTree
            roomMap={roomMap}
            selectableIds={selectableIds}
            currentNodeId={run.currentNodeId}
            onSelect={selectNode}
          />
        </ScrollView>

        {/* ── Légende ─────────────────────────────────────────────────── */}
        <View style={styles.legend}>
          {[
            { type: ROOM_TYPES.COMBAT,     labelKey: 'map.legend_combat'    },
            { type: ROOM_TYPES.REST,       labelKey: 'map.legend_rest'      },
            { type: ROOM_TYPES.SHOP,       labelKey: 'map.legend_shop'      },
            { type: ROOM_TYPES.BOSS_MINI,  labelKey: 'map.legend_boss_mini' },
            { type: ROOM_TYPES.BOSS,       labelKey: 'map.legend_boss'      },
            { type: ROOM_TYPES.BOSS_FINAL, labelKey: 'map.legend_final'     },
          ].map(({ type, labelKey }) => {
            const label = t(labelKey);
            return (
              <View key={labelKey} style={styles.legendItem}>
                <Text style={{ fontSize: 11 }}>{roomIcon(type)}</Text>
                <Text style={[styles.legendTxt, { color: roomColor(type) }]}>{label}</Text>
              </View>
            );
          })}
        </View>

      </View>
    </SafeAreaView>
  );
}

// ─── Barre de progression du run ──────────────────────────────────────────────

function RunProgress({ layerIndex, total, roomMap, run }) {
  const { t } = useTranslation();
  const actBoundaries = run?.actBoundaries || [];

  // Calcul de l'acte courant
  const currentAct = layerIndex < actBoundaries[0] ? 1
                   : layerIndex < actBoundaries[1] ? 2 : 3;

  return (
    <View style={styles.progressBox}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{t('map.act_label', { act: currentAct })}</Text>
        <Text style={styles.progressFraction}>
          {t('map.layer_fraction', { current: layerIndex, total })}
        </Text>
      </View>

      {/* Segments groupés par acte */}
      <View style={styles.progressActs}>
        {[0, 1, 2].map(actIdx => {
          const start = actIdx === 0 ? 0 : actBoundaries[actIdx - 1] ?? 0;
          const end   = actBoundaries[actIdx] ?? total;
          const actColor = actIdx === 0 ? PALETTE.upgradeBlue
                         : actIdx === 1 ? PALETTE.upgradeRed
                         : '#FF2266';
          const actLabel = actIdx === 0 ? t('map.act_i') : actIdx === 1 ? t('map.act_ii') : t('map.act_iii');
          return (
            <View key={actIdx} style={styles.progressActGroup}>
              <Text style={[styles.progressActLabel, { color: actColor + (currentAct === actIdx+1 ? 'FF' : '55') }]}>
                {actLabel}
              </Text>
              <View style={styles.progressSegments}>
                {Array.from({ length: end - start }, (_, i) => {
                  const li      = start + i;
                  const cleared = li < layerIndex;
                  const current = li === layerIndex;
                  const nodes   = roomMap?.[li] || [];
                  const isBoss  = nodes.some(n => [ROOM_TYPES.BOSS_MINI, ROOM_TYPES.BOSS, ROOM_TYPES.BOSS_FINAL].includes(n.type));
                  const isFinal = nodes.some(n => n.type === ROOM_TYPES.BOSS_FINAL);
                  const bgColor = cleared ? actColor
                                : current ? actColor + '66'
                                : isFinal ? '#FF226633'
                                : isBoss  ? PALETTE.roomBoss + '33'
                                : PALETTE.bgDark;
                  return (
                    <View key={li} style={[
                      styles.segment,
                      { backgroundColor: bgColor, borderColor: current ? actColor : 'transparent' },
                    ]}>
                      {isBoss && !cleared && (
                        <Text style={{ fontSize: 7, lineHeight: 9 }}>{isFinal ? '★' : '☠'}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Arbre de salles SVG ──────────────────────────────────────────────────────

function MapTree({ roomMap, selectableIds, currentNodeId, onSelect }) {
  const { t } = useTranslation();
  const LAYER_H = 92;
  const svgW    = SCREEN_W - 40;
  const svgH    = roomMap.length * LAYER_H + 50;

  return (
    <View style={{ width: svgW, alignSelf: 'center', height: svgH }}>
      {/* ── SVG : connexions + visuels des noeuds (pas de touch ici) ── */}
      <Svg width={svgW} height={svgH} style={{ position: 'absolute' }}>
        {/* Connexions */}
        {roomMap.map((layer, li) =>
          layer.map(node =>
            node.connections.map(connId => {
              const nextLayer = roomMap[li + 1];
              if (!nextLayer) return null;
              const target = nextLayer.find(n => n.id === connId);
              if (!target) return null;

              const x1 = nodeX(node.position, layer.length, svgW);
              const y1 = nodeY(li, LAYER_H) + NODE_SIZE / 2;
              const x2 = nodeX(target.position, nextLayer.length, svgW);
              const y2 = nodeY(li + 1, LAYER_H) - NODE_SIZE / 2;
              const isPath = node.cleared || selectableIds.includes(connId);

              return (
                <Line
                  key={`line_${node.id}_${connId}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isPath ? PALETTE.borderLight : PALETTE.border}
                  strokeWidth={isPath ? 2 : 1}
                  opacity={isPath ? 0.8 : 0.25}
                  strokeDasharray={isPath ? undefined : '4,4'}
                />
              );
            })
          )
        )}

        {/* Visuels noeuds */}
        {roomMap.map((layer, li) =>
          layer.map(node => {
            const cx = nodeX(node.position, layer.length, svgW);
            const cy = nodeY(li, LAYER_H);
            return (
              <MapNodeSvg
                key={node.id}
                node={node}
                cx={cx} cy={cy}
                isSelectable={selectableIds.includes(node.id)}
                isCleared={node.cleared}
                isCurrent={node.id === currentNodeId}
                tFn={t}
              />
            );
          })
        )}
      </Svg>

      {/* ── TouchableOpacity natifs superposés pour chaque nœud ── */}
      {roomMap.map((layer, li) =>
        layer.map(node => {
          const cx          = nodeX(node.position, layer.length, svgW);
          const cy          = nodeY(li, LAYER_H);
          const isSelectable = selectableIds.includes(node.id);
          const hitSize     = NODE_SIZE + 12;

          return (
            <TouchableOpacity
              key={`touch_${node.id}`}
              style={{
                position:        'absolute',
                left:            cx - hitSize / 2,
                top:             cy - hitSize / 2,
                width:           hitSize,
                height:          hitSize,
                borderRadius:    hitSize / 2,
              }}
              onPress={() => isSelectable && onSelect(node.id)}
              activeOpacity={isSelectable ? 0.6 : 1}
              disabled={!isSelectable}
            />
          );
        })
      )}
    </View>
  );
}

// ─── Nœud de carte (visuel SVG uniquement, sans onPress) ──────────────────────

function MapNodeSvg({ node, cx, cy, isSelectable, isCleared, isCurrent, tFn }) {
  const color   = roomColor(node.type);
  const r       = NODE_SIZE / 2 - 2;
  const opacity = isCleared ? 0.35 : isSelectable ? 1 : 0.25;

  return (
    <G opacity={opacity}>
      {isSelectable && (
        <>
          <Circle cx={cx} cy={cy} r={r + 10} fill={color} opacity={0.06} />
          <Circle cx={cx} cy={cy} r={r + 6}  fill={color} opacity={0.1} />
        </>
      )}
      <Circle cx={cx} cy={cy} r={r} fill={PALETTE.bgCard} />
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={isSelectable ? 2.5 : 1} />
      <RoomIcon type={node.type} cx={cx} cy={cy} color={color} r={r * 0.52} isCleared={isCleared} />
      {isSelectable && (
        <Circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
      )}
      {isCleared && (
        <SvgText x={cx} y={cy - r + 11} textAnchor="middle" fill={color} fontSize={11}>✓</SvgText>
      )}
      <SvgText x={cx} y={cy + r + 14} textAnchor="middle"
        fill={isSelectable ? color : PALETTE.textDim} fontSize={9}>
        {roomLabel(node.type, tFn)}
      </SvgText>
    </G>
  );
}

function RoomIcon({ type, cx, cy, color, r, isCleared }) {
  if (isCleared) return <Circle cx={cx} cy={cy} r={r * 0.5} fill={color} opacity={0.4} />;
  switch (type) {
    case ROOM_TYPES.COMBAT: return <Polygon points={triPts(cx, cy, r)} fill={color} />;
    case ROOM_TYPES.REST:   return (
      <G>
        <Rect x={cx-2} y={cy-r}   width={4}     height={r*2} fill={color} rx={2} />
        <Rect x={cx-r} y={cy-2}   width={r*2}   height={4}   fill={color} rx={2} />
      </G>
    );
    case ROOM_TYPES.SHOP:   return <Polygon points={diamondPts(cx, cy, r)} fill={color} />;
    case ROOM_TYPES.BOSS:   return <Polygon points={starPts(cx, cy, r, r*0.4, 5)} fill={color} />;
    default: return <Circle cx={cx} cy={cy} r={r * 0.6} fill={color} />;
  }
}

// ─── Mini stats joueur ────────────────────────────────────────────────────────

function PlayerMiniStats({ player }) {
  const ratio     = player.hp / player.maxHp;
  const lowHp     = ratio < 0.35;
  return (
    <View style={styles.miniStats}>
      <Text style={[styles.hpTxt, lowHp && { color: PALETTE.upgradeRed }]}>
        ❤ {player.hp}/{player.maxHp}
      </Text>
      <View style={styles.hpBarBg}>
        <View style={[
          styles.hpBarFill,
          {
            width: `${ratio * 100}%`,
            backgroundColor: lowHp ? PALETTE.upgradeRed : PALETTE.hp,
          },
        ]} />
      </View>
      <Text style={styles.atkTxt}>⚔ {player.attack}  🛡 {player.defense}</Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodeX(position, layerSize, svgW) {
  if (layerSize === 1) return svgW / 2;
  const margin  = 44;
  const usableW = svgW - margin * 2;
  return margin + position * (usableW / (layerSize - 1));
}

function nodeY(layerIndex, layerH) {
  return 28 + layerIndex * layerH;
}

function roomColor(type) {
  return {
    [ROOM_TYPES.COMBAT]:     PALETTE.roomCombat,
    [ROOM_TYPES.REST]:       PALETTE.roomRest,
    [ROOM_TYPES.SHOP]:       PALETTE.roomShop,
    [ROOM_TYPES.BOSS_MINI]:  PALETTE.roomBoss,
    [ROOM_TYPES.BOSS]:       PALETTE.roomBoss,
    [ROOM_TYPES.BOSS_FINAL]: '#FF2266',
  }[type] || PALETTE.textMuted;
}

function roomIcon(type) {
  return {
    [ROOM_TYPES.COMBAT]:     '⚔',
    [ROOM_TYPES.REST]:       '+',
    [ROOM_TYPES.SHOP]:       '◆',
    [ROOM_TYPES.BOSS_MINI]:  '☠',
    [ROOM_TYPES.BOSS]:       '★',
    [ROOM_TYPES.BOSS_FINAL]: '👁',
  }[type] || '?';
}

function roomLabel(type, t) {
  if (!t) {
    return {
      [ROOM_TYPES.COMBAT]:     'Combat',
      [ROOM_TYPES.REST]:       'Rest',
      [ROOM_TYPES.SHOP]:       'Shop',
      [ROOM_TYPES.BOSS_MINI]:  'Mini-Boss',
      [ROOM_TYPES.BOSS]:       'Boss',
      [ROOM_TYPES.BOSS_FINAL]: 'FINAL BOSS',
    }[type] || '?';
  }
  return {
    [ROOM_TYPES.COMBAT]:     t('map.legend_combat'),
    [ROOM_TYPES.REST]:       t('map.legend_rest'),
    [ROOM_TYPES.SHOP]:       t('map.legend_shop'),
    [ROOM_TYPES.BOSS_MINI]:  t('map.legend_boss_mini'),
    [ROOM_TYPES.BOSS]:       t('map.legend_boss'),
    [ROOM_TYPES.BOSS_FINAL]: t('map.legend_final'),
  }[type] || '?';
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen }[color] || '#888';
}

const triPts     = (cx, cy, r) => `${cx},${cy-r} ${cx-r*0.866},${cy+r*0.5} ${cx+r*0.866},${cy+r*0.5}`;
const diamondPts = (cx, cy, r) => `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`;
const starPts    = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

// ─── Modal upgrades ───────────────────────────────────────────────────────────

function UpgradesModal({ visible, upgrades, onClose }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✦ {t('game.upgrades_active')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Text style={styles.modalCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
            <View style={styles.modalCards}>
              {upgrades.map((u, i) => {
                const hex = upgradeHex(u.color);
                return (
                  <View
                    key={`${u.id}_${i}`}
                    style={[
                      styles.modalCard,
                      { borderColor: u.synergyActive ? hex : PALETTE.border },
                      u.synergyActive && { backgroundColor: hex + '12' },
                    ]}
                  >
                    <View style={[styles.modalColorBar, { backgroundColor: hex }]} />
                    <View style={styles.modalCardBody}>
                      <View style={styles.modalCardTop}>
                        <Text style={[styles.modalCardName, { color: u.synergyActive ? hex : PALETTE.textPrimary }]}>
                          {u.synergyActive ? '✦ ' : ''}{u.name}
                        </Text>
                        <View style={[styles.modalColorDot, { backgroundColor: hex }]} />
                      </View>
                      <Text style={[styles.modalCardDesc, { color: hex + 'CC' }]}>{u.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 10 },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  floorLabel:   { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  roomCount:    { color: PALETTE.textMuted, fontSize: 11, textAlign: 'center' },
  scoreBox:  { alignItems: 'flex-end' },
  scoreVal:  { color: PALETTE.charge, fontSize: 18, fontWeight: 'bold' },
  scoreLbl:  { color: PALETTE.textDim, fontSize: 10, letterSpacing: 2 },

  btnBack: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },
  btnBackTxt: { color: PALETTE.textMuted, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  // Action row
  actionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  actionBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },

  btnUpgrades: {
    borderWidth:     1,
    borderColor:     PALETTE.upgradeBlue + '88',
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   5,
    backgroundColor: PALETTE.upgradeBlue + '15',
  },
  btnUpgradesTxt: { color: PALETTE.upgradeBlue, fontSize: 11, fontWeight: 'bold' },

  btnAbandon: {
    borderWidth:     1,
    borderColor:     PALETTE.upgradeRed + '88',
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   5,
  },
  btnAbandonTxt: { color: PALETTE.upgradeRed, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },

  abandonConfirmRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  abandonConfirmTxt: { color: PALETTE.upgradeRed, fontSize: 10 },
  btnConfirmYes: {
    backgroundColor: PALETTE.upgradeRed,
    borderRadius:    6,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  btnConfirmYesTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  btnConfirmNo: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    6,
    paddingHorizontal: 10,
    paddingVertical:   5,
  },
  btnConfirmNoTxt: { color: PALETTE.textMuted, fontSize: 11, fontWeight: 'bold' },

  // Upgrades modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor:      PALETTE.bgCard,
    borderTopLeftRadius:  18,
    borderTopRightRadius: 18,
    borderTopWidth:       1,
    borderLeftWidth:      1,
    borderRightWidth:     1,
    borderColor:          PALETTE.borderLight,
    padding:              16,
    gap:                  12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:  { color: PALETTE.charge, fontSize: 13, fontWeight: 'bold', letterSpacing: 3 },
  modalClose:  { padding: 4 },
  modalCloseTxt: { color: PALETTE.textMuted, fontSize: 16 },
  modalCards:  { gap: 8 },
  modalCard: {
    flexDirection: 'row',
    borderWidth:   1,
    borderRadius:  10,
    overflow:      'hidden',
    backgroundColor: '#0A0A16',
  },
  modalColorBar:  { width: 4, backgroundColor: PALETTE.border },
  modalCardBody:  { flex: 1, padding: 10, gap: 3 },
  modalCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalCardName:  { fontSize: 13, fontWeight: 'bold', flex: 1 },
  modalColorDot:  { width: 6, height: 6, borderRadius: 3 },
  modalCardDesc:  { fontSize: 11, lineHeight: 16 },

  // Progression
  progressBox: {
    gap:             6,
    backgroundColor: PALETTE.bgCard,
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    padding:         10,
  },
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel:    { color: PALETTE.textPrimary, fontSize: 10, fontWeight: 'bold', letterSpacing: 2 },
  progressFraction: { color: PALETTE.textMuted, fontSize: 10 },
  progressActs:     { flexDirection: 'row', gap: 6 },
  progressActGroup: { flex: 1, gap: 3 },
  progressActLabel: { fontSize: 8, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  progressSegments: { flexDirection: 'row', gap: 2 },
  segment: {
    flex:            1,
    height:          8,
    borderRadius:    3,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    alignItems:      'center',
    justifyContent:  'center',
  },

  // Next layer preview
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  nextLabel: { color: PALETTE.textDim, fontSize: 10, letterSpacing: 1 },
  nextBadge: {
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  nextBadgeTxt: { fontSize: 11, fontWeight: 'bold' },

  // HP
  miniStats: { alignItems: 'center', gap: 3 },
  hpTxt:     { color: PALETTE.hp, fontSize: 12, fontWeight: 'bold' },
  hpBarBg: {
    width: 80, height: 5,
    backgroundColor: '#0D1A10',
    borderRadius:    2,
    overflow:        'hidden',
  },
  hpBarFill: { height: 5, borderRadius: 2 },
  atkTxt:    { color: PALETTE.textMuted, fontSize: 10 },

  mapScroll: { flex: 1 },

  // Légende
  legend: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            16,
    paddingTop:     8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendTxt:  { fontSize: 10 },

  fragBox:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fragIcon:  { color: PALETTE.fragment, fontSize: 14 },
  fragCount: { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold' },
});
