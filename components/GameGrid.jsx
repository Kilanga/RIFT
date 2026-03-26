/**
 * RIFT — GameGrid
 * - Swipe ET tap sur cellule adjacente pour se déplacer / attaquer
 * - Silhouettes SVG humanoïdes pour joueur et ennemis
 * - Indicateurs directionnels (flèches + bordure attaque) autour du joueur
 */

import { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Polygon, Circle, Rect, Line, G, Text as SvgText } from 'react-native-svg';

import useGameStore from '../store/gameStore';
import { PLAYER_SHAPES, GRID_SIZE, CELL_TYPES, ENEMY_TYPES, PALETTE } from '../constants';
import { Assassin, Arcaniste, Colosse } from './ClassSilhouettes';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_W    = SCREEN_W - GRID_PADDING * 2;
const CELL_SIZE = Math.floor(GRID_W / GRID_SIZE);
const R         = CELL_SIZE * 0.33; // rayon de base des entités

// ─── Couleurs d'indication selon la classe ────────────────────────────────────
const CLASS_ARROW = {
  [PLAYER_SHAPES.TRIANGLE]: { stroke: 'rgba(0,255,204,0.7)',  bg: 'rgba(0,255,204,0.08)'  },
  [PLAYER_SHAPES.CIRCLE]:   { stroke: 'rgba(255,102,255,0.7)', bg: 'rgba(255,102,255,0.08)' },
  [PLAYER_SHAPES.HEXAGON]:  { stroke: 'rgba(102,170,255,0.7)', bg: 'rgba(102,170,255,0.08)' },
};

export default function GameGrid() {
  const player       = useGameStore(s => s.player);
  const currentRoom  = useGameStore(s => s.currentRoom);
  const enemies      = useGameStore(s => s.enemies);
  const dyingEnemies = useGameStore(s => s.dyingEnemies);
  const damagePops   = useGameStore(s => s.damagePops);
  const isPlayerTurn = useGameStore(s => s.isPlayerTurn);
  const movePlayer   = useGameStore(s => s.movePlayer);

  // Ref pour accéder à player et isPlayerTurn dans le PanResponder sans recréer
  const playerRef       = useRef(player);
  const isPlayerTurnRef = useRef(isPlayerTurn);
  playerRef.current       = player;
  isPlayerTurnRef.current = isPlayerTurn;

  // ── PanResponder : swipe (déplacement long) + tap (cellule adjacente) ────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gs) => {
        if (!isPlayerTurnRef.current) return;

        const absDx = Math.abs(gs.dx);
        const absDy = Math.abs(gs.dy);
        const swipeThr = CELL_SIZE * 0.35;
        const tapThr   = CELL_SIZE * 0.25;

        if (absDx < tapThr && absDy < tapThr) {
          // Tap : on calcule la cellule touchée depuis la position initiale du doigt
          const startCellX = Math.floor(gs.x0 / CELL_SIZE);
          const startCellY = Math.floor(gs.y0 / CELL_SIZE);
          const p = playerRef.current;
          const cdx = startCellX - p.x;
          const cdy = startCellY - p.y;
          if (Math.abs(cdx) + Math.abs(cdy) === 1) {
            movePlayer(cdx, cdy);
          }
          return;
        }

        // Swipe
        if (absDx > swipeThr || absDy > swipeThr) {
          if (absDx > absDy) movePlayer(gs.dx > 0 ? 1 : -1, 0);
          else                movePlayer(0, gs.dy > 0 ? 1 : -1);
        }
      },
    })
  ).current;

  if (!currentRoom) return null;

  const { grid, width, height } = currentRoom;
  const totalW = width  * CELL_SIZE;
  const totalH = height * CELL_SIZE;

  return (
    <View style={styles.container}>
      <View style={[
        styles.gridBorder,
        { borderColor: isPlayerTurn ? '#00CC66' : '#CC3333', width: totalW + 4, height: totalH + 4 },
      ]}>
        <View
          style={{ width: totalW, height: totalH }}
          {...panResponder.panHandlers}
        >
          <Svg width={totalW} height={totalH}>
            <Rect x={0} y={0} width={totalW} height={totalH} fill={PALETTE.bg} />

            {grid.map((row, ry) =>
              row.map((cell, rx) => (
                <CellShape key={`${ry}_${rx}`} cell={cell} rx={rx} ry={ry} />
              ))
            )}
            <GridLines totalW={totalW} totalH={totalH} />

            {/* Ennemis morts (fantôme) */}
            {dyingEnemies.map(e => (
              <EntityToken key={`dying_${e.id}`} entity={e} opacity={0.2} />
            ))}

            {/* Ennemis vivants */}
            {enemies.map(e => (
              <EntityToken key={e.id} entity={e} opacity={1} />
            ))}

            {/* Indicateurs directionnels — au-dessus de tout */}
            <DirectionHints
              player={player}
              grid={grid}
              gridW={width}
              gridH={height}
              enemies={enemies}
              isPlayerTurn={isPlayerTurn}
            />

            {/* Joueur */}
            <PlayerToken player={player} />

            {/* Dégâts flottants */}
            {damagePops.map(pop => <DamagePop key={pop.id} pop={pop} />)}
          </Svg>
        </View>
      </View>
    </View>
  );
}

