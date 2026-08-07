import * as U from './logic.js';

function requireStarted(state) {
  if (!state.started || state.winner) {
    throw Object.assign(new Error('Game not active.'), { code: 'not_active' });
  }
}

function requireTurn(state, playerId) {
  if (state.players[state.turn] !== playerId) {
    throw Object.assign(new Error('Not your turn.'), { code: 'not_turn' });
  }
}

// Does this player currently hold any card that's legal to play right now?
// Used to let a player keep acting (instead of auto-passing) after a color
// change or after absorbing a draw penalty.
function hasPlayableCard(state, playerId) {
  const hand = state.hands[playerId] || [];
  const top = state.discard.length ? state.discard[state.discard.length - 1] : null;
  return hand.some((c) => U.isPlayable(c, top, state.activeColor, state.pendingDraw, state.pendingStackValue));
}

const UnoGame = {
  id: 'uno',
  name: 'UNO',
  emoji: '🃏',
  tagline: 'Classic 2-player card duel',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) { return U.freshState(playerIds); },
  start(state) { U.startGame(state); },
  buildClientState(state, playerId) { return U.buildClientState(state, playerId); },

  actions: {
    play_card(state, playerId, payload) {
      requireStarted(state);
      requireTurn(state, playerId);

      const card = payload?.card;
      if (!card) throw Object.assign(new Error('Invalid card.'), { code: 'bad_card' });

      const hand = state.hands[playerId];
      const idx = hand.findIndex((c) => c.color === card.color && c.value === card.value);
      if (idx === -1) throw Object.assign(new Error('Card not in hand.'), { code: 'bad_card' });

      const top = state.discard.length ? state.discard[state.discard.length - 1] : null;

      // Pass pendingDraw/pendingStackValue so isPlayable can enforce stack-only mode
      // (a stacked card's addition must be the same as or greater than the last one played).
      if (!U.isPlayable(card, top, state.activeColor, state.pendingDraw, state.pendingStackValue)) {
        const msg = state.pendingDraw > 0
          ? `Stack penalty active — you must counter with a +${state.pendingStackValue} or higher, or draw ${state.pendingDraw}.`
          : 'Card does not match color or value.';
        throw Object.assign(new Error(msg), { code: 'illegal' });
      }

      const played = hand.splice(idx, 1)[0];
      state.discard.push(played);

      const label = U.playerLabel(state, playerId);
      const opponent = U.getOpponent(state, playerId);

      // Handle color for wilds
      if (played.color === 'wild') {
        const chosen = payload.chosenColor;
        state.activeColor = U.COLORS.includes(chosen) ? chosen : state.activeColor || 'R';
        const colorName = U.COLOR_NAMES[state.activeColor];
        state.log.push(`${label} changed the color to ${colorName}.`);
        state.lastColorChange = {
          seq: (state.lastColorChange?.seq || 0) + 1,
          byPlayerId: playerId,
          byLabel: label,
          color: state.activeColor,
          colorName,
        };
      } else {
        state.activeColor = played.color;
      }

      // Track last move for UI display
      state.lastMove = { playerLabel: label, card: played };
      state.log.push(`${label} played ${played.color} ${played.value}`);

      if (hand.length === 1) state.log.push(`${label} has UNO!`);
      if (hand.length === 0) {
        state.winner = playerId;
        state.log.push(`${label} WINS!`);
        return;
      }

      // ── Special card effects ─────────────────────────────────────
      if (played.value === 'skip') {
        // Skip: opponent loses turn, player goes again (2-player)
        state.log.push(`Skip! ${U.playerLabel(state, opponent)} loses a turn.`);
        U.nextTurn(state); // advance to opponent
        U.nextTurn(state); // advance back to current player

      } else if (played.value === 'reverse') {
        // Reverse in 2-player = Skip
        state.direction *= -1;
        state.log.push(`Reverse! ${label} goes again.`);
        U.nextTurn(state);
        U.nextTurn(state);

      } else if (played.value === '+2') {
        // Stack: add to pending, opponent must counter (with a +2 or higher) or absorb
        state.pendingDraw += 2;
        state.pendingStackValue = 2;
        state.log.push(`+2 stacked! ${U.playerLabel(state, opponent)} must counter or draw ${state.pendingDraw}.`);
        // Pass turn to opponent — they decide to counter or draw
        U.nextTurn(state);

      } else if (played.value === 'wild+4') {
        // Stack: add to pending, opponent must counter (with a +4) or absorb
        state.pendingDraw += 4;
        state.pendingStackValue = 4;
        state.log.push(`Wild +4 stacked! ${U.playerLabel(state, opponent)} must counter or draw ${state.pendingDraw}.`);
        U.nextTurn(state);

      } else if (played.value === 'wild') {
        // Plain color-change wild: the same player may immediately follow up
        // with a card of the newly-chosen color if they have one — no
        // compulsion, and no draw is forced if they don't.
        if (hasPlayableCard(state, playerId)) {
          state.log.push(`${label} may play another ${U.COLOR_NAMES[state.activeColor]} card, or pass.`);
          // Turn stays with the current player.
        } else {
          U.nextTurn(state);
        }

      } else {
        U.nextTurn(state);
      }

      U.maintainDeck(state);
    },

    draw_card(state, playerId) {
      requireStarted(state);
      requireTurn(state, playerId);

      if (state.pendingDraw > 0) {
        // Player accepts the penalty stack
        const total = state.pendingDraw;
        state.pendingDraw = 0;
        state.pendingStackValue = 0;
        U.drawCards(state, playerId, total);
        state.log.push(`${U.playerLabel(state, playerId)} drew ${total} cards (penalty).`);
        state.lastMove = { playerLabel: U.playerLabel(state, playerId), card: null, drawPenalty: total };

        // The player still gets their turn: if one of the cards they now
        // hold matches the current color/value, they may play it — no
        // compulsion, they can also just pass.
        if (!hasPlayableCard(state, playerId)) {
          U.nextTurn(state);
        }
      } else {
        // Normal draw
        const drawn = U.drawCards(state, playerId, 1);
        if (drawn.length) {
          state.log.push(`${U.playerLabel(state, playerId)} drew a card.`);
        } else {
          state.log.push('No cards left to draw!');
        }

        const top = state.discard.length ? state.discard[state.discard.length - 1] : null;
        const canPlay = drawn.length ? U.isPlayable(drawn[0], top, state.activeColor, 0) : false;

        if (!canPlay) {
          // Drawn card can't play — pass turn
          U.nextTurn(state);
        }
        // If canPlay — player may play the drawn card (turn stays)
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
