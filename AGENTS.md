
# PROJECT: "Sudoku Master" — Mobile-First Offline Sudoku PWA

You are a senior frontend engineer. Build a complete, production-ready 
Sudoku game as a Progressive Web App using ONLY vanilla HTML, CSS, and 
JavaScript (ES Modules). No frameworks, no libraries, no build step, 
no external fonts/CDNs.

## CRITICAL CONSTRAINTS (read first — these prevent known failures)

1. FILE SIZE: Keep every file under 400 lines. Split logic across small 
modules. Jules may struggle with very large files — do not create 
any file larger than 500 lines.

2. NO EXTERNAL DEPENDENCIES: Zero npm packages. Zero CDN links. 
Everything must work offline from the first load.

3. ES MODULES: Use <script type="module"> and import/export. 
All paths must be relative (./js/engine.js, not /js/engine.js) 
so it works when hosted in a subdirectory.

4. VIBRATION API: navigator.vibrate() does NOT work on iOS Safari. 
Guard it: if (navigator.vibrate) navigator.vibrate(ms). 
Never assume vibration works. The setting must still be visible 
on iOS (just silently does nothing).

5. AUDIO: Use Web Audio API (AudioContext) to generate sounds 
programmatically. Do NOT reference any .mp3/.wav files. 
AudioContext must be created/resumed on first user gesture 
(browser autoplay policy). Create a unlockAudio() function 
called on first tap. Handle the case where AudioContext is 
suspended — call ctx.resume() before playing.

6. SERVICE WORKER PATHS: In sw.js, use relative paths starting 
with './' for all cached assets. Use a cache-first strategy. 
Increment CACHE_NAME when assets change. Also cache the 
manifest and icons.

7. iOS PWA QUIRKS: 
- Add <meta name="apple-mobile-web-app-capable" content="yes">
- Add <meta name="apple-mobile-web-app-status-bar-style" 
content="black-translucent">
- Add <link rel="apple-touch-icon" href="./assets/icon-192.png">
- Safe areas: use env(safe-area-inset-top/bottom/left/right) 
with viewport-fit=cover in the viewport meta tag.

8. VIEWPORT: <meta name="viewport" content="width=device-width, 
initial-scale=1, maximum-scale=1, user-scalable=no, 
viewport-fit=cover">. Disable double-tap zoom with 
touch-action: manipulation on interactive elements.

9. LOCALSTORAGE KEYS: Prefix all keys with sudoku. 
(e.g. sudoku.progress, sudoku.save, sudoku.settings, 
sudoku.endless.stats). Wrap all JSON.parse in try/catch 
to survive corrupt data.

10. NO CONSOLE ERRORS: Every referenced DOM element must exist. 
Every imported function must be exported. Verify imports 
mentally before finalizing.

11. PUZZLE GENERATION PERFORMANCE: Generating 200-level progress 
on first load should NOT happen. Generate each puzzle ONLY 
when the player starts that level (lazy generation). Use the 
level ID as a deterministic seed so the same level always 
produces the same puzzle. Implement a small seeded PRNG 
(mulberry32 or xorshift) inside engine.js. generate(holes, seed) 
must accept an optional seed.

12. ASYNC GENERATION: If puzzle generation takes more than 200ms, 
show a "Generating..." overlay with a spinner. Use 
requestIdleCallback or setTimeout(0) to avoid blocking UI. 
Never freeze the UI thread for more than 300ms.

## FILE STRUCTURE (create exactly these files)

sudoku/
├─ index.html
├─ manifest.json
├─ sw.js
├─ css/
│ └─ style.css
├─ js/
│ ├─ engine.js (seeded PRNG + generation + solver + uniqueness)
│ ├─ levels.js (200 story levels + endless config + progress)
│ ├─ game.js (Game class: state, moves, undo, hints, notes)
│ ├─ settings.js (sound via WebAudio, vibration, toggles)
│ ├─ animations.js (confetti, ripple, pop, shake, toast)
│ ├─ storage.js (safe localStorage wrapper with try/catch)