// ─── Indicateurs directionnels (visuels seulement — le tap est géré par le PanResponder) ──

function DirectionHints({ player, grid, gridW, gridH, enemies, isPlayerTurn }) {
  if (!isPlayerTurn) return null;
  const theme = CLASS_ARROW[player.shape] ?? CLASS_ARROW[PLAYER_SHAPES.TRIANGLE];
  const liveEnemies = enemies.filter(e => e.hp > 0);
  const dirs = [{ dx:0,dy:-1 },{ dx:0,dy:1 },{ dx:-1,dy:0 },{ dx:1,dy:0 }];

  return (
    <G>
      {dirs.map(({ dx, dy }) => {
        const nx = player.x + dx;
        const ny = player.y + dy;
        if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) return null;
        if (grid[ny]?.[nx] === CELL_TYPES.WALL) return null;

        const hasEnemy = liveEnemies.some(e => e.x === nx && e.y === ny);
        const cx = nx * CELL_SIZE + CELL_SIZE / 2;
        const cy = ny * CELL_SIZE + CELL_SIZE / 2;

        if (hasEnemy) {
          // Bordure d'attaque rouge — ne cache pas l'ennemi
          return (
            <G key={`atk_${dx}_${dy}`}>
              <Rect
                x={nx * CELL_SIZE + 1} y={ny * CELL_SIZE + 1}
                width={CELL_SIZE - 2} height={CELL_SIZE - 2}
                fill="none" stroke="#FF4444" strokeWidth={2} rx={2} opacity={0.8}
              />
            </G>
          );
        }

        // Flèche directionnelle
        const ar = CELL_SIZE * 0.2;
        const tip   = { x: cx + dx * ar * 1.2, y: cy + dy * ar * 1.2 };
        const perp  = { x: -dy, y: dx };
        const b1    = { x: cx - dx * ar * 0.5 + perp.x * ar * 0.7, y: cy - dy * ar * 0.5 + perp.y * ar * 0.7 };
        const b2    = { x: cx - dx * ar * 0.5 - perp.x * ar * 0.7, y: cy - dy * ar * 0.5 - perp.y * ar * 0.7 };

        return (
          <G key={`arr_${dx}_${dy}`}>
            <Rect
              x={nx * CELL_SIZE + 1} y={ny * CELL_SIZE + 1}
              width={CELL_SIZE - 2} height={CELL_SIZE - 2}
              fill={theme.bg} rx={2}
            />
            <Polygon
              points={`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`}
              fill={theme.stroke}
            />
          </G>
        );
      })}
    </G>
  );
}

// ─── Cellule ──────────────────────────────────────────────────────────────────

function CellShape({ cell, rx, ry }) {
  const x = rx * CELL_SIZE, y = ry * CELL_SIZE, s = CELL_SIZE;
  const bg = {
    [CELL_TYPES.WALL]:  PALETTE.bgCard,
    [CELL_TYPES.EXIT]:  '#0D2010',
    [CELL_TYPES.ALTAR]: '#1A0D2E',
    [CELL_TYPES.CHEST]: '#2A2010',
  }[cell] ?? ((rx + ry) % 2 === 0 ? '#0C0C16' : '#0A0A14');

  return (
    <G>
      <Rect x={x} y={y} width={s} height={s} fill={bg} />
      {cell === CELL_TYPES.EXIT  && <Polygon points={geoTri(x+s/2,y+s/2,s*0.28)} fill={PALETTE.roomCombat} opacity={0.7} />}
      {cell === CELL_TYPES.ALTAR && <Circle cx={x+s/2} cy={y+s/2} r={s*0.22} fill="none" stroke="#AA44FF" strokeWidth={2} />}
      {cell === CELL_TYPES.CHEST && <Rect x={x+s*0.25} y={y+s*0.25} width={s*0.5} height={s*0.5} fill={PALETTE.fragment} opacity={0.7} rx={2} />}
      {cell === CELL_TYPES.WALL  && <Rect x={x+1} y={y+1} width={s-2} height={s-2} fill="#0E0E1C" opacity={0.6} />}
    </G>
  );
}

