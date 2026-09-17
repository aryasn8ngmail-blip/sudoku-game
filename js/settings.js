// js/settings.js - WebAudio synth, Vibration guard, and Settings management
import { safeGet, safeSet } from './storage.js';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  highlight: true,
  autoNotes: true,
  darkMode: true
};

let settingsState = { ...DEFAULT_SETTINGS, ...safeGet(SETTINGS_KEY, {}) };

export function getSettings() {
  return { ...settingsState };
}

export function updateSettings(newSettings) {
  settingsState = { ...settingsState, ...newSettings };
  safeSet(SETTINGS_KEY, settingsState);
  return settingsState;
}

// WebAudio SFX Engine
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Attach gesture listener automatically
if (typeof document !== 'undefined') {
  const initAudioOnGesture = () => {
    unlockAudio();
    document.body.removeEventListener('touchstart', initAudioOnGesture);
    document.body.removeEventListener('click', initAudioOnGesture);
  };
  document.body.addEventListener('touchstart', initAudioOnGesture, { once: true });
  document.body.addEventListener('click', initAudioOnGesture, { once: true });
}

function playTone(freqs, type = 'sine', duration = 0.1, gainVal = 0.05) {
  if (!settingsState.sound) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    if (Array.isArray(freqs)) {
      freqs.forEach((f, idx) => {
        osc.frequency.setValueAtTime(f.freq, now + (f.time || 0));
      });
    } else {
      osc.frequency.setValueAtTime(freqs, now);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    // Audio errors fail gracefully
  }
}

export const sfx = {
  tap() {
    playTone(400, 'sine', 0.04, 0.03);
  },
  place() {
    playTone([{ freq: 523.25, time: 0 }, { freq: 659.25, time: 0.04 }], 'sine', 0.1, 0.05);
  },
  error() {
    playTone([{ freq: 220, time: 0 }, { freq: 180, time: 0.05 }], 'sawtooth', 0.15, 0.05);
  },
  win() {
    playTone([
      { freq: 523.25, time: 0 },
      { freq: 659.25, time: 0.08 },
      { freq: 783.99, time: 0.16 },
      { freq: 1046.50, time: 0.24 }
    ], 'triangle', 0.35, 0.06);
  },
  achievement() {
    playTone([
      { freq: 587.33, time: 0 },
      { freq: 880.00, time: 0.1 }
    ], 'triangle', 0.25, 0.05);
  },
  hint() {
    playTone([{ freq: 880, time: 0 }, { freq: 1174.66, time: 0.06 }], 'sine', 0.12, 0.04);
  },
  undo() {
    playTone([{ freq: 350, time: 0 }, { freq: 280, time: 0.04 }], 'sine', 0.08, 0.04);
  }
};

export function vibrate(pattern) {
  if (!settingsState.vibration) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      // Guard against vibration failure
    }
  }
}
