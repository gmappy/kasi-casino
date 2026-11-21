# Kasi Casino Architecture & Developer Guide 🏛️

This document details the architectural design, data contracts, game loop, and state machine of **Kasi Casino**. It is intended to help any contributor understand, extend, or maintain the codebase.

---

## 1. High-Level System Architecture

The game is built with vanilla ES modules, with zero external build tools, compilers, or heavy libraries. It follows a clean Separation of Concerns (SoC):

```
┌─────────────────────────────────────────────────────────────┐
│                       Presentation Layer                    │
│  index.html (Semantic HTML5 layout & modal overlays)        │
│  style.css (Emerald felt theme, 3D card tilt, animations)   │
│  cardRenderer.js (Accessible SVG / DOM card components)     │
│  audio.js (Web Audio API sound synthesis engine)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ UI Events & Rendering
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Controller                  │
│  app.js (Turn orchestration, event handlers, human actions) │
└──────────────────────────────┬──────────────────────────────┘
                               │ State queries & Move dispatch
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                          Core Engine                        │
│  gameEngine.js (40-card deck, subset-sum combinations,      │
│                 build validation, scoring, state machine)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▲ AI Move Selection
                               │
┌──────────────────────────────┴─────────────────────────────┐
│                         AI Opponents                        │
│  aiPlayer.js (Heuristic evaluation & personality matrices)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Models

### 2.1 The Card Entity
Each card is represented as a plain JavaScript object:
```javascript
{
  id: "card_14",             // Unique string identifier
  suit: "D",                 // 'S' (Spades), 'H' (Hearts), 'D' (Diamonds), 'C' (Clubs)
  rank: 10,                  // Integer 1 to 10 (Ace = 1, Numbers 2-10)
  value: 10,                 // Numerical capture value (strictly 1 for Ace)
  isBigCasino: true,         // True for 10 of Diamonds (2 pts)
  isLittleCasino: false,     // True for 2 of Spades (1 pt + 1 spade)
  isAce: false,              // True for any rank 1 card (1 pt each)
  isSpade: false             // True for any suit 'S' card
}
```

### 2.2 Active Build Entity
A Build represents a locked or unlocked stack of cards on the table layout:
```javascript
{
  id: "build_1700000_abcd",  // Unique build ID
  value: 8,                  // Declared target capture rank (2-10)
  ownerId: 1,                // Player ID who created or last increased the build
  isLocked: true,            // Boolean: true if multiple sets have been merged (Compound)
  cards: [cardA, cardB, ...],// Flat array of all cards contained inside
  sets: [                    // Array of subsets proving the value
    [cardA, cardB],          // e.g. 5 + 3 = 8
    [cardC]                  // e.g. 8 (makes it a locked Double Build)
  ]
}
```

### 2.3 The Game State
Managed inside `GameState` (`gameEngine.js`):
- `players`: Array of 3 players (Human `id: 0`, Bra Moss `id: 1`, Sis Thandi `id: 2`).
- `hands`: Map of player ID to arrays of cards remaining in hand.
- `tableCards`: Array of loose cards currently face-up on the table.
- `builds`: Array of active builds currently on the table.
- `lastCapturerId`: ID of the player who made the most recent capture (used for the end-of-round sweep).
- `roundNumber`: 1-based round index.
- `dealerIndex`: Rotates clockwise after each round.

---

## 3. Game State Machine & Turn Lifecycle

```
[Start Match]
      │
      ▼
[Init Round] ──► Shuffle 40-card deck ──► Deal 10 cards to P1, P2, P3 & 10 to Table
      │
      ├───────────────────────┐
      ▼                       ▼
 (Current Turn)         (Check Hands)
   P0 (Human)       All 3 hands empty?
      │                       │
      │ Input                 ├─► YES ──► [Finish Round]
      ▼                       │              │
 [Execute Move]               │              ├─► Award leftover cards to lastCapturerId
      │                       │              ├─► Calculate 11 Base Points + Sweeps
      ▼                       │              ├─► Check target score (>= 21 pts)
 [Evaluate Sweep]             │              │     ├─► WINNER: [Game Over]
      │                       │              │     └─► NEXT: [Init Round]
      ▼                       │
[Advance Turn Clockwise] ─────┘
      │
      ▼
   P1 / P2 (AI)
      │
   AI Evaluation ──► Select Best Move ──► [Execute Move]
```

---

## 4. Key Algorithms in `gameEngine.js`

### 4.1 Subset-Sum Solver (`findSubsetsSummingTo`)
Identifies all distinct combinations of loose table cards that add up to a target number (2 through 10) using backtracking with pruning:
```javascript
function findSubsetsSummingTo(cards, target) { ... }
```

### 4.2 Greedy Disjoint Capture Combiner (`getGreedySumCombinations`)
Finds pair matches plus the maximum number of disjoint subsets that add up to the played card's rank, prioritizing combinations containing high-value cards (Big Casino, Little Casino, Aces, Spades).

### 4.3 Build Legality Rules
A build of target rank `V` is valid if and only if:
1. `V <= 10`
2. The player **currently holds another card of rank `V`** in their hand.
3. For single builds: `card.value + sum(tableCards) === V`.
4. For build increases: `existingBuild.value + card.value === V` and `existingBuild.isLocked === false`.
5. For double builds: multiple sets of `V` are merged together, setting `isLocked = true`.

### 4.4 Trailing Legality Rule
A player **CANNOT trail** a card if they currently own an active build on the table. They must capture it, add to it, or capture elsewhere.

---

## 5. AI Heuristic Engine (`aiPlayer.js`)

AI agents evaluate every legal move available across their entire hand:
- **Big Casino capture (10♦):** +60 pts priority.
- **Little Casino capture (2♠):** +35 pts priority.
- **Aces (A♠, A♥, A♦, A♣):** +30 pts each.
- **Sweeps:** +50 pts bonus.
- **Spades capture:** +12 pts per spade.
- **Locking a Double Build:** +40 pts (protects point cards from theft).
- **Stealing an opponent's single build:** +35 pts.
- **Trailing point cards (10♦, 2♠, Aces):** Heavily penalized (-80 to -150 pts).

### AI Personalities
- **Bra Moss (`aggressive`):** Prioritizes building, sweeps, and high card totals.
- **Sis Thandi (`tactical`):** Prioritizes immediate captures, Spades counting, and denying opponents.

---

## 6. Synthesized Audio (`audio.js`)

The audio engine uses the browser's native **Web Audio API** (`OscillatorNode`, `GainNode`, `BiquadFilterNode`, and noise buffers) without requiring any external MP3/WAV files:
- `playDeal()`: White noise burst shaped through a bandpass filter (1200 Hz).
- `playPlayCard()`: Low triangle wave + snappy noise burst.
- `playCapture()`: Arpeggiated C-major chime (C5, E5, G5, C6).
- `playBuild()`: Double wood-knock (square + triangle waveforms).
- `playSweep()`: Triumphant 4-note brass fanfare.
- `playWin()`: Full victory chord celebration.