function GridLines({ totalW, totalH }) {
  const lines = [];
  for (let x = 0; x <= totalW; x += CELL_SIZE)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={totalH} stroke={PALETTE.border} strokeWidth={0.4} />);
  for (let y = 0; y <= totalH; y += CELL_SIZE)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={totalW} y2={y} stroke={PALETTE.border} strokeWidth={0.4} />);
  return <G>{lines}</G>;
}

// ─── Joueur (silhouette humanoïde selon la classe) ────────────────────────────

function PlayerToken({ player }) {
  const cx = player.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = player.y * CELL_SIZE + CELL_SIZE / 2;

  const [pulse, setPulse] = useState(false);
  const prevPos = useRef({ x: player.x, y: player.y });
  useEffect(() => {
    if (player.x !== prevPos.current.x || player.y !== prevPos.current.y) {
      prevPos.current = { x: player.x, y: player.y };
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 180);
      return () => clearTimeout(t);
    }
  }, [player.x, player.y]);

  const color = {
    [PLAYER_SHAPES.TRIANGLE]: PALETTE.triangle,
    [PLAYER_SHAPES.CIRCLE]:   PALETTE.circle,
    [PLAYER_SHAPES.HEXAGON]:  PALETTE.hexagon,
  }[player.shape] ?? PALETTE.triangle;

  const scale = pulse ? 1.12 : 1.0;

  return (
    <G>
      {/* Halo */}
      <Circle cx={cx} cy={cy} r={R * scale + 6} fill="none" stroke={color}
        strokeWidth={pulse ? 2 : 1} opacity={pulse ? 0.5 : 0.2} />

      {/* Silhouette selon la classe */}
      {player.shape === PLAYER_SHAPES.TRIANGLE && <Assassin cx={cx} cy={cy} r={R * scale} color={color} />}
      {player.shape === PLAYER_SHAPES.CIRCLE   && <Arcaniste cx={cx} cy={cy} r={R * scale} color={color} />}
      {player.shape === PLAYER_SHAPES.HEXAGON  && <Colosse cx={cx} cy={cy} r={R * scale} color={color} />}

      {/* Charges */}
      {player.maxCharges > 0 && (
        <ChargeRing cx={cx} cy={cy} r={R + 9} charges={player.charges} maxCharges={player.maxCharges} />
      )}
      {/* HP bar */}
      <MiniBar x={player.x * CELL_SIZE} y={player.y * CELL_SIZE + CELL_SIZE - 4}
        hp={player.hp} maxHp={player.maxHp} color={PALETTE.hp} />
    </G>
  );
}

// ─── Ennemi (silhouette selon le type) ───────────────────────────────────────

function EntityToken({ entity: enemy, opacity = 1 }) {
  const cx = enemy.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = enemy.y * CELL_SIZE + CELL_SIZE / 2;
  const r  = enemy.isBoss ? R * 1.3 : R;
  const color = enemy.color || '#FF4444';

  return (
    <G opacity={opacity}>
      {enemy.type === ENEMY_TYPES.CHASER     && <Ecumeur   cx={cx} cy={cy} r={r} color={color} />}
      {enemy.type === ENEMY_TYPES.SHOOTER    && <Tirailleur cx={cx} cy={cy} r={r} color={color} />}
      {enemy.type === ENEMY_TYPES.BLOCKER    && <Titan     cx={cx} cy={cy} r={r} color={color} />}
      {enemy.type === ENEMY_TYPES.BOSS_VOID  && <Echo      cx={cx} cy={cy} r={r} color={color} />}
      {enemy.type === ENEMY_TYPES.BOSS_PULSE && <Tonnerre  cx={cx} cy={cy} r={r} color={color} />}
      {enemy.type === ENEMY_TYPES.BOSS_RIFT  && <Devoreur  cx={cx} cy={cy} r={r} color={color} />}
      {opacity === 1 && (
        <MiniBar x={enemy.x * CELL_SIZE} y={enemy.y * CELL_SIZE + CELL_SIZE - 4}
          hp={enemy.hp} maxHp={enemy.maxHp} color="#FF4444" />
      )}
    </G>
  );
}

