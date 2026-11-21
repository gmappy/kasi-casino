// app.js - Main Application Controller for Kasi Casino Web

import { GameState } from './gameEngine.js';
import { AIPlayer } from './aiPlayer.js';
import { renderCardHTML } from './cardRenderer.js';
import { sound } from './audio.js';

class KasiCasinoApp {
  constructor() {
    this.gameState = null;
    this.aiPlayers = {
      1: new AIPlayer('aggressive'), // Bra Moss
      2: new AIPlayer('tactical')    // Sis Thandi
    };

    this.selectedCard = null;
    this.validMoves = [];
    this.aiSpeed = 800; // ms per AI turn
    this.isFastMode = false;

    // DOM Elements
    this.opponentsBarEl = document.getElementById('opponentsBar');
    this.buildsContainerEl = document.getElementById('buildsContainer');
    this.looseCardsAreaEl = document.getElementById('looseCardsArea');
    this.playerHandEl = document.getElementById('playerHand');
    this.turnStatusTextEl = document.getElementById('turnStatusText');
    this.btnCaptureEl = document.getElementById('btnCapture');
    this.btnBuildEl = document.getElementById('btnBuild');
    this.btnTrailEl = document.getElementById('btnTrail');
    this.btnCountOutEl = document.getElementById('btnCountOut');
    this.sweepOverlayEl = document.getElementById('sweepOverlay');
    this.historyFeedEl = document.getElementById('historyFeed');

    // Modals
    this.rulesModal = document.getElementById('rulesModal');
    this.settingsModal = document.getElementById('settingsModal');
    this.buildModal = document.getElementById('buildModal');
    this.buildOptionsListEl = document.getElementById('buildOptionsList');
    this.roundSummaryModal = document.getElementById('roundSummaryModal');
    this.roundSummaryBodyEl = document.getElementById('roundSummaryBody');
    this.gameOverModal = document.getElementById('gameOverModal');
    this.gameOverBodyEl = document.getElementById('gameOverBody');

    this.init();
  }

  init() {
    this.gameState = new GameState({ targetScore: 21, playerCount: 3 });
    this.attachEventListeners();
    this.render();
    sound.playDeal();
    this.processTurn();
  }

