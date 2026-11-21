/**
 * gameEngine.js - Strict South African 40-Card Kasi Casino Game Engine
 * 
 * Implements standard Kasi / Township rules:
 * - 40-Card Deck (Aces through 10, face cards stripped)
 * - Ace is strictly worth 1 point in captures and builds
 * - 3-Player 10-10-10-10 deal
 * - Single builds vs locked compound/double builds
 * - Sweeps, last capture bonuses, 11-point scoring system, and Count Out.
 */

export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
export const SUIT_COLORS = { S: '#1e293b', H: '#dc2626', D: '#ea580c', C: '#334155' };

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Ace=1, no Jacks/Queens/Kings

/**
 * Returns human-readable rank label ('A' for 1, or string number)
 * @param {number} rank - Card rank integer (1-10)
 * @returns {string}
 */
export function getRankLabel(rank) {
  if (rank === 1) return 'A';
  return String(rank);
}

/**
 * Generates a standard 40-card South African Kasi Casino deck.
 * Strips all Jacks, Queens, and Kings.
 * @returns {Array<Object>} 40 card objects
 */
export function createDeck() {
  const deck = [];
  let id = 1;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `card_${id++}`,
        suit,
        rank,
        value: rank, // Ace is strictly 1 in captures and builds
        isBigCasino: suit === 'D' && rank === 10,
        isLittleCasino: suit === 'S' && rank === 2,
        isAce: rank === 1,
        isSpade: suit === 'S'
      });
    }
  }
  return deck;
}

/**
 * Shuffles deck using Fisher-Yates algorithm.
 * @param {Array<Object>} deck 
 * @returns {Array<Object>}
 */
export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Finds all subsets of cards whose numerical values add up to target.
 * Requires subset length >= 2 (single card match is a pair, not a sum).
 * @param {Array<Object>} cards 
 * @param {number} target 
 * @returns {Array<Array<Object>>}
 */
export function findSubsetsSummingTo(cards, target) {
  const results = [];
  
  function backtrack(start, currentSubset, currentSum) {
    if (currentSum === target && currentSubset.length >= 2) {
      results.push([...currentSubset]);
      // continue searching as cards can't have value 0
    }
    for (let i = start; i < cards.length; i++) {
      if (currentSum + cards[i].value <= target) {
        currentSubset.push(cards[i]);
        backtrack(i + 1, currentSubset, currentSum + cards[i].value);
        currentSubset.pop();
      }
    }
  }

  backtrack(0, [], 0);
  return results;
}

// Greedily partition loose cards into multiple disjoint subsets that each sum to target
// Also include any single cards whose rank matches target
export function getGreedySumCombinations(cards, target) {
  // First, find all single matching cards (pair captures)
  const singleMatches = cards.filter(c => c.rank === target);
  let remainingCards = cards.filter(c => c.rank !== target);
  
  const sumGroups = [];
  
  // Find disjoint subsets that sum to target (prefer largest subsets to capture more cards)
  while (remainingCards.length >= 2) {
    const subsets = findSubsetsSummingTo(remainingCards, target);
    if (subsets.length === 0) break;
    
    // Sort subsets: prefer high point cards or most cards
    subsets.sort((a, b) => {
      const ptsA = a.reduce((acc, c) => acc + (c.isBigCasino ? 2 : (c.isLittleCasino ? 1 : (c.isAce ? 1 : 0))), 0);
      const ptsB = b.reduce((acc, c) => acc + (c.isBigCasino ? 2 : (c.isLittleCasino ? 1 : (c.isAce ? 1 : 0))), 0);
      if (ptsB !== ptsA) return ptsB - ptsA;
      return b.length - a.length;
    });

    const chosen = subsets[0];
    sumGroups.push(chosen);
    const chosenIds = new Set(chosen.map(c => c.id));
    remainingCards = remainingCards.filter(c => !chosenIds.has(c.id));
  }

  return {
    singleMatches,
    sumGroups,
    allCapturedCards: [...singleMatches, ...sumGroups.flat()]
  };
}

