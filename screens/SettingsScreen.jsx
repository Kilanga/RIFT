/**
 * RIFT — SettingsScreen
 * Paramètres : son (toggle + slider volume), langue, thème, mode, reset
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Modal, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../utils/i18n';
import useGameStore from '../store/gameStore';
import { PALETTE } from '../constants';

// ─── Composant principal ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const meta               = useGameStore(s => s.meta);
  const returnPhase        = useGameStore(s => s.settingsReturnPhase);
  const setPhase           = useGameStore(s => s.setPhase);
  const goToPrivacy        = useGameStore(s => s.goToPrivacy);
  const goToLegal          = useGameStore(s => s.goToLegal);
  const setMusicEnabled    = useGameStore(s => s.setMusicEnabled);
  const setSfxEnabled      = useGameStore(s => s.setSfxEnabled);
  const setMusicVolume     = useGameStore(s => s.setMusicVolume);
  const setSfxVolume       = useGameStore(s => s.setSfxVolume);
  const setLanguage        = useGameStore(s => s.setLanguage);
  const toggleHardcoreMode = useGameStore(s => s.toggleHardcoreMode);
  const setPremiumTheme    = useGameStore(s => s.setPremiumTheme);
  const resetProgress      = useGameStore(s => s.resetProgress);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { t }          = useTranslation();
  const currentLang    = meta.preferredLanguage || i18n.language || 'fr';
  const musicEnabled   = meta.musicEnabled ?? true;
  const sfxEnabled     = meta.sfxEnabled   ?? true;
  const musicVolume    = meta.musicVolume   ?? 0.4;
  const sfxVolume      = meta.sfxVolume     ?? 0.7;

  const handleLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const handleReset = () => {
    resetProgress();
    setShowResetConfirm(false);
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase(returnPhase)} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Son ──────────────────────────────────────────────────────────── */}
        <Section label={t('settings.section_sound')}>
          <SoundRow
            label={t('settings.music_label')}
            desc={t('settings.music_desc')}
            enabled={musicEnabled}
            volume={musicVolume}
            onToggle={() => setMusicEnabled(!musicEnabled)}
            onVolume={setMusicVolume}
            color="#4488FF"
          />
          <SoundRow
            label={t('settings.sfx_label')}
            desc={t('settings.sfx_desc')}
            enabled={sfxEnabled}
            volume={sfxVolume}
            onToggle={() => setSfxEnabled(!sfxEnabled)}
            onVolume={setSfxVolume}
            color="#00CC88"
            last
          />
        </Section>

        {/* ── Langue ───────────────────────────────────────────────────────── */}
        <Section label={t('settings.section_language')}>
          <View style={styles.langRow}>
            <LangBtn
              label={t('settings.lang_fr')}
              flag="🇫🇷"
              active={currentLang === 'fr' || currentLang.startsWith('fr')}
              onPress={() => handleLanguage('fr')}
            />
            <LangBtn
              label={t('settings.lang_en')}
              flag="🇬🇧"
              active={currentLang === 'en' || currentLang.startsWith('en')}
              onPress={() => handleLanguage('en')}
            />
          </View>
        </Section>

        {/* ── Gameplay ─────────────────────────────────────────────────────── */}
        <Section label={t('settings.section_gameplay')}>
          <ToggleRow
            label={t('settings.hardcore_label')}
            desc={t('settings.hardcore_desc')}
            value={meta.hardcoreMode ?? false}
            onToggle={toggleHardcoreMode}
            danger
          />
        </Section>

        {/* ── Apparence (premium) ──────────────────────────────────────────── */}
        {meta.isPremium && (
          <Section label={t('settings.section_appearance')}>
            <ToggleRow
              label={t('settings.neon_label')}
              desc={t('settings.neon_desc')}
              value={meta.premiumTheme === 'neon'}
              onToggle={() => setPremiumTheme(meta.premiumTheme === 'neon' ? 'default' : 'neon')}
            />
          </Section>
        )}

        {/* ── Données ──────────────────────────────────────────────────────── */}
        <Section label={t('settings.section_data')}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => setShowResetConfirm(true)}
            activeOpacity={0.75}
          >
            <Text style={styles.resetIcon}>⚠</Text>
            <View style={styles.resetTexts}>
              <Text style={styles.resetLabel}>{t('settings.reset_label')}</Text>
              <Text style={styles.resetDesc}>{t('settings.reset_desc')}</Text>
            </View>
          </TouchableOpacity>
        </Section>

        {/* ── Informations légales ─────────────────────────────────────────── */}
        <Section label={t('settings.section_legal')}>
          <TouchableOpacity style={styles.legalBtn} onPress={goToPrivacy} activeOpacity={0.75}>
            <Text style={styles.legalBtnTxt}>{t('settings.privacy_policy')}</Text>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.legalBtn, styles.legalBtnLast]} onPress={goToLegal} activeOpacity={0.75}>
            <Text style={styles.legalBtnTxt}>{t('settings.legal_notice')}</Text>
            <Text style={styles.legalArrow}>›</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Version ──────────────────────────────────────────────────────── */}
        <Text style={styles.version}>{t('settings.version')}</Text>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Modal confirmation reset ─────────────────────────────────────── */}
      <Modal transparent animationType="fade" visible={showResetConfirm} onRequestClose={() => setShowResetConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.reset_modal_title')}</Text>
            <Text style={styles.modalBody}>{t('settings.reset_modal_body')}</Text>
            <TouchableOpacity style={styles.modalBtnDanger} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.modalBtnDangerTxt}>{t('settings.reset_modal_confirm')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowResetConfirm(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnCancelTxt}>{t('settings.reset_modal_cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

function SoundRow({ label, desc, enabled, volume, onToggle, onVolume, color, last = false }) {
  return (
    <View style={[styles.soundRow, !last && styles.soundRowBorder]}>
      {/* Ligne toggle */}
      <View style={styles.soundToggleLine}>
        <View style={styles.toggleTexts}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDesc}>{desc}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: '#222233', true: color + '66' }}
          thumbColor={enabled ? color : '#555566'}
        />
      </View>
      {/* Slider volume */}
      <View style={styles.sliderLine}>
        <Text style={[styles.volIcon, !enabled && styles.dimmed]}>
          {volume < 0.05 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
        </Text>
        <VolumeSlider
          value={volume}
          onChange={onVolume}
          color={color}
          disabled={!enabled}
        />
        <Text style={[styles.volPct, !enabled && styles.dimmed]}>
          {Math.round(volume * 100)}%
        </Text>
      </View>
    </View>
  );
}

function VolumeSlider({ value, onChange, color, disabled }) {
  const trackRef  = useRef(null);
  const pageXRef  = useRef(0);
  const trackWRef = useRef(1);

  const clamp = useCallback(v => Math.max(0, Math.min(1, v)), []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture:  () => true,
      onMoveShouldSetPanResponder:          () => true,
      onMoveShouldSetPanResponderCapture:   () => true,
      onPanResponderGrant: (evt) => {
        if (disabled) return;
        const ratio = Math.max(0, Math.min(1,
          (evt.nativeEvent.pageX - pageXRef.current) / (trackWRef.current || 1)
        ));
        onChange(ratio);
      },
      onPanResponderMove: (evt) => {
        if (disabled) return;
        const ratio = Math.max(0, Math.min(1,
          (evt.nativeEvent.pageX - pageXRef.current) / (trackWRef.current || 1)
        ));
        onChange(ratio);
      },
    })
  ).current;

  const handleLayout = () => {
    if (trackRef.current) {
      trackRef.current.measure((fx, fy, w, h, px) => {
        pageXRef.current  = px;
        trackWRef.current = w || 1;
      });
    }
  };

  const fillPct   = `${Math.round(value * 100)}%`;
  const thumbLeft = `${Math.round(value * 100)}%`;
  const trackColor = disabled ? '#2A2A3A' : '#1A1A2E';
  const fillColor  = disabled ? '#333344' : color;
  const thumbColor = disabled ? '#444455' : color;

  return (
    <View
      ref={trackRef}
      style={styles.sliderTrack}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={[styles.sliderBg, { backgroundColor: trackColor }]} />
      <View style={[styles.sliderFill, { width: fillPct, backgroundColor: fillColor }]} />
      <View style={[
        styles.sliderThumb,
        { left: thumbLeft, borderColor: thumbColor, backgroundColor: disabled ? '#333' : '#0A0A14' },
        { transform: [{ translateX: -8 }] },
      ]} />
    </View>
  );
}

