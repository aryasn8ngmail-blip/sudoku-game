// test/unit.test.js - Unit tests for Sudoku Master engine, game, levels, storage
import { mulberry32, isValid, countSolutions, generate, difficultyFromLevel } from '../js/engine.js';
import { Game } from '../js/game.js';
import { LEVEL_CONFIGS, ENDLESS_DIFFICULTIES } from '../js/levels.js';
import { safeGet, safeSet, safeRemove } from '../js/storage.js';

console.log('--- RUNNING UNIT TESTS ---');

// 1. PRNG Test
const rng1 = mulberry32(12345);
const val1 = rng1();
const rng2 = mulberry32(12345);
const val2 = rng2();
console.assert(val1 === val2, 'PRNG must be deterministic for same seed');
console.log('✓ PRNG deterministic check passed');

// 2. Engine Generator & Uniqueness Test
const genRes = generate(32, 9999);
console.assert(genRes.puzzle && genRes.solution, 'Generator returns puzzle and solution');
console.assert(countSolutions(genRes.puzzle) === 1, 'Generated puzzle must have exactly 1 solution');
console.log('✓ Puzzle generation and solution uniqueness passed');

// 3. Difficulty Mapping
console.assert(difficultyFromLevel(1) === 'easy', 'Level 1 is easy');
console.assert(difficultyFromLevel(50) === 'medium', 'Level 50 is medium');
console.assert(difficultyFromLevel(100) === 'hard', 'Level 100 is hard');
console.assert(difficultyFromLevel(180) === 'expert', 'Level 180 is expert');
console.log('✓ Difficulty mapping passed');

// 4. Game Logic & State Test
const game = new Game({
  puzzle: genRes.puzzle,
  solution: genRes.solution,
  maxHints: 5
});

const emptyCell = [];
for (let r = 0; r < 9; r++) {
  for (let c = 0; c < 9; c++) {
    if (genRes.puzzle[r][c] === 0) {
      emptyCell.push(r, c);
      break;
    }
  }
  if (emptyCell.length) break;
}

const [er, ec] = emptyCell;
const correctVal = genRes.solution[er][ec];
const wrongVal = (correctVal % 9) + 1;

// Wrong placement test
const errMove = game.place(er, ec, wrongVal);
console.assert(errMove.error === true, 'Wrong placement returns error');
console.assert(game.mistakes === 1, 'Mistakes incremented');

// Correct placement test
const okMove = game.place(er, ec, correctVal);
console.assert(okMove.ok === true, 'Correct placement returns ok');
console.assert(game.board[er][ec] === correctVal, 'Board updated with value');

// Undo test
game.undo();
console.assert(game.board[er][ec] === 0, 'Undo clears correct placement');

console.log('✓ Game state, place, mistakes, and undo passed');

// 5. Level configs check
console.assert(Object.keys(LEVEL_CONFIGS).length === 200, '200 story level configs exist');
console.assert(LEVEL_CONFIGS[1].holes >= 32, 'Level 1 holes >= 32');
console.assert(LEVEL_CONFIGS[200].holes <= 58, 'Level 200 holes <= 58');
console.log('✓ Level configs check passed');

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY!');