export class GameState {
  constructor(config = {}) {
    this.targetScore = config.targetScore || 21;
    this.playerCount = config.playerCount || 3; // Standard 3-Hand Kasi Casino
    this.players = [
      { id: 0, name: config.playerName || 'You', isAI: false, avatar: '👤', score: 0, capturedCards: [], sweeps: 0 },
      { id: 1, name: 'Bra Moss', isAI: true, avatar: '🦁', score: 0, capturedCards: [], sweeps: 0 },
      { id: 2, name: 'Sis Thandi', isAI: true, avatar: '🦅', score: 0, capturedCards: [], sweeps: 0 }
    ];
    if (this.playerCount === 2) {
      this.players.pop(); // 2-player mode
    }

    this.roundNumber = 0;
    this.dealerIndex = this.players.length - 1; // Dealer starts so Player 0 (You) goes first in Round 1
    this.currentTurn = 0;
    this.deck = [];
    this.hands = {};
    this.tableCards = []; // Loose cards on table
    this.builds = []; // Active builds on table
    this.lastCapturerId = null;
    this.history = [];
    this.gameOver = false;
    this.winner = null;
    this.roundOver = false;

    this.initRound();
  }

  initRound() {
    this.roundNumber++;
    this.roundOver = false;
    this.lastCapturerId = null;

    // Reset captured cards & sweeps for the round
    this.players.forEach(p => {
      p.capturedCards = [];
      p.sweeps = 0;
    });

    this.deck = shuffleDeck(createDeck());
    this.hands = {};
    this.players.forEach(p => {
      this.hands[p.id] = [];
    });
    this.tableCards = [];
    this.builds = [];

    if (this.playerCount === 3) {
      // 3-Hand Kasi Casino: 40 cards exact!
      // 10 cards to each of the 3 players, 10 cards face-up to table
      for (let i = 0; i < 10; i++) {
        for (const p of this.players) {
          this.hands[p.id].push(this.deck.pop());
        }
      }
      for (let i = 0; i < 10; i++) {
        this.tableCards.push(this.deck.pop());
      }
    } else {
      // 2-Player mode: 4 to each, 4 to table; rest dealt in rounds of 4
      for (let i = 0; i < 4; i++) {
        for (const p of this.players) {
          this.hands[p.id].push(this.deck.pop());
        }
      }
      for (let i = 0; i < 4; i++) {
        this.tableCards.push(this.deck.pop());
      }
    }

    // Turn starts clockwise from dealer's left
    this.currentTurn = (this.dealerIndex + 1) % this.players.length;
    this.log(`Round ${this.roundNumber} started! 40-Card Kasi Casino deal.`);
  }

  log(msg) {
    this.history.unshift({ time: new Date().toLocaleTimeString(), text: msg });
    if (this.history.length > 50) this.history.pop();
  }

  getCurrentPlayer() {
    return this.players[this.currentTurn];
  }

  // Check if player currently owns an active build on the table
  playerOwnsBuild(playerId) {
    return this.builds.some(b => b.ownerId === playerId);
  }