// ─── Silhouettes joueurs ──────────────────────────────────────────────────────

// Assassin : capuche, corps élancé, dague
// ─── Silhouettes ennemis ──────────────────────────────────────────────────────

// Écumeur : posture ramassée, griffes
function Ecumeur({ cx, cy, r, color }) {
  return (
    <G>
      {/* Tête baissée */}
      <Circle cx={cx + r*0.1} cy={cy - r*0.55} r={r*0.34} fill={color} />
      {/* Corps penché */}
      <Polygon
        points={`${cx - r*0.5},${cy - r*0.2} ${cx + r*0.55},${cy - r*0.35} ${cx + r*0.45},${cy + r*0.75} ${cx - r*0.4},${cy + r*0.6}`}
        fill={color}
      />
      {/* Griffe gauche */}
      <Line x1={cx - r*0.5} y1={cy + r*0.05} x2={cx - r*0.9} y2={cy + r*0.4} stroke={color} strokeWidth={1.5} />
      <Line x1={cx - r*0.9} y1={cy + r*0.4} x2={cx - r*1.05} y2={cy + r*0.2} stroke={color} strokeWidth={1.2} />
      <Line x1={cx - r*0.9} y1={cy + r*0.4} x2={cx - r*1.0} y2={cy + r*0.58} stroke={color} strokeWidth={1.2} />
      {/* Griffe droite */}
      <Line x1={cx + r*0.55} y1={cy} x2={cx + r*0.95} y2={cy + r*0.35} stroke={color} strokeWidth={1.5} />
      <Line x1={cx + r*0.95} y1={cy + r*0.35} x2={cx + r*1.1} y2={cy + r*0.15} stroke={color} strokeWidth={1.2} />
      <Line x1={cx + r*0.95} y1={cy + r*0.35} x2={cx + r*1.05} y2={cy + r*0.52} stroke={color} strokeWidth={1.2} />
    </G>
  );
}

// Tirailleur : silhouette mince, arbalète
function Tirailleur({ cx, cy, r, color }) {
  return (
    <G>
      {/* Tête */}
      <Circle cx={cx} cy={cy - r*0.95} r={r*0.32} fill={color} />
      {/* Corps mince */}
      <Rect x={cx - r*0.22} y={cy - r*0.6} width={r*0.44} height={r*1.5} fill={color} rx={r*0.06} />
      {/* Arbalète */}
      <Line x1={cx - r*0.8} y1={cy - r*0.1} x2={cx + r*0.8} y2={cy - r*0.1}
        stroke={color} strokeWidth={2.2} opacity={0.9} />
      <Line x1={cx - r*0.5} y1={cy - r*0.1} x2={cx + r*0.25} y2={cy - r*0.5}
        stroke={color} strokeWidth={1.5} opacity={0.7} />
      {/* Carquois */}
      <Rect x={cx + r*0.28} y={cy - r*0.65} width={r*0.18} height={r*0.55} fill={color} opacity={0.7} rx={r*0.04} />
    </G>
  );
}

// Titan : masse imposante, large, pas de cou visible
function Titan({ cx, cy, r, color }) {
  return (
    <G>
      {/* Bloc tête+corps fusionné */}
      <Rect x={cx - r*0.75} y={cy - r*1.1} width={r*1.5} height={r*2.0} fill={color} rx={r*0.12} />
      {/* Yeux enfoncés */}
      <Rect x={cx - r*0.45} y={cy - r*0.7} width={r*0.28} height={r*0.18} fill={PALETTE.bg} rx={r*0.04} />
      <Rect x={cx + r*0.17} y={cy - r*0.7} width={r*0.28} height={r*0.18} fill={PALETTE.bg} rx={r*0.04} />
      {/* Reliefs d'armure */}
      <Line x1={cx - r*0.75} y1={cy - r*0.2} x2={cx + r*0.75} y2={cy - r*0.2}
        stroke={PALETTE.bg} strokeWidth={1} opacity={0.25} />
      <Line x1={cx} y1={cy - r*0.2} x2={cx} y2={cy + r*0.9}
        stroke={PALETTE.bg} strokeWidth={1} opacity={0.2} />
    </G>
  );
}

