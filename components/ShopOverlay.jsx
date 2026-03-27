/**
 * RIFT — ShopOverlay
 * Boutique : achète des upgrades avec les fragments collectés
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Polygon, Circle, G } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, UPGRADE_COLORS } from '../constants';
import { getUpgradeById } from '../systems/upgradeSystem';

export default function ShopOverlay() {
  const { t } = useTranslation();
  const player      = useGameStore(s => s.player);
  const currentRoom = useGameStore(s => s.currentRoom);
  const buyShopItem = useGameStore(s => s.buyShopItem);
  const leaveRoom   = useGameStore(s => s.leaveRoom);

  const items = currentRoom?.shopItems || [];

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('shop.title')}</Text>
        <View style={styles.wallet}>
          <Text style={styles.fragmentIcon}>◈</Text>
          <Text style={styles.fragmentCount}>{player.fragments}</Text>
          <Text style={styles.fragmentLabel}>{t('shop.fragments_label')}</Text>
        </View>
      </View>

      {/* Items */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.items}>
        {items.map((item, index) => {
          const upgrade    = getUpgradeById(item.upgradeId);
          const canAfford  = player.fragments >= item.price;
          if (!upgrade) return null;

          return (
            <ShopItem
              key={`${item.upgradeId}_${index}`}
              upgrade={upgrade}
              price={item.price}
              bought={item.bought}
              canAfford={canAfford}
              onBuy={() => !item.bought && canAfford && buyShopItem(index)}
            />
          );
        })}
      </ScrollView>

      {/* Quitter */}
      <TouchableOpacity style={styles.btnLeave} onPress={leaveRoom} activeOpacity={0.8}>
        <Text style={styles.btnLeaveTxt}>{t('shop.leave')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Item de shop ─────────────────────────────────────────────────────────────

function ShopItem({ upgrade, price, bought, canAfford, onBuy }) {
  const { t } = useTranslation();
  const color     = upgradeHex(upgrade.color);
  const rarityTxt = {
    common: t('shop.rarity_common'),
    rare:   t('shop.rarity_rare'),
    epic:   t('shop.rarity_epic'),
    curse:  t('shop.rarity_curse'),
  }[upgrade.rarity] || t('shop.rarity_common');

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { borderColor: bought ? PALETTE.border : color },
        bought    && styles.itemBought,
        !canAfford && !bought && styles.itemCantAfford,
      ]}
      onPress={onBuy}
      activeOpacity={bought ? 1 : 0.7}
      disabled={bought}
    >
      {/* Icône */}
      <View style={[styles.itemIcon, { backgroundColor: color + '22' }]}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={12} fill={color} opacity={bought ? 0.3 : 0.8} />
        </Svg>
      </View>

      {/* Infos */}
      <View style={styles.itemBody}>
        <Text style={[styles.itemRarity, { color: PALETTE.textMuted }]}>{rarityTxt}</Text>
        <Text style={[styles.itemName, { color: bought ? PALETTE.textMuted : color }]}>{t(`upgrade.${upgrade.id}.name`, { defaultValue: upgrade.name })}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{t(`upgrade.${upgrade.id}.desc`, { defaultValue: upgrade.description })}</Text>
      </View>

      {/* Prix */}
      <View style={styles.priceBox}>
        {bought ? (
          <Text style={styles.boughtTxt}>{t('shop.bought')}</Text>
        ) : (
          <View style={[styles.priceTag, { borderColor: canAfford ? color : PALETTE.textMuted }]}>
            <Text style={styles.fragIcon}>◈</Text>
            <Text style={[styles.priceNum, { color: canAfford ? color : PALETTE.textMuted }]}>{price}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function upgradeHex(color) {
  return { red: PALETTE.upgradeRed, blue: PALETTE.upgradeBlue, green: PALETTE.upgradeGreen, curse: '#AA44CC' }[color] || '#888';
}

const styles = StyleSheet.create({
  container: {
    flex:    1,
    padding: 20,
    gap:     16,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  title: {
    color:       PALETTE.fragment,
    fontSize:    13,
    fontWeight:  'bold',
    letterSpacing: 2,
  },
  wallet: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
    backgroundColor: '#1A1408',
    borderWidth:   1,
    borderColor:   PALETTE.fragment,
    borderRadius:  8,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  fragmentIcon:  { color: PALETTE.fragment, fontSize: 12 },
  fragmentCount: { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold' },
  fragmentLabel: { color: PALETTE.textMuted, fontSize: 11 },

  scroll:  { flex: 1 },
  items:   { gap: 10 },

  item: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderRadius:    12,
    padding:         12,
    gap:             12,
  },
  itemBought:     { opacity: 0.5 },
  itemCantAfford: { opacity: 0.7 },
  itemIcon:       { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemBody:       { flex: 1, gap: 2 },
  itemRarity:     { fontSize: 9, letterSpacing: 1 },
  itemName:       { fontSize: 14, fontWeight: 'bold' },
  itemDesc:       { color: PALETTE.textMuted, fontSize: 11, lineHeight: 15 },

  priceBox: { alignItems: 'center' },
  priceTag: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            3,
    borderWidth:    1,
    borderRadius:   6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  fragIcon:  { color: PALETTE.fragment, fontSize: 11 },
  priceNum:  { fontSize: 14, fontWeight: 'bold' },
  boughtTxt: { color: PALETTE.hp, fontSize: 11, fontWeight: 'bold' },

  btnLeave: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
  },
  btnLeaveTxt: { color: PALETTE.textMuted, fontSize: 14 },
});
