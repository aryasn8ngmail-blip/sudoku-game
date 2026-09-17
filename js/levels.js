// js/levels.js - 200 story levels, Endless config & progress tracking
import { generate, difficultyFromLevel } from './engine.js';
import { safeGet, safeSet } from './storage.js';

const PROGRESS_KEY = 'progress';
const ENDLESS_STATS_KEY = 'endless.stats';

export const LEVEL_CONFIGS = {};

// Build configurations for 200 progressive levels
for (let id = 1; id <= 200; id++) {
  let holes = 32;
  let maxHints = 5;

  if (id <= 30) {
    // Easy: 32-37 empty cells
    const ratio = (id - 1) / 29;
    holes = Math.round(32 + ratio * 5);
    maxHints = 5;
  } else if (id <= 80) {
    // Medium: 38-45 empty cells
    const ratio = (id - 31) / 49;
    holes = Math.round(38 + ratio * 7);
    maxHints = id <= 50 ? 5 : 4;
  } else if (id <= 140) {
    // Hard: 46-52 empty cells
    const ratio = (id - 81) / 59;
    holes = Math.round(46 + ratio * 6);
    maxHints = id <= 120 ? 4 : 3;
  } else {
    // Expert: 53-58 empty cells
    const ratio = (id - 141) / 59;
    holes = Math.round(53 + ratio * 5);
    maxHints = id <= 170 ? 3 : 2;
  }

  LEVEL_CONFIGS[id] = {
    id,
    tier: difficultyFromLevel(id),
    holes,
    maxHints,
    seed: id * 7919
  };
}

export const ENDLESS_DIFFICULTIES = {
  easy: { name: 'Easy', holes: 35, maxHints: 5, color: '#22c55e' },
  medium: { name: 'Medium', holes: 42, maxHints: 4, color: '#4f8cff' },
  hard: { name: 'Hard', holes: 49, maxHints: 3, color: '#f59e0b' },
  expert: { name: 'Expert', holes: 56, maxHints: 2, color: '#ef4444' }
};

export function getProgress() {
  return safeGet(PROGRESS_KEY, {});
}

export function saveLevelProgress(levelId, timeSec, stars) {
  const current = getProgress();
  const existing = current[levelId] || {};

  const updated = {
    done: true,
    stars: Math.max(existing.stars || 0, stars),
    bestTime: existing.bestTime ? Math.min(existing.bestTime, timeSec) : timeSec
  };

  current[levelId] = updated;
  safeSet(PROGRESS_KEY, current);
  return current;
}

export function isLevelUnlocked(levelId) {
  if (levelId === 1) return true;
  const progress = getProgress();
  return Boolean(progress[levelId - 1] && progress[levelId - 1].done);
}

export function getEndlessStats() {
  const defaultStats = {
    easy: { played: 0, won: 0, bestTime: null },
    medium: { played: 0, won: 0, bestTime: null },
    hard: { played: 0, won: 0, bestTime: null },
    expert: { played: 0, won: 0, bestTime: null }
  };
  return safeGet(ENDLESS_STATS_KEY, defaultStats);
}

export function recordEndlessStart(difficulty) {
  const stats = getEndlessStats();
  if (!stats[difficulty]) {
    stats[difficulty] = { played: 0, won: 0, bestTime: null };
  }
  stats[difficulty].played += 1;
  safeSet(ENDLESS_STATS_KEY, stats);
  return stats;
}

export function recordEndlessWin(difficulty, timeSec) {
  const stats = getEndlessStats();
  if (!stats[difficulty]) {
    stats[difficulty] = { played: 1, won: 0, bestTime: null };
  }
  const diffStats = stats[difficulty];
  diffStats.won += 1;
  if (diffStats.bestTime === null || timeSec < diffStats.bestTime) {
    diffStats.bestTime = timeSec;
  }
  safeSet(ENDLESS_STATS_KEY, stats);
  return stats;
}

export function getPuzzleForLevel(levelId) {
  const config = LEVEL_CONFIGS[levelId];
  if (!config) throw new Error(`Invalid level ID: ${levelId}`);
  return generate(config.holes, config.seed);
}

export function getPuzzleForEndless(difficulty) {
  const config = ENDLESS_DIFFICULTIES[difficulty];
  if (!config) throw new Error(`Invalid difficulty: ${difficulty}`);
  const seed = Date.now();
  return generate(config.holes, seed);
}
