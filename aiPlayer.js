// aiPlayer.js - Tactical AI for South African Kasi Casino

export class AIPlayer {
  constructor(personality = 'balanced') {
    this.personality = personality; // 'aggressive' (Bra Moss) or 'tactical' (Sis Thandi)
  }

  chooseMove(gameState, playerId) {
    const hand = gameState.hands[playerId];
    const player = gameState.players[playerId];
    const allMoves = [];

    // Collect all valid moves for every card in AI's hand
    for (const card of hand) {
      const moves = gameState.getValidMovesForCard(playerId, card);
      allMoves.push(...moves);
    }

    if (allMoves.length === 0) {
      return null;
    }

    // Score every move
    let bestMove = null;
    let highestScore = -Infinity;

    for (const move of allMoves) {
      const score = this.evaluateMove(move, gameState, playerId);
      if (score > highestScore) {
        highestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  evaluateMove(move, gameState, playerId) {
    let score = 0;

    if (move.type === 'CAPTURE') {
      // 1. Point Cards captured
      const allCards = [move.card, ...(move.capturedCards || [])];
      for (const c of allCards) {
        if (c.isBigCasino) score += 60; // 10♦ is worth 2 pts + huge card
        if (c.isLittleCasino) score += 35; // 2♠ is 1 pt + spade
        if (c.isAce) score += 30; // 1 pt each
        if (c.isSpade) score += 12; // Spades count towards 1 pt
        score += 5; // Card count towards 3 pts
      }

      // Check if this results in a sweep
      const remainingLoose = gameState.tableCards.filter(c => !allCards.some(ac => ac.id === c.id));
      const remainingBuilds = gameState.builds.filter(b => !(move.builds || []).some(mb => mb.id === b.id));
      if (remainingLoose.length === 0 && remainingBuilds.length === 0) {
        score += 50; // Sweep bonus!
      }

      // Capturing own build vs opponent build
      if (move.builds && move.builds.length > 0) {
        for (const b of move.builds) {
          if (b.ownerId !== playerId) {
            score += 25; // Stealing opponent's build!
          } else {
            score += 15; // Securing own build
          }
        }
      }
    } 
    else if (move.type === 'BUILD_DOUBLE') {
      // Locking a build makes it immune to theft/increase!
      score += 40;
      // If Big Casino or Little Casino or Ace is in the build, locking is imperative
      const cardsInBuild = [move.card, ...(move.tableCards || []), ...(move.build ? move.build.cards : [])];
      for (const c of cardsInBuild) {
        if (c.isBigCasino) score += 50;
        if (c.isLittleCasino) score += 30;
        if (c.isAce) score += 20;
      }
    } 
    else if (move.type === 'BUILD_INCREASE') {
      // Stealing and increasing opponent's single build
      score += 35;
      if (move.build.ownerId !== playerId) {
        score += 15; // Denying opponent
      }
    } 
    else if (move.type === 'BUILD_SINGLE') {
      // Single build is vulnerable, but creates opportunities
      score += 20;

      // Penalize putting Big Casino or Little Casino into an open single build
      if (move.card.isBigCasino || move.tableCards.some(c => c.isBigCasino)) {
        score -= 40; // Too risky to leave 10♦ in single build
      }
      if (move.card.isLittleCasino || move.tableCards.some(c => c.isLittleCasino)) {
        score -= 25; // Risky to leave 2♠
      }

      // If target rank is high (e.g. 9 or 10), less likely to be increased
      if (move.targetRank >= 8) {
        score += 10;
      }
    } 
    else if (move.type === 'TRAIL') {
      // Trailing is default fallback, scored lower
      score = 0;

      // NEVER trail money cards unless forced!
      if (move.card.isBigCasino) score -= 150;
      if (move.card.isLittleCasino) score -= 100;
      if (move.card.isAce) score -= 80;
      if (move.card.isSpade) score -= 15;

      // Prefer trailing cards of ranks that are unlikely to sum to 10 with table cards
      // Low ranks (3, 4, 5) might easily pair or combine
      score -= (10 - move.card.rank) * 2;
    }

    // Personality flavor adjustments
    if (this.personality === 'aggressive') {
      if (move.type.startsWith('BUILD')) score += 5;
    } else {
      if (move.type === 'CAPTURE') score += 5;
    }

    // Slight randomness to avoid completely robotic identical plays
    score += Math.random() * 2;

    return score;
  }
}
