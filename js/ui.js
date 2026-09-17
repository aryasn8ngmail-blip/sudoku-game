// js/ui.js - Core UI renderer, navigation, interaction & service worker registration
import { Game } from './game.js';
import { getSettings, updateSettings, sfx, vibrate, unlockAudio } from './settings.js';
import { safeGet, safeSet, safeRemove } from './storage.js';
import { LEVEL_CONFIGS, ENDLESS_DIFFICULTIES, getProgress, saveLevelProgress, isLevelUnlocked, recordEndlessStart, recordEndlessWin, getPuzzleForLevel, getPuzzleForEndless } from './levels.js';
import { getStoryStats, updateStoryStats, checkAchievementsOnWin, formatTime, renderStats } from './stats.js';
import { ripple, popCell, shakeCell, confetti, toast } from './animations.js';

const SAVE_KEY = 'save';

let currentGame = null;
let selectedCell = null;
let isNotesMode = false;
let timerInterval = null;
let saveDebounceTimer = null;
let deferredInstallPrompt = null;
let levelsScrollPos = 0;

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');

  if (screenId === 'levels-screen') {
    const levelsContainer = document.getElementById('levels-container');
    if (levelsContainer) levelsContainer.scrollTop = levelsScrollPos;
  }
}

function syncSettingsUI() {
  const settings = getSettings();
  document.getElementById('toggle-sound').checked = settings.sound;
  document.getElementById('toggle-vibration').checked = settings.vibration;
  document.getElementById('toggle-highlight').checked = settings.highlight;
  document.getElementById('toggle-autonotes').checked = settings.autoNotes;
  document.getElementById('toggle-darkmode').checked = settings.darkMode;

  if (settings.darkMode) {
    document.body.removeAttribute('data-theme');
  } else {
    document.body.setAttribute('data-theme', 'light');
  }
}