// ─── Silhouettes boss ─────────────────────────────────────────────────────────

// L'Écho : fantôme spectral, yeux brillants, corps effilé
function Echo({ cx, cy, r, color }) {
  return (
    <G>
      {/* Aura */}
      <Circle cx={cx} cy={cy} r={r*1.4} fill={color} opacity={0.08} />
      {/* Corps fantôme (cercle haut + effilé bas) */}
      <Circle cx={cx} cy={cy - r*0.3} r={r*0.85} fill={color} opacity={0.7} />
      <Polygon
        points={`${cx - r*0.85},${cy - r*0.3} ${cx + r*0.85},${cy - r*0.3} ${cx + r*0.35},${cy + r*1.2} ${cx - r*0.35},${cy + r*1.2}`}
        fill={color} opacity={0.7}
      />
      {/* Tentacules bas */}
      <Polygon
        points={`${cx - r*0.35},${cy+r*1.2} ${cx - r*0.1},${cy+r*1.0} ${cx + r*0.1},${cy+r*1.2}`}
        fill={PALETTE.bg} opacity={0.8}
      />
      <Polygon
        points={`${cx + r*0.05},${cy+r*1.2} ${cx + r*0.3},${cy+r*1.0} ${cx + r*0.55},${cy+r*1.2}`}
        fill={PALETTE.bg} opacity={0.8}
      />
      {/* Yeux lumineux */}
      <Circle cx={cx - r*0.32} cy={cy - r*0.42} r={r*0.2} fill="#FFFFFF" opacity={0.9} />
      <Circle cx={cx + r*0.32} cy={cy - r*0.42} r={r*0.2} fill="#FFFFFF" opacity={0.9} />
      <Circle cx={cx - r*0.32} cy={cy - r*0.42} r={r*0.1} fill={color} />
      <Circle cx={cx + r*0.32} cy={cy - r*0.42} r={r*0.1} fill={color} />
    </G>
  );
}

// Tonnerre Incarné : couronne de foudre, corps angulaire, éclairs
function Tonnerre({ cx, cy, r, color }) {
  return (
    <G>
      {/* Aura électrique */}
      <Circle cx={cx} cy={cy} r={r*1.45} fill={color} opacity={0.07} />
      {/* Couronne de pics */}
      {[-0.9, -0.45, 0, 0.45, 0.9].map((ox, i) => (
        <Line key={i}
          x1={cx + ox*r} y1={cy - r*0.9}
          x2={cx + ox*r*0.7} y2={cy - r*1.6}
          stroke={color} strokeWidth={2} opacity={0.8}
        />
      ))}
      {/* Tête */}
      <Circle cx={cx} cy={cy - r*0.55} r={r*0.45} fill={color} />
      {/* Corps angulaire */}
      <Polygon
        points={`${cx - r*0.55},${cy - r*0.1} ${cx + r*0.55},${cy - r*0.1} ${cx + r*0.75},${cy + r*0.95} ${cx - r*0.75},${cy + r*0.95}`}
        fill={color}
      />
      {/* Éclair gauche */}
      <Polygon
        points={`${cx-r*0.55},${cy+r*0.05} ${cx-r*0.85},${cy+r*0.35} ${cx-r*0.62},${cy+r*0.35} ${cx-r*0.92},${cy+r*0.72}`}
        fill={color} opacity={0.85}
      />
      {/* Éclair droit */}
      <Polygon
        points={`${cx+r*0.55},${cy+r*0.05} ${cx+r*0.85},${cy+r*0.35} ${cx+r*0.62},${cy+r*0.35} ${cx+r*0.92},${cy+r*0.72}`}
        fill={color} opacity={0.85}
      />
    </G>
  );
}