  // Get all legal moves for a specific card in player's hand
  getValidMovesForCard(playerId, card) {
    const hand = this.hands[playerId];
    const ownsBuild = this.playerOwnsBuild(playerId);
    const moves = [];

    // 1. CAPTURE MOVES
    // A card of rank R can capture:
    // a) Active builds of value R (whether owned by player or opponent)
    // b) Matching rank loose cards (Pair capture)
    // c) Subsets of loose cards summing to R (Sum capture)
    const matchingBuilds = this.builds.filter(b => b.value === card.rank);
    const sumResult = getGreedySumCombinations(this.tableCards, card.rank);
    const hasCapture = matchingBuilds.length > 0 || sumResult.allCapturedCards.length > 0;

    if (hasCapture) {
      moves.push({
        type: 'CAPTURE',
        card,
        targetRank: card.rank,
        builds: matchingBuilds,
        singleMatches: sumResult.singleMatches,
        sumGroups: sumResult.sumGroups,
        capturedCards: [
          ...matchingBuilds.flatMap(b => b.cards),
          ...sumResult.allCapturedCards
        ],
        description: `Capture with ${card.rank}${SUIT_SYMBOLS[card.suit]}`
      });
    }

    // 2. BUILD MOVES
    // To build value V (V <= 10):
    // Player MUST hold another card of rank V in hand!
    const otherCardsInHand = hand.filter(c => c.id !== card.id);
    const candidateTargetRanks = [...new Set(otherCardsInHand.map(c => c.rank))].filter(r => r > card.value);

    for (const targetRank of candidateTargetRanks) {
      const neededSum = targetRank - card.value;

      // Type 2a: Single Build using card + 1 or more loose table cards
      // Single loose card matching neededSum
      const singleTableMatches = this.tableCards.filter(c => c.value === neededSum);
      for (const tableCard of singleTableMatches) {
        moves.push({
          type: 'BUILD_SINGLE',
          card,
          targetRank,
          tableCards: [tableCard],
          description: `Build ${targetRank} (${card.value} + ${tableCard.value})`
        });
      }

      // Multiple loose cards summing to neededSum
      if (neededSum >= 2) {
        const subsets = findSubsetsSummingTo(this.tableCards, neededSum);
        for (const subset of subsets) {
          moves.push({
            type: 'BUILD_SINGLE',
            card,
            targetRank,
            tableCards: subset,
            description: `Build ${targetRank} (${card.value} + [${subset.map(c => c.value).join('+')}])`
          });
        }
      }

      // Type 2b: Increase an existing UNLOCKED single build
      // If there is an unlocked single build of value V_old, and V_old + card.value === targetRank
      for (const build of this.builds) {
        if (!build.isLocked) {
          if (build.value + card.value === targetRank) {
            moves.push({
              type: 'BUILD_INCREASE',
              card,
              targetRank,
              build,
              description: `Increase Build ${build.value} -> ${targetRank}`
            });
          }
        }
      }
    }

    // Type 2c: Double / Multiple Build (Locking)
    // If player holds targetRank in hand (and played card has value <= targetRank)
    // Case 1: Playing a card equal to targetRank onto an existing single build of targetRank
    // (e.g. build of 8 exists, player plays 8 from hand onto it, holding another 8)
    const cardsOfSameRank = hand.filter(c => c.id !== card.id && c.rank === card.rank);
    if (cardsOfSameRank.length > 0) {
      // Player holds at least two cards of rank `card.rank`.
      // If there's an existing build of card.rank, player can merge card to lock it!
      const existingBuildsOfSameRank = this.builds.filter(b => b.value === card.rank && !b.isLocked);
      for (const build of existingBuildsOfSameRank) {
        moves.push({
          type: 'BUILD_DOUBLE',
          card,
          targetRank: card.rank,
          build,
          tableCards: [],
          description: `Lock Double Build ${card.rank} with ${card.rank}${SUIT_SYMBOLS[card.suit]}`
        });
      }

      // Also if loose table cards equal card.rank or sum to card.rank, player can create a double build
      // e.g. hand has two 8s. Table has 8 or 5+3. Player plays 8 or forms another 8 to create double build!
    }

    // Case 2: Player forms targetRank with (card + tableCards), and ALSO merges an existing table card or build of targetRank!
    for (const targetRank of candidateTargetRanks) {
      const neededSum = targetRank - card.value;
      const looseMatchingTarget = this.tableCards.filter(c => c.rank === targetRank);
      const existingBuildOfTarget = this.builds.find(b => b.value === targetRank);

      if (looseMatchingTarget.length > 0 || existingBuildOfTarget) {
        // Find table cards summing to neededSum
        const candidateSubsets = [];
        const singleMatches = this.tableCards.filter(c => c.value === neededSum && c.rank !== targetRank);
        for (const sc of singleMatches) candidateSubsets.push([sc]);

        if (neededSum >= 2) {
          const subsets = findSubsetsSummingTo(this.tableCards.filter(c => c.rank !== targetRank), neededSum);
          candidateSubsets.push(...subsets);
        }

        for (const subset of candidateSubsets) {
          moves.push({
            type: 'BUILD_DOUBLE',
            card,
            targetRank,
            tableCards: [...subset, ...looseMatchingTarget],
            build: existingBuildOfTarget,
            description: `Lock Double Build ${targetRank} (Compound)`
          });
        }
      }
    }

    // 3. TRAIL MOVE
    // Legal ONLY if player does not own an active build on the table!
    if (!ownsBuild) {
      moves.push({
        type: 'TRAIL',
        card,
        description: `Trail ${card.rank}${SUIT_SYMBOLS[card.suit]}`
      });
    }

    return moves;
  }

