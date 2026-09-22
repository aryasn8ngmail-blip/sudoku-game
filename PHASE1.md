\# PROJECT: Sudoku Master — Visual \& UX Fixes (Phase 1 of 2)



You are a senior UI/UX engineer. The Sudoku Master PWA already works 

(vanilla HTML/CSS/JS, no frameworks). I need you to FIX visual and UX 

issues only. DO NOT add new features in this PR.



\## DO NOT CHANGE (critical)



\- Game logic in engine.js, game.js, storage.js, levels.js

\- Service worker (sw.js)

\- Level progression (200 levels)

\- Endless Mode logic

\- Audio generation (Web Audio API)

\- Vibration API

\- Any localStorage keys



\## SCOPE: Only visual/CSS/HTML improvements



\---



\## FIX 1 — SPLASH SCREEN (add)



Add a splash screen shown for 1.5 seconds on app open:



\- Full-screen dark background (#0a0e14)

\- Crown SVG icon centered (create a simple outline crown in SVG, 

&#x20; stroke color: gradient blue-to-purple)

\- Below icon: "SUDOKU MASTER" with gradient text

\- Subtle pulse animation on the icon (scale 1.0 → 1.05 → 1.0, 1.5s loop)

\- After 1.5s, fade out over 300ms and reveal Home screen



Implementation:

\- Add `<div id="splash">` as first child of body

\- CSS animation for pulse + fade-out

\- JS: setTimeout 1.5s to add .hidden class, then remove element after 1.8s

\- Make sure Splash does NOT show on every screen change, only on app load



\---



\## FIX 2 — HOME SCREEN REDESIGN



Current issues: too plain, empty space, weak logo, no background.



Changes:

1\. Add a subtle animated background:

&#x20;  - Dark base (#0a0e14)

&#x20;  - Two soft radial gradients (blue + purple) that slowly float 

&#x20;    (use CSS @keyframes with transform: translate, 20s loop)

&#x20;  - Optional: faint grid lines pattern at 5% opacity using CSS 

&#x20;    background-image with linear-gradient repeating



2\. Add crown SVG icon (same as splash) above the title, size 72px



3\. Title "SUDOKU MASTER": 

&#x20;  - Font-size 32px, font-weight 800, letter-spacing 2px

&#x20;  - Gradient text (linear-gradient(135deg, #4f8cff, #a855f7) with 

&#x20;    -webkit-background-clip: text; color: transparent)



4\. REMOVE subtitle "Mobile Offline Sudoku"



5\. Compact the buttons:

&#x20;  - Max-width: 340px, centered

&#x20;  - Padding: 14px 20px (smaller than current)

&#x20;  - Font-size: 16px

&#x20;  - Border-radius: 14px

&#x20;  - Margin between buttons: 10px



6\. Button hierarchy:

&#x20;  - Continue Game: gradient background + shadow (only if save exists)

&#x20;  - Story Mode: solid #4f8cff

&#x20;  - Endless Mode: dark outline (border 1.5px #2a3142)

&#x20;  - Stats: dark outline

&#x20;  - Settings: dark outline



7\. Add hover/active states:

&#x20;  - Hover: slight scale (1.02) + brighter

&#x20;  - Active: scale (0.98)



\---



\## FIX 3 — GAME SCREEN IMPROVEMENTS



\### 3.1 Board border

\- Change outer border from thick blue (3-4px) to: 1.5px solid #2a3142

\- Add subtle box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4)

\- Keep 3x3 subgrid borders but use 2px #4f8cff (thinner than now)

\- Cell borders: 0.5px solid #1a1f2b



\### 3.2 Replace ALL emoji icons with inline SVG

Create a small SVG icon set inside index.html (inline <svg> with 

<symbol>), 24x24 viewBox, stroke-width 2, stroke-linecap round:



\- `#icon-undo` → arrow curve turning left

\- `#icon-erase` → backspace outline

\- `#icon-notes` → pencil outline

\- `#icon-hint` → lightbulb outline

\- `#icon-pause` → two vertical bars

\- `#icon-back` → chevron-left

\- `#icon-star` → star (used in levels/stats)

\- `#icon-lock` → padlock

\- `#icon-trophy` → trophy

\- `#icon-calendar` → calendar

\- `#icon-check` → checkmark



Use them everywhere (tools row, top bar, number pad erase button).

Color: currentColor (so they inherit text color).



\### 3.3 Top bar improvements

\- Back button: use #icon-back SVG, 24px, color #7b8596

\- Level title: font-weight 600, 16px

\- Timer + mistakes: put in a row with a subtle separator dot (·)

\- Mistakes: show as "✕ 0/3" but with SVG x icon in #ff5c5c if > 0

\- Pause button: change from orange to neutral:

&#x20; - Background: transparent

&#x20; - Border: 1.5px solid #2a3142

&#x20; - Icon: #icon-pause in #7b8596

&#x20; - Border-radius: 10px

&#x20; - Padding: 8px



\### 3.4 Progress bar

\- Make thinner: height 3px (from current)

\- Color: gradient blue-to-purple

\- Add small text label to the LEFT of the bar: "Progress"

\- Add small text to the RIGHT: "23/81" (in #7b8596, 11px)

\- Rounded ends (border-radi



us: 2px)



\### 3.5 Notes readability

\- Increase notes font-size from current (\~7px) to 9px

\- Color: #7b8596

\- Grid gap inside note cell: 1px (tighter)

\- Font-weight: 500



\### 3.6 Remove duplicate erase

\- Remove the Erase button from the tools row (top row)

\- Keep only the erase button in the number pad (bottom right)

\- In the tools row, keep: Undo | Notes | Hint

\- Make these 3 buttons evenly spaced

\- Tools row layout: 3 columns grid instead of 4



\### 3.7 Selected cell glow

\- Add: box-shadow: 0 0 0 2px #4f8cff, 0 0 16px rgba(79, 140, 255, 0.4)

\- Or use inset shadow if outer shadow looks weird



\### 3.8 Peer highlighting (contrast)

\- Light mode: peers = #e8eef7 (light blue-gray), same-number = #dbe5f5

\- Dark mode: peers = #1f2733, same-number = #2a3a55

\- Make sure selected cell is always more prominent than peers



\### 3.9 Number pad pressed state

\- On :active: transform scale(0.95), transition 100ms

\- Background darken slightly



\---



\## FIX 4 — LEVELS SCREEN



\### 4.1 Hide stars on locked levels

\- For locked levels: only show lock icon, no stars at all

\- For unlocked \& not completed: show empty stars (☆☆☆) in #7b8596

\- For completed: show earned stars in gold (#f59e0b)



\### 4.2 Tier quick-nav

\- Add a sticky top bar with 4 small buttons: Easy | Medium | Hard | Expert

\- Click scrolls smoothly to that tier section

\- Active tier highlighted with accent color

\- Background: #151a23 with subtle bottom border



\### 4.3 Current level pulse

\- The next uncompleted level should have a subtle pulsing border

\- Animation: border-color oscillates between #4f8cff and #a855f7, 2s loop



\---



\## FIX 5 — STATS SCREEN REDESIGN



Current: just a list of text. Too dry.



Redesign:



\### 5.1 Progress ring at top

\- Show circular progress ring: "X / 200" (levels completed)

\- SVG-based ring, 120px diameter, 8px stroke

\- Background ring: #2a3142

\- Progress ring: gradient blue-to-purple

\- Center text: big "1" and small "/ 200"

\- Below: small caption "Levels Completed"



\### 5.2 Card-based layout

\- Group stats into cards with subtle borders

\- Each card: background #151a23, border 1px #2a3142, border-radius 14px, 

&#x20; padding 16px



Cards:

1\. \*\*Progress\*\* (has the ring)

2\. \*\*Streaks\*\*: Current streak, Best streak (with 🔥 → SVG flame icon)

3\. \*\*Times\*\*: Best Time per tier (4 rows: Easy/Medium/Hard/Expert)

4\. \*\*Endless Mode\*\*: 4 rows with difficulty color dots



\### 5.3 SVG icons in stats

\- Replace emojis with SVG

\- Trophy icon next to completed levels

\- Clock icon next to times

\- Flame icon next to streaks



\### 5.4 Bar chart for best times

\- Small horizontal bars showing relative speeds (visual comparison)

\- Bar colors match difficulty tier colors

\- Bars are scaled relative to the fastest time



\### 5.5 Reset stats button

\- Outline red (border 1.5px #ff5c5c, text #ff5c5c, transparent bg)

\- Add warning icon

\- 2-step confirmation: first click shows "Are you sure?" with 

&#x20; Confirm / Cancel buttons



\---



\## FIX 6 — SETTINGS SCREEN



\### 6.1 Group into sections

\- Audio \& Haptics: Sound Effects, Vibration

\- Gameplay: Highlight Same Numbers, Auto-Remove Notes

\- Appearance: Dark Mode

\- Data: Reset All Progress



\### 6.2 Section headers

\- Small uppercase heading in #4f8cff, 11px, letter-spacing 1px

\- Add small icon before each heading (SVG)

\- Margin top 20px before each section



\### 6.3 Reset button redesign

\- Outline red instead of solid orange

\- Add warning triangle icon

\- 2-step confirmation modal



\---



\## FIX 7 — PAGE TRANSITIONS



Add smooth transitions between screens:

\- Fade + slight horizontal slide

\- Duration: 250ms, ease-out

\- Forward navigation: slide from right (+20px)

\- Back navigation: slide from left (-20px)

\- Implement with CSS classes .screen-enter and .screen-exit



\---



\## FIX 8 — TYPOGRAPHY



\- Use font-family stack: 

&#x20; system-ui, -apple-system, "Segoe UI", Roboto, sans-serif

\- Headings: font-weight 700-800

\- Body: font-weight 400-500

\- Numbers in board: font-weight 600 (prefilled: 700)



\---



\## FIX 9 — COLOR PALETTE REFINEMENT



Update CSS variables:



```css

:root {

&#x20; --bg: #0a0e14;

&#x20; --surface: #151a23;

&#x20; --cell: #1a1f2b;

&#x20; --cell-empty: #131820;

&#x20; --line: #2a



3142;

&#x20; --text: #f0f3f8;

&#x20; --text-dim: #7b8596;

&#x20; --accent: #4f8cff;

&#x20; --accent-2: #a855f7;

&#x20; --gradient: linear-gradient(135deg, #4f8cff, #a855f7);

&#x20; --user: #7fb2ff;

&#x20; --error: #ff5c5c;

&#x20; --peer: #1f2733;

&#x20; --same: #2a3a55;

&#x20; --success: #22c55e;

&#x20; --warning: #f59e0b;

&#x20; --easy: #22c55e;

&#x20; --medium: #4f8cff;

&#x20; --hard: #f59e0b;

&#x20; --expert: #ef4444;

}

---

## FIX 10 — NOTES BUG (critical)

### Problem
When Notes mode is active and the user taps multiple different numbers 
on the same cell, only the LAST number is kept. Previous notes on that 
cell disappear. The user cannot add multiple candidate numbers to a 
single cell.

Expected behavior: tapping 3 then 5 then 7 on the same cell should 
result in notes showing "3 5 7" in that cell. Tapping the same number 
again should remove it (toggle behavior).

### Fix
1. In `game.js`, method `toggleNote(r, c, v)`:
   - Ensure notes[r][c] is a Set (or equivalent)
   - Do NOT overwrite the existing Set with a new Set
   - Add: `notes[r][c].add(v)`
   - If already exists: `notes[r][c].delete(v)` (toggle)
   - Return the updated state

2. In `ui.js`, when rendering a cell that has notes:
   - Iterate through ALL notes in the Set (1-9)
   - Render each note in its correct mini-grid position 
     (3x3 grid: 1=top-left, 2=top-center, 3=top-right, 
     4=mid-left, 5=center, 6=mid-right, 
     7=bottom-left, 8=bottom-center, 9=bottom-right)
   - Do NOT clear notes when a number is placed unless 
     "Auto-Remove Notes" is enabled AND the number matches

3. When the user places a final number in a cell:
   - Clear all notes in that cell (behavior already exists)
   - But ONLY for that specific cell, not related cells

4. When "Auto-Remove Notes" is enabled and a number is placed:
   - Remove that number from notes in the same row, column, and 3x3 box
   - Do NOT remove other numbers from those cells

5. Verify with test cases:
   - Tap Notes button → tap 1, 3, 5 on same cell → see "1 3 5" notes
   - Tap Notes button → tap 3 again → "3" should be removed → "1 5"
   - Place a number in that cell → notes should clear
   - Toggle Auto-Remove Notes ON → place a number in row → 
     same number in other cells' notes should be removed
   - Toggle Auto-Remove Notes OFF → place a number → 
     other cells' notes should NOT change

### Debugging aid
Add a small console.log in toggleNote() that logs the current notes 
for that cell, so we can verify during testing:
`console.log('Notes for cell', r, c, ':', [...notes[r][c]])`
Remove this log before final PR.

---

## FIX 11 — NOTES UI/UX POLISH

While fixing the Notes bug, also improve the Notes UI:

1. When Notes mode is active, show a clear visual indicator:
   - The Notes button gets a highlighted state (accent background)
   - Add a small "NOTES" badge somewhere visible (e.g., top of board)
     that appears only when notes mode is ON
   - The board border changes subtly (e.g., accent color)

2. Notes rendering:
   - Font-size: 9px (as per FIX 3.5)
   - Color: #7b8596
   - Grid inside cell: 3x3, each cell centered
   - Font-weight: 500

3. Keyboard/gesture (optional, if easy):
   - Long-press on a cell (500ms) toggles Notes mode automatically
   - Double-tap on a cell in Notes mode clears all its notes