function initEvents() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (btn) ripple(e, btn);
  });

  document.getElementById('btn-continue').addEventListener('click', () => { unlockAudio(); sfx.tap(); resumeSavedGame(); });
  document.getElementById('btn-story').addEventListener('click', () => { unlockAudio(); sfx.tap(); renderLevels(); showScreen('levels-screen'); });
  document.getElementById('btn-endless').addEventListener('click', () => { unlockAudio(); sfx.tap(); showScreen('endless-screen'); });
  document.getElementById('btn-stats').addEventListener('click', () => { unlockAudio(); sfx.tap(); renderStats(); showScreen('stats-screen'); });
  document.getElementById('btn-settings').addEventListener('click', () => { unlockAudio(); sfx.tap(); syncSettingsUI(); showScreen('settings-screen'); });

  document.getElementById('btn-levels-back').addEventListener('click', () => { sfx.tap(); showScreen('home-screen'); checkContinueButton(); });
  document.getElementById('btn-endless-back').addEventListener('click', () => { sfx.tap(); showScreen('home-screen'); checkContinueButton(); });
  document.getElementById('btn-settings-back').addEventListener('click', () => { sfx.tap(); showScreen('home-screen'); checkContinueButton(); });
  document.getElementById('btn-stats-back').addEventListener('click', () => { sfx.tap(); showScreen('home-screen'); checkContinueButton(); });

  document.getElementById('btn-game-back').addEventListener('click', () => {
    sfx.tap();
    pauseGameTimer();
    if (currentGame) currentGame.pause();
    saveCurrentGame();
    showScreen(currentGame.mode === 'story' ? 'levels-screen' : 'endless-screen');
    checkContinueButton();
  });

  document.getElementById('btn-game-pause').addEventListener('click', () => {
    sfx.tap();
    pauseGameTimer();
    if (currentGame) currentGame.pause();
    saveCurrentGame();
    document.getElementById('pause-modal').classList.remove('hidden');
  });

  document.getElementById('btn-pause-resume').addEventListener('click', () => {
    sfx.tap();
    document.getElementById('pause-modal').classList.add('hidden');
    if (currentGame) currentGame.resume();
    startGameTimer();
  });

  document.getElementById('btn-pause-restart').addEventListener('click', () => {
    sfx.tap();
    document.getElementById('pause-modal').classList.add('hidden');
    if (currentGame) {
      if (currentGame.mode === 'story') startStoryLevel(currentGame.levelId);
      else startEndlessGame(currentGame.difficulty);
    }
  });

  document.getElementById('btn-pause-quit').addEventListener('click', () => {
    sfx.tap();
    document.getElementById('pause-modal').classList.add('hidden');
    saveCurrentGame();
    showScreen(currentGame.mode === 'story' ? 'levels-screen' : 'endless-screen');
    checkContinueButton();
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (!currentGame) return;
    sfx.undo(); vibrate(10);
    if (currentGame.undo()) { renderBoard(); updateToolsAndNumpad(); saveCurrentGameThrottled(); }
  });

  document.getElementById('btn-erase').addEventListener('click', () => {
    if (!currentGame || !selectedCell) return;
    sfx.tap();
    const [r, c] = selectedCell;
    currentGame.erase(r, c);
    renderBoard(); updateToolsAndNumpad(); saveCurrentGameThrottled();
  });

  document.getElementById('btn-notes').addEventListener('click', () => {
    sfx.tap();
    isNotesMode = !isNotesMode;
    document.getElementById('btn-notes').classList.toggle('active', isNotesMode);
  });

  document.getElementById('btn-hint').addEventListener('click', () => {
    if (!currentGame) return;
    sfx.hint(); vibrate(15);
    const hintRes = currentGame.hint();
    if (hintRes) {
      selectedCell = [hintRes.r, hintRes.c];
      renderBoard();
      const cellEl = document.querySelector(`.cell[data-r="${hintRes.r}"][data-c="${hintRes.c}"]`);
      if (cellEl) popCell(cellEl);
      updateToolsAndNumpad();
      saveCurrentGameThrottled();
      if (hintRes.done) handleWin();
    }
  });

  document.querySelectorAll('.btn-num[data-num]').forEach(btn => {
    btn.addEventListener('click', () => handleNumberInput(parseInt(btn.getAttribute('data-num'), 10)));
  });

  document.getElementById('btn-num-erase').addEventListener('click', () => {
    if (!currentGame || !selectedCell) return;
    sfx.tap();
    const [r, c] = selectedCell;
    currentGame.erase(r, c);
    renderBoard(); updateToolsAndNumpad(); saveCurrentGameThrottled();
  });

  document.addEventListener('keydown', (e) => {
    const gameScreen = document.getElementById('game-screen');
    if (gameScreen.classList.contains('hidden') || !currentGame) return;
    if (e.key >= '1' && e.key <= '9') handleNumberInput(parseInt(e.key, 10));
    else if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectedCell) { currentGame.erase(selectedCell[0], selectedCell[1]); renderBoard(); updateToolsAndNumpad(); }
    } else if (e.key === 'n' || e.key === 'N') {
      isNotesMode = !isNotesMode;
      document.getElementById('btn-notes').classList.toggle('active', isNotesMode);
    } else if (e.key === 'u' || e.key === 'U') document.getElementById('btn-undo').click();
  });

  document.querySelectorAll('#endless-screen .btn-card[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => {
      unlockAudio(); sfx.tap();
      startEndlessGame(btn.getAttribute('data-diff'));
    });
  });

  document.getElementById('btn-win-next').addEventListener('click', () => {
    sfx.tap();
    document.getElementById('win-modal').classList.add('hidden');
    if (currentGame.mode === 'story') {
      const nextId = currentGame.levelId + 1;
      if (nextId <= 200) startStoryLevel(nextId);
      else showScreen('levels-screen');
    } else startEndlessGame(currentGame.difficulty);
  });

  document.getElementById('btn-win-levels').addEventListener('click', () => {
    sfx.tap();
    document.getElementById('win-modal').classList.add('hidden');
    showScreen(currentGame.mode === 'story' ? 'levels-screen' : 'endless-screen');
    checkContinueButton();
  });

  document.getElementById('toggle-sound').addEventListener('change', (e) => updateSettings({ sound: e.target.checked }));
  document.getElementById('toggle-vibration').addEventListener('change', (e) => updateSettings({ vibration: e.target.checked }));
  document.getElementById('toggle-highlight').addEventListener('change', (e) => { updateSettings({ highlight: e.target.checked }); if (currentGame) renderBoard(); });
  document.getElementById('toggle-autonotes').addEventListener('change', (e) => updateSettings({ autoNotes: e.target.checked }));
  document.getElementById('toggle-darkmode').addEventListener('change', (e) => { updateSettings({ darkMode: e.target.checked }); syncSettingsUI(); });

  document.getElementById('btn-reset-progress').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset all story progress and statistics?")) {
      safeRemove('progress'); safeRemove('endless.stats'); safeRemove('stats.story'); safeRemove('save');
      toast("Progress Reset"); syncSettingsUI(); checkContinueButton();
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!safeGet('installBannerDismissed', false)) {
      document.getElementById('install-banner').classList.remove('hidden');
    }
  });

  document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      document.getElementById('install-banner').classList.add('hidden');
    }
  });

  document.getElementById('dismiss-install-btn').addEventListener('click', () => {
    safeSet('installBannerDismissed', true);
    document.getElementById('install-banner').classList.add('hidden');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (currentGame && !currentGame.isFinished) { pauseGameTimer(); currentGame.pause(); saveCurrentGame(); }
    } else {
      const gScr = document.getElementById('game-screen');
      const pMod = document.getElementById('pause-modal');
      const wMod = document.getElementById('win-modal');
      if (!gScr.classList.contains('hidden') && pMod.classList.contains('hidden') && wMod.classList.contains('hidden') && currentGame) {
        currentGame.resume(); startGameTimer();
      }
    }
  });
}