  // Execute a selected move
  executeMove(playerId, move) {
    const player = this.players[playerId];
    const hand = this.hands[playerId];

    // Remove card from player's hand
    const cardIndex = hand.findIndex(c => c.id === move.card.id);
    if (cardIndex === -1) {
      throw new Error(`Card ${move.card.id} not found in player hand!`);
    }
    const [playedCard] = hand.splice(cardIndex, 1);

    let isSweep = false;

    if (move.type === 'TRAIL') {
      if (this.playerOwnsBuild(playerId)) {
        throw new Error("Cannot trail while owning an active build!");
      }
      this.tableCards.push(playedCard);
      this.log(`${player.name} trailed ${playedCard.rank}${SUIT_SYMBOLS[playedCard.suit]}`);
    } 
    else if (move.type === 'CAPTURE') {
      const captured = [playedCard, ...move.capturedCards];
      
      // Remove captured loose cards from table
      const capturedIds = new Set(move.capturedCards.map(c => c.id));
      this.tableCards = this.tableCards.filter(c => !capturedIds.has(c.id));

      // Remove captured builds from table
      if (move.builds && move.builds.length > 0) {
        const buildIds = new Set(move.builds.map(b => b.id));
        this.builds = this.builds.filter(b => !buildIds.has(b.id));
      }

      // Add to player's capture pile
      player.capturedCards.push(...captured);
      this.lastCapturerId = playerId;

      // Check Sweep: Did this capture clear all loose cards and builds from table?
      if (this.tableCards.length === 0 && this.builds.length === 0) {
        isSweep = true;
        player.sweeps++;
        this.log(`💥 SWEEP! ${player.name} cleared the entire table with ${playedCard.rank}${SUIT_SYMBOLS[playedCard.suit]}! (+1 Sweep point)`);
      } else {
        const count = captured.length;
        this.log(`${player.name} captured ${count} cards with ${playedCard.rank}${SUIT_SYMBOLS[playedCard.suit]}`);
      }
    } 
    else if (move.type === 'BUILD_SINGLE') {
      // Remove table cards used in the build from loose cards
      const usedIds = new Set(move.tableCards.map(c => c.id));
      this.tableCards = this.tableCards.filter(c => !usedIds.has(c.id));

      const newBuild = {
        id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        value: move.targetRank,
        ownerId: playerId,
        isLocked: false,
        cards: [playedCard, ...move.tableCards],
        sets: [[playedCard, ...move.tableCards]]
      };
      this.builds.push(newBuild);
      this.log(`${player.name} built Single ${move.targetRank} with ${playedCard.rank}${SUIT_SYMBOLS[playedCard.suit]} and ${move.tableCards.map(c => c.rank).join('+')}`);
    } 
    else if (move.type === 'BUILD_INCREASE') {
      const targetBuild = this.builds.find(b => b.id === move.build.id);
      if (!targetBuild || targetBuild.isLocked) {
        throw new Error("Cannot increase locked or non-existent build!");
      }
      targetBuild.value = move.targetRank;
      targetBuild.ownerId = playerId;
      targetBuild.cards.push(playedCard);
      targetBuild.sets[0].push(playedCard);
      this.log(`${player.name} increased Build to ${move.targetRank} with ${playedCard.rank}${SUIT_SYMBOLS[playedCard.suit]}`);
    } 
    else if (move.type === 'BUILD_DOUBLE') {
      // Locking a build into a double/multiple build
      let targetBuild = move.build ? this.builds.find(b => b.id === move.build.id) : null;
      const usedIds = new Set((move.tableCards || []).map(c => c.id));
      this.tableCards = this.tableCards.filter(c => !usedIds.has(c.id));

      if (targetBuild) {
        targetBuild.isLocked = true;
        targetBuild.ownerId = playerId;
        targetBuild.cards.push(playedCard, ...(move.tableCards || []));
        targetBuild.sets.push([playedCard, ...(move.tableCards || [])]);
      } else {
        targetBuild = {
          id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          value: move.targetRank,
          ownerId: playerId,
          isLocked: true,
          cards: [playedCard, ...(move.tableCards || [])],
          sets: [[playedCard], [...(move.tableCards || [])]]
        };
        this.builds.push(targetBuild);
      }
      this.log(`🔒 ${player.name} created Locked Double Build ${move.targetRank}!`);
    }

    // Check if hands are empty and whether more deals or round end
    this.checkTurnProgression();

    return {
      move,
      isSweep,
      player,
      roundOver: this.roundOver,
      gameOver: this.gameOver
    };
  }

