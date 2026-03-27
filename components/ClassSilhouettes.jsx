/**
 * RIFT — ClassSilhouettes
 * Silhouettes SVG partagées pour les 3 classes joueur.
 * Utilisées dans GameGrid et dans les menus (LastRunCard, ShapeSelectScreen…).
 *
 * Usage :
 *   <Svg width={W} height={H}>
 *     <Assassin  cx={W/2} cy={H/2} r={R} color="#00FFCC" />
 *   </Svg>
 */

import React from 'react';
import { Circle, Polygon, Rect, Line, G, Ellipse } from 'react-native-svg';

// Assassin : capuche, silhouette élancée, dague
export function Assassin({ cx, cy, r, color }) {
  const dark = color + 'AA';
  return (
    <G>
      {/* Capuche */}
      <Polygon
        points={`${cx},${cy - r * 1.55} ${cx - r * 0.55},${cy - r * 0.7} ${cx + r * 0.55},${cy - r * 0.7}`}
        fill={dark}
      />
      {/* Tête */}
      <Circle cx={cx} cy={cy - r * 1.0} r={r * 0.38} fill={color} />
      {/* Corps élancé */}
      <Polygon
        points={`${cx - r*0.28},${cy - r*0.58} ${cx + r*0.28},${cy - r*0.58} ${cx + r*0.38},${cy + r*0.85} ${cx - r*0.38},${cy + r*0.85}`}
        fill={color}
      />
      {/* Dague */}
      <Line x1={cx + r*0.28} y1={cy - r*0.1} x2={cx + r*0.7} y2={cy + r*0.45}
        stroke={color} strokeWidth={1.8} opacity={0.85} />
      <Polygon
        points={`${cx+r*0.72},${cy+r*0.48} ${cx+r*0.58},${cy+r*0.38} ${cx+r*0.62},${cy+r*0.55}`}
        fill={color} opacity={0.85}
      />
    </G>
  );
}

// Arcaniste : robe ample, chapeau de mage, bâton
export function Arcaniste({ cx, cy, r, color }) {
  return (
    <G>
      {/* Chapeau */}
      <Polygon
        points={`${cx},${cy - r*1.7} ${cx - r*0.32},${cy - r*0.85} ${cx + r*0.32},${cy - r*0.85}`}
        fill={color}
      />
      <Rect x={cx - r*0.42} y={cy - r*0.88} width={r*0.84} height={r*0.16} fill={color} rx={1} />
      {/* Tête */}
      <Circle cx={cx} cy={cy - r * 0.58} r={r * 0.36} fill={color} />
      {/* Robe */}
      <Polygon
        points={`${cx - r*0.28},${cy - r*0.22} ${cx + r*0.28},${cy - r*0.22} ${cx + r*0.75},${cy + r*0.9} ${cx - r*0.75},${cy + r*0.9}`}
        fill={color}
      />
      {/* Bâton */}
      <Line x1={cx + r*0.52} y1={cy + r*0.7} x2={cx + r*0.75} y2={cy - r*1.1}
        stroke={color} strokeWidth={1.5} opacity={0.8} />
      {/* Orbe au bout du bâton */}
      <Circle cx={cx + r*0.78} cy={cy - r*1.18} r={r*0.2} fill={color} opacity={0.9} />
      <Circle cx={cx + r*0.78} cy={cy - r*1.18} r={r*0.1} fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

// Colosse : armure lourde, bouclier, casque
export function Colosse({ cx, cy, r, color }) {
  return (
    <G>
      {/* Casque */}
      <Rect x={cx - r*0.42} y={cy - r*1.35} width={r*0.84} height={r*0.5} fill={color} rx={r*0.2} />
      <Rect x={cx - r*0.25} y={cy - r*1.38} width={r*0.5} height={r*0.18} fill={color} opacity={0.6} />
      {/* Tête */}
      <Circle cx={cx} cy={cy - r * 0.78} r={r * 0.35} fill={color} />
      {/* Corps large */}
      <Rect x={cx - r*0.65} y={cy - r*0.4} width={r*1.3} height={r*1.2} fill={color} rx={r*0.08} />
      {/* Bouclier (gauche) */}
      <Rect x={cx - r*1.05} y={cy - r*0.55} width={r*0.46} height={r*0.9} fill={color} rx={r*0.08} />
      <Rect x={cx - r*0.98} y={cy - r*0.48} width={r*0.32} height={r*0.76} fill="#FFFFFF" opacity={0.15} rx={r*0.06} />
      {/* Épée (droite) */}
      <Line x1={cx + r*0.78} y1={cy + r*0.65} x2={cx + r*0.78} y2={cy - r*0.85}
        stroke={color} strokeWidth={2.5} opacity={0.9} />
      <Line x1={cx + r*0.55} y1={cy - r*0.45} x2={cx + r*1.0} y2={cy - r*0.45}
        stroke={color} strokeWidth={2} opacity={0.7} />
    </G>
  );
}

// Spectre : silhouette fantomatique, capuche, bas de robe effiloché
export function Spectre({ cx, cy, r, color }) {
  return (
    <G>
      {/* Capuche profonde */}
      <Polygon
        points={`${cx},${cy - r*1.6} ${cx - r*0.6},${cy - r*0.65} ${cx + r*0.6},${cy - r*0.65}`}
        fill={color} opacity={0.9}
      />
      {/* Tête floue */}
      <Circle cx={cx} cy={cy - r*1.05} r={r*0.32} fill={color} opacity={0.65} />
      {/* Yeux lumineux */}
      <Circle cx={cx - r*0.12} cy={cy - r*1.08} r={r*0.07} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={cx + r*0.12} cy={cy - r*1.08} r={r*0.07} fill="#FFFFFF" opacity={0.95} />
      {/* Corps vaporeux */}
      <Polygon
        points={`${cx - r*0.38},${cy - r*0.62} ${cx + r*0.38},${cy - r*0.62} ${cx + r*0.55},${cy + r*0.42} ${cx - r*0.55},${cy + r*0.42}`}
        fill={color} opacity={0.55}
      />
      {/* Bas effiloché — 3 pointes */}
      <Polygon
        points={`${cx - r*0.55},${cy + r*0.42} ${cx - r*0.38},${cy + r*1.05} ${cx - r*0.18},${cy + r*0.55}`}
        fill={color} opacity={0.5}
      />
      <Polygon
        points={`${cx - r*0.18},${cy + r*0.55} ${cx},${cy + r*1.15} ${cx + r*0.18},${cy + r*0.55}`}
        fill={color} opacity={0.55}
      />
      <Polygon
        points={`${cx + r*0.18},${cy + r*0.55} ${cx + r*0.38},${cy + r*1.05} ${cx + r*0.55},${cy + r*0.42}`}
        fill={color} opacity={0.5}
      />
      {/* Aura */}
      <Ellipse cx={cx} cy={cy + r*0.2} rx={r*0.62} ry={r*0.18} fill={color} opacity={0.18} />
    </G>
  );
}