Arya:
│ └─ ui.js (all DOM rendering + event wiring + bootstrap)
└─ assets/
└─ icon-192.png (create a valid PNG icon; if not possible, 
use an inline SVG data-URI in HTML and 
reference it in manifest as a fallback)

## FEATURE REQUIREMENTS

### A. GAME ENGINE (engine.js)
- Seeded PRNG: mulberry32(seed) used by all randomization.
- generate(holes, seed) returns { puzzle, solution }.
- Fill a 9×9 grid with a valid complete solution using 
randomized backtracking (seeded).
- Remove cells one by one in random (seeded) order, checking 
after each removal that the puzzle still has EXACTLY ONE 
solution (countSolutions with early exit at 2).
- Return both puzzle and the full solution.
- isValid(board, r, c, v) checks row, col, 3×3 box.
- countSolutions(board, limit=2) uses backtracking with early exit.
- generate(holes, seed) must complete in < 2s for Expert 
(58 holes) on a mid-range phone. If generation for a seed fails 
to produce a valid unique puzzle, retry with seed+1 up to 5 times.
- Export helper: difficultyFromLevel(levelId) returning 
'easy' | 'medium' | 'hard' | 'expert'.

### B. LEVELS + ENDLESS MODE (levels.js)

PART 1 — STORY MODE (200 progressive levels):
- 200 levels with progressive difficulty:
- Levels 1–30: 32–37 empty cells (Easy)
- Levels 31–80: 38–45 empty cells (Medium)
- Levels 81–140: 46–52 empty cells (Hard)
- Levels 141–200: 53–58 empty cells (Expert)
- Hints allowed per level: 
- Levels 1–50: 5 hints
- Levels 51–120: 4 hints
- Levels 121–170: 3 hints
- Levels 171–200: 2 hints
- Level unlocking: level N unlocks when level N-1 is completed.
- Progress saved to sudoku.progress:
{ "1": { done: true, bestTime: 120, stars: 3 }, ... }
- Puzzle for a level is generated LAZILY using seed = levelId * 7919.
- Group levels visually by tier in the Levels screen:
Easy (green), Medium (blue), Hard (orange), Expert (red).

PART 2 — ENDLESS MODE (infinite puzzles):
- Separate screen: "Endless Mode".
- Four difficulty buttons: Easy / Medium / Hard / Expert.
- Each tap generates a BRAND NEW random puzzle of that difficulty 
using a random seed = Date.now().
- No locking, no level numbers. Endless play.
- Track stats separately: sudoku.endless.stats = 
{ easy: { played, won, bestTime }, medium: {...}, 
hard: {...}, expert: {...} }.
- After winning an Endless puzzle: show "Play Again" (same 
difficulty) and "Change Difficulty" buttons.

PART 3 — HOME SCREEN:
- 4 main buttons + Continue:
1. "Continue" (only if sudoku.save exists) — resume last game
2. "Story Mode" → Levels screen
3. "Endless Mode" → Endless difficulty picker
4. "Stats" → Stats screen
5. "Settings" → Settings screen

### C. GAME LOGIC (game.js)
- class Game with:
- board (current 9×9), puzzle (fixed cells), solution
- notes — 9×9 array of Sets (bitmask alternative OK)
- mistakes, maxMistakes = 3
- history — stack for undo (type, coords, prev value, 
prev notes snapshot). Max 100 entries (shift oldest).
- hintsLeft
- startTime, pausedAt, pausedMs
- mode — 'story' | 'endless'
- levelId (for story) or difficulty (for endless)
- elapsed() returns ms excluding paused time
- Methods: place(r,c,v), toggleNote(r,c,v), erase(r,c), 
undo(), hint(), pause(), resume(), _isSolved()
- place() returns { error: true } if wrong, 
{ ok: true, done: bool } if correct.
- Auto-remove notes in same row/col/box when a number is placed 
(if setting enabled).
- stars() returns 3 (0 mistakes), 2 (1 mistake), 1 (2 mistakes).

### D. SETTINGS (settings.js)
- Persisted under sudoku.settings:
{ sound, vibration, highlight, autoNotes, darkMode }

