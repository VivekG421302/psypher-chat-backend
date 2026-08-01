const COLORS = ['R', 'Y', 'G', 'B'];
const COLOR_NAMES = { R: 'Red', Y: 'Yellow', G: 'Green', B: 'Blue' };
const ACTIONS = ['skip', 'reverse', '+2'];
const MIN_DECK_RESERVE = 5;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createDeck() {
  const deck = [];
  for (const color of COLORS) {
    deck.push({ color, value: '0', type: 'number' });
    for (const val of [...'123456789'.split(''), ...ACTIONS]) {
      deck.push({ color, value: val, type: 'action' });
      deck.push({ color, value: val, type: 'action' });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'wild', value: 'wild', type: 'wild' });
    deck.push({ color: 'wild', value: 'wild+4', type: 'wild' });
  }
  return shuffle(deck);
}

export function isPlayable(card, topCard, activeColor, pendingDraw = 0) {
  // During a draw stack, only counter-cards are legal
  if (pendingDraw > 0) {
    if (card.value === '+2') return true;   // can always stack +2 on +2 or +4 stack
    if (card.value === 'wild+4') return true; // can always stack +4
    return false;
  }
  if (card.color === 'wild') return true;
  if (card.color === activeColor) return true;
  if (topCard && card.value === topCard.value) return true;
  return false;
}

export function freshState(playerIds) {
  return {
    players: [...playerIds],
    hands: {},
    deck: [],
    discard: [],
    turn: 0,
    direction: 1,
    activeColor: null,
    started: false,
    winner: null,
    unoCalled: new Set(),
    log: [],
    lastColorChange: null,
    pendingDraw: 0,   // stacked draw penalty waiting to be resolved
    lastMove: null,   // { playerLabel, card } for the "last move" display line
  };
}

export function startGame(state) {
  state.deck = createDeck();
  state.discard = [];
  state.turn = 0;
  state.direction = 1;
  state.winner = null;
  state.unoCalled = new Set();
  state.log = [];
  state.pendingDraw = 0;
  state.lastMove = null;

  for (const pid of state.players) {
    state.hands[pid] = [];
    for (let i = 0; i < 7; i++) state.hands[pid].push(state.deck.pop());
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const initial = state.deck.pop();
    if (initial.color !== 'wild') {
      state.discard.push(initial);
      state.activeColor = initial.color;
      break;
    } else {
      state.deck.unshift(initial);
      shuffle(state.deck);
    }
  }

  const top = state.discard[state.discard.length - 1];
  state.log.push(`Top card is ${top.color} ${top.value}`);
  state.started = true;
}

export function reshuffleDiscard(state) {
  if (state.discard.length <= 1) return;
  const top = state.discard[state.discard.length - 1];
  state.deck = shuffle(state.discard.slice(0, -1));
  state.discard = [top];
  state.log.push('Deck reshuffled from discard pile.');
}

export function drawCards(state, playerId, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length > 1) reshuffleDiscard(state);
      else break;
    }
    if (state.deck.length === 0) break;
    drawn.push(state.deck.pop());
  }
  state.hands[playerId].push(...drawn);
  return drawn;
}

export function nextTurn(state) {
  const n = state.players.length;
  state.turn = (((state.turn + state.direction) % n) + n) % n;
  const current = state.players[state.turn];
  state.unoCalled.delete(current);
}

export function getOpponent(state, playerId) {
  return state.players[0] === playerId ? state.players[1] : state.players[0];
}

export function playerLabel(state, playerId) {
  return `Player ${state.players.indexOf(playerId) + 1}`;
}

export function buildClientState(state, playerId) {
  const opponent = getOpponent(state, playerId);
  const top = state.discard.length ? state.discard[state.discard.length - 1] : null;
  return {
    myHand: state.hands[playerId] || [],
    opponentCount: (state.hands[opponent] || []).length,
    discardTop: top,
    activeColor: state.activeColor,
    myTurn: state.players[state.turn] === playerId,
    turnIndex: state.turn,
    deckCount: state.deck.length,
    direction: state.direction,
    winner: state.winner,
    unoCalled: Array.from(state.unoCalled),
    log: state.log.slice(-8),
    playerIndex: state.players.indexOf(playerId),
    started: state.started,
    lastColorChange: state.lastColorChange,
    pendingDraw: state.pendingDraw,
    lastMove: state.lastMove,
  };
}

export function maintainDeck(state) {
  if (state.deck.length < MIN_DECK_RESERVE) reshuffleDiscard(state);
}

export { COLORS, COLOR_NAMES };
