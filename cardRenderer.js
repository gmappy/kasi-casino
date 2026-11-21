// cardRenderer.js - High-DPI Crisp SVG Playing Cards for Kasi Casino

import { SUIT_SYMBOLS, SUIT_NAMES, SUIT_COLORS, getRankLabel } from './gameEngine.js';

export function renderCardHTML(card, options = {}) {
  const {
    isFacedown = false,
    isSelected = false,
    isSelectable = true,
    isDimmed = false,
    highlight = null, // 'capture', 'build', 'money'
    scale = 1,
    extraClasses = ''
  } = options;

  if (isFacedown) {
    return `
      <div class="kasi-card facedown ${extraClasses}" data-card-id="${card ? card.id : ''}">
        <div class="card-back-pattern">
          <div class="pattern-inner">♠♥♦♣</div>
        </div>
      </div>
    `;
  }

  const isRed = card.suit === 'H' || card.suit === 'D';
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  const rankLabel = getRankLabel(card.rank);

  let specialBadge = '';
  let specialClass = '';

  if (card.isBigCasino) {
    specialBadge = '<span class="special-pill big-casino">BIG CASINO 10♦</span>';
    specialClass = 'is-big-casino';
  } else if (card.isLittleCasino) {
    specialBadge = '<span class="special-pill little-casino">LITTLE 2♠</span>';
    specialClass = 'is-little-casino';
  } else if (card.isAce) {
    specialBadge = '<span class="special-pill ace-badge">ACE 1★</span>';
    specialClass = 'is-ace';
  } else if (card.isSpade) {
    specialClass = 'is-spade';
  }

  const tag = isSelectable ? 'button' : 'div';
  const typeAttr = isSelectable ? 'type="button"' : '';
  const selectedClass = isSelected ? 'selected' : '';
  const selectableClass = isSelectable ? 'selectable' : '';
  const dimmedClass = isDimmed ? 'dimmed' : '';
  const highlightClass = highlight ? `highlight-${highlight}` : '';
  const label = `${rankLabel} of ${SUIT_NAMES[card.suit]}`;

  return `
    <${tag} ${typeAttr} class="kasi-card ${card.suit.toLowerCase()} ${specialClass} ${selectedClass} ${selectableClass} ${dimmedClass} ${highlightClass} ${extraClasses}" 
         aria-label="${label}"
         data-card-id="${card.id}" 
         data-rank="${card.rank}" 
         data-suit="${card.suit}" 
         data-value="${card.value}">
      <div class="card-corner top-left" style="color: ${color}">
        <span class="card-rank">${rankLabel}</span>
        <span class="card-suit">${symbol}</span>
      </div>
      
      <div class="card-center" style="color: ${color}">
        <div class="center-symbol">${symbol}</div>
        <div class="center-rank">${rankLabel}</div>
        ${specialBadge}
      </div>

      <div class="card-corner bottom-right" style="color: ${color}">
        <span class="card-rank">${rankLabel}</span>
        <span class="card-suit">${symbol}</span>
      </div>
    </${tag}>
  `;
}
