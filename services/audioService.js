/**
 * RIFT — Audio Service
 * Gestion de la musique d'ambiance et des effets sonores.
 * Utilise expo-av. Tous les fichiers audio sont chargés en avance (preload).
 */

import { Audio } from 'expo-av';

// ─── Catalogue des fichiers audio ─────────────────────────────────────────────

const MUSIC_FILES = {
  menu:     require('../assets/audio/music/menu.mp3'),
  combat:   require('../assets/audio/music/combat.mp3'),
  victory:  require('../assets/audio/music/victory.mp3'),
  gameover: require('../assets/audio/music/gameover.mp3'),
};

const SFX_FILES = {
  attack:       require('../assets/audio/sfx/attack.mp3'),
  hit:          require('../assets/audio/sfx/hit.mp3'),
  hit_player:   require('../assets/audio/sfx/hit_player.mp3'),
  enemy_death:  require('../assets/audio/sfx/enemy_death.mp3'),
  upgrade_pick: require('../assets/audio/sfx/upgrade_pick.mp3'),
  upgrade_buy:  require('../assets/audio/sfx/upgrade_buy.mp3'),
  fragment:     require('../assets/audio/sfx/fragment.mp3'),
  level_up:     require('../assets/audio/sfx/level_up.mp3'),
  boss_roar:    require('../assets/audio/sfx/boss_roar.mp3'),
  ui_click:     require('../assets/audio/sfx/ui_click.mp3'),
  ui_back:      require('../assets/audio/sfx/ui_back.mp3'),
  ui_confirm:   require('../assets/audio/sfx/ui_confirm.mp3'),
  heal:         require('../assets/audio/sfx/heal.mp3'),
  critical:     require('../assets/audio/sfx/critical.mp3'),
};

// ─── État interne ──────────────────────────────────────────────────────────────

let _currentMusic   = null;   // Sound object de la musique en cours
let _currentTrack   = null;   // Nom du track en cours
let _musicVolume    = 0.4;
let _sfxVolume      = 0.7;
let _initialized    = false;

// ─── Initialisation ────────────────────────────────────────────────────────────

export async function initAudio() {
  if (_initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS:  true,
      staysActiveInBackground: false,
      shouldDuckAndroid:     true,
    });
    _initialized = true;
  } catch (e) {
    console.warn('[Audio] init failed:', e.message);
  }
}

// ─── Musique ───────────────────────────────────────────────────────────────────

/**
 * Joue une musique en boucle. Ne recharge pas si le même track est déjà actif.
 * @param {'menu'|'combat'|'victory'|'gameover'} track
 */
export async function playMusic(track) {
  if (!_initialized) await initAudio();
  if (_currentTrack === track) return;

  await stopMusic();

  const file = MUSIC_FILES[track];
  if (!file) return;

  try {
    const { sound } = await Audio.Sound.createAsync(file, {
      isLooping:    true,
      volume:       _musicVolume,
      shouldPlay:   true,
    });
    _currentMusic = sound;
    _currentTrack = track;
  } catch (e) {
    console.warn('[Audio] playMusic failed:', e.message);
  }
}

export async function stopMusic() {
  if (!_currentMusic) return;
  try {
    await _currentMusic.stopAsync();
    await _currentMusic.unloadAsync();
  } catch (_) {}
  _currentMusic = null;
  _currentTrack = null;
}

export async function setMusicVolume(vol) {
  _musicVolume = Math.max(0, Math.min(1, vol));
  if (_currentMusic) {
    try { await _currentMusic.setVolumeAsync(_musicVolume); } catch (_) {}
  }
}

// ─── Effets sonores ────────────────────────────────────────────────────────────

/**
 * Joue un effet sonore (fire-and-forget, sans bloquer).
 * @param {keyof typeof SFX_FILES} sfx
 */
export async function playSfx(sfx) {
  if (!_initialized) await initAudio();
  const file = SFX_FILES[sfx];
  if (!file) return;

  try {
    const { sound } = await Audio.Sound.createAsync(file, {
      volume:     _sfxVolume,
      shouldPlay: true,
    });
    // Auto-déchargement quand terminé
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (e) {
    // Silencieux en prod — un SFX raté ne doit pas planter l'app
  }
}

export function setSfxVolume(vol) {
  _sfxVolume = Math.max(0, Math.min(1, vol));
}

// ─── Getters (pour les settings) ──────────────────────────────────────────────

export function getMusicVolume() { return _musicVolume; }
export function getSfxVolume()   { return _sfxVolume; }
