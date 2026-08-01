import * as U from './logic.js';

function requireStarted(state) {
  if (!state.started || state.winner) {
    const err = new Error('Game not active.');
    err.code = 'not_active';
    throw err;
  }
}

function requireTurn(state, playerId) {
  if (state.players[state.turn] !== playerId) {
    const err = new Error('Not your turn.');
    err.code = 'not_turn';
    throw err;
  }
}

const UnoGame = {
  id: 'uno',
  name: 'UNO',
  emoji: '🃏',
  tagline: 'Classic 2-player card duel',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) {
    return U.freshState(playerIds);
  },

  start(state) {
    U.startGame(state);
  },

  buildClientState(state, playerId) {
    return U.buildClientState(state, playerId);
  },

  actions: {
    play_card(state, playerId, payload) {
      requireStarted(state);
      requireTurn(state, playerId);

      const card = payload && payload.card;
      if (!card) throw Object.assign(new Error('Invalid card.'), { code: 'bad_card' });

      const hand = state.hands[playerId];
      const idx = hand.findIndex((c) => c.color === card.color && c.value === card.value);
      if (idx === -1) throw Object.assign(new Error('Card not in hand.'), { code: 'bad_card' });

      const top = state.discard.length ? state.discard[state.discard.length - 1] : null;
      if (!U.isPlayable(card, top, state.activeColor)) {
        throw Object.assign(new Error('Card does not match color or value.'), { code: 'illegal' });
      }

      const played = hand.splice(idx, 1)[0];
      state.discard.push(played);

      if (played.color === 'wild') {
        const chosen = payload.chosenColor;
        state.activeColor = U.COLORS.includes(chosen) ? chosen : state.activeColor || 'R';
      } else {
        state.activeColor = played.color;
      }

      state.log.push(`${U.playerLabel(state, playerId)} played ${played.color} ${played.value}`);

      if (hand.length === 1) {
        state.log.push(`${U.playerLabel(state, playerId)} has UNO!`);
      }
      if (hand.length === 0) {
        state.winner = playerId;
        state.log.push(`${U.playerLabel(state, playerId)} WINS!`);
        return;
      }

      const opponent = U.getOpponent(state, playerId);

      if (played.value === 'skip') {
        state.log.push('Skip! Opponent loses a turn.');
        U.nextTurn(state);
        U.nextTurn(state);
      } else if (played.value === 'reverse') {
        state.direction *= -1;
        state.log.push('Reverse! Direction flipped.');
        U.nextTurn(state);
      } else if (played.value === '+2') {
        state.log.push('Draw Two! Opponent draws 2 cards.');
        U.drawCards(state, opponent, 2);
        U.nextTurn(state);
        U.nextTurn(state);
      } else if (played.value === 'wild+4') {
        state.log.push('Wild Draw Four! Opponent draws 4 cards.');
        U.drawCards(state, opponent, 4);
        U.nextTurn(state);
        U.nextTurn(state);
      } else {
        U.nextTurn(state);
      }

      U.maintainDeck(state);
    },

    draw_card(state, playerId) {
      requireStarted(state);
      requireTurn(state, playerId);

      const drawn = U.drawCards(state, playerId, 1);
      if (drawn.length) {
        state.log.push(`${U.playerLabel(state, playerId)} drew a card.`);
      } else {
        state.log.push('No cards left to draw!');
      }

      const top = state.discard.length ? state.discard[state.discard.length - 1] : null;
      const canPlay = drawn.length ? U.isPlayable(drawn[0], top, state.activeColor) : false;

      if (drawn.length && !canPlay) {
        state.log.push('Drawn card not playable. Turn passes.');
        U.nextTurn(state);
      } else if (!drawn.length) {
        U.nextTurn(state);
      }
      U.maintainDeck(state);
    },

    call_uno(state, playerId) {
      if ((state.hands[playerId] || []).length === 1) {
        state.unoCalled.add(playerId);
        state.log.push(`${U.playerLabel(state, playerId)} called UNO!`);
      } else {
        throw Object.assign(new Error('You can only call UNO with exactly 1 card left.'), { code: 'illegal' });
      }
    },

    catch_uno(state, playerId) {
      const opponent = U.getOpponent(state, playerId);
      const oppHand = state.hands[opponent] || [];
      if (oppHand.length === 1 && !state.unoCalled.has(opponent)) {
        U.drawCards(state, opponent, 2);
        state.log.push(`${U.playerLabel(state, playerId)} caught missed UNO! +2 penalty.`);
      } else {
        throw Object.assign(new Error('Opponent is safe or does not have UNO.'), { code: 'illegal' });
      }
    },

    pass_turn(state, playerId) {
      requireTurn(state, playerId);
      state.log.push(`${U.playerLabel(state, playerId)} passed.`);
      U.nextTurn(state);
    },

    restart(state) {
      U.startGame(state);
    },
  },
};

export default UnoGame;