function handleNumberInput(val) {
  if (!currentGame || !selectedCell) return;
  const [r, c] = selectedCell;

  if (isNotesMode) {
    sfx.tap(); currentGame.toggleNote(r, c, val); renderBoard(); saveCurrentGameThrottled();
  } else {
    const res = currentGame.place(r, c, val);
    const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);

    if (res.error) {
      sfx.error(); vibrate([30, 40, 30]);
      if (cellEl) shakeCell(cellEl);
      renderBoard(); updateToolsAndNumpad();
      if (res.gameOver) {
        setTimeout(() => {
          alert("Game Over! You made 3 mistakes.");
          safeRemove(SAVE_KEY);
          showScreen(currentGame.mode === 'story' ? 'levels-screen' : 'endless-screen');
          checkContinueButton();
        }, 100);
      }
    } else if (res.ok) {
      sfx.place(); vibrate(10);
      if (cellEl) popCell(cellEl);
      renderBoard(); updateToolsAndNumpad(); saveCurrentGameThrottled();
      if (res.done) handleWin();
    }
  }
}

function handleWin() {
  pauseGameTimer(); sfx.win(); vibrate([20, 40, 20, 40, 20]); safeRemove(SAVE_KEY);
  const timeSec = Math.floor(currentGame.elapsed() / 1000);
  const starsCount = currentGame.stars();

  if (currentGame.mode === 'story') {
    saveLevelProgress(currentGame.levelId, timeSec, starsCount);
    updateStoryStats(LEVEL_CONFIGS[currentGame.levelId].tier, timeSec, currentGame.mistakes === 0);
  } else recordEndlessWin(currentGame.difficulty, timeSec);

  checkAchievementsOnWin(currentGame, timeSec);

  const winModal = document.getElementById('win-modal');
  const winTitle = document.getElementById('win-title');
  const winStars = document.getElementById('win-stars');
  const winNextBtn = document.getElementById('btn-win-next');
  const winLevelsBtn = document.getElementById('btn-win-levels');

  if (currentGame.mode === 'story') {
    winTitle.textContent = `Level ${currentGame.levelId} Completed!`;
    winStars.textContent = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
    winNextBtn.textContent = 'Next Level'; winLevelsBtn.textContent = 'Back to Levels';
  } else {
    winTitle.textContent = `${ENDLESS_DIFFICULTIES[currentGame.difficulty].name} Completed!`;
    winStars.textContent = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
    winNextBtn.textContent = 'Play Again'; winLevelsBtn.textContent = 'Change Difficulty';
  }

  document.getElementById('win-time').textContent = formatTime(timeSec);
  document.getElementById('win-mistakes').textContent = `${currentGame.mistakes}/3`;
  winModal.classList.remove('hidden');
  confetti(winModal);
}

