// js/game.js - Core Game class for Sudoku state, moves, undo, hints, notes
import { getSettings } from './settings.js';

export class Game {
  constructor(options = {}) {
    this.mode = options.mode || 'story'; // 'story' | 'endless'
    this.levelId = options.levelId || null;
    this.difficulty = options.difficulty || 'easy';

    // 9x9 grid arrays
    this.puzzle = options.puzzle || Array.from({ length: 9 }, () => Array(9).fill(0));
    this.solution = options.solution || Array.from({ length: 9 }, () => Array(9).fill(0));
    this.board = options.board ? options.board.map(r => [...r]) : this.puzzle.map(r => [...r]);

    // Notes: 9x9 array of Sets (or converted array)
    if (options.notes) {
      this.notes = options.notes.map(r => r.map(c => new Set(c)));
    } else {
      this.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    }

    this.mistakes = options.mistakes || 0;
    this.maxMistakes = 3;
    this.hintsLeft = options.hintsLeft !== undefined ? options.hintsLeft : (options.maxHints || 3);

    this.history = options.history ? [...options.history] : []; // Max 100 entries

    this.startTime = options.startTime || Date.now();
    this.pausedAt = options.pausedAt || null;
    this.pausedMs = options.pausedMs || 0;

    this.isFinished = options.isFinished || false;
  }

  elapsed() {
    if (this.isFinished) {
      return this.savedElapsed || (Date.now() - this.startTime - this.pausedMs);
    }
    const currentPause = this.pausedAt ? (Date.now() - this.pausedAt) : 0;
    return Math.max(0, Date.now() - this.startTime - this.pausedMs - currentPause);
  }

  pause() {
    if (!this.pausedAt && !this.isFinished) {
      this.pausedAt = Date.now();
    }
  }

  resume() {
    if (this.pausedAt) {
      this.pausedMs += (Date.now() - this.pausedAt);
      this.pausedAt = null;
    }
  }

  // Clone notes for snapshotting history
  _cloneNotes() {
    return this.notes.map(row => row.map(set => Array.from(set)));
  }

  _pushHistory(entry) {
    this.history.push({
      ...entry,
      notesSnapshot: this._cloneNotes()
    });
    if (this.history.length > 100) {
      this.history.shift();
    }
  }

  place(r, c, val) {
    if (this.isFinished) return { error: false };
    if (this.puzzle[r][c] !== 0) return { error: false }; // Prefilled cell cannot be changed
    if (this.board[r][c] === val) return { ok: true, done: this._isSolved() }; // Same value

    const prevVal = this.board[r][c];

    if (val !== this.solution[r][c]) {
      this.mistakes += 1;
      this._pushHistory({ type: 'place_err', r, c, prevVal, val });
      const gameOver = this.mistakes >= this.maxMistakes;
      if (gameOver) {
        this.isFinished = true;
      }
      return { error: true, gameOver, mistakes: this.mistakes };
    }

    // Correct placement
    this._pushHistory({ type: 'place', r, c, prevVal, val });
    this.board[r][c] = val;
    this.notes[r][c].clear();

    const settings = getSettings();
    if (settings.autoNotes) {
      this._autoRemoveNotes(r, c, val);
    }

    const done = this._isSolved();
    if (done) {
      this.isFinished = true;
      this.savedElapsed = this.elapsed();
    }

    return { ok: true, done };
  }

  _autoRemoveNotes(r, c, val) {
    for (let i = 0; i < 9; i++) {
      this.notes[r][i].delete(val);
      this.notes[i][c].delete(val);
    }
    const boxR = Math.floor(r / 3) * 3;
    const boxC = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        this.notes[boxR + i][boxC + j].delete(val);
      }
    }
  }

  toggleNote(r, c, val) {
    if (this.isFinished) return;
    if (this.puzzle[r][c] !== 0 || this.board[r][c] !== 0) return;

    this._pushHistory({ type: 'note', r, c });
    if (this.notes[r][c].has(val)) {
      this.notes[r][c].delete(val);
    } else {
      this.notes[r][c].add(val);
    }
  }

  erase(r, c) {
    if (this.isFinished) return;
    if (this.puzzle[r][c] !== 0) return;
    if (this.board[r][c] === 0 && this.notes[r][c].size === 0) return;

    this._pushHistory({ type: 'erase', r, c, prevVal: this.board[r][c] });
    this.board[r][c] = 0;
    this.notes[r][c].clear();
  }

  undo() {
    if (this.isFinished || this.history.length === 0) return false;

    const last = this.history.pop();
    this.board[last.r][last.c] = last.prevVal !== undefined ? last.prevVal : 0;

    // Restore notes from snapshot
    if (last.notesSnapshot) {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          this.notes[r][c] = new Set(last.notesSnapshot[r][c]);
        }
      }
    }
    return true;
  }

  hint() {
    if (this.isFinished || this.hintsLeft <= 0) return null;

    // Find all empty or incorrect cells
    const targetCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.puzzle[r][c] === 0 && this.board[r][c] !== this.solution[r][c]) {
          targetCells.push([r, c]);
        }
      }
    }

    if (targetCells.length === 0) return null;

    // Select a cell
    const [r, c] = targetCells[Math.floor(Math.random() * targetCells.length)];
    const correctVal = this.solution[r][c];

    this.hintsLeft -= 1;
    this._pushHistory({ type: 'hint', r, c, prevVal: this.board[r][c], val: correctVal });

    this.board[r][c] = correctVal;
    this.notes[r][c].clear();

    const settings = getSettings();
    if (settings.autoNotes) {
      this._autoRemoveNotes(r, c, correctVal);
    }

    const done = this._isSolved();
    if (done) {
      this.isFinished = true;
      this.savedElapsed = this.elapsed();
    }

    return { r, c, val: correctVal, done };
  }

  _isSolved() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] !== this.solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  stars() {
    if (this.mistakes === 0) return 3;
    if (this.mistakes === 1) return 2;
    return 1;
  }

  getFilledCount() {
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] !== 0) count++;
      }
    }
    return count;
  }

  getDigitCounts() {
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = this.board[r][c];
        if (val >= 1 && val <= 9) counts[val]++;
      }
    }
    return counts;
  }

  toJSON() {
    return {
      mode: this.mode,
      levelId: this.levelId,
      difficulty: this.difficulty,
      puzzle: this.puzzle,
      solution: this.solution,
      board: this.board,
      notes: this.notes.map(r => r.map(c => Array.from(c))),
      mistakes: this.mistakes,
      hintsLeft: this.hintsLeft,
      history: this.history,
      startTime: this.startTime,
      pausedAt: this.pausedAt,
      pausedMs: this.pausedMs,
      isFinished: this.isFinished,
      savedElapsed: this.savedElapsed
    };
  }

  static fromJSON(json) {
    if (!json) return null;
    return new Game(json);
  }
}