// Le Dévoreur : cornes, marque de rift étoilée, corps massif
function Devoreur({ cx, cy, r, color }) {
  return (
    <G>
      {/* Aura sombre */}
      <Circle cx={cx} cy={cy} r={r*1.55} fill={color} opacity={0.1} />
      {/* Corne gauche */}
      <Polygon
        points={`${cx - r*0.42},${cy - r*0.9} ${cx - r*0.78},${cy - r*1.7} ${cx - r*0.2},${cy - r*0.85}`}
        fill={color}
      />
      {/* Corne droite */}
      <Polygon
        points={`${cx + r*0.42},${cy - r*0.9} ${cx + r*0.78},${cy - r*1.7} ${cx + r*0.2},${cy - r*0.85}`}
        fill={color}
      />
      {/* Tête */}
      <Circle cx={cx} cy={cy - r*0.65} r={r*0.5} fill={color} />
      {/* Yeux rouges */}
      <Circle cx={cx - r*0.22} cy={cy - r*0.72} r={r*0.14} fill="#FF0000" opacity={0.95} />
      <Circle cx={cx + r*0.22} cy={cy - r*0.72} r={r*0.14} fill="#FF0000" opacity={0.95} />
      {/* Corps massif */}
      <Polygon
        points={`${cx - r*0.85},${cy - r*0.15} ${cx + r*0.85},${cy - r*0.15} ${cx + r*1.05},${cy + r*1.1} ${cx - r*1.05},${cy + r*1.1}`}
        fill={color}
      />
      {/* Marque de rift (étoile 4 branches) */}
      <Polygon
        points={geoStar(cx, cy + r*0.42, r*0.38, r*0.15, 4)}
        fill={PALETTE.bg} opacity={0.7}
      />
      {/* Griffes */}
      <Line x1={cx-r*0.85} y1={cy+r*0.4} x2={cx-r*1.2} y2={cy+r*0.15} stroke={color} strokeWidth={2} />
      <Line x1={cx-r*0.85} y1={cy+r*0.4} x2={cx-r*1.18} y2={cy+r*0.6} stroke={color} strokeWidth={2} />
      <Line x1={cx+r*0.85} y1={cy+r*0.4} x2={cx+r*1.2} y2={cy+r*0.15} stroke={color} strokeWidth={2} />
      <Line x1={cx+r*0.85} y1={cy+r*0.4} x2={cx+r*1.18} y2={cy+r*0.6} stroke={color} strokeWidth={2} />
    </G>
  );
}

// ─── Floating damage number ───────────────────────────────────────────────────

function DamagePop({ pop }) {
  const cx = pop.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = pop.y * CELL_SIZE + CELL_SIZE / 4;
  if (pop.isCombo) {
    return (
      <SvgText x={cx} y={cy - CELL_SIZE*0.2} fill="#FF8800"
        fontSize={CELL_SIZE*0.42} fontWeight="bold" textAnchor="middle" opacity={0.98}>
        {`x${pop.amount} COMBO`}
      </SvgText>
    );
  }
  return (
    <SvgText x={cx} y={cy} fill={pop.isPlayer ? '#FF4444' : '#FFD700'}
      fontSize={CELL_SIZE*0.36} fontWeight="bold" textAnchor="middle" opacity={0.95}>
      -{pop.amount}
    </SvgText>
  );
}

// ─── Utilitaires SVG ──────────────────────────────────────────────────────────

function ChargeRing({ cx, cy, r, charges, maxCharges }) {
  return (
    <G>
      {Array.from({ length: maxCharges }, (_, i) => {
        const a = (i / maxCharges) * Math.PI * 2 - Math.PI / 2;
        return (
          <Circle key={i}
            cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r}
            r={2} fill={i < charges ? PALETTE.charge : PALETTE.bgCard}
          />
        );
      })}
    </G>
  );
}

function MiniBar({ x, y, hp, maxHp, color }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const w = CELL_SIZE - 4;
  return (
    <G>
      <Rect x={x+2} y={y} width={w} height={3} fill="#111120" rx={1} />
      <Rect x={x+2} y={y} width={w * ratio} height={3} fill={color} rx={1} />
    </G>
  );
}

// ─── Helpers géométriques ─────────────────────────────────────────────────────

const geoTri = (cx, cy, r) =>
  `${cx},${cy-r} ${cx-r*0.866},${cy+r*0.5} ${cx+r*0.866},${cy+r*0.5}`;

const geoStar = (cx, cy, ro, ri, n) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (Math.PI / n) * i - Math.PI / 2;
    const r = i % 2 === 0 ? ro : ri;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  gridBorder: {
    borderWidth: 2, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
});