Arya:
- Defaults: sound=true, vibration=true, highlight=true, 
autoNotes=true, darkMode=true.
- sfx.tap(), sfx.place(), sfx.error(), sfx.win(), 
sfx.achievement(), sfx.hint(), sfx.undo() — all via 
WebAudio oscillators. Short (< 150ms), pleasant frequencies, 
low gain (~0.05).
- vibrate(pattern) — guarded with if (navigator.vibrate).
Patterns:
- correct: 10ms
- error: [30, 40, 30]
- win: [20, 40, 20, 40, 20]
- achievement: [15, 30, 15]
- unlockAudio() — creates/resumes AudioContext, called on 
first user gesture. Also attaches a one-time listener to 
document.body for 'touchstart'/'click'.

### E. ANIMATIONS (animations.js)
- ripple(event, element) — Material-style ripple on buttons.
- popCell(cell) — CSS class scales cell 1 → 1.15 → 1.
- shakeCell(cell) — CSS class shakes horizontally.
- confetti(container) — pure CSS/JS confetti: ~40 divs, 
random colors/positions, animate falling, remove after 2s.
- toast(message, duration) — bottom toast for achievements.
- All animations use transform and opacity only 
(GPU-friendly). Use will-change sparingly.
- Respect prefers-reduced-motion: skip animations if user 
has reduced motion enabled.

### F. STORAGE (storage.js)
- safeGet(key, fallback), safeSet(key, value), 
safeRemove(key) — all wrapped in try/catch.
- Handles quota exceeded errors gracefully.

### G. UI (ui.js)
Screens: Home, Levels, Game, Endless Picker, Settings, Stats, 
Win Modal, Pause Modal.

- Home: gradient logo "SUDOKU MASTER", Continue (if save exists), 
Story Mode, Endless Mode, Stats, Settings.

- Levels: 
- Tier headers: Easy / Medium / Hard / Expert with color badges.
- 3-column grid of 200 buttons.
- Each button shows level number and star rating 
(☆☆☆ / ★☆☆ / ★★☆ / ★★★).
- Completed = green bg, current = accent border, locked = dimmed.
- Scroll position remembered when returning.

- Game:
- Top bar: back, level label (or difficulty in endless), 
timer (MM:SS), mistakes (✕ n/3), pause button.
- Progress bar under top bar: filled cells / 81.
- 9×9 board: CSS Grid, aspect-ratio 1/1, gap 1px, 
3×3 subgrid borders thicker (2px accent).
- Cell states: prefilled (white bold), user (blue), 
error (red + shake), selected (gradient bg), peer (dark), 
same-number (lighter), notes (3×3 mini-grid, 2px font).
- Tools row: Undo, Erase, Notes toggle, Hint.
- Hint button pulses when hints > 0, dims when 0.
- Notes toggle shows active state.
- Number pad: 1–9 + erase. 5 columns. 
Each button min 48×48px touch target.
- Numbers already placed 9 times get dimmed.

- Pause Modal: "Paused", Resume button, Restart Level, 
Quit to Levels. Timer frozen.

- Settings: toggles for Sound, Vibration, Highlight, Auto-notes, 
Dark mode. Reset progress button with confirm dialog.

- Stats: 
- Story Mode section: total levels done / 200, 
best time per tier, total play time, current streak.
- Endless section: played / won per difficulty, best time.
- Reset stats button with confirm dialog.

- Win Modal: 
- Level number (or difficulty for endless), time, mistakes.
- Stars (3/2/1) with animated appearance.
- Confetti overlay.
- Next Level / Play Again button.
- Back to Levels / Change Difficulty button.

- All text in English.