  checkTurnProgression() {
    // Check if all players have cards in hand
    const allHandsEmpty = this.players.every(p => this.hands[p.id].length === 0);

    if (allHandsEmpty) {
      if (this.deck.length > 0) {
        // Deal next cards (for 2-player mode)
        const cardsPerDeal = 4;
        for (let i = 0; i < cardsPerDeal; i++) {
          for (const p of this.players) {
            if (this.deck.length > 0) {
              this.hands[p.id].push(this.deck.pop());
            }
          }
        }
        this.log(`Dealt next round of cards from deck.`);
      } else {
        // End of Hand / Round!
        this.finishRound();
        return;
      }
    }

    // Advance turn to next player who has cards
    let nextTurn = (this.currentTurn + 1) % this.players.length;
    let attempts = 0;
    while (this.hands[this.players[nextTurn].id].length === 0 && attempts < this.players.length) {
      nextTurn = (nextTurn + 1) % this.players.length;
      attempts++;
    }
    this.currentTurn = nextTurn;
  }

  finishRound() {
    this.roundOver = true;

    // Rule: Whoever made the last capture sweeps all remaining table cards & builds!
    if (this.lastCapturerId !== null) {
      const lastPlayer = this.players[this.lastCapturerId];
      const remainingCards = [...this.tableCards, ...this.builds.flatMap(b => b.cards)];
      if (remainingCards.length > 0) {
        lastPlayer.capturedCards.push(...remainingCards);
        this.tableCards = [];
        this.builds = [];
        this.log(`🎯 ${lastPlayer.name} made the last capture and sweeps all remaining table cards (${remainingCards.length} cards)!`);
      }
    }

    // Calculate Round Scores
    const roundScores = this.calculateRoundScores();
    this.roundScores = roundScores;

    // Check for Game Winner (First to targetScore)
    for (const p of this.players) {
      if (p.score >= this.targetScore) {
        this.gameOver = true;
      }
    }

    if (this.gameOver) {
      // Winner is player with highest score
      const sorted = [...this.players].sort((a, b) => b.score - a.score);
      this.winner = sorted[0];
      this.log(`🏆 GAME OVER! ${this.winner.name} wins with ${this.winner.score} points!`);
    } else {
      this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    }
  }

