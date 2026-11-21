# Contributing to Kasi Casino 🤝

Thank you for your interest in contributing to **Kasi Casino**! This project is intentionally designed with zero complex toolchains or heavy build pipelines so anyone can clone, run, modify, and test it in minutes.

---

## 🛠️ Getting Started

### Prerequisites
- Any modern web browser (Chrome, Firefox, Safari, Edge).
- Python 3 OR Node.js (for local static serving and unit testing).
- Git.

### Setup
```bash
# Clone your fork or the repository
git clone https://github.com/gmappy/kasi-casino.git
cd kasi-casino

# Start local web server
python3 -m http.server 8080
# or with node:
# npx serve .
```
Open `http://localhost:8080` in your browser.

---

## 🧪 Testing

We take game correctness seriously, especially for mathematical combinations and strict South African Kasi rules.

### 1. Engine Unit Tests
Tests deck composition, 40-card stripping, subset-sum logic, build locking, and 11-point scoring:
```bash
node test_engine.js
```

### 2. Multi-Match Simulation Tests
Runs 5 full multi-round matches with simulated AI agents from deal to 21 points to ensure zero deadlocks or stuck turn loops:
```bash
node simulate_match.js
```

---

## 🎨 Code Style & Guidelines

1. **Vanilla ES Modules:** We do not use React, Vue, webpack, or Babel. All modules must run natively in the browser via standard `<script type="module">`.
2. **Accessible HTML/CSS:**
   - Interactive elements must be semantic `<button>` elements with clear `aria-label`s.
   - Modals use `display: none;` when closed to avoid polluting screen readers and assistive devices.
3. **Pure Logic in `gameEngine.js`:**
   - Keep game engine rules decoupled from the DOM.
   - The engine must remain 100% testable in Node.js without browser APIs.
4. **Zero External Assets:**
   - Sounds are generated programmatically via `audio.js` (Web Audio API).
   - Playing cards are rendered via clean SVG/CSS in `cardRenderer.js`.

---

## 💡 Ideas for Contribution

- **New AI Personalities:** Add new AI strategies in `aiPlayer.js` (e.g. "Strict Spades Counter", "High-Roller").
- **Custom Felt Themes:** Add felt themes (Midnight Blue, Classic Crimson, Carbon Black) in `style.css`.
- **Peer-to-Peer / WebRTC Multiplayer:** Enable human-vs-human play over local networks.
- **Tournament Mode:** Multi-round bracket system.

---

## 📬 Submitting a Pull Request

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/my-new-feature`.
3. Make your changes and run `node test_engine.js` and `node simulate_match.js`.
4. Commit with descriptive commit messages.
5. Push to your branch and open a Pull Request!
