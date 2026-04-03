/**
 * RIFT — LegalScreen
 * Mentions légales — obligatoires (loi française pour services en ligne)
 * Accessible depuis Paramètres → Informations légales
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/gameStore';
import { GAME_PHASES, PALETTE } from '../constants';

export default function LegalScreen() {
  const { t, i18n } = useTranslation();
  const setPhase    = useGameStore(s => s.setPhase);
  const isEn        = i18n.language?.startsWith('en');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase(GAME_PHASES.SETTINGS)} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.legal_notice').toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEn ? <LegalEN /> : <LegalFR />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Version française ────────────────────────────────────────────────────────

function LegalFR() {
  return (
    <>
      <Section title="Éditeur de l'application">
        <Row label="Nom" value="Arnaud Lothe" />
        <Row label="Pays" value="France" />
        <Row label="Contact" value="contact@arnaudlothe.site" />
        <Body style={{ marginTop: 6 }}>
          Application développée à titre personnel, sans activité commerciale enregistrée.
        </Body>
      </Section>

      <Section title="Directeur de la publication">
        <Body>Arnaud Lothe — contact@arnaudlothe.site</Body>
      </Section>

      <Section title="Hébergement des données">
        <Row label="Service" value="Supabase" />
        <Row label="Opérateur" value="Supabase Inc., 970 Toa Payoh North, Singapore" />
        <Row label="Infrastructure" value="Amazon Web Services (AWS)" />
      </Section>

      <Section title="Propriété intellectuelle">
        <Body>
          L'ensemble du contenu de l'application RIFT (graphismes, sons, textes, code, design) est la propriété d'Arnaud Lothe, sauf mention contraire.{'\n\n'}
          Toute reproduction, représentation ou exploitation non autorisée est interdite.
        </Body>
      </Section>

      <Section title="Droit applicable">
        <Body>
          Ces mentions légales sont régies par le droit français. Tout litige sera soumis aux tribunaux français compétents.
        </Body>
      </Section>

      <Section title="Contact">
        <Body>contact@arnaudlothe.site</Body>
      </Section>
    </>
  );
}

// ─── English version ──────────────────────────────────────────────────────────

function LegalEN() {
  return (
    <>
      <Section title="App Publisher">
        <Row label="Name" value="Arnaud Lothe" />
        <Row label="Country" value="France" />
        <Row label="Contact" value="contact@arnaudlothe.site" />
        <Body style={{ marginTop: 6 }}>
          Application developed as a personal project, with no registered commercial activity.
        </Body>
      </Section>

      <Section title="Publication Director">
        <Body>Arnaud Lothe — contact@arnaudlothe.site</Body>
      </Section>

      <Section title="Data Hosting">
        <Row label="Service" value="Supabase" />
        <Row label="Operator" value="Supabase Inc., 970 Toa Payoh North, Singapore" />
        <Row label="Infrastructure" value="Amazon Web Services (AWS)" />
      </Section>

      <Section title="Intellectual Property">
        <Body>
          All content in the RIFT application (graphics, sounds, text, code, design) is the property of Arnaud Lothe, unless otherwise stated.{'\n\n'}
          Any unauthorized reproduction, representation or use is prohibited.
        </Body>
      </Section>

      <Section title="Applicable Law">
        <Body>
          These legal notices are governed by French law. Any dispute shall be submitted to the competent French courts.
        </Body>
      </Section>

      <Section title="Contact">
        <Body>contact@arnaudlothe.site</Body>
      </Section>
    </>
  );
}

// ─── Composants de mise en forme ──────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Body({ children, style }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: PALETTE.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop:        12,
    paddingBottom:     10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
    gap:               2,
  },
  backBtn: { alignSelf: 'flex-start', marginBottom: 4 },
  backTxt: { color: PALETTE.textMuted, fontSize: 14 },
  title:   { color: PALETTE.textPrimary, fontSize: 18, fontWeight: 'bold', letterSpacing: 3 },

  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },

  section: { gap: 8 },
  sectionTitle: {
    color:        PALETTE.textPrimary,
    fontSize:     14,
    fontWeight:   'bold',
    letterSpacing: 1,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A2E',
  },

  row: {
    flexDirection:  'row',
    gap:            12,
    paddingVertical: 3,
  },
  rowLabel: {
    color:     PALETTE.textMuted,
    fontSize:  12,
    width:     120,
    flexShrink: 0,
  },
  rowValue: {
    flex:      1,
    color:     PALETTE.textPrimary,
    fontSize:  12,
    lineHeight: 18,
  },
  body: {
    color:      PALETTE.textMuted,
    fontSize:   13,
    lineHeight: 21,
  },
});
