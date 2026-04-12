/**
 * RIFT — MapScreen
 * Carte du run : arbre de salles, barre de progression, score, aperçu couche suivante
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Modal, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { ROOM_TYPES, PALETTE, ENEMY_INFO, ENEMY_TYPES, ACT1_BOSS_TYPES, RUST_BOSS_UNLOCK_THRESHOLD } from '../constants';
import { generateRoom } from '../utils/procGen';

const { width: SCREEN_W } = Dimensions.get('window');
const NODE_SIZE = 48;
const IS_TABLET = SCREEN_W >= 768;
const IS_LARGE_TABLET = SCREEN_W >= 1024;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getActLocalLayerIndex(node, run) {
  const bounds = run.actBoundaries || [];
  if (node.act === 1) return node.layer;
  if (node.act === 2) return node.layer - (bounds[0] || 0);
  return node.layer - (bounds[1] || 0);
}

function getPreviewEnemyBalanceProfile(node, run) {
  const localLayerIndex = getActLocalLayerIndex(node, run);
  let categoryMultipliers;

  if (node.act === 1) {
    categoryMultipliers = { mob: 1, elite: 1, boss: 1 };
  } else if (node.act === 2) {
    categoryMultipliers = localLayerIndex <= 0
      ? { mob: 1.12, elite: 1.15, boss: 1.12 }
      : { mob: 1.2, elite: 1.25, boss: 1.2 };
  } else {
    categoryMultipliers = localLayerIndex <= 0
      ? { mob: 1.35, elite: 1.45, boss: 1.4 }
      : { mob: 1.45, elite: 1.55, boss: 1.5 };
  }

  const adaptiveScale = clamp(run.enemyAdaptiveScale || 1, 0.9, 1.12);
  return {
    categoryMultipliers: {
      mob: clamp(categoryMultipliers.mob * adaptiveScale, 0.9, 1.8),
      elite: clamp(categoryMultipliers.elite * adaptiveScale, 0.9, 1.9),
      boss: clamp(categoryMultipliers.boss * adaptiveScale, 0.9, 1.8),
    },
    attackWeight: 0.7,
    defenseWeight: 0.5,
    defenseCaps: { mob: 3, elite: 4, boss: 6 },
  };
}

export default function MapScreen() {
  const { t } = useTranslation();
  const roomMap              = useGameStore(s => s.roomMap);
  const run                  = useGameStore(s => s.run);
  const player               = useGameStore(s => s.player);
  const activeUpgrades       = useGameStore(s => s.activeUpgrades);
  const permanentUpgrades    = useGameStore(s => s.meta?.permanentUpgrades || []);
  const selectNode           = useGameStore(s => s.selectNode);
  const getSelectableNodeIds = useGameStore(s => s.getSelectableNodeIds);
  const pauseRun             = useGameStore(s => s.pauseRun);
  const abandonRun           = useGameStore(s => s.abandonRun);
  const goToSettings         = useGameStore(s => s.goToSettings);

  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showUpgradesModal,  setShowUpgradesModal]  = useState(false);

  const selectableIds = getSelectableNodeIds();

  if (!roomMap || roomMap.length === 0) return null;

  const totalLayers = roomMap.length;

  // Aperçu des types de salles de la prochaine couche sélectionnable
  const nextLayerNodes = selectableIds.length > 0
    ? roomMap.find(layer => layer.some(n => selectableIds.includes(n.id))) || []
    : [];
  const nextLayerIndex = selectableIds.length > 0
    ? roomMap.findIndex(layer => layer.some(n => selectableIds.includes(n.id)))
    : -1;
  const nextTypes = [...new Set(nextLayerNodes.map(n => n.type))];

  const nextCombatIntelByNodeId = useMemo(() => {
    if (nextLayerIndex < 0) return {};

    const combatTypes = [
      ROOM_TYPES.COMBAT,
      ROOM_TYPES.ELITE,
      ROOM_TYPES.BOSS_MINI,
      ROOM_TYPES.BOSS,
      ROOM_TYPES.BOSS_FINAL,
    ];

    const act1BossPool = permanentUpgrades.length >= RUST_BOSS_UNLOCK_THRESHOLD
      ? ACT1_BOSS_TYPES
      : ACT1_BOSS_TYPES.filter(t => t !== ENEMY_TYPES.BOSS_RUST);

    return nextLayerNodes
      .filter(node => combatTypes.includes(node.type))
      .reduce((acc, node) => {
        const roomSeed = ((run.mapSeed || 0) ^ hashString(node.id || '')) >>> 0;
        const enemyBalanceProfile = getPreviewEnemyBalanceProfile(node, run);
        const room = generateRoom(
          node.type,
          nextLayerIndex + 1,
          roomSeed,
          run.finalBossType || null,
          act1BossPool,
          enemyBalanceProfile
        );
        const dotColors = (room.enemies || []).map(enemy => enemyColor(enemy?.type));
        acc[node.id] = { dotColors };
        return acc;
      }, {});
  }, [nextLayerIndex, nextLayerNodes, run.finalBossType, run.mapSeed, run.enemyAdaptiveScale, run.actBoundaries, permanentUpgrades.length]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnBack} onPress={pauseRun} activeOpacity={0.7}>
            <Text style={styles.btnBackTxt}>{t('map.back_menu')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGear} onPress={() => goToSettings('map')} activeOpacity={0.7}>
            <Text style={styles.btnGearTxt}>⚙</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.floorLabel}>
              {run.isDailyRun ? t('map.daily_badge') : t('map.seed_label', { seed: run.mapSeed || '—' })}
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
            combatIntelByNodeId={nextCombatIntelByNodeId}
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

function MapTree({ roomMap, selectableIds, currentNodeId, combatIntelByNodeId, onSelect }) {
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
                combatIntel={combatIntelByNodeId?.[node.id] || null}
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

function MapNodeSvg({ node, cx, cy, isSelectable, isCleared, isCurrent, combatIntel, tFn }) {
  const color   = roomColor(node.type);
  const r       = NODE_SIZE / 2 - 2;
  const opacity = isCleared ? 0.35 : isSelectable ? 1 : 0.25;
  const showEnemyDots = isSelectable && !isCleared && !!combatIntel && [
    ROOM_TYPES.COMBAT,
    ROOM_TYPES.ELITE,
    ROOM_TYPES.BOSS_MINI,
    ROOM_TYPES.BOSS,
    ROOM_TYPES.BOSS_FINAL,
  ].includes(node.type);

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
      {showEnemyDots && enemyDots(node.id, cx, cy, combatIntel?.dotColors || [])}
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

function enemyDots(nodeId, cx, cy, dotColors) {
  const dots = (dotColors || []).slice(0, 10);
  if (dots.length === 0) return null;

  const radius = 16;
  const startDeg = -160;
  const endDeg = -20;
  const span = endDeg - startDeg;

  return (
    <G>
      {dots.map((dotColor, i) => {
        const t = dots.length === 1 ? 0.5 : i / (dots.length - 1);
        const deg = startDeg + span * t;
        const rad = (deg * Math.PI) / 180;
        return (
          <Circle
            key={`enemy_dot_${nodeId}_${i}`}
            cx={cx + Math.cos(rad) * radius}
            cy={cy + Math.sin(rad) * radius}
            r={2.1}
            fill={dotColor}
          />
        );
      })}
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

function dangerMeta(enemies) {
  const score = enemies.reduce((sum, enemy) => {
    const attack  = enemy?.attack || 0;
    const hp      = enemy?.maxHp || enemy?.hp || 0;
    const defense = enemy?.defense || 0;
    const boss    = enemy?.isBoss ? 12 : 0;
    return sum + attack * 2 + hp * 0.3 + defense * 1.5 + boss;
  }, 0);

  let level = 1;
  if (score >= 14) level = 2;
  if (score >= 24) level = 3;
  if (score >= 34) level = 4;

  const scale = {
    1: { text: '#FFB3B3', border: '#FF9E9E', bg: '#2A1212' },
    2: { text: '#FF8A8A', border: '#FF6E6E', bg: '#331212' },
    3: { text: '#FF5C5C', border: '#FF4444', bg: '#3D1111' },
    4: { text: '#FF2C2C', border: '#FF1A1A', bg: '#470D0D' },
  };

  return { score: Math.round(score), level, ...scale[level] };
}

function enemyShort(type) {
  return ENEMY_INFO[type]?.short || String(type || '?').slice(0, 3).toUpperCase();
}

function enemyColor(type) {
  return {
    chaser: PALETTE.chaser,
    shooter: PALETTE.shooter,
    blocker: PALETTE.blocker,
    healer: PALETTE.healer,
    explosive: PALETTE.explosive,
    summoner: PALETTE.summoner,
    sentinel: PALETTE.sentinel,
    boss_void: PALETTE.roomBoss,
    boss_cinder: '#FF7A2F',
    boss_mirror: '#FF66AA',
    boss_weaver: '#C48AFF',
    boss_rust: '#B7A588',
    boss_cutter: '#66D6FF',
    boss_pulse: '#FF6600',
    boss_rift: '#FF2266',
    boss_guardian: '#44CCFF',
    boss_entity: '#FF0044',
  }[type] || PALETTE.textMuted;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen }[color] || '#888';
}

const triPts = (cx, cy, r) => `${cx},${cy-r} ${cx-r*0.866},${cy+r*0.5} ${cx+r*0.866},${cy+r*0.5}`;
const diamondPts = (cx, cy, r) => `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`;
const starPts = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? ro : ri;
    return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
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
                          {u.synergyActive ? '✦ ' : ''}{t(`upgrade.${u.id}.name`, { defaultValue: u.name })}
                        </Text>
                        <View style={[styles.modalColorDot, { backgroundColor: hex }]} />
                      </View>
                      <Text style={[styles.modalCardDesc, { color: hex + 'CC' }]}>{t(`upgrade.${u.id}.desc`, { defaultValue: u.description })}</Text>
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
  container: {
    flex:            1,
    paddingHorizontal: IS_LARGE_TABLET ? 28 : IS_TABLET ? 24 : 20,
    paddingTop:        12,
    paddingBottom:     8,
    gap:               IS_TABLET ? 12 : 10,
    width:             '100%',
    maxWidth:          IS_LARGE_TABLET ? 1120 : 980,
    alignSelf:         'center',
  },

  // Header
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  floorLabel:   { color: PALETTE.textPrimary, fontSize: IS_TABLET ? 18 : 16, fontWeight: 'bold', textAlign: 'center' },
  roomCount:    { color: PALETTE.textMuted, fontSize: IS_TABLET ? 12 : 11, textAlign: 'center' },
  scoreBox:  { alignItems: 'flex-end' },
  scoreVal:  { color: PALETTE.charge, fontSize: IS_TABLET ? 20 : 18, fontWeight: 'bold' },
  scoreLbl:  { color: PALETTE.textDim, fontSize: 10, letterSpacing: 2 },

  btnBack: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },
  btnBackTxt: { color: PALETTE.textMuted, fontSize: IS_TABLET ? 12 : 11, fontWeight: 'bold', letterSpacing: 1 },
  btnGear: {
    borderWidth:     1,
    borderColor:     '#333333',
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   6,
  },
  btnGearTxt: { color: '#666666', fontSize: 14 },

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
  btnUpgradesTxt: { color: PALETTE.upgradeBlue, fontSize: IS_TABLET ? 12 : 11, fontWeight: 'bold' },

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
  progressLabel:    { color: PALETTE.textPrimary, fontSize: IS_TABLET ? 11 : 10, fontWeight: 'bold', letterSpacing: 2 },
  progressFraction: { color: PALETTE.textMuted, fontSize: IS_TABLET ? 11 : 10 },
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

  enemyPreviewBox: {
    gap: 6,
    backgroundColor: PALETTE.bgCard,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 10,
    padding: 10,
  },
  enemyPreviewTitle: { color: PALETTE.textPrimary, fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  enemyPreviewHint: { color: PALETTE.textMuted, fontSize: 10 },
  enemyPreviewRow: { gap: 8, paddingTop: 2, paddingRight: 2 },
  enemyCard: {
    minWidth: 170,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
    borderRadius: 8,
    backgroundColor: '#0B0B14',
    padding: 8,
    gap: 5,
  },
  enemyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  enemyCardType: { fontSize: 11, fontWeight: 'bold', flexShrink: 1 },
  enemyCardNode: { color: PALETTE.textDim, fontSize: 9 },
  enemyCardCount: { color: PALETTE.textMuted, fontSize: 10 },
  enemyThreatScore: { color: PALETTE.textDim, fontSize: 9, letterSpacing: 1 },
  enemyDangerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  enemyThreatDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  enemyThreatDot: { width: 7, height: 7, borderRadius: 4 },
  enemyDangerCaption: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  enemyChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  enemyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#0F0F1B',
  },
  enemyDot: { width: 7, height: 7, borderRadius: 4 },
  enemyChipTxt: { color: PALETTE.textPrimary, fontSize: 10, fontWeight: '600' },

  // HP
  miniStats: { alignItems: 'center', gap: 3 },
  hpTxt:     { color: PALETTE.hp, fontSize: 12, fontWeight: 'bold' },
  hpBarBg: {
    width: IS_TABLET ? 96 : 80, height: 5,
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
    gap:            IS_TABLET ? 20 : 16,
    paddingTop:     8,
    borderTopWidth: 1,
    borderTopColor: PALETTE.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendTxt:  { fontSize: IS_TABLET ? 11 : 10 },

  fragBox:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fragIcon:  { color: PALETTE.fragment, fontSize: 14 },
  fragCount: { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold' },
});
