/**
 * RIFT — ShopOverlay
 * Boutique + Forge : deux onglets dans la salle shop
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import useGameStore from '../store/gameStore';
import { PALETTE, UPGRADE_COLORS } from '../constants';
import { getUpgradeById } from '../systems/upgradeSystem';

const FORGE_UPGRADE_COST = 20;
const FORGE_CREATE_COST  = 15;

export default function ShopOverlay() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('shop');

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'shop' && styles.tabActive]}
          onPress={() => setTab('shop')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabTxt, tab === 'shop' && styles.tabTxtActive]}>
            {t('shop.tab_shop')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'forge' && styles.tabActiveForge]}
          onPress={() => setTab('forge')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabTxt, tab === 'forge' && styles.tabTxtActiveForge]}>
            {t('shop.tab_forge')}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'shop' ? <ShopTab /> : <ForgeTab />}
    </View>
  );
}

// ─── Onglet Boutique ──────────────────────────────────────────────────────────

function ShopTab() {
  const { t } = useTranslation();
  const player      = useGameStore(s => s.player);
  const currentRoom = useGameStore(s => s.currentRoom);
  const buyShopItem = useGameStore(s => s.buyShopItem);
  const leaveRoom   = useGameStore(s => s.leaveRoom);

  const items = currentRoom?.shopItems || [];

  return (
    <>
      <View style={styles.wallet}>
        <Text style={styles.fragmentIcon}>◈</Text>
        <Text style={styles.fragmentCount}>{player.fragments}</Text>
        <Text style={styles.fragmentLabel}>{t('shop.fragments_label')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.items}>
        {items.map((item, index) => {
          const upgrade   = getUpgradeById(item.upgradeId);
          const canAfford = player.fragments >= item.price;
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

      <TouchableOpacity style={styles.btnLeave} onPress={leaveRoom} activeOpacity={0.8}>
        <Text style={styles.btnLeaveTxt}>{t('shop.leave')}</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Onglet Forge ─────────────────────────────────────────────────────────────

function ForgeTab() {
  const { t } = useTranslation();
  const player            = useGameStore(s => s.player);
  const activeUpgrades    = useGameStore(s => s.activeUpgrades);
  const forgeUpgrade      = useGameStore(s => s.forgeUpgrade);
  const forgeCreateByColor = useGameStore(s => s.forgeCreateByColor);
  const leaveRoom         = useGameStore(s => s.leaveRoom);

  // Upgrades améliorables (pas encore au maxStack)
  const stackCount = {};
  activeUpgrades.forEach(u => { stackCount[u.id] = (stackCount[u.id] || 0) + 1; });
  const upgradeable = activeUpgrades.filter(
    (u, idx, arr) => arr.findIndex(x => x.id === u.id) === idx && stackCount[u.id] < u.maxStack
  );

  const colors = [
    { key: UPGRADE_COLORS.RED,   label: t('shop.forge_red'),   hex: PALETTE.upgradeRed   },
    { key: UPGRADE_COLORS.BLUE,  label: t('shop.forge_blue'),  hex: PALETTE.upgradeBlue  },
    { key: UPGRADE_COLORS.GREEN, label: t('shop.forge_green'), hex: PALETTE.upgradeGreen },
    { key: UPGRADE_COLORS.CURSE, label: t('shop.forge_curse'), hex: '#AA44CC'             },
  ];

  return (
    <>
      <View style={styles.wallet}>
        <Text style={styles.fragmentIcon}>◈</Text>
        <Text style={styles.fragmentCount}>{player.fragments}</Text>
        <Text style={styles.fragmentLabel}>{t('shop.fragments_label')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.forgeContent}>

        {/* Section Améliorer */}
        <Text style={styles.forgeSection}>{t('shop.forge_upgrade_title')}</Text>
        <Text style={styles.forgeCostHint}>{t('shop.forge_upgrade_cost', { cost: FORGE_UPGRADE_COST })}</Text>

        {upgradeable.length === 0 ? (
          <Text style={styles.forgeEmpty}>{t('shop.forge_nothing_upgradeable')}</Text>
        ) : (
          upgradeable.map(u => {
            const canAfford = player.fragments >= FORGE_UPGRADE_COST;
            const color     = upgradeHex(u.color);
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.forgeItem, { borderColor: canAfford ? color : PALETTE.border }, !canAfford && styles.forgeItemDisabled]}
                onPress={() => canAfford && forgeUpgrade(u.id)}
                activeOpacity={0.7}
                disabled={!canAfford}
              >
                <View style={[styles.forgeDot, { backgroundColor: color }]} />
                <View style={styles.forgeItemBody}>
                  <Text style={[styles.forgeItemName, { color }]}>{t(`upgrade.${u.id}.name`, { defaultValue: u.name })}</Text>
                  <Text style={styles.forgeItemStack}>{t('shop.forge_stack', { current: stackCount[u.id], max: u.maxStack })}</Text>
                </View>
                <View style={[styles.forgePriceTag, { borderColor: canAfford ? color : PALETTE.border }]}>
                  <Text style={styles.fragIcon}>◈</Text>
                  <Text style={[styles.forgePriceNum, { color: canAfford ? color : PALETTE.textMuted }]}>{FORGE_UPGRADE_COST}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Section Créer */}
        <Text style={[styles.forgeSection, { marginTop: 16 }]}>{t('shop.forge_create_title')}</Text>
        <Text style={styles.forgeCostHint}>{t('shop.forge_create_cost', { cost: FORGE_CREATE_COST })}</Text>

        <View style={styles.colorGrid}>
          {colors.map(c => {
            const canAfford = player.fragments >= FORGE_CREATE_COST;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.colorBtn, { borderColor: canAfford ? c.hex : PALETTE.border, backgroundColor: c.hex + '18' }, !canAfford && styles.colorBtnDisabled]}
                onPress={() => canAfford && forgeCreateByColor(c.key)}
                activeOpacity={0.7}
                disabled={!canAfford}
              >
                <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                <Text style={[styles.colorLabel, { color: canAfford ? c.hex : PALETTE.textMuted }]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <TouchableOpacity style={styles.btnLeave} onPress={leaveRoom} activeOpacity={0.8}>
        <Text style={styles.btnLeaveTxt}>{t('shop.leave')}</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── ShopItem ─────────────────────────────────────────────────────────────────

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
        bought     && styles.itemBought,
        !canAfford && !bought && styles.itemCantAfford,
      ]}
      onPress={onBuy}
      activeOpacity={bought ? 1 : 0.7}
      disabled={bought}
    >
      <View style={[styles.itemIcon, { backgroundColor: color + '22' }]}>
        <Svg width={36} height={36} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={12} fill={color} opacity={bought ? 0.3 : 0.8} />
        </Svg>
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemRarity, { color: PALETTE.textMuted }]}>{rarityTxt}</Text>
        <Text style={[styles.itemName, { color: bought ? PALETTE.textMuted : color }]}>{t(`upgrade.${upgrade.id}.name`, { defaultValue: upgrade.name })}</Text>
        <Text style={styles.itemDesc} numberOfLines={2}>{t(`upgrade.${upgrade.id}.desc`, { defaultValue: upgrade.description })}</Text>
      </View>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },

  // Onglets
  tabs: {
    flexDirection:   'row',
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    overflow:        'hidden',
  },
  tab: {
    flex:            1,
    paddingVertical: 10,
    alignItems:      'center',
    backgroundColor: PALETTE.bgDark,
  },
  tabActive:          { backgroundColor: PALETTE.fragment + '22' },
  tabActiveForge:     { backgroundColor: '#FF880022' },
  tabTxt:             { color: PALETTE.textMuted, fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
  tabTxtActive:       { color: PALETTE.fragment },
  tabTxtActiveForge:  { color: '#FF8800' },

  // Wallet
  wallet: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    alignSelf:         'flex-end',
    backgroundColor:   '#1A1408',
    borderWidth:       1,
    borderColor:       PALETTE.fragment,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   4,
  },
  fragmentIcon:  { color: PALETTE.fragment, fontSize: 12 },
  fragmentCount: { color: PALETTE.textPrimary, fontSize: 16, fontWeight: 'bold' },
  fragmentLabel: { color: PALETTE.textMuted, fontSize: 11 },

  scroll: { flex: 1 },
  items:  { gap: 10 },

  // Shop item
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
  priceBox:       { alignItems: 'center' },
  priceTag: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  fragIcon:  { color: PALETTE.fragment, fontSize: 11 },
  priceNum:  { fontSize: 14, fontWeight: 'bold' },
  boughtTxt: { color: PALETTE.hp, fontSize: 11, fontWeight: 'bold' },

  // Forge
  forgeContent:      { gap: 8, paddingBottom: 8 },
  forgeSection:      { color: '#FF8800', fontSize: 11, fontWeight: 'bold', letterSpacing: 3, marginTop: 4 },
  forgeCostHint:     { color: PALETTE.textDim, fontSize: 10, marginBottom: 4 },
  forgeEmpty:        { color: PALETTE.textDim, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  forgeItem: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: PALETTE.bgCard,
    borderWidth:     1,
    borderRadius:    10,
    padding:         10,
    gap:             10,
  },
  forgeItemDisabled: { opacity: 0.5 },
  forgeDot:          { width: 10, height: 10, borderRadius: 5 },
  forgeItemBody:     { flex: 1, gap: 2 },
  forgeItemName:     { fontSize: 13, fontWeight: 'bold' },
  forgeItemStack:    { color: PALETTE.textMuted, fontSize: 10 },
  forgePriceTag: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    borderWidth:       1,
    borderRadius:      6,
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  forgePriceNum: { fontSize: 13, fontWeight: 'bold' },

  colorGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
  },
  colorBtn: {
    flex:              1,
    minWidth:          '45%',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderWidth:       1,
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   12,
  },
  colorBtnDisabled: { opacity: 0.5 },
  colorDot:   { width: 10, height: 10, borderRadius: 5 },
  colorLabel: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

  // Quitter
  btnLeave: {
    borderWidth:     1,
    borderColor:     PALETTE.border,
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
  },
  btnLeaveTxt: { color: PALETTE.textMuted, fontSize: 14 },
});