  calculateRoundScores() {
    const summary = {};
    const cardCounts = {};
    const spadeCounts = {};

    this.players.forEach(p => {
      const cards = p.capturedCards;
      cardCounts[p.id] = cards.length;
      spadeCounts[p.id] = cards.filter(c => c.isSpade).length;

      summary[p.id] = {
        name: p.name,
        cardCount: cards.length,
        spadeCount: spadeCounts[p.id],
        hasBigCasino: cards.some(c => c.isBigCasino),
        hasLittleCasino: cards.some(c => c.isLittleCasino),
        aces: cards.filter(c => c.isAce).length,
        sweeps: p.sweeps,
        pointsGained: 0,
        breakdown: []
      };
    });

    // 1. Most Cards (3 pts) - Single highest count out of 40; 0 pts if tied
    let maxCards = -1;
    let maxCardsHolders = [];
    for (const [id, count] of Object.entries(cardCounts)) {
      if (count > maxCards) {
        maxCards = count;
        maxCardsHolders = [Number(id)];
      } else if (count === maxCards) {
        maxCardsHolders.push(Number(id));
      }
    }
    if (maxCardsHolders.length === 1 && maxCards > 0) {
      const winnerId = maxCardsHolders[0];
      summary[winnerId].pointsGained += 3;
      summary[winnerId].breakdown.push(`Most Cards (${maxCards}): +3 pts`);
    } else if (maxCardsHolders.length > 1) {
      this.log(`Most cards tied (${maxCards}) - 0 points awarded.`);
    }

    // 2. Most Spades (1 pt) - Single highest count out of 10; 0 pts if tied
    let maxSpades = -1;
    let maxSpadesHolders = [];
    for (const [id, count] of Object.entries(spadeCounts)) {
      if (count > maxSpades) {
        maxSpades = count;
        maxSpadesHolders = [Number(id)];
      } else if (count === maxSpades) {
        maxSpadesHolders.push(Number(id));
      }
    }
    if (maxSpadesHolders.length === 1 && maxSpades > 0) {
      const winnerId = maxSpadesHolders[0];
      summary[winnerId].pointsGained += 1;
      summary[winnerId].breakdown.push(`Most Spades (${maxSpades}): +1 pt`);
    } else if (maxSpadesHolders.length > 1) {
      this.log(`Most Spades tied (${maxSpades}) - 0 points awarded.`);
    }

    // 3. Big Casino (10 of Diamonds) = 2 pts
    // 4. Little Casino (2 of Spades) = 1 pt
    // 5. Aces = 1 pt each
    // 6. Sweeps = 1 pt each
    this.players.forEach(p => {
      const s = summary[p.id];
      if (s.hasBigCasino) {
        s.pointsGained += 2;
        s.breakdown.push(`Big Casino (10♦): +2 pts`);
      }
      if (s.hasLittleCasino) {
        s.pointsGained += 1;
        s.breakdown.push(`Little Casino (2♠): +1 pt`);
      }
      if (s.aces > 0) {
        s.pointsGained += s.aces;
        s.breakdown.push(`${s.aces} Ace${s.aces > 1 ? 's' : ''}: +${s.aces} pt${s.aces > 1 ? 's' : ''}`);
      }
      if (s.sweeps > 0) {
        s.pointsGained += s.sweeps;
        s.breakdown.push(`${s.sweeps} Sweep${s.sweeps > 1 ? 's' : ''}: +${s.sweeps} pt${s.sweeps > 1 ? 's' : ''}`);
      }

      p.score += s.pointsGained;
      s.totalScore = p.score;
    });

    return summary;
  }

  // Count Out: A player claims 21 points mid-round
  countOut(playerId) {
    const player = this.players[playerId];
    // Calculate current confirmed points
    let guaranteedPoints = player.score;
    const cards = player.capturedCards;
    if (cards.some(c => c.isBigCasino)) guaranteedPoints += 2;
    if (cards.some(c => c.isLittleCasino)) guaranteedPoints += 1;
    guaranteedPoints += cards.filter(c => c.isAce).length;
    guaranteedPoints += player.sweeps;

    if (guaranteedPoints >= this.targetScore) {
      player.score = guaranteedPoints;
      this.gameOver = true;
      this.winner = player;
      this.log(`🎉 COUNT OUT SUCCESS! ${player.name} accurately counted out with ${guaranteedPoints} points and wins!`);
      return { success: true, points: guaranteedPoints };
    } else {
      // Miscount! Automatic loss in Kasi rules!
      this.log(`❌ COUNT OUT FAILED! ${player.name} claimed 21 but only has ${guaranteedPoints} points. Disqualified!`);
      return { success: false, points: guaranteedPoints };
    }
  }
}
