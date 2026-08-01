import { CHARACTERS, CHARACTER_MAP, TRAIT_MAP, evaluateTrait } from './characters.js';

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function freshState(playerIds) {
  return {
    players: [...playerIds],
    characters: CHARACTERS,
    secretOf: {},          // playerId -> characterId (the character THAT player embodies)
    eliminated: {},         // playerId -> Set(characterId) — each player's own deduction board
    askedQuestions: {},     // playerId -> [{ traitKey, value }] — questions that player has already asked
    turn: 0,
    started: false,
    winner: null,
    phase: 'setup',         // 'setup' | 'in_progress' | 'game_over'
    log: [],
    lastQuestion: null,     // { seq, askedBy, askedByLabel, traitKey, traitLabel, value, questionText, answer }
    lastAccusation: null,   // { seq, byPlayerId, byLabel, characterId, characterName, correct }
    qSeq: 0,
  };
}

export function startGame(state) {
  const [p1, p2] = state.players;
  const pool = shuffle(state.characters);
  state.secretOf = { [p1]: pool[0].id, [p2]: pool[1].id };
  state.eliminated = { [p1]: new Set(), [p2]: new Set() };
  state.askedQuestions = { [p1]: [], [p2]: [] };
  state.turn = 0;
  state.winner = null;
  state.phase = 'in_progress';
  state.log = [`Secrets assigned. ${playerLabel(state, p1)} goes first.`];
  state.lastQuestion = null;
  state.lastAccusation = null;
  state.qSeq = 0;
  state.started = true;
}

export function getOpponent(state, playerId) {
  return state.players[0] === playerId ? state.players[1] : state.players[0];
}

export function playerLabel(state, playerId) {
  return `Player ${state.players.indexOf(playerId) + 1}`;
}

export function nextTurn(state) {
  const n = state.players.length;
  state.turn = (state.turn + 1) % n;
}

/**
 * Ask a yes/no question about the opponent's secret character. The server
 * knows the secret, so it evaluates the answer immediately instead of
 * waiting on the opponent to respond by hand. Matching characters that fail
 * the criteria are auto-eliminated on the asker's personal board as a
 * convenience — players can still manually adjust their board afterwards.
 */
export function askQuestion(state, playerId, traitKey, value) {
  const trait = TRAIT_MAP.get(traitKey);
  if (!trait) throw Object.assign(new Error('Unknown trait.'), { code: 'bad_trait' });
  if (trait.type === 'categorical' && !trait.values.includes(value)) {
    throw Object.assign(new Error('Unknown trait value.'), { code: 'bad_value' });
  }
  const normalizedValue = trait.type === 'boolean' ? true : value;

  const opponent = getOpponent(state, playerId);
  const secretCharacter = CHARACTER_MAP.get(state.secretOf[opponent]);
  const answer = evaluateTrait(secretCharacter, traitKey, normalizedValue);

  const questionText = trait.question(normalizedValue);
  const label = playerLabel(state, playerId);

  // Auto-eliminate on the asker's own board: any still-active character
  // whose trait value doesn't match the answer they just received.
  const board = state.eliminated[playerId];
  const eliminatedNow = [];
  for (const character of state.characters) {
    if (board.has(character.id)) continue;
    const matches = evaluateTrait(character, traitKey, normalizedValue);
    const shouldBeEliminated = answer ? !matches : matches;
    if (shouldBeEliminated) {
      board.add(character.id);
      eliminatedNow.push(character.id);
    }
  }

  state.qSeq += 1;
  state.lastQuestion = {
    seq: state.qSeq,
    askedBy: playerId,
    askedByLabel: label,
    traitKey,
    traitLabel: trait.label,
    value: normalizedValue,
    questionText,
    answer,
    eliminatedCount: eliminatedNow.length,
  };
  state.askedQuestions[playerId].push({ traitKey, value: normalizedValue, questionText, answer });
  state.log.push(`${label} asked: "${questionText}" → ${answer ? 'Yes' : 'No'}`);

  nextTurn(state);
  return { answer, eliminatedNow };
}

/**
 * Make a final accusation against a specific character as the opponent's
 * secret. Correct guess wins immediately; a wrong guess forfeits the turn
 * (and auto-eliminates that character on the accuser's own board, since
 * they now know it's ruled out).
 */
export function accuse(state, playerId, characterId) {
  const character = CHARACTER_MAP.get(characterId);
  if (!character) throw Object.assign(new Error('Unknown character.'), { code: 'bad_character' });

  const opponent = getOpponent(state, playerId);
  const correct = state.secretOf[opponent] === characterId;
  const label = playerLabel(state, playerId);

  state.qSeq += 1;
  state.lastAccusation = {
    seq: state.qSeq,
    byPlayerId: playerId,
    byLabel: label,
    characterId,
    characterName: character.name,
    correct,
  };

  if (correct) {
    state.winner = playerId;
    state.phase = 'game_over';
    state.log.push(`${label} accused ${character.name} — CORRECT! ${label} wins!`);
  } else {
    state.eliminated[playerId].add(characterId);
    state.log.push(`${label} accused ${character.name} — wrong! Turn forfeited.`);
    nextTurn(state);
  }

  return { correct };
}

export function toggleCharacter(state, playerId, characterId) {
  const board = state.eliminated[playerId];
  if (!board) return;
  if (board.has(characterId)) board.delete(characterId);
  else board.add(characterId);
}

export function buildClientState(state, playerId) {
  const opponent = getOpponent(state, playerId);
  const mySecretId = state.secretOf[playerId];
  const mySecret = mySecretId ? CHARACTER_MAP.get(mySecretId) : null;
  const myEliminated = state.eliminated[playerId] ? Array.from(state.eliminated[playerId]) : [];
  const opponentEliminatedCount = state.eliminated[opponent] ? state.eliminated[opponent].size : 0;

  return {
    started: state.started,
    phase: state.phase,
    characters: state.characters,
    mySecret,
    myEliminated,
    opponentActiveCount: state.characters.length - opponentEliminatedCount,
    myTurn: state.players[state.turn] === playerId,
    turnIndex: state.turn,
    playerIndex: state.players.indexOf(playerId),
    winner: state.winner,
    lastQuestion: state.lastQuestion,
    lastAccusation: state.lastAccusation,
    myAskedQuestions: state.askedQuestions[playerId] || [],
    log: state.log.slice(-10),
  };
}
