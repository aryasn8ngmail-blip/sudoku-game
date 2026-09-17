// js/engine.js - PRNG, Sudoku Solver, Generator & Difficulty mapping

export function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isValid(board, r, c, val) {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val) return false;
    if (board[i][c] === val) return false;
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxR + i][boxC + j] === val) return false;
    }
  }
  return true;
}

export function countSolutions(board, limit = 2) {
  let count = 0;

  function solve() {
    let minCandidates = 10;
    let targetR = -1;
    let targetC = -1;
    let candidates = null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const list = [];
          for (let v = 1; v <= 9; v++) {
            if (isValid(board, r, c, v)) list.push(v);
          }
          if (list.length < minCandidates) {
            minCandidates = list.length;
            targetR = r;
            targetC = c;
            candidates = list;
          }
          if (minCandidates === 0) return;
        }
      }
    }

    if (targetR === -1) {
      count++;
      return;
    }

    for (let i = 0; i < candidates.length; i++) {
      board[targetR][targetC] = candidates[i];
      solve();
      board[targetR][targetC] = 0;
      if (count >= limit) return;
    }
  }

  solve();
  return count;
}

function solveBoard(board, rng) {
  function solve() {
    let targetR = -1;
    let targetC = -1;
    let minCandidates = 10;
    let candidates = null;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const list = [];
          for (let v = 1; v <= 9; v++) {
            if (isValid(board, r, c, v)) list.push(v);
          }
          if (list.length < minCandidates) {
            minCandidates = list.length;
            targetR = r;
            targetC = c;
            candidates = list;
          }
          if (minCandidates === 0) return false;
        }
      }
    }

    if (targetR === -1) return true;

    // Shuffle candidates with rng
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let v of candidates) {
      board[targetR][targetC] = v;
      if (solve()) return true;
      board[targetR][targetC] = 0;
    }

    return false;
  }

  solve();
}

function tryGenerateSingle(holes, rng) {
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoard(solution, rng);

  const puzzle = solution.map(row => [...row]);
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let removed = 0;
  for (let [r, c] of positions) {
    if (removed >= holes) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }

  if (removed < holes) {
    return null;
  }

  return { puzzle, solution };
}

export function generate(holes, seed = Date.now()) {
  let currentSeed = seed;
  for (let attempt = 0; attempt < 5; attempt++) {
    const rng = mulberry32(currentSeed);
    const result = tryGenerateSingle(holes, rng);
    if (result) {
      return result;
    }
    currentSeed = (currentSeed + 1) >>> 0;
  }

  // Fallback if 5 attempts fail to reach exact hole target: generate with last attempt
  const rng = mulberry32(seed);
  const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
  solveBoard(solution, rng);
  const puzzle = solution.map(row => [...row]);
  const positions = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      positions.push([r, c]);
    }
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  let removed = 0;
  for (let [r, c] of positions) {
    if (removed >= holes) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      removed++;
    } else {
      puzzle[r][c] = backup;
    }
  }
  return { puzzle, solution };
}

export function difficultyFromLevel(levelId) {
  if (levelId <= 30) return 'easy';
  if (levelId <= 80) return 'medium';
  if (levelId <= 140) return 'hard';
  return 'expert';
}
