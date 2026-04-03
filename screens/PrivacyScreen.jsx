/**
 * RIFT — PrivacyScreen
 * Politique de confidentialité — conforme RGPD / CNIL
 * Accessible depuis Paramètres → Informations légales
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/gameStore';
import { GAME_PHASES, PALETTE } from '../constants';

export default function PrivacyScreen() {
  const { t, i18n } = useTranslation();
  const setPhase    = useGameStore(s => s.setPhase);
  const isEn        = i18n.language?.startsWith('en');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setPhase(GAME_PHASES.SETTINGS)} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>{t('settings.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.privacy_policy').toUpperCase()}</Text>
        <Text style={styles.updated}>{isEn ? 'Last updated: ' : 'Mise à jour : '}2025</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isEn ? <PrivacyEN /> : <PrivacyFR />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Version française ────────────────────────────────────────────────────────

function PrivacyFR() {
  return (
    <>
      <Section title="1. Responsable du traitement">
        <Body>
          RIFT est développé et publié par :{'\n\n'}
          {'Arnaud Lothe\nFrance'}{'\n\n'}
          Pour toute question relative à vos données : contact@arnaudlothe.site
        </Body>
      </Section>

      <Section title="2. Données collectées">
        <Body>
          L'application collecte uniquement les données strictement nécessaires à son fonctionnement :
        </Body>
        <BulletList items={[
          'Pseudo joueur (optionnel) — saisi librement, utilisé uniquement pour le classement en ligne.',
          'Scores et statistiques de jeu (salles terminées, ennemis tués, classe choisie) — envoyés au classement en ligne si vous avez renseigné un pseudo.',
          'Identifiant d\'appareil anonyme (UUID) — généré localement, utilisé uniquement pour associer vos achats in-app à votre appareil. Cet identifiant ne permet pas de vous identifier personnellement.',
          'Données d\'achat (référence produit) — transmises à Stripe pour le traitement du paiement.',
        ]} />
        <Body>
          L'application ne collecte pas : adresse e-mail, numéro de téléphone, données de localisation, contacts, données biométriques, historique de navigation.
        </Body>
      </Section>

      <Section title="3. Finalités et bases légales">
        <BulletList items={[
          'Classement en ligne (pseudo + score) — base légale : consentement (le pseudo est facultatif).',
          'Gestion des achats in-app (UUID + référence produit) — base légale : exécution du contrat (nécessaire pour vous livrer l\'achat).',
          'Amélioration du jeu (statistiques agrégées) — base légale : intérêt légitime.',
        ]} />
      </Section>

      <Section title="4. Sous-traitants">
        <Body>
          Vos données peuvent être traitées par les sous-traitants suivants :
        </Body>
        <BulletList items={[
          'Supabase (base de données & API) — hébergé sur AWS (UE possible selon configuration). Politique : supabase.com/privacy',
          'Stripe (paiements) — certifié PCI DSS. Politique : stripe.com/fr/privacy',
        ]} />
        <Body>
          Ces sous-traitants sont liés par des clauses contractuelles conformes au RGPD.
        </Body>
      </Section>

      <Section title="5. Durée de conservation">
        <BulletList items={[
          'Pseudo et scores : conservés tant que le classement est actif, supprimés sur demande.',
          'UUID d\'appareil : stocké localement sur votre appareil (AsyncStorage). Supprimé à la désinstallation de l\'application.',
          'Données d\'achat : conservées le temps légalement requis (5 ans pour les obligations comptables).',
        ]} />
      </Section>

      <Section title="6. Vos droits (RGPD)">
        <Body>
          Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
        </Body>
        <BulletList items={[
          'Droit d\'accès à vos données',
          'Droit de rectification',
          'Droit à l\'effacement ("droit à l\'oubli")',
          'Droit à la portabilité',
          'Droit d\'opposition au traitement',
        ]} />
        <Body>
          Pour exercer ces droits, contactez-nous à : contact@arnaudlothe.site{'\n\n'}
          Vous disposez également du droit d\'introduire une réclamation auprès de la CNIL (cnil.fr).
        </Body>
      </Section>

      <Section title="7. Cookies et traceurs">
        <Body>
          L'application n'utilise pas de cookies. L'UUID d'appareil est un identifiant technique local, non partagé à des fins publicitaires.
        </Body>
      </Section>

      <Section title="8. Sécurité">
        <Body>
          Les données transmises sont protégées par chiffrement TLS. Les accès à la base de données Supabase sont sécurisés par des politiques Row Level Security (RLS).
        </Body>
      </Section>

      <Section title="9. Modifications">
        <Body>
          Cette politique peut être mise à jour. La version en vigueur est toujours accessible depuis les Paramètres de l'application. En cas de modification substantielle, une notification sera affichée dans l'application.
        </Body>
      </Section>
    </>
  );
}

// ─── English version ──────────────────────────────────────────────────────────

function PrivacyEN() {
  return (
    <>
      <Section title="1. Data Controller">
        <Body>
          RIFT is developed and published by:{'\n\n'}
          {'Arnaud Lothe\nFrance'}{'\n\n'}
          For any question about your data: contact@arnaudlothe.site
        </Body>
      </Section>

      <Section title="2. Data Collected">
        <Body>
          The app collects only the data strictly necessary for its operation:
        </Body>
        <BulletList items={[
          'Player nickname (optional) — freely entered, used only for the online leaderboard.',
          'Game scores and stats (rooms cleared, enemies killed, chosen class) — sent to the leaderboard only if you provided a nickname.',
          'Anonymous device identifier (UUID) — generated locally, used only to associate in-app purchases with your device. This identifier cannot personally identify you.',
          'Purchase data (product reference) — transmitted to Stripe for payment processing.',
        ]} />
        <Body>
          The app does NOT collect: email address, phone number, location, contacts, biometric data, or browsing history.
        </Body>
      </Section>

      <Section title="3. Legal Basis">
        <BulletList items={[
          'Online leaderboard (nickname + score) — legal basis: consent (nickname is optional).',
          'In-app purchases (UUID + product reference) — legal basis: contract performance (required to deliver your purchase).',
          'Game improvement (aggregated statistics) — legal basis: legitimate interest.',
        ]} />
      </Section>

      <Section title="4. Third-Party Processors">
        <Body>
          Your data may be processed by the following sub-processors:
        </Body>
        <BulletList items={[
          'Supabase (database & API) — hosted on AWS. Privacy: supabase.com/privacy',
          'Stripe (payments) — PCI DSS certified. Privacy: stripe.com/privacy',
        ]} />
      </Section>

      <Section title="5. Data Retention">
        <BulletList items={[
          'Nickname and scores: retained as long as the leaderboard is active, deleted upon request.',
          'Device UUID: stored locally on your device (AsyncStorage). Deleted when you uninstall the app.',
          'Purchase data: retained as required by law (5 years for accounting purposes).',
        ]} />
      </Section>

      <Section title="6. Your Rights (GDPR)">
        <Body>
          Under the General Data Protection Regulation (GDPR), you have the following rights:
        </Body>
        <BulletList items={[
          'Right of access',
          'Right to rectification',
          'Right to erasure ("right to be forgotten")',
          'Right to data portability',
          'Right to object to processing',
        ]} />
        <Body>
          To exercise these rights, contact us at: contact@arnaudlothe.site{'\n\n'}
          You may also lodge a complaint with your national data protection authority (in France: cnil.fr).
        </Body>
      </Section>

      <Section title="7. Cookies & Trackers">
        <Body>
          The app does not use cookies. The device UUID is a local technical identifier, not shared for advertising purposes.
        </Body>
      </Section>

      <Section title="8. Security">
        <Body>
          All transmitted data is protected by TLS encryption. Database access is secured through Supabase Row Level Security (RLS) policies.
        </Body>
      </Section>

      <Section title="9. Changes">
        <Body>
          This policy may be updated. The current version is always accessible from the app Settings. In case of substantial changes, a notification will be displayed in the app.
        </Body>
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

function Body({ children }) {
  return <Text style={styles.body}>{children}</Text>;
}

function BulletList({ items }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
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
  updated: { color: PALETTE.textDim, fontSize: 11 },

  content: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },

  section: { gap: 8 },
  sectionTitle: {
    color:       PALETTE.textPrimary,
    fontSize:    14,
    fontWeight:  'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  body: {
    color:      PALETTE.textMuted,
    fontSize:   13,
    lineHeight: 21,
  },
  bulletList:  { gap: 6, paddingLeft: 4 },
  bulletRow:   { flexDirection: 'row', gap: 8 },
  bullet:      { color: PALETTE.textMuted, fontSize: 13, lineHeight: 21, width: 12 },
  bulletText:  { flex: 1, color: PALETTE.textMuted, fontSize: 13, lineHeight: 21 },
});
