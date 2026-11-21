# Kasi Casino ♠️🇿🇦

A sleek, responsive web edition of **South African Kasi (Township) Casino** (40-card Cassino), featuring smooth 60fps animations, rich Web Audio synthesized sound effects, tactical AI opponents, and strict township rules.

---

## 🎴 The Kasi Casino Rules

Unlike international 52-card Cassino, **Kasi Casino** is played with a **40-card deck** (all face cards—Jacks, Queens, and Kings—are stripped out). Every card from Ace to 10 has a numerical value:
- **Ace = 1**
- **Cards 2 through 10 = Face value**

### 👥 The 3-Hand Deal (10-10-10-10)
- **40 cards total**
- **10 cards** dealt to Player 1 (You)
- **10 cards** dealt to Player 2 (Bra Moss)
- **10 cards** dealt to Player 3 (Sis Thandi)
- **10 cards** dealt face-up across the center table
- Play proceeds clockwise until all 10 cards are played out across a single high-stakes round.

---

## 🎯 Gameplay Mechanics

On each turn, you play **1 card** from your hand to execute one of the following moves:

1. **Pair Capture:** Capture loose table cards of the exact same rank (e.g. playing 7 captures all 7s on the table).
2. **Sum Capture:** Capture combinations of loose table cards whose numerical values add up to your card's rank (e.g. playing 9 captures 5+4 and 6+3).
3. **Compound Captures:** Simultaneously capture pairs and multiple sum groups in one move (e.g. an 8 captures another 8, a 5+3, and a 6+2).
4. **Building:**
   - **Single Build:** Combine a card from hand with table cards to announce a higher target rank (e.g. play a 3 onto a 4 and announce *"Building 7"*). **Rule:** You *must* hold a 7 in hand to make this play. Single builds can be stolen or increased by opponents.
   - **Locked Double Build:** Merge two or more sets totaling the same rank (e.g. merge a build of 8 with another 8 or 6+2). Once doubled, **it is locked**—nobody can increase its value; it can only be captured by playing that exact rank.
   - **Increasing / Stealing Builds:** Add a card from your hand to an opponent's single build to increase the total (e.g. add 2 to a build of 7 to make it 9, provided you hold a 9).
5. **Trailing:** Discard one card face-up to the table. **Rule:** A player *cannot trail* while owning an active build on the table!
6. **Sweeps (Clears):** Clearing every card and build off the table in one move earns a **+1 Sweep bonus point**.
7. **Last Capture:** Whoever makes the final capture of the round takes all leftover loose cards and builds on the table.
8. **Count Out:** First to 21 points (or 11 points for quick match) wins. Players may declare "Count Out" mid-round to claim immediate victory; miscounting results in an automatic loss under township rules.

---

## 🏆 Scoring (11 Base Points + Sweeps)

- **Most Cards (3 pts):** Single highest card count (out of 40). 0 pts if tied for 1st.
- **Most Spades (1 pt):** Single highest Spades count (out of 10). 0 pts if tied for 1st.
- **Big Casino (10♦):** 2 pts.
- **Little Casino (2♠):** 1 pt.
- **Aces (A♠, A♥, A♦, A♣):** 1 pt each (4 pts total).
- **Sweeps:** 1 pt for each sweep scored.

---

## 🚀 How to Run Locally

This is a zero-dependency modern web app. You can run it with any static web server:

```bash
# Clone the repository
git clone https://github.com/gmappy/kasi-casino.git
cd kasi-casino

# Start a local server (Python 3)
python3 -m http.server 8080
```

Then open `http://localhost:8080` in any mobile or desktop web browser.

---

## 🛠️ Tech Stack

- **HTML5 & Vanilla ES Modules** (modular architecture: `gameEngine.js`, `aiPlayer.js`, `audio.js`, `cardRenderer.js`, `app.js`).
- **Responsive CSS3** with dark emerald felt gradient, gold metallic accents, and viewport-locked layout for mobile devices.
- **Web Audio API** synthesizer for realistic card dealing, clicks, chips chimes, and sweep fanfares.
- **No external CDN dependencies**—loads instantly and works offline.