function ToggleRow({ label, desc, value, onToggle, danger = false }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTexts}>
        <Text style={[styles.toggleLabel, danger && styles.toggleLabelDanger]}>{label}</Text>
        {desc ? <Text style={styles.toggleDesc}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#222233', true: danger ? PALETTE.upgradeRed + '88' : '#2255AA' }}
        thumbColor={value ? (danger ? PALETTE.upgradeRed : '#4488FF') : '#555566'}
      />
    </View>
  );
}

function LangBtn({ label, flag, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.langBtn, active && styles.langBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.langFlag}>{flag}</Text>
      <Text style={[styles.langBtnTxt, active && styles.langBtnTxtActive]}>{label}</Text>
      {active && <Text style={styles.langBtnCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PALETTE.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop:        12,
    paddingBottom:     8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  backTxt: { color: PALETTE.textMuted, fontSize: 14 },
  title:   { color: PALETTE.textPrimary, fontSize: 22, fontWeight: 'bold', letterSpacing: 4 },

  content: { paddingHorizontal: 16, paddingTop: 20, gap: 24 },

  section: { gap: 10 },
  sectionLabel: {
    color:         PALETTE.textMuted,
    fontSize:      10,
    letterSpacing: 3,
    fontWeight:    'bold',
  },
  sectionContent: {
    backgroundColor: '#08080F',
    borderWidth:     1,
    borderColor:     '#1A1A2E',
    borderRadius:    12,
    overflow:        'hidden',
  },

  // Sound row (toggle + slider)
  soundRow: {
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     12,
    gap:               10,
  },
  soundRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#111122',
  },
  soundToggleLine: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  sliderLine: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  volIcon: { fontSize: 14, width: 20, textAlign: 'center' },
  volPct:  { color: PALETTE.textMuted, fontSize: 11, width: 36, textAlign: 'right' },
  dimmed:  { opacity: 0.35 },

  // Slider
  sliderTrack: {
    flex:           1,
    height:         28,
    justifyContent: 'center',
  },
  sliderBg: {
    position:     'absolute',
    left:         0,
    right:        0,
    height:       5,
    borderRadius: 3,
  },
  sliderFill: {
    position:     'absolute',
    left:         0,
    height:       5,
    borderRadius: 3,
  },
  sliderThumb: {
    position:     'absolute',
    width:        16,
    height:       16,
    borderRadius: 8,
    borderWidth:  2,
    top:          6,   // (28 - 16) / 2
  },

  // Toggle générique
  toggleRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#111122',
  },
  toggleTexts:       { flex: 1, gap: 2 },
  toggleLabel:       { color: PALETTE.textPrimary, fontSize: 14 },
  toggleLabelDanger: { color: PALETTE.upgradeRed + 'CC' },
  toggleDesc:        { color: PALETTE.textMuted, fontSize: 11 },

  // Langue
  langRow: {
    flexDirection: 'row',
    padding:       12,
    gap:           10,
  },
  langBtn: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             6,
    paddingVertical: 12,
    borderRadius:    8,
    borderWidth:     1,
    borderColor:     '#222244',
    backgroundColor: '#0A0A14',
  },
  langBtnActive: {
    borderColor:     '#4466CC',
    backgroundColor: '#0D0D22',
  },
  langFlag:         { fontSize: 16 },
  langBtnTxt:       { color: PALETTE.textMuted, fontSize: 13 },
  langBtnTxtActive: { color: PALETTE.textPrimary, fontWeight: 'bold' },
  langBtnCheck:     { color: '#4488FF', fontSize: 12, fontWeight: 'bold' },

  // Reset
  resetBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   16,
    gap:               14,
  },
  resetIcon:   { fontSize: 20, color: PALETTE.upgradeRed },
  resetTexts:  { flex: 1, gap: 3 },
  resetLabel:  { color: PALETTE.upgradeRed + 'DD', fontSize: 14, fontWeight: 'bold' },
  resetDesc:   { color: PALETTE.textMuted, fontSize: 11, lineHeight: 16 },

  legalBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#111122',
  },
  legalBtnLast: { borderBottomWidth: 0 },
  legalBtnTxt:  { flex: 1, color: PALETTE.textPrimary, fontSize: 14 },
  legalArrow:   { color: PALETTE.textMuted, fontSize: 18 },

  version: {
    color:         PALETTE.textDim,
    fontSize:      10,
    textAlign:     'center',
    letterSpacing: 2,
  },

  // Modal reset
  modalOverlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         24,
  },
  modalCard: {
    width:           '100%',
    backgroundColor: '#0A0508',
    borderWidth:     1,
    borderColor:     PALETTE.upgradeRed + '66',
    borderRadius:    16,
    padding:         24,
    gap:             16,
  },
  modalTitle: {
    color:         PALETTE.upgradeRed,
    fontSize:      16,
    fontWeight:    'bold',
    letterSpacing: 2,
    textAlign:     'center',
  },
  modalBody: {
    color:      PALETTE.textMuted,
    fontSize:   13,
    lineHeight: 20,
    textAlign:  'center',
  },
  modalBtnDanger: {
    backgroundColor: PALETTE.upgradeRed + '22',
    borderWidth:     2,
    borderColor:     PALETTE.upgradeRed,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  modalBtnDangerTxt: { color: PALETTE.upgradeRed, fontSize: 14, fontWeight: 'bold', letterSpacing: 3 },
  modalBtnCancel: {
    borderWidth:     1,
    borderColor:     '#222233',
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
  },
  modalBtnCancelTxt: { color: PALETTE.textMuted, fontSize: 13 },
});
