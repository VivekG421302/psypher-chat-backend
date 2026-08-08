import * as S from './logic.js';

function requireStarted(state) {
  if (!state.started) {
    throw Object.assign(new Error('Game not active.'), { code: 'not_active' });
  }
}

const SketchGame = {
  id: 'sketch',
  name: 'Sketch & Guess',
  emoji: '🎨',
  tagline: 'Draw it, guess it — race the clock',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) { return S.freshState(playerIds); },
  start(state) { S.startGame(state); },
  buildClientState(state, playerId) { return S.buildClientState(state, playerId); },

  actions: {
    choose_word(state, playerId, payload) {
      requireStarted(state);
      const word = payload?.word;
      if (!word) throw Object.assign(new Error('Missing word.'), { code: 'bad_word' });
      S.chooseWord(state, playerId, word);
    },

    draw_stroke(state, playerId, payload) {
      requireStarted(state);
      S.addStroke(state, playerId, {
        points: payload?.points,
        color: payload?.color,
        size: payload?.size,
        newStroke: !!payload?.newStroke,
      });
    },

    clear_canvas(state, playerId) {
      requireStarted(state);
      S.clearCanvas(state, playerId);
    },

    undo_stroke(state, playerId) {
      requireStarted(state);
      S.undoStroke(state, playerId);
    },

    guess(state, playerId, payload) {
      requireStarted(state);
      const text = payload?.text;
      if (!text) throw Object.assign(new Error('Empty guess.'), { code: 'bad_guess' });
      S.submitGuess(state, playerId, text);
    },

    skip_round(state, playerId) {
      requireStarted(state);
      S.skipRound(state, playerId);
    },

    time_up(state) {
      requireStarted(state);
      S.timeUp(state);
    },

    next_round(state) {
      requireStarted(state);
      S.nextRound(state);
    },

    restart(state) {
      S.startGame(state);
    },
  },
};

export default SketchGame;
