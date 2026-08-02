import * as T from './logic.js';

const TicTacToeGame = {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  emoji: '⭕',
  tagline: 'First to three in a row wins',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) {
    return T.freshState(playerIds);
  },

  start(state) {
    T.startGame(state);
  },

  buildClientState(state, playerId) {
    return T.buildClientState(state, playerId);
  },

  actions: {
    make_move(state, playerId, payload) {
      const index = Number(payload?.index);
      T.makeMove(state, playerId, index);
    },

    restart(state) {
      T.startGame(state);
    },
  },
};

export default TicTacToeGame;
