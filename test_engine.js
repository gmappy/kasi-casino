// test_engine.js - Test suite for Kasi Casino Game Engine & AI

import {
  createDeck,
  shuffleDeck,
  findSubsetsSummingTo,
  getGreedySumCombinations,
  GameState
} from './gameEngine.js';
import { AIPlayer } from './aiPlayer.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("--- 1. Testing Deck Composition ---");
const deck = createDeck();
assert(deck.length === 40, `Deck has exactly 40 cards (got ${deck.length})`);
assert(deck.filter(c => c.rank >= 1 && c.rank <= 10).length === 40, "All cards have ranks 1 to 10 (no face cards)");

const bigCasino = deck.find(c => c.isBigCasino);
assert(bigCasino && bigCasino.suit === 'D' && bigCasino.rank === 10, "10 of Diamonds is correctly marked Big Casino");

const littleCasino = deck.find(c => c.isLittleCasino);
assert(littleCasino && littleCasino.suit === 'S' && littleCasino.rank === 2, "2 of Spades is correctly marked Little Casino");

const aces = deck.filter(c => c.isAce);
assert(aces.length === 4, `4 Aces present in deck (got ${aces.length})`);

const spades = deck.filter(c => c.isSpade);
assert(spades.length === 10, `10 Spades present in deck (got ${spades.length})`);

console.log("\n--- 2. Testing Sum Combinations ---");
const sampleTable = [
  { id: '1', rank: 3, value: 3, suit: 'H' },
  { id: '2', rank: 5, value: 5, suit: 'S' },
  { id: '3', rank: 8, value: 8, suit: 'D' },
  { id: '4', rank: 2, value: 2, suit: 'C' },
  { id: '5', rank: 6, value: 6, suit: 'H' }
];

const subsets8 = findSubsetsSummingTo(sampleTable, 8);
// 3+5 = 8, 2+6 = 8
assert(subsets8.length >= 2, `Found at least 2 subsets summing to 8 (got ${subsets8.length})`);

const greedy = getGreedySumCombinations(sampleTable, 8);
assert(greedy.singleMatches.length === 1, "Found single match 8");
assert(greedy.sumGroups.length === 2, `Found two sum groups (3+5, 2+6), got ${greedy.sumGroups.length}`);
assert(greedy.allCapturedCards.length === 5, `Greedy capture took all 5 cards!`);

console.log("\n--- 3. Testing 3-Hand Deal & State ---");
const game = new GameState({ targetScore: 21, playerCount: 3 });
assert(game.players.length === 3, "3 players created");
assert(game.hands[0].length === 10, "Player 1 dealt 10 cards");
assert(game.hands[1].length === 10, "Player 2 dealt 10 cards");
assert(game.hands[2].length === 10, "Player 3 dealt 10 cards");
assert(game.tableCards.length === 10, "Table dealt 10 cards");
assert(game.deck.length === 0, "All 40 cards distributed cleanly (10-10-10-10)!");

console.log("\n--- 4. Testing Build & Trail Constraints ---");
// Create a controlled state:
const testGame = new GameState({ targetScore: 21, playerCount: 3 });
// Clear hands & table
testGame.hands[0] = [
  { id: 'p1_3', rank: 3, value: 3, suit: 'H' },
  { id: 'p1_7', rank: 7, value: 7, suit: 'D' },
  { id: 'p1_9', rank: 9, value: 9, suit: 'S' }
];
testGame.tableCards = [
  { id: 't_4', rank: 4, value: 4, suit: 'C' }
];
testGame.builds = [];
testGame.currentTurn = 0;

// Moves for card 3: should be able to build 7 (3 + 4) because player holds 7!
const movesFor3 = testGame.getValidMovesForCard(0, testGame.hands[0][0]);
const build7Move = movesFor3.find(m => m.type === 'BUILD_SINGLE' && m.targetRank === 7);
assert(build7Move !== undefined, "Found valid single build of 7 using 3 + 4 (holding 7)");

// Execute the build of 7
testGame.executeMove(0, build7Move);
assert(testGame.builds.length === 1, "Build of 7 created on table");
assert(testGame.builds[0].ownerId === 0, "Build owned by player 0");
assert(testGame.playerOwnsBuild(0) === true, "Player 0 owns an active build");

// Now player 0 should NOT be allowed to trail
const movesFor7 = testGame.getValidMovesForCard(0, testGame.hands[0][0]); // 7
const trailMove = movesFor7.find(m => m.type === 'TRAIL');
assert(trailMove === undefined, "Player cannot trail while owning an active build!");

console.log("\n--- 5. Testing AI Move Selection ---");
const ai = new AIPlayer('aggressive');
testGame.hands[1] = [
  { id: 'ai_7', rank: 7, value: 7, suit: 'S', isSpade: true },
  { id: 'ai_1', rank: 1, value: 1, suit: 'H', isAce: true }
];
testGame.currentTurn = 1;
const aiMove = ai.chooseMove(testGame, 1);
assert(aiMove !== null, "AI successfully found a move");
assert(aiMove.type === 'CAPTURE' && aiMove.targetRank === 7, `AI chose to capture the Build of 7! (Chose: ${aiMove.description})`);

console.log("\n--- 6. Testing Round Scoring ---");
const scoringGame = new GameState({ targetScore: 21, playerCount: 3 });
// Give player 0: 20 cards including Big Casino, 6 Spades, 2 Aces
scoringGame.players[0].capturedCards = [
  { id: 'c1', rank: 10, suit: 'D', value: 10, isBigCasino: true, isSpade: false },
  { id: 'c2', rank: 2, suit: 'S', value: 2, isLittleCasino: true, isSpade: true },
  { id: 'c3', rank: 1, suit: 'S', value: 1, isAce: true, isSpade: true },
  { id: 'c4', rank: 1, suit: 'H', value: 1, isAce: true, isSpade: false },
  { id: 'c5', rank: 3, suit: 'S', value: 3, isSpade: true },
  { id: 'c6', rank: 4, suit: 'S', value: 4, isSpade: true },
  { id: 'c7', rank: 5, suit: 'S', value: 5, isSpade: true },
  { id: 'c8', rank: 6, suit: 'S', value: 6, isSpade: true },
  ...Array(12).fill(null).map((_, i) => ({ id: `fill_${i}`, rank: 4, suit: 'C', value: 4, isSpade: false }))
]; // 20 cards, 6 spades, Big Casino, Little Casino, 2 Aces

scoringGame.players[1].capturedCards = Array(12).fill(null).map((_, i) => ({ id: `p1_${i}`, rank: 5, suit: 'H', value: 5, isSpade: false }));
scoringGame.players[2].capturedCards = Array(8).fill(null).map((_, i) => ({ id: `p2_${i}`, rank: 6, suit: 'C', value: 6, isSpade: false }));

const summary = scoringGame.calculateRoundScores();
// P0 should get:
// Most cards (20 > 12 > 8): 3 pts
// Most spades (6 > 0 > 0): 1 pt
// Big Casino: 2 pts
// Little Casino: 1 pt
// 2 Aces: 2 pts
// Total = 3 + 1 + 2 + 1 + 2 = 9 pts
assert(summary[0].pointsGained === 9, `Player 0 gained exactly 9 points (got ${summary[0].pointsGained})`);

console.log("\nALL ENGINE TESTS PASSED! 🎉");
