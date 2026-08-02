import * as C from './logic.js';

const ChessGame = {
  id: 'chess',
  name: 'Chess',
  emoji: '♟️',
  tagline: 'Classic strategy — checkmate wins',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) { return C.freshState(playerIds); },
  start(state)           { C.startGame(state); },
  buildClientState(state, playerId) { return C.buildClientState(state, playerId); },

  actions: {
    move(state, playerId, payload) {
      const { fromR, fromC, toR, toC } = payload;
      C.executeMove(state, playerId, Number(fromR), Number(fromC), Number(toR), Number(toC), null);
    },

    promote(state, playerId, payload) {
      const pending = state.promotionPending;
      if (!pending) throw Object.assign(new Error('No promotion pending.'), { code: 'bad_state' });
      const myColor = C.colorForPlayer(state, playerId);
      if (pending.color !== myColor) throw Object.assign(new Error('Not your promotion.'), { code: 'not_turn' });
      const piece = ['Q','R','B','N'].includes(payload?.piece) ? payload.piece : 'Q';
      C.executeMove(state, playerId, pending.fromR, pending.fromC, pending.toR, pending.toC, piece);
    },

    offer_draw(state, playerId) {
      state.log.push(`${C.playerLabel(state, playerId)} offers a draw.`);
      state._drawOfferedBy = playerId;
    },

    accept_draw(state, playerId) {
      if (state._drawOfferedBy && state._drawOfferedBy !== playerId) {
        state.winner = 'draw';
        state.winReason = 'agreement';
        state.log.push("Draw by agreement.");
        state._drawOfferedBy = null;
      }
    },

    resign(state, playerId) {
      const opponent = state.players.find(p => p !== playerId);
      state.winner = opponent;
      state.winReason = 'resignation';
      state.scores[opponent] = (state.scores[opponent] || 0) + 1;
      state.log.push(`${C.playerLabel(state, playerId)} resigns. ${C.playerLabel(state, opponent)} wins.`);
    },

    restart(state) {
      C.startGame(state);
    },
  },
};

export default ChessGame;