function startGameTimer() {
  pauseGameTimer();
  timerInterval = setInterval(() => {
    if (currentGame) {
      document.getElementById('game-timer').textContent = formatTime(Math.floor(currentGame.elapsed() / 1000));
    }
  }, 1000);
}

function pauseGameTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

function saveCurrentGame() { if (currentGame && !currentGame.isFinished) safeSet(SAVE_KEY, currentGame.toJSON()); }

function saveCurrentGameThrottled() {
  if (saveDebounceTimer) return;
  saveDebounceTimer = setTimeout(() => { saveDebounceTimer = null; saveCurrentGame(); }, 500);
}

function checkContinueButton() {
  const saved = safeGet(SAVE_KEY, null);
  document.getElementById('btn-continue').classList.toggle('hidden', !(saved && !saved.isFinished));
}

function resumeSavedGame() {
  const savedData = safeGet(SAVE_KEY, null);
  if (!savedData) return;
  currentGame = Game.fromJSON(savedData);
  if (currentGame) { currentGame.resume(); launchGameScreen(); }
}

function showLoadingOverlay() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoadingOverlay() { document.getElementById('loading-overlay').classList.add('hidden'); }

function startStoryLevel(levelId) {
  showLoadingOverlay();
  setTimeout(() => {
    const puzzleData = getPuzzleForLevel(levelId);
    const config = LEVEL_CONFIGS[levelId];
    currentGame = new Game({ mode: 'story', levelId, puzzle: puzzleData.puzzle, solution: puzzleData.solution, maxHints: config.maxHints });
    hideLoadingOverlay(); launchGameScreen();
  }, 50);
}

function startEndlessGame(difficulty) {
  showLoadingOverlay();
  setTimeout(() => {
    const puzzleData = getPuzzleForEndless(difficulty);
    const config = ENDLESS_DIFFICULTIES[difficulty];
    recordEndlessStart(difficulty);
    currentGame = new Game({ mode: 'endless', difficulty, puzzle: puzzleData.puzzle, solution: puzzleData.solution, maxHints: config.maxHints });
    hideLoadingOverlay(); launchGameScreen();
  }, 50);
}

function launchGameScreen() {
  selectedCell = null; isNotesMode = false;
  document.getElementById('btn-notes').classList.remove('active');
  const labelEl = document.getElementById('game-level-label');
  labelEl.textContent = currentGame.mode === 'story' ? `Level ${currentGame.levelId}` : `${ENDLESS_DIFFICULTIES[currentGame.difficulty].name}`;
  renderBoard(); updateToolsAndNumpad(); showScreen('game-screen'); startGameTimer(); saveCurrentGame();
}

function renderBoard() {
  const boardContainer = document.getElementById('sudoku-board');
  boardContainer.innerHTML = '';
  if (!currentGame) return;

  const settings = getSettings();
  const selR = selectedCell ? selectedCell[0] : -1;
  const selC = selectedCell ? selectedCell[1] : -1;
  const selVal = (selectedCell && currentGame.board[selR][selC] !== 0) ? currentGame.board[selR][selC] : 0;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell'; cell.setAttribute('data-r', r); cell.setAttribute('data-c', c);
      const isPrefilled = currentGame.puzzle[r][c] !== 0;
      const currentVal = currentGame.board[r][c];

      if (isPrefilled) { cell.classList.add('prefilled'); cell.textContent = currentVal; }
      else if (currentVal !== 0) {
        cell.classList.add('user');
        if (currentVal !== currentGame.solution[r][c]) cell.classList.add('error');
        cell.textContent = currentVal;
      } else {
        const notesSet = currentGame.notes[r][c];
        if (notesSet && notesSet.size > 0) {
          const notesGrid = document.createElement('div');
          notesGrid.className = 'notes-grid';
          for (let n = 1; n <= 9; n++) {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            if (notesSet.has(n)) noteItem.textContent = n;
            notesGrid.appendChild(noteItem);
          }
          cell.appendChild(notesGrid);
        }
      }

      if (r === selR && c === selC) cell.classList.add('selected');
      else if (selectedCell && (r === selR || c === selC || (Math.floor(r / 3) === Math.floor(selR / 3) && Math.floor(c / 3) === Math.floor(selC / 3)))) {
        if (settings.highlight) cell.classList.add('peer');
      }
      if (settings.highlight && selVal !== 0 && currentVal === selVal && !(r === selR && c === selC)) cell.classList.add('same');

      cell.addEventListener('click', () => { sfx.tap(); selectedCell = [r, c]; renderBoard(); });
      boardContainer.appendChild(cell);
    }
  }

  const progressPct = Math.round((currentGame.getFilledCount() / 81) * 100);
  document.getElementById('game-progress-bar').style.width = `${progressPct}%`;
  document.getElementById('game-timer').textContent = formatTime(Math.floor(currentGame.elapsed() / 1000));
  document.getElementById('game-mistakes').textContent = `✕ ${currentGame.mistakes}/3`;
}

