const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclure le dossier supabase/ (fonctions Deno TypeScript) du bundler Metro
config.resolver.blockList = [
  /supabase[\\/]functions[\\/].*/,
];

module.exports = config;