### H. VISUAL DESIGN
- Dark theme by default. Light theme optional via setting.
- CSS variables for all colors:
--bg, --surface, --cell, --line, --text, --text-dim,
--accent (#4f8cff), --accent-2 (#a855f7),
--user (#7fb2ff), --error (#ff5c5c),
--peer (#1f2533), --same (#26314a),
--success (#22c55e),
--easy (#22c55e), --medium (#4f8cff), 
--hard (#f59e0b), --expert (#ef4444)
- Gradient accent: linear-gradient(135deg, #4f8cff, #a855f7) 
on Play button, selected cell, and level header.
- Rounded corners (12–16px), subtle shadows, modern look.
- Font: system-ui stack. No external fonts.
- Max width 520px, centered on larger screens.

Arya:
### I. PWA (manifest.json + sw.js)
- manifest.json: 
- name "Sudoku Master", short_name "Sudoku"
- display "standalone", orientation "portrait"
- theme_color "#0f1115", background_color "#0f1115"
- start_url "./", scope "./"
- icons: 192 and 512 (use inline SVG data-URI if PNG not possible)
- sw.js: 
- CACHE_NAME = 'sudoku-v1'
- Cache all app shell assets including all js/ files.
- On install: self.skipWaiting().
- On activate: delete old caches, self.clients.claim().
- Fetch strategy: cache-first, fallback to network, 
fallback to cached index.html for navigation requests.
- Register service worker in ui.js on window.load with 
navigator.serviceWorker.register('./sw.js').
- Handle beforeinstallprompt: show a dismissible banner 
"Add to Home Screen". Remember dismissal in localStorage.

## EXTRA POLISH (must include — all of these)

1. Ripple effect on ALL buttons.
2. Pop animation on correct number placement.
3. Shake animation on wrong number placement.
4. Confetti on level complete (Story and Endless).
5. Gradient on Play button + selected cell.
6. Pulse animation on Hint button when hints > 0.
7. Progress bar showing filled cells / 81.
8. Toast notifications for achievements:
- "First Win!" (complete level 1)
- "No Mistakes!" (complete a level with 0 mistakes)
- "Speed Demon!" (complete a level in under 3 minutes)
- "5 Level Streak!" (5 levels in a row without mistakes)
- "Halfway There!" (100 levels completed)
- "Sudoku Master!" (200 levels completed)
9. Streak counter (consecutive levels without mistakes).
10. Best time tracking per level (Story) and per difficulty 
(Endless).
11. Auto-pause when app goes to background 
(visibilitychange hidden event).
12. Timer resumes when app returns to foreground.
13. Continue button on Home if saved game exists.
14. Auto-save game state after every move (throttled to 
avoid excessive writes — max once per 500ms).
15. Reset progress option in Settings.

## QUALITY CHECKLIST (verify before submitting)

- [ ] All imports resolve. No missing exports.
- [ ] No console errors on load.
- [ ] Service worker registers and caches all assets.
- [ ] Works offline after first load (DevTools offline).
- [ ] All buttons have min 44×44px touch target.
- [ ] Safe area insets respected on notched phones.
- [ ] Audio unlocks on first tap (no autoplay error).
- [ ] AudioContext resume() called if suspended.
- [ ] Vibration guarded for iOS.
- [ ] Puzzle generation < 2s for Expert on mid-range phone.
- [ ] Same level always produces same puzzle (seeded).
- [ ] localStorage never throws (try/catch everywhere).
- [ ] All text is English.
- [ ] No external requests (Network tab = only local files).
- [ ] Manifest valid (Application tab in DevTools).
- [ ] PWA installable (Lighthouse PWA audit passes).
- [ ] Every file under 500 lines.
- [ ] CSS uses only transform/opacity for animations.
- [ ] Respects prefers-reduced-motion.
- [ ] No memory leaks (event listeners cleaned up on 
screen change where applicable).
- [ ] 200 story levels + endless mode both fully work.
- [ ] Undo stack limited to 100 entries.
- [ ] Timer accurate after pause/resume cycles.

## DELIVERABLE

Create all files in a single Pull Request. After creating files, 
mentally verify:
1. Load index.html → no console errors.
2. Service worker registers successfully.
3. Story Mode level 1 playable, completion unlocks level 2.
4. Endless Mode generates new puzzles per difficulty.
5. Settings persist across reload.
6. Offline mode works after first load.
7. Win Modal shows with stars and confetti.

If any requirement is ambiguous, choose the simplest 
mobile-first solution. Prioritize in this order:
1. Offline works
2. No console errors
3. Smooth gameplay
4. Seeded generation (same level = same puzzle)
5. Visual polish
6. Animations and effects