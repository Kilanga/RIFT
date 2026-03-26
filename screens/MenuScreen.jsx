/**
 * RIFT — MenuScreen
 * Écran d'accueil : logo animé, dernière run, progression permanente, CTA
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Circle, G, Line } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, PERMANENT_UPGRADES_CATALOG, PLAYER_SHAPES, CLASS_INFO } from '../constants';
import { Assassin, Arcaniste, Colosse } from '../components/ClassSilhouettes';
import { ACHIEVEMENTS_CATALOG } from '../store/achievements';
import { fetchTopScores, fetchDailyScores } from '../services/leaderboardService';
import PlayerNameModal from '../components/PlayerNameModal';
import TutorialOverlay from '../components/TutorialOverlay';

const TOTAL_UNLOCKS    = PERMANENT_UPGRADES_CATALOG.length;
const ORBIT_INTERVAL   = 80; // ms → ~12 fps


export default function MenuScreen() {
  const meta             = useGameStore(s => s.meta);
  const run              = useGameStore(s => s.run);
  const goToShapeSelect  = useGameStore(s => s.goToShapeSelect);
  const startDailyRun    = useGameStore(s => s.startDailyRun);
  const goToMultiplayer  = useGameStore(s => s.goToMultiplayer);
  const resumeRun        = useGameStore(s => s.resumeRun);

  // ── Animation orbitale ───────────────────────────────────────────────────
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAngle(a => (a + 0.8) % 360), ORBIT_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // ── Leaderboard online ───────────────────────────────────────────────────
  const [onlineScores, setOnlineScores]   = useState([]);
  const [dailyScores,  setDailyScores]    = useState([]);
  const [onlineLoading, setOnlineLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [dailyTab, setDailyTab]           = useState(false);
  const [showTutorial, setShowTutorial]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTopScores(10), fetchDailyScores(10)]).then(([top, daily]) => {
      if (cancelled) return;
      setOnlineScores(top);
      setDailyScores(daily);
      setOnlineLoading(false);
    }).catch(() => { if (!cancelled) setOnlineLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Afficher le tuto automatiquement à la toute première visite
  useEffect(() => {
    if (meta.totalRuns === 0) setShowTutorial(true);
  }, []);

  const handleDailyRun = () => {
    if (!meta.playerName) { setShowNameModal(true); return; }
    goToShapeSelect(); // ira vers startDailyRun depuis ShapeSelectScreen
  };

  const unlockedCount = meta.permanentUpgrades.length;
  const hasMoreUnlocks = unlockedCount < TOTAL_UNLOCKS;
  const lastRun = meta.lastRunSummary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>

        {/* ── Logo animé ─────────────────────────────────────────────────── */}
        <View style={styles.logoBox}>
          <AnimatedLogo angle={angle} />
        </View>

        {/* ── Titre ──────────────────────────────────────────────────────── */}
        <View style={styles.titleBox}>
          <Text style={styles.title}>RIFT</Text>
          <Text style={styles.tagline}>DUNGEON ROGUELITE · GÉOMÉTRIQUE</Text>
        </View>

        {/* ── Dernière run ───────────────────────────────────────────────── */}
        {lastRun && <LastRunCard run={lastRun} />}

        {/* ── Boutons ────────────────────────────────────────────────────── */}
        {run?.isPaused && (
          <TouchableOpacity style={styles.btnResume} onPress={resumeRun} activeOpacity={0.75}>
            <Text style={styles.btnResumeTxt}>▶  REPRENDRE LA RUN</Text>
            <Text style={styles.btnResumeSub}>Couche {run.currentLayerIndex} · Score {run.score}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.btnPlay, { flex: 1 }]} onPress={goToShapeSelect} activeOpacity={0.75}>
            <Text style={styles.btnPlayTxt}>▶  JOUER</Text>
            {meta.totalRuns > 0 && (
              <Text style={styles.btnPlaySub}>Run #{meta.totalRuns + 1}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnDaily} onPress={handleDailyRun} activeOpacity={0.75}>
            <Text style={styles.btnDailyIcon}>☀</Text>
            <Text style={styles.btnDailyTxt}>DAILY</Text>
            <Text style={styles.btnDailySub}>RUN</Text>
          </TouchableOpacity>

          <View style={styles.btnRightCol}>
            <TouchableOpacity style={styles.btnMulti} onPress={goToMultiplayer} activeOpacity={0.75}>
              <Text style={styles.btnMultiTxt}>⚔</Text>
              <Text style={styles.btnMultiLabel}>MULTI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnHelp} onPress={() => setShowTutorial(true)} activeOpacity={0.75}>
              <Text style={styles.btnHelpTxt}>?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hasMoreUnlocks && (
          <Text style={styles.deathHint}>
            ✦ Chaque mort débloque un upgrade permanent
          </Text>
        )}

        {/* ── Progression permanente ─────────────────────────────────────── */}
        <PermanentProgress upgrades={meta.permanentUpgrades} meta={meta} />

        {/* ── Leaderboard online ─────────────────────────────────────────── */}
        <OnlineLeaderboard
          topScores={onlineScores}
          dailyScores={dailyScores}
          loading={onlineLoading}
          dailyTab={dailyTab}
          onTabChange={setDailyTab}
          playerName={meta.playerName}
          onSetName={() => setShowNameModal(true)}
        />

        {/* ── Classement local ───────────────────────────────────────────── */}
        {meta.localLeaderboard?.length > 0 && (
          <LocalLeaderboard entries={meta.localLeaderboard} />
        )}

        {/* ── Historique des runs ────────────────────────────────────────── */}
        {meta.runHistory?.length > 1 && (
          <RunHistory entries={meta.runHistory} />
        )}

        {/* ── Succès ─────────────────────────────────────────────────────── */}
        {meta.totalRuns > 0 && (
          <AchievementsSection unlockedIds={meta.achievements || []} />
        )}

        {/* ── Padding bas ────────────────────────────────────────────────── */}
        <View style={{ height: 16 }} />

      </ScrollView>

      <PlayerNameModal
        visible={showNameModal}
        onDone={() => setShowNameModal(false)}
      />

      <TutorialOverlay
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

// ─── Logo animé ───────────────────────────────────────────────────────────────

function AnimatedLogo({ angle }) {
  const R   = Math.PI / 180;
  const cx  = 70;
  const cy  = 70;

  // 3 particules orbitales à rayons et vitesses différents
  const p = [
    { r: 62, speed: 1.0,  shape: 'tri',  color: PALETTE.triangle, size: 7  },
    { r: 50, speed: -1.6, shape: 'circ', color: PALETTE.circle,   size: 5  },
    { r: 75, speed: 0.6,  shape: 'hex',  color: PALETTE.hexagon,  size: 6  },
  ].map(p => {
    const a = (angle * p.speed) * R;
    return { ...p, x: cx + p.r * Math.cos(a), y: cy + p.r * Math.sin(a) };
  });

  return (
    <Svg width={140} height={140} viewBox="0 0 140 140">
      {/* Cercles de fond */}
      <Circle cx={cx} cy={cy} r={62} fill="none" stroke="#1A1A3A" strokeWidth={0.8} opacity={0.5} />
      <Circle cx={cx} cy={cy} r={48} fill="none" stroke="#2A2A5A" strokeWidth={0.8} opacity={0.4} />
      <Circle cx={cx} cy={cy} r={34} fill="none" stroke="#1E1E40" strokeWidth={0.8} opacity={0.3} />

      {/* Lignes de connexion des orbites */}
      {p.map((pt, i) => (
        <Line key={`line_${i}`} x1={cx} y1={cy} x2={pt.x} y2={pt.y}
          stroke={pt.color} strokeWidth={0.5} opacity={0.2} />
      ))}

      {/* Triangle principal (statique) */}
      <Polygon
        points={`${cx},${cy - 42} ${cx - 36},${cy + 21} ${cx + 36},${cy + 21}`}
        fill="none"
        stroke={PALETTE.triangle}
        strokeWidth={2}
        opacity={0.6}
      />

      {/* Cercle interne */}
      <Circle cx={cx} cy={cy} r={16} fill="none" stroke={PALETTE.circle} strokeWidth={1.5} opacity={0.5} />

      {/* Hexagone central */}
      <Polygon
        points={hexPts(cx, cy, 9)}
        fill={PALETTE.hexagon}
        opacity={0.55}
      />

      {/* Particules orbitales */}
      {p.map((pt, i) => (
        <G key={`part_${i}`}>
          {pt.shape === 'tri'  && <Polygon points={miniTri(pt.x, pt.y, pt.size)} fill={pt.color} />}
          {pt.shape === 'circ' && <Circle cx={pt.x} cy={pt.y} r={pt.size * 0.7} fill={pt.color} />}
          {pt.shape === 'hex'  && <Polygon points={hexPts(pt.x, pt.y, pt.size * 0.7)} fill={pt.color} />}
        </G>
      ))}

      {/* Points aux sommets du triangle */}
      <Circle cx={cx}        cy={cy - 42} r={2.5} fill={PALETTE.triangle} opacity={0.8} />
      <Circle cx={cx - 36}   cy={cy + 21} r={2.5} fill={PALETTE.triangle} opacity={0.8} />
      <Circle cx={cx + 36}   cy={cy + 21} r={2.5} fill={PALETTE.triangle} opacity={0.8} />
    </Svg>
  );
}

// ─── Carte dernière run ───────────────────────────────────────────────────────

function ClassSilhouette({ shape, color, size = 44 }) {
  const s  = size;
  const cx = s / 2;
  const cy = s * 0.62; // centre vertical — laisse de la place pour la tête/chapeau
  const r  = s * 0.22;
  const Component = shape === PLAYER_SHAPES.TRIANGLE ? Assassin
                  : shape === PLAYER_SHAPES.CIRCLE   ? Arcaniste
                  : Colosse;
  return (
    <Svg width={s} height={s}>
      <Component cx={cx} cy={cy} r={r} color={color} />
    </Svg>
  );
}

function LastRunCard({ run }) {
  const cls     = CLASS_INFO[run.shape] || CLASS_INFO[PLAYER_SHAPES.TRIANGLE];
  const TOTAL_L = 6;
  const progress = Math.min(run.layersCleared, TOTAL_L);
  const pct      = progress / TOTAL_L;

  const getMessage = () => {
    if (run.abandoned) return 'Run abandonnée.';
    if (run.won) return '🏆 Run complétée !';
    if (pct === 0) return 'Le Rift t\'a consumé dès le début.';
    if (pct < 0.34) return 'Tu peux aller beaucoup plus loin.';
    if (pct < 0.67) return 'Tu avais trouvé ton rythme. Presque.';
    return 'Si proche... Encore une run.';
  };

  return (
    <View style={styles.lastRunCard}>
      <Text style={styles.lastRunTitle}>DERNIÈRE RUN</Text>

      <View style={styles.lastRunRow}>
        {/* Classe */}
        <View style={[styles.lastRunShape, { borderColor: cls.color + '44' }]}>
          <ClassSilhouette shape={run.shape} color={cls.color} size={44} />
          <Text style={[styles.lastRunShapeName, { color: cls.color }]}>{cls.name}</Text>
        </View>

        {/* Stats */}
        <View style={styles.lastRunStats}>
          <View style={styles.lastRunStat}>
            <Text style={styles.lastRunStatVal}>{run.score}</Text>
            <Text style={styles.lastRunStatLbl}>Score</Text>
          </View>
          <View style={styles.lastRunStat}>
            <Text style={styles.lastRunStatVal}>{run.killsThisRun}</Text>
            <Text style={styles.lastRunStatLbl}>Kills</Text>
          </View>
          <View style={styles.lastRunStat}>
            <Text style={[styles.lastRunStatVal, { color: run.won ? PALETTE.charge : PALETTE.textPrimary }]}>
              {progress}/{TOTAL_L}
            </Text>
            <Text style={styles.lastRunStatLbl}>Couches</Text>
          </View>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressBarBg}>
        <View style={[
          styles.progressBarFill,
          {
            width: `${pct * 100}%`,
            backgroundColor: run.won ? PALETTE.charge : (pct > 0.5 ? PALETTE.triangle : PALETTE.upgradeRed),
          },
        ]} />
      </View>

      <Text style={styles.lastRunMsg}>{getMessage()}</Text>
    </View>
  );
}

