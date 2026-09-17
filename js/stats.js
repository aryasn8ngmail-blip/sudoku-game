// js/stats.js - Statistics tracking, achievements and stats screen renderer
import { safeGet, safeSet } from './storage.js';
import { getProgress, getEndlessStats, ENDLESS_DIFFICULTIES } from './levels.js';
import { sfx, vibrate } from './settings.js';
import { toast } from './animations.js';

const STATS_KEY = 'stats.story';

export function getStoryStats() {
  return safeGet(STATS_KEY, {
    totalPlayTime: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestTimes: { easy: null, medium: null, hard: null, expert: null }
  });
}

export function updateStoryStats(tier, timeSec, noMistakes) {
  const stats = getStoryStats();
  stats.totalPlayTime += timeSec;

  if (noMistakes) {
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.currentStreak = 0;
  }

  if (stats.bestTimes[tier] === null || timeSec < stats.bestTimes[tier]) {
    stats.bestTimes[tier] = timeSec;
  }

  safeSet(STATS_KEY, stats);
  return stats;
}

export function checkAchievementsOnWin(game, timeSec) {
  const progress = getProgress();
  const completedCount = Object.keys(progress).length;

  if (game.mode === 'story') {
    if (game.levelId === 1 && completedCount === 1) {
      toast("🏆 First Win!");
      sfx.achievement();
      vibrate([15, 30, 15]);
    }
    if (completedCount === 100) {
      toast("🏆 Halfway There!");
      sfx.achievement();
      vibrate([15, 30, 15]);
    }
    if (completedCount === 200) {
      toast("🏆 Sudoku Master!");
      sfx.achievement();
      vibrate([15, 30, 15]);
    }
  }

  if (game.mistakes === 0) {
    toast("⭐ No Mistakes!");
    sfx.achievement();
    vibrate([15, 30, 15]);
  }

  if (timeSec < 180) {
    toast("⚡ Speed Demon!");
    sfx.achievement();
    vibrate([15, 30, 15]);
  }

  const storyStats = getStoryStats();
  if (storyStats.currentStreak === 5) {
    toast("🔥 5 Level Streak!");
    sfx.achievement();
    vibrate([15, 30, 15]);
  }
}

export function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;
  container.innerHTML = '';

  const progress = getProgress();
  const storyStats = getStoryStats();
  const endlessStats = getEndlessStats();

  const completedCount = Object.keys(progress).length;
  const totalPlayTimeMin = Math.round(storyStats.totalPlayTime / 60);

  // Story Card
  const storyCard = document.createElement('div');
  storyCard.className = 'stats-card';
  storyCard.innerHTML = `
    <h3>Story Mode Progress</h3>
    <div class="stats-row"><span>Levels Completed</span><span>${completedCount} / 200</span></div>
    <div class="stats-row"><span>Current Win Streak</span><span>${storyStats.currentStreak}</span></div>
    <div class="stats-row"><span>Best Win Streak</span><span>${storyStats.bestStreak}</span></div>
    <div class="stats-row"><span>Total Play Time</span><span>${totalPlayTimeMin} mins</span></div>
    <div class="stats-row"><span>Best Time (Easy)</span><span>${storyStats.bestTimes.easy ? formatTime(storyStats.bestTimes.easy) : '--:--'}</span></div>
    <div class="stats-row"><span>Best Time (Medium)</span><span>${storyStats.bestTimes.medium ? formatTime(storyStats.bestTimes.medium) : '--:--'}</span></div>
    <div class="stats-row"><span>Best Time (Hard)</span><span>${storyStats.bestTimes.hard ? formatTime(storyStats.bestTimes.hard) : '--:--'}</span></div>
    <div class="stats-row"><span>Best Time (Expert)</span><span>${storyStats.bestTimes.expert ? formatTime(storyStats.bestTimes.expert) : '--:--'}</span></div>
  `;
  container.appendChild(storyCard);

  // Endless Card
  const endlessCard = document.createElement('div');
  endlessCard.className = 'stats-card';
  let endlessRows = '<h3>Endless Mode Stats</h3>';
  ['easy', 'medium', 'hard', 'expert'].forEach(d => {
    const st = endlessStats[d] || { played: 0, won: 0, bestTime: null };
    const name = ENDLESS_DIFFICULTIES[d].name;
    const timeStr = st.bestTime ? formatTime(st.bestTime) : '--:--';
    endlessRows += `<div class="stats-row"><span>${name}</span><span>${st.won}/${st.played} won (Best: ${timeStr})</span></div>`;
  });
  endlessCard.innerHTML = endlessRows;
  container.appendChild(endlessCard);
}
