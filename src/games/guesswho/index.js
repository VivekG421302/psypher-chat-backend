import * as G from './logic.js';

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

const GuessWhoGame = {
  id: 'guesswho',
  name: 'Guess Who?',
  emoji: '🕵️',
  tagline: 'Deduce your opponent\u2019s secret character first',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) { return G.freshState(playerIds); },
  start(state) { G.startGame(state); },
  buildClientState(state, playerId) { return G.buildClientState(state, playerId); },

  actions: {
    ask_question(state, playerId, payload) {
      requireStarted(state);
      requireTurn(state, playerId);

      const traitKey = payload?.traitKey;
      const value = payload?.value;
      if (!traitKey) throw Object.assign(new Error('Missing trait.'), { code: 'bad_trait' });

      G.askQuestion(state, playerId, traitKey, value);
    },

    accuse(state, playerId, payload) {
      requireStarted(state);
      requireTurn(state, playerId);

      const characterId = Number(payload?.characterId);
      if (!characterId) throw Object.assign(new Error('Missing character.'), { code: 'bad_character' });

      G.accuse(state, playerId, characterId);
    },

    toggle_character(state, playerId, payload) {
      // Personal deduction board — allowed any time, doesn't consume a turn.
      const characterId = Number(payload?.characterId);
      if (!characterId) throw Object.assign(new Error('Missing character.'), { code: 'bad_character' });
      G.toggleCharacter(state, playerId, characterId);
    },

    restart(state) {
      G.startGame(state);
    },
  },
};

export default GuessWhoGame;