function updateToolsAndNumpad() {
  if (!currentGame) return;
  const hintCount = document.getElementById('hint-count');
  hintCount.textContent = currentGame.hintsLeft;
  const hintBtn = document.getElementById('btn-hint');
  hintBtn.classList.toggle('btn-pulse', currentGame.hintsLeft > 0);
  hintBtn.style.opacity = currentGame.hintsLeft > 0 ? '1' : '0.4';

  const counts = currentGame.getDigitCounts();
  for (let num = 1; num <= 9; num++) {
    const btn = document.querySelector(`.btn-num[data-num="${num}"]`);
    if (btn) btn.classList.toggle('dimmed', counts[num] >= 9);
  }
}

function renderLevels() {
  const container = document.getElementById('levels-container');
  container.innerHTML = '';
  const progress = getProgress();
  const tiers = [
    { name: 'Easy', badge: 'badge-easy', start: 1, end: 30 },
    { name: 'Medium', badge: 'badge-medium', start: 31, end: 80 },
    { name: 'Hard', badge: 'badge-hard', start: 81, end: 140 },
    { name: 'Expert', badge: 'badge-expert', start: 141, end: 200 }
  ];

  tiers.forEach(tier => {
    const section = document.createElement('div');
    section.className = 'tier-section';
    section.innerHTML = `<div class="tier-header"><span>${tier.name}</span><span class="tier-badge ${tier.badge}">Levels ${tier.start}–${tier.end}</span></div>`;
    const grid = document.createElement('div');
    grid.className = 'levels-grid';

    for (let id = tier.start; id <= tier.end; id++) {
      const lvlBtn = document.createElement('button');
      lvlBtn.className = 'btn level-btn';
      const unlocked = isLevelUnlocked(id);
      const lvlData = progress[id];

      if (!unlocked) {
        lvlBtn.classList.add('locked');
        lvlBtn.innerHTML = `<span class="level-num">${id}</span><span class="level-stars">🔒</span>`;
      } else {
        if (lvlData && lvlData.done) {
          lvlBtn.classList.add('completed');
          const stars = '★'.repeat(lvlData.stars) + '☆'.repeat(3 - lvlData.stars);
          lvlBtn.innerHTML = `<span class="level-num">${id}</span><span class="level-stars">${stars}</span>`;
        } else {
          lvlBtn.classList.add('current');
          lvlBtn.innerHTML = `<span class="level-num">${id}</span><span class="level-stars">☆☆☆</span>`;
        }
        lvlBtn.addEventListener('click', () => { unlockAudio(); sfx.tap(); levelsScrollPos = container.scrollTop; startStoryLevel(id); });
      }
      grid.appendChild(lvlBtn);
    }
    section.appendChild(grid);
    container.appendChild(section);
  });
}

window.addEventListener('load', () => {
  syncSettingsUI(); initEvents(); checkContinueButton();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('[PWA] ServiceWorker registered:', reg.scope);
    }).catch(err => console.warn('[PWA] ServiceWorker registration failed:', err));
  }
});