  attachEventListeners() {
    // Sound Toggle
    document.getElementById('btnToggleSound').addEventListener('click', (e) => {
      const enabled = sound.toggle();
      e.currentTarget.textContent = enabled ? '🔊' : '🔇';
    });

    // Rules Modal
    document.getElementById('btnRules').addEventListener('click', () => {
      this.openModal(this.rulesModal);
    });
    document.getElementById('btnCloseRules').addEventListener('click', () => {
      this.closeModal(this.rulesModal);
    });

    // Settings Modal
    document.getElementById('btnSettings').addEventListener('click', () => {
      this.openModal(this.settingsModal);
    });
    document.getElementById('btnCloseSettings').addEventListener('click', () => {
      this.closeModal(this.settingsModal);
    });

    // Fast AI Speed Toggle
    const fastAiCheckbox = document.getElementById('toggleFastAi');
    if (fastAiCheckbox) {
      fastAiCheckbox.addEventListener('change', (e) => {
        this.isFastMode = e.target.checked;
        this.aiSpeed = this.isFastMode ? 250 : 800;
      });
    }

    // Target Score Setting
    const targetScoreSelect = document.getElementById('selectTargetScore');
    if (targetScoreSelect) {
      targetScoreSelect.addEventListener('change', (e) => {
        const target = parseInt(e.target.value, 10);
        this.gameState.targetScore = target;
        this.render();
      });
    }

    // Reset Match Button
    document.getElementById('btnResetMatch').addEventListener('click', () => {
      this.closeModal(this.settingsModal);
      this.startNewMatch();
    });

    // Action Buttons
    this.btnCaptureEl.addEventListener('click', () => this.handleCaptureClick());
    this.btnBuildEl.addEventListener('click', () => this.handleBuildClick());
    this.btnTrailEl.addEventListener('click', () => this.handleTrailClick());
    this.btnCountOutEl.addEventListener('click', () => this.handleCountOutClick());

    // Build Modal Close
    document.getElementById('btnCloseBuildModal').addEventListener('click', () => {
      this.closeModal(this.buildModal);
    });

    // Next Round Button
    document.getElementById('btnNextRound').addEventListener('click', () => {
      this.closeModal(this.roundSummaryModal);
      this.gameState.initRound();
      sound.playDeal();
      this.render();
      this.processTurn();
    });

    // Play Again Button (Game Over)
    document.getElementById('btnPlayAgain').addEventListener('click', () => {
      this.closeModal(this.gameOverModal);
      this.startNewMatch();
    });

    // Backdrop clicks to close modals
    [this.rulesModal, this.settingsModal, this.buildModal].forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) this.closeModal(m);
      });
    });
  }

  startNewMatch() {
    const target = this.gameState ? this.gameState.targetScore : 21;
    this.gameState = new GameState({ targetScore: target, playerCount: 3 });
    this.selectedCard = null;
    this.validMoves = [];
    sound.playDeal();
    this.render();
    this.processTurn();
  }

  openModal(modalEl) {
    modalEl.classList.add('open');
  }

  closeModal(modalEl) {
    modalEl.classList.remove('open');
  }

  // Card Selection Handler
  selectCard(card) {
    if (this.gameState.currentTurn !== 0) return; // Only during Human turn
    
    if (this.selectedCard && this.selectedCard.id === card.id) {
      // Deselect
      this.selectedCard = null;
      this.validMoves = [];
    } else {
      this.selectedCard = card;
      this.validMoves = this.gameState.getValidMovesForCard(0, card);
      sound.playPlayCard();
    }
    this.render();
  }

  handleCaptureClick() {
    if (!this.selectedCard) return;
    const captureMoves = this.validMoves.filter(m => m.type === 'CAPTURE');
    if (captureMoves.length === 0) return;

    // Execute capture
    this.executeHumanMove(captureMoves[0]);
  }

  handleBuildClick() {
    if (!this.selectedCard) return;
    const buildMoves = this.validMoves.filter(m => m.type.startsWith('BUILD'));
    if (buildMoves.length === 0) return;

    if (buildMoves.length === 1) {
      this.executeHumanMove(buildMoves[0]);
      return;
    }

    // Multiple build possibilities: show options picker modal
    this.buildOptionsListEl.innerHTML = '';
    buildMoves.forEach((move, idx) => {
      const item = document.createElement('div');
      item.className = 'build-option-item';
      
      let badge = 'Single Build';
      if (move.type === 'BUILD_DOUBLE') badge = '🔒 Locked Double Build';
      if (move.type === 'BUILD_INCREASE') badge = '⬆️ Increase Build';

      item.innerHTML = `
        <div>
          <div class="build-option-title">${move.description}</div>
          <div class="build-option-desc">${badge}</div>
        </div>
        <button class="btn-action btn-build">Select</button>
      `;
      item.addEventListener('click', () => {
        this.closeModal(this.buildModal);
        this.executeHumanMove(move);
      });
      this.buildOptionsListEl.appendChild(item);
    });

    this.openModal(this.buildModal);
  }

  handleTrailClick() {
    if (!this.selectedCard) return;
    const trailMove = this.validMoves.find(m => m.type === 'TRAIL');
    if (!trailMove) return;

    this.executeHumanMove(trailMove);
  }

  handleCountOutClick() {
    const confirmed = window.confirm("Declare 'Count Out' to claim 21 points for immediate victory?\n\nWarning: In Kasi rules, miscounting results in an automatic loss!");
    if (!confirmed) return;

    const result = this.gameState.countOut(0);
    if (result.success) {
      sound.playWin();
      this.showGameOverModal(this.gameState.players[0]);
    } else {
      sound.playError();
      alert(`Miscount! You currently only have ${result.points} points, not 21.`);
      this.render();
    }
  }

  executeHumanMove(move) {
    try {
      const result = this.gameState.executeMove(0, move);
      this.selectedCard = null;
      this.validMoves = [];

      if (result.isSweep) {
        sound.playSweep();
        this.showSweepAnimation(result.player.name);
      } else if (move.type === 'CAPTURE') {
        sound.playCapture();
      } else if (move.type.startsWith('BUILD')) {
        sound.playBuild();
      } else {
        sound.playPlayCard();
      }

      this.render();

      if (result.roundOver) {
        this.handleRoundOver();
      } else {
        this.processTurn();
      }
    } catch (err) {
      console.error(err);
      sound.playError();
      alert(err.message);
    }
  }

  // Turn orchestration
  processTurn() {
    if (this.gameState.roundOver || this.gameState.gameOver) return;

    const currentPlayer = this.gameState.getCurrentPlayer();
    if (!currentPlayer.isAI) {
      // Human turn: wait for user action
      this.render();
      return;
    }

    // AI Turn
    this.render();
    setTimeout(() => {
      this.runAITurn(currentPlayer.id);
    }, this.aiSpeed);
  }

  runAITurn(aiId) {
    if (this.gameState.roundOver || this.gameState.gameOver) return;
    if (this.gameState.currentTurn !== aiId) return;

    const ai = this.aiPlayers[aiId];
    const move = ai.chooseMove(this.gameState, aiId);

    if (!move) {
      console.warn("AI has no legal move!");
      return;
    }

    const result = this.gameState.executeMove(aiId, move);

    if (result.isSweep) {
      sound.playSweep();
      this.showSweepAnimation(result.player.name);
    } else if (move.type === 'CAPTURE') {
      sound.playCapture();
    } else if (move.type.startsWith('BUILD')) {
      sound.playBuild();
    } else {
      sound.playPlayCard();
    }

    this.render();

    if (result.roundOver) {
      this.handleRoundOver();
    } else {
      this.processTurn();
    }
  }

  showSweepAnimation(playerName) {
    this.sweepOverlayEl.textContent = `💥 ${playerName.toUpperCase()} SWEEP! (+1 PT)`;
    this.sweepOverlayEl.classList.add('show');
    setTimeout(() => {
      this.sweepOverlayEl.classList.remove('show');
    }, 2000);
  }

  handleRoundOver() {
    if (this.gameState.gameOver) {
      sound.playWin();
      this.showGameOverModal(this.gameState.winner);
    } else {
      sound.playCapture();
      this.showRoundSummaryModal();
    }
  }

  showRoundSummaryModal() {
    const summary = this.gameState.roundScores;
    let html = `
      <div style="margin-bottom: 12px; font-weight: 700; color: #a7f3d0;">
        Round ${this.gameState.roundNumber} Complete! Points Awarded:
      </div>
      <div class="score-summary-grid">
    `;

    this.gameState.players.forEach(p => {
      const s = summary[p.id];
      html += `
        <div class="score-col">
          <div class="score-col-name">${p.name}</div>
          <div class="score-col-pts">+${s.pointsGained}</div>
          <div style="font-size: 0.75rem; color: #facc15; font-weight: bold;">Total: ${p.score} pts</div>
          <div class="score-col-detail">
            <div>🃏 Cards: ${s.cardCount} / 40</div>
            <div>♠ Spades: ${s.spadeCount} / 10</div>
            ${s.hasBigCasino ? '<div>⭐ Big Casino 10♦ (+2)</div>' : ''}
            ${s.hasLittleCasino ? '<div>🔹 Little Casino 2♠ (+1)</div>' : ''}
            ${s.aces > 0 ? `<div>★ Aces: ${s.aces} (+${s.aces})</div>` : ''}
            ${s.sweeps > 0 ? `<div>💥 Sweeps: ${s.sweeps} (+${s.sweeps})</div>` : ''}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    this.roundSummaryBodyEl.innerHTML = html;
    this.openModal(this.roundSummaryModal);
  }

  showGameOverModal(winner) {
    let html = `
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 3rem;">🏆</div>
        <h3 style="color: var(--gold-light); font-size: 1.4rem; margin: 8px 0;">${winner.name} Wins!</h3>
        <p style="color: #cbd5e1; font-size: 0.95rem;">Reached ${winner.score} points to take the Kasi Casino crown!</p>
      </div>
      <div class="score-summary-grid" style="margin-top: 16px;">
    `;

    this.gameState.players.forEach(p => {
      const isWin = p.id === winner.id;
      html += `
        <div class="score-col ${isWin ? 'winner' : ''}">
          <div class="score-col-name">${p.name}</div>
          <div class="score-col-pts">${p.score}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${isWin ? '👑 Champion' : 'Player'}</div>
        </div>
      `;
    });

    html += `</div>`;
    this.gameOverBodyEl.innerHTML = html;
    this.openModal(this.gameOverModal);
  }

  // Main UI Render
  render() {
    this.renderHeaderAndStatus();
    this.renderOpponents();
    this.renderBuilds();
    this.renderTableCards();
    this.renderPlayerHand();
    this.renderActionButtons();
    this.renderHistory();
  }

  renderHeaderAndStatus() {
    const curPlayer = this.gameState.getCurrentPlayer();
    if (this.gameState.gameOver) {
      this.turnStatusTextEl.textContent = `Match Over: ${this.gameState.winner.name} won!`;
    } else if (this.gameState.roundOver) {
      this.turnStatusTextEl.textContent = `Round ${this.gameState.roundNumber} ended. Calculating points...`;
    } else if (curPlayer.isAI) {
      this.turnStatusTextEl.textContent = `${curPlayer.name} is making a move...`;
    } else {
      if (this.selectedCard) {
        this.turnStatusTextEl.textContent = `Selected ${this.selectedCard.rank}${this.selectedCard.suit}: choose an action below`;
      } else {
        this.turnStatusTextEl.textContent = `Your Turn: Tap a card from your hand`;
      }
    }
  }

  renderOpponents() {
    this.opponentsBarEl.innerHTML = '';
    const aiPlayers = this.gameState.players.filter(p => p.isAI);

    aiPlayers.forEach(p => {
      const isTurn = this.gameState.currentTurn === p.id;
      const handCount = this.gameState.hands[p.id] ? this.gameState.hands[p.id].length : 0;
      const spades = p.capturedCards.filter(c => c.isSpade).length;
      const hasBig = p.capturedCards.some(c => c.isBigCasino);
      const hasLittle = p.capturedCards.some(c => c.isLittleCasino);
      const aces = p.capturedCards.filter(c => c.isAce).length;

      const div = document.createElement('div');
      div.className = `player-hud ${isTurn ? 'active-turn' : ''}`;
      div.innerHTML = `
        <div class="player-avatar">
          ${p.avatar}
          <span class="avatar-badge">${handCount}</span>
        </div>
        <div class="player-info">
          <div class="player-name-row">
            <span class="player-name">${p.name}</span>
            <span class="player-score">${p.score} pts</span>
          </div>
          <div class="player-stats-row">
            <span class="stat-chip">🃏 ${p.capturedCards.length}</span>
            <span class="stat-chip spades">♠ ${spades}</span>
            ${p.sweeps > 0 ? `<span class="stat-chip sweeps">💥 ${p.sweeps}</span>` : ''}
            ${hasBig ? `<span title="Big Casino 10♦">⭐</span>` : ''}
            ${hasLittle ? `<span title="Little Casino 2♠">🔹</span>` : ''}
            ${aces > 0 ? `<span title="${aces} Ace(s)">★${aces}</span>` : ''}
          </div>
        </div>
      `;
      this.opponentsBarEl.appendChild(div);
    });
  }

  renderBuilds() {
    this.buildsContainerEl.innerHTML = '';
    if (this.gameState.builds.length === 0) {
      return;
    }

    this.gameState.builds.forEach(build => {
      const owner = this.gameState.players[build.ownerId];
      const isLocked = build.isLocked;

      // Check if current human selection can capture or interact with this build
      let isCapturable = false;
      let isIncreasable = false;
      if (this.selectedCard && this.gameState.currentTurn === 0) {
        if (this.selectedCard.rank === build.value) isCapturable = true;
        if (!isLocked && this.validMoves.some(m => m.type === 'BUILD_INCREASE' && m.build.id === build.id)) {
          isIncreasable = true;
        }
      }

      const buildEl = document.createElement('div');
      buildEl.className = `build-group ${isLocked ? 'locked' : ''} ${isCapturable ? 'highlight-capture' : ''}`;
      
      let cardsHtml = '';
      build.cards.forEach(card => {
        cardsHtml += renderCardHTML(card, { isSelectable: false });
      });

      buildEl.innerHTML = `
        <div class="build-badge">
          <span class="build-val">${isLocked ? '🔒 ' : ''}${build.value}</span>
          <span class="build-owner">${owner ? owner.name : ''}</span>
        </div>
        <div class="build-cards-stack">
          ${cardsHtml}
        </div>
      `;

      this.buildsContainerEl.appendChild(buildEl);
    });
  }

  renderTableCards() {
    this.looseCardsAreaEl.innerHTML = '';
    if (this.gameState.tableCards.length === 0 && this.gameState.builds.length === 0) {
      this.looseCardsAreaEl.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; padding: 20px;">
          Empty Table (Ready for next play)
        </div>
      `;
      return;
    }

    // Determine which cards should be highlighted based on human selection
    const captureCardIds = new Set();
    const buildCardIds = new Set();

    if (this.selectedCard && this.gameState.currentTurn === 0) {
      this.validMoves.forEach(move => {
        if (move.type === 'CAPTURE') {
          (move.capturedCards || []).forEach(c => captureCardIds.add(c.id));
        } else if (move.type.startsWith('BUILD')) {
          (move.tableCards || []).forEach(c => buildCardIds.add(c.id));
        }
      });
    }

    this.gameState.tableCards.forEach(card => {
      let highlight = null;
      if (captureCardIds.has(card.id)) highlight = 'capture';
      else if (buildCardIds.has(card.id)) highlight = 'build';

      const cardWrapper = document.createElement('div');
      cardWrapper.innerHTML = renderCardHTML(card, {
        isSelectable: false,
        highlight
      });
      const cardEl = cardWrapper.firstElementChild;
      this.looseCardsAreaEl.appendChild(cardEl);
    });
  }

  renderPlayerHand() {
    this.playerHandEl.innerHTML = '';
    const myHand = this.gameState.hands[0] || [];
    const isMyTurn = this.gameState.currentTurn === 0 && !this.gameState.roundOver && !this.gameState.gameOver;

    myHand.forEach(card => {
      const isSelected = this.selectedCard && this.selectedCard.id === card.id;
      const cardWrapper = document.createElement('div');
      cardWrapper.innerHTML = renderCardHTML(card, {
        isSelected,
        isSelectable: isMyTurn,
        isDimmed: !isMyTurn
      });
      const cardEl = cardWrapper.firstElementChild;
      
      if (isMyTurn) {
        cardEl.addEventListener('click', () => this.selectCard(card));
      }

      this.playerHandEl.appendChild(cardEl);
    });
  }

  renderActionButtons() {
    const isMyTurn = this.gameState.currentTurn === 0 && !this.gameState.roundOver && !this.gameState.gameOver;
    const hasCard = this.selectedCard !== null;

    const captureMoves = hasCard ? this.validMoves.filter(m => m.type === 'CAPTURE') : [];
    const buildMoves = hasCard ? this.validMoves.filter(m => m.type.startsWith('BUILD')) : [];
    const trailMove = hasCard ? this.validMoves.find(m => m.type === 'TRAIL') : null;

    // Capture Button
    if (isMyTurn && captureMoves.length > 0) {
      this.btnCaptureEl.disabled = false;
      const totalCaptured = captureMoves[0].capturedCards.length + 1;
      this.btnCaptureEl.innerHTML = `<span>🎯 Capture (${totalCaptured})</span>`;
    } else {
      this.btnCaptureEl.disabled = true;
      this.btnCaptureEl.innerHTML = `<span>🎯 Capture</span>`;
    }

    // Build Button
    if (isMyTurn && buildMoves.length > 0) {
      this.btnBuildEl.disabled = false;
      this.btnBuildEl.innerHTML = `<span>🏗️ Build (${buildMoves.length})</span>`;
    } else {
      this.btnBuildEl.disabled = true;
      this.btnBuildEl.innerHTML = `<span>🏗️ Build</span>`;
    }

    // Trail Button
    if (isMyTurn && trailMove) {
      this.btnTrailEl.disabled = false;
      this.btnTrailEl.innerHTML = `<span>🃏 Trail</span>`;
      this.btnTrailEl.title = "Place card face up on table";
    } else {
      this.btnTrailEl.disabled = true;
      if (this.gameState.playerOwnsBuild(0)) {
        this.btnTrailEl.title = "Cannot trail while owning an active build!";
      } else {
        this.btnTrailEl.title = "";
      }
      this.btnTrailEl.innerHTML = `<span>🃏 Trail</span>`;
    }

    // Count Out Button
    this.btnCountOutEl.disabled = !isMyTurn;
  }

  renderHistory() {
    this.historyFeedEl.innerHTML = '';
    this.gameState.history.slice(0, 15).forEach(item => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.textContent = `${item.time} - ${item.text}`;
      this.historyFeedEl.appendChild(div);
    });
  }
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', () => {
  window.app = new KasiCasinoApp();
});
