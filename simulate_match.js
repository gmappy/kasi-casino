// simulate_match.js - Simulate full multi-round matches to ensure no stuck states or deadlocks

import { GameState } from './gameEngine.js';
import { AIPlayer } from './aiPlayer.js';

const aiPlayers = {
  0: new AIPlayer('balanced'),
  1: new AIPlayer('aggressive'),
  2: new AIPlayer('tactical')
};

console.log("Simulating 5 full Kasi Casino matches...");

for (let match = 1; match <= 5; match++) {
  const game = new GameState({ targetScore: 21, playerCount: 3 });
  // Set all players to AI for simulation
  game.players[0].isAI = true;

  let totalMoves = 0;
  while (!game.gameOver && game.roundNumber <= 10) {
    if (game.roundOver) {
      if (game.gameOver) break;
      game.initRound();
    }

    const curPlayer = game.getCurrentPlayer();
    const ai = aiPlayers[curPlayer.id];
    const move = ai.chooseMove(game, curPlayer.id);

    if (!move) {
      throw new Error(`Deadlock! Player ${curPlayer.id} (${curPlayer.name}) has no valid move! Hand: ${JSON.stringify(game.hands[curPlayer.id])}`);
    }

    game.executeMove(curPlayer.id, move);
    totalMoves++;
  }

  console.log(`Match ${match} finished in Round ${game.roundNumber} after ${totalMoves} moves. Winner: ${game.winner ? game.winner.name : 'None'} (${game.winner ? game.winner.score : 0} pts)`);
  if (!game.gameOver) {
    throw new Error(`Match ${match} did not conclude properly within 10 rounds!`);
  }
}

console.log("✅ All 5 full match simulations finished successfully with zero deadlocks!");