// ─── Progression permanente ───────────────────────────────────────────────────

function PermanentProgress({ upgrades, meta }) {
  const count       = upgrades.length;
  const remaining   = TOTAL_UNLOCKS - count;
  const unlockedIds = upgrades.map(u => u.id);

  // Calcul des victoires totales pour vérifier les conditions
  const totalWins  = Object.values(meta.shapeStats || {}).reduce((s, v) => s + (v.wins || 0), 0);
  const isCondMet  = (cond) => {
    if (!cond) return true;
    switch (cond.type) {
      case 'runs':       return meta.totalRuns >= cond.value;
      case 'kills':      return meta.totalKills >= cond.value;
      case 'wins':       return totalWins >= cond.value;
      case 'score':      return meta.bestScore >= cond.value;
      case 'shape_win':  return (meta.shapeStats?.[cond.shape]?.wins || 0) >= 1;
      case 'all_shapes': {
        const s = meta.shapeStats || {};
        return (s.triangle?.wins||0)>0 && (s.circle?.wins||0)>0 && (s.hexagon?.wins||0)>0;
      }
      default: return true;
    }
  };

  return (
    <View style={styles.permBox}>
      <View style={styles.permHeader}>
        <Text style={styles.permTitle}>UPGRADES PERMANENTS</Text>
        <Text style={styles.permCount}>
          <Text style={{ color: count > 0 ? PALETTE.charge : PALETTE.textMuted }}>{count}</Text>
          <Text style={styles.permCountTotal}>/{TOTAL_UNLOCKS}</Text>
        </Text>
      </View>

      <Text style={styles.permMechanic}>
        ✦ Chaque mort te rapporte un upgrade — si la condition est remplie
      </Text>

      {/* Grille */}
      <View style={styles.permGrid}>
        {PERMANENT_UPGRADES_CATALOG.map(u => {
          const isOwned   = unlockedIds.includes(u.id);
          const condMet   = isCondMet(u.unlockCondition);
          const isHidden  = !isOwned && u.hidden;

          return (
            <View
              key={u.id}
              style={[
                styles.permSlot,
                isOwned  && { borderColor: PALETTE.charge + '77', backgroundColor: '#1A1200' },
                !isOwned && condMet  && !isHidden && { borderColor: PALETTE.triangle + '44', backgroundColor: PALETTE.bgDark },
                !isOwned && !condMet && !isHidden && { borderColor: PALETTE.border,           backgroundColor: PALETTE.bgDark },
                isHidden && { borderColor: '#1A1A2A', backgroundColor: '#0A0A12' },
              ]}
            >
              <Text style={{ fontSize: 13, opacity: isOwned ? 1 : isHidden ? 0.08 : 0.35 }}>
                {isHidden ? '?' : u.icon}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.permSlotName, {
                  color: isOwned ? PALETTE.charge : isHidden ? PALETTE.textDim : condMet ? PALETTE.textMuted : PALETTE.textDim,
                }]}>
                  {isHidden ? '???' : u.name}
                </Text>
                {isOwned && (
                  <Text style={[styles.permSlotCond, { color: PALETTE.charge + '77' }]}>✓ obtenu</Text>
                )}
                {!isOwned && !isHidden && u.unlockCondition && (
                  <Text style={[styles.permSlotCond, { color: condMet ? PALETTE.triangle + 'AA' : PALETTE.textDim }]} numberOfLines={1}>
                    {condMet ? '✓' : '○'} {u.unlockCondition.desc}
                  </Text>
                )}
                {!isOwned && !isHidden && !u.unlockCondition && (
                  <Text style={[styles.permSlotCond, { color: PALETTE.triangle + 'AA' }]}>✓ dans le tirage</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {remaining > 0 && (
        <Text style={styles.permHint}>
          {remaining} upgrade{remaining > 1 ? 's' : ''} encore à découvrir
        </Text>
      )}
      {remaining === 0 && (
        <Text style={[styles.permHint, { color: PALETTE.charge }]}>
          ✦ Tous les upgrades permanents débloqués !
        </Text>
      )}
    </View>
  );
}

// ─── Leaderboard online ───────────────────────────────────────────────────────

const SHAPE_ICON_OL  = { triangle: '▲', circle: '●', hexagon: '⬡' };
const SHAPE_COLOR_OL = { triangle: PALETTE.triangle, circle: PALETTE.circle, hexagon: PALETTE.hexagon };

function OnlineLeaderboard({ topScores, dailyScores, loading, dailyTab, onTabChange, playerName, onSetName }) {
  const entries = dailyTab ? dailyScores : topScores;

  return (
    <View style={styles.olBox}>
      {/* Header avec tabs */}
      <View style={styles.olHeader}>
        <Text style={styles.olTitle}>🌐  CLASSEMENT MONDIAL</Text>
        <View style={styles.olTabs}>
          <TouchableOpacity
            style={[styles.olTab, !dailyTab && styles.olTabActive]}
            onPress={() => onTabChange(false)}
          >
            <Text style={[styles.olTabTxt, !dailyTab && { color: PALETTE.textPrimary }]}>GLOBAL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.olTab, dailyTab && styles.olTabActive]}
            onPress={() => onTabChange(true)}
          >
            <Text style={[styles.olTabTxt, dailyTab && { color: PALETTE.charge }]}>☀ DAILY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pseudo du joueur */}
      {playerName ? (
        <TouchableOpacity onPress={onSetName} activeOpacity={0.7}>
          <Text style={styles.olPlayer}>Joueur : <Text style={{ color: PALETTE.triangle }}>{playerName}</Text>  ✎</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.olSetNameBtn} onPress={onSetName} activeOpacity={0.8}>
          <Text style={styles.olSetNameTxt}>+ Configurer ton pseudo pour apparaître ici</Text>
        </TouchableOpacity>
      )}

      {/* Lignes du classement */}
      {loading ? (
        <Text style={styles.olLoading}>Chargement…</Text>
      ) : entries.length === 0 ? (
        <Text style={styles.olEmpty}>
          {dailyTab ? 'Aucun score aujourd\'hui. Sois le premier !' : 'Aucun score encore.'}
        </Text>
      ) : (
        entries.map((e, i) => {
          const sc = SHAPE_COLOR_OL[e.shape] || PALETTE.textMuted;
          const isFirst = i === 0;
          const isMe    = e.player_name === playerName;
          return (
            <View
              key={i}
              style={[
                styles.olRow,
                isFirst && { borderColor: PALETTE.charge + '55', backgroundColor: PALETTE.charge + '08' },
                isMe    && { borderColor: PALETTE.triangle + '55', backgroundColor: PALETTE.triangle + '08' },
              ]}
            >
              <Text style={[styles.olRank, { color: isFirst ? PALETTE.charge : PALETTE.textDim }]}>
                {isFirst ? '★' : `#${i + 1}`}
              </Text>
              <Text style={[styles.olShape, { color: sc }]}>{SHAPE_ICON_OL[e.shape] || '?'}</Text>
              <Text style={[styles.olName, isMe && { color: PALETTE.triangle }]}>{e.player_name}</Text>
              <Text style={[styles.olScore, { color: isFirst ? PALETTE.charge : PALETTE.textPrimary }]}>
                {e.score.toLocaleString()}
              </Text>
              <Text style={styles.olMeta}>{e.layers}L{e.won ? ' 🏆' : ''}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Classement local ─────────────────────────────────────────────────────────

const SHAPE_ICON = { triangle: '▲', circle: '●', hexagon: '⬡' };
const SHAPE_COLOR = { triangle: PALETTE.triangle, circle: PALETTE.circle, hexagon: PALETTE.hexagon };

function LocalLeaderboard({ entries }) {
  return (
    <View style={styles.lbBox}>
      <View style={styles.lbHeader}>
        <Text style={styles.lbTitle}>MEILLEURS SCORES</Text>
        <Text style={styles.lbSub}>Top {entries.length}</Text>
      </View>
      {entries.map((e, i) => {
        const shapeColor = SHAPE_COLOR[e.shape] || PALETTE.textMuted;
        const isFirst    = i === 0;
        return (
          <View
            key={i}
            style={[
              styles.lbRow,
              isFirst && { backgroundColor: PALETTE.charge + '0C', borderColor: PALETTE.charge + '44' },
            ]}
          >
            <Text style={[styles.lbRank, { color: isFirst ? PALETTE.charge : PALETTE.textDim }]}>
              {isFirst ? '★' : `#${i + 1}`}
            </Text>
            <Text style={[styles.lbShape, { color: shapeColor }]}>
              {SHAPE_ICON[e.shape] || '?'}
            </Text>
            <Text style={[styles.lbScore, { color: isFirst ? PALETTE.charge : PALETTE.textPrimary }]}>
              {e.score.toLocaleString()}
            </Text>
            <Text style={styles.lbDetails}>
              {e.layers}L · {e.kills}K{e.won ? ' · 🏆' : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Historique des runs ──────────────────────────────────────────────────────

function RunHistory({ entries }) {
  return (
    <View style={styles.histBox}>
      <Text style={styles.histTitle}>HISTORIQUE — {entries.length} DERNIERS RUNS</Text>
      <View style={styles.histList}>
        {entries.map((e, i) => {
          const shapeColor = SHAPE_COLOR[e.shape] || PALETTE.textMuted;
          const date       = new Date(e.date);
          const dateStr    = `${date.getDate()}/${date.getMonth() + 1} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
          return (
            <View key={i} style={[styles.histRow, e.won && { borderColor: PALETTE.charge + '44' }]}>
              <Text style={[styles.histShape, { color: shapeColor }]}>
                {SHAPE_ICON[e.shape] || '?'}
              </Text>
              <View style={styles.histInfo}>
                <Text style={[styles.histScore, { color: e.won ? PALETTE.charge : PALETTE.textPrimary }]}>
                  {e.won ? '🏆 ' : ''}{e.score} pts
                </Text>
                <Text style={styles.histMeta}>{e.layers} couches · {e.kills} kills</Text>
              </View>
              <Text style={styles.histDate}>{dateStr}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Succès ───────────────────────────────────────────────────────────────────

function AchievementsSection({ unlockedIds }) {
  const count = unlockedIds.length;
  const total = ACHIEVEMENTS_CATALOG.length;

  return (
    <View style={styles.achBox}>
      <View style={styles.achHeader}>
        <Text style={styles.achTitle}>SUCCÈS</Text>
        <Text style={styles.achCount}>
          <Text style={{ color: count > 0 ? '#88CCFF' : PALETTE.textMuted }}>{count}</Text>
          <Text style={styles.achCountTotal}>/{total}</Text>
        </Text>
      </View>
      <View style={styles.achGrid}>
        {ACHIEVEMENTS_CATALOG.map(a => {
          const unlocked = unlockedIds.includes(a.id);
          return (
            <View
              key={a.id}
              style={[
                styles.achSlot,
                unlocked
                  ? { borderColor: '#88CCFF55', backgroundColor: '#001020' }
                  : { borderColor: PALETTE.border, backgroundColor: PALETTE.bgDark },
              ]}
            >
              <Text style={{ fontSize: 16, opacity: unlocked ? 1 : 0.15 }}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.achName, { color: unlocked ? '#88CCFF' : PALETTE.textDim }]}>
                  {unlocked ? a.name : '???'}
                </Text>
                {unlocked && (
                  <Text style={styles.achDesc}>{a.desc}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      {count < total && (
        <Text style={styles.achHint}>
          {total - count} succès encore à déverrouiller
        </Text>
      )}
      {count === total && (
        <Text style={[styles.achHint, { color: '#88CCFF' }]}>
          ✦ Tous les succès débloqués — Maître du Rift !
        </Text>
      )}
    </View>
  );
}

// ─── Helpers géométriques ─────────────────────────────────────────────────────

function hexPts(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

function miniTri(cx, cy, r) {
  return `${cx},${cy - r} ${cx - r * 0.866},${cy + r * 0.5} ${cx + r * 0.866},${cy + r * 0.5}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: PALETTE.bg },
  container: {
    alignItems:        'center',
    paddingVertical:   32,
    paddingHorizontal: 20,
    gap:               22,
  },

  logoBox: { alignItems: 'center' },

  titleBox: { alignItems: 'center', gap: 6 },
  title:    { color: PALETTE.textPrimary, fontSize: 54, fontWeight: 'bold', letterSpacing: 14 },
  tagline:  { color: PALETTE.textDim, fontSize: 10, letterSpacing: 4 },

  // Boutons
  btnResume: {
    width:           '100%',
    alignItems:      'center',
    backgroundColor: '#001A08',
    borderWidth:     2,
    borderColor:     PALETTE.upgradeGreen,
    borderRadius:    14,
    paddingHorizontal: 20,
    paddingVertical:   14,
    gap:             4,
  },
  btnResumeTxt: { color: PALETTE.upgradeGreen, fontSize: 17, fontWeight: 'bold', letterSpacing: 3 },
  btnResumeSub: { color: PALETTE.upgradeGreen + '99', fontSize: 11, letterSpacing: 1 },

  buttonsRow: { width: '100%', flexDirection: 'row', gap: 10 },
  btnPlay: {
    alignItems:        'center',
    backgroundColor:   '#001A10',
    borderWidth:       2,
    borderColor:       PALETTE.triangle,
    borderRadius:      14,
    paddingHorizontal: 20,
    paddingVertical:   18,
    gap:               4,
  },
  btnPlayTxt: { color: PALETTE.triangle, fontSize: 18, fontWeight: 'bold', letterSpacing: 4 },
  btnPlaySub: { color: PALETTE.textDim,   fontSize: 11, letterSpacing: 2 },

  btnDaily: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1A1000',
    borderWidth:     2,
    borderColor:     PALETTE.charge,
    borderRadius:    14,
    paddingHorizontal: 16,
    paddingVertical:  18,
    gap:             2,
  },
  btnDailyIcon: { fontSize: 16 },
  btnDailyTxt:  { color: PALETTE.charge, fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
  btnDailySub:  { color: PALETTE.charge + '99', fontSize: 9, letterSpacing: 3 },

  btnRightCol: { gap: 6 },

  btnMulti: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1A0010',
    borderWidth:     1,
    borderColor:     PALETTE.circle,
    borderRadius:    10,
    width:           46,
    paddingVertical: 7,
    gap:             2,
  },
  btnMultiTxt:   { color: PALETTE.circle, fontSize: 14 },
  btnMultiLabel: { color: PALETTE.circle + 'BB', fontSize: 7, fontWeight: 'bold', letterSpacing: 1 },

  btnHelp: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    10,
    width:           46,
    paddingVertical: 7,
  },
  btnHelpTxt: { color: PALETTE.textMuted, fontSize: 18, fontWeight: 'bold' },

  deathHint: { color: PALETTE.textDim, fontSize: 11, letterSpacing: 1, textAlign: 'center' },

  // Dernière run
  lastRunCard: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    12,
    padding:         14,
    gap:             10,
  },
  lastRunTitle:  { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },
  lastRunRow:    { flexDirection: 'row', gap: 12, alignItems: 'center' },
  lastRunShape:  {
    borderWidth:  1,
    borderRadius: 8,
    padding:      10,
    alignItems:   'center',
    gap:          4,
    minWidth:     64,
  },
  lastRunShapeName: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  lastRunStats:     { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  lastRunStat:      { alignItems: 'center', gap: 2 },
  lastRunStatVal:   { color: PALETTE.textPrimary, fontSize: 20, fontWeight: 'bold' },
  lastRunStatLbl:   { color: PALETTE.textMuted,   fontSize: 10 },

  progressBarBg: {
    width:           '100%',
    height:          4,
    backgroundColor: PALETTE.bgDark,
    borderRadius:    2,
    overflow:        'hidden',
  },
  progressBarFill: { height: 4, borderRadius: 2 },
  lastRunMsg:      { color: PALETTE.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Progression permanente
  permBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             12,
  },
  permHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  permTitle:      { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },
  permCount:      { fontSize: 16, fontWeight: 'bold' },
  permCountTotal: { color: PALETTE.textDim, fontSize: 13 },

  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  permSlot: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   6,
    minWidth:          '46%',
    flex:              1,
  },
  permMechanic:   { color: PALETTE.textDim, fontSize: 10, textAlign: 'center', fontStyle: 'italic' },
  permSlotName:   { fontSize: 11 },
  permSlotCond:   { fontSize: 9, color: PALETTE.textDim, marginTop: 1 },
  permHint:       { color: PALETTE.textDim, fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

  // Leaderboard online
  olBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.borderLight,
    borderRadius:    12,
    padding:         14,
    gap:             8,
  },
  olHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  olTitle:    { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: 'bold' },
  olTabs:     { flexDirection: 'row', gap: 4 },
  olTab: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      6,
    borderWidth:       1,
    borderColor:       PALETTE.border,
  },
  olTabActive: { borderColor: PALETTE.borderLight, backgroundColor: PALETTE.bgDark },
  olTabTxt:    { fontSize: 10, fontWeight: 'bold', color: PALETTE.textDim, letterSpacing: 1 },

  olPlayer:      { color: PALETTE.textMuted, fontSize: 11, textAlign: 'center' },
  olSetNameBtn: {
    borderWidth:     1,
    borderColor:     PALETTE.triangle + '44',
    borderRadius:    8,
    paddingVertical: 8,
    alignItems:      'center',
  },
  olSetNameTxt:  { color: PALETTE.triangle + 'AA', fontSize: 11 },

  olLoading: { color: PALETTE.textDim, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
  olEmpty:   { color: PALETTE.textDim, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },

  olRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderWidth:       1,
    borderColor:       PALETTE.border,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   6,
    backgroundColor:   PALETTE.bgDark,
  },
  olRank:  { width: 18, fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  olShape: { fontSize: 12, width: 14, textAlign: 'center' },
  olName:  { flex: 1, color: PALETTE.textMuted, fontSize: 12 },
  olScore: { fontSize: 14, fontWeight: 'bold' },
  olMeta:  { color: PALETTE.textDim, fontSize: 10, minWidth: 30, textAlign: 'right' },

  // Classement local
  lbBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             8,
  },
  lbHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lbTitle:   { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },
  lbSub:     { color: PALETTE.textDim, fontSize: 10 },
  lbRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    borderWidth:       1,
    borderColor:       PALETTE.border,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   7,
    backgroundColor:   PALETTE.bgDark,
  },
  lbRank:    { width: 18, fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  lbShape:   { fontSize: 14, fontWeight: 'bold', width: 18, textAlign: 'center' },
  lbScore:   { fontSize: 15, fontWeight: 'bold', flex: 1 },
  lbDetails: { color: PALETTE.textMuted, fontSize: 10 },

  // Historique
  histBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             8,
  },
  histTitle: { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },
  histList:  { gap: 5 },
  histRow: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               10,
    borderWidth:       1,
    borderColor:       PALETTE.border,
    borderRadius:      7,
    paddingHorizontal: 10,
    paddingVertical:   6,
    backgroundColor:   PALETTE.bgDark,
  },
  histShape: { fontSize: 14, width: 16, textAlign: 'center' },
  histInfo:  { flex: 1, gap: 1 },
  histScore: { fontSize: 13, fontWeight: 'bold' },
  histMeta:  { color: PALETTE.textMuted, fontSize: 10 },
  histDate:  { color: PALETTE.textDim, fontSize: 9 },

  // Succès
  achBox: {
    width:           '100%',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    12,
    padding:         14,
    gap:             12,
  },
  achHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  achTitle:      { color: PALETTE.textMuted, fontSize: 10, letterSpacing: 3, fontWeight: 'bold' },
  achCount:      { fontSize: 16, fontWeight: 'bold' },
  achCountTotal: { color: PALETTE.textDim, fontSize: 13 },
  achGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  achSlot: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   6,
    minWidth:          '46%',
    flex:              1,
  },
  achName: { fontSize: 11, fontWeight: 'bold' },
  achDesc: { fontSize: 9, color: PALETTE.textDim, marginTop: 1 },
  achHint: { color: PALETTE.textDim, fontSize: 11, textAlign: 'center', fontStyle: 'italic' },

});
