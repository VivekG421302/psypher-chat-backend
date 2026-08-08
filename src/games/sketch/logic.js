import { pickWords } from './wordbank.js';

export const CHOICE_MS = 15_000;   // time the drawer has to pick a word
export const ROUND_MS = 80_000;    // time to draw + guess per round
export const TOTAL_ROUNDS = 6;     // 3 turns each, in a 2-player duel
const MAX_STROKES = 400;           // safety cap so a state object can't grow unbounded
const MAX_GUESSES = 200;

function normalize(text) {
  return String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function playerLabel(state, playerId) {
  return `Player ${state.players.indexOf(playerId) + 1}`;
}

export function getDrawer(state) {
  return state.players[state.drawerIndex];
}

export function getGuesser(state) {
  return state.players[state.drawerIndex === 0 ? 1 : 0];
}

export function freshState(playerIds) {
  return {
    players: [...playerIds],
    started: false,
    phase: 'idle', // 'choosing' | 'drawing' | 'roundEnd' | 'gameEnd'
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    drawerIndex: 0,
    scores: { [playerIds[0]]: 0, [playerIds[1]]: 0 },
    wordChoices: [],
    choiceDeadline: null,
    secretWord: null,
    usedWords: [],
    strokes: [],
    guesses: [],
    roundDeadline: null,
    roundDurationMs: ROUND_MS,
    roundWinnerId: null,
    roundPointsAwarded: null,
    lastRoundWord: null,
    winner: null,
    log: [],
  };
}

function beginChoosingPhase(state) {
  state.phase = 'choosing';
  state.wordChoices = pickWords(3, new Set(state.usedWords));
  state.choiceDeadline = Date.now() + CHOICE_MS;
  state.secretWord = null;
  state.strokes = [];
  state.guesses = [];
  state.roundDeadline = null;
  state.roundWinnerId = null;
  state.roundPointsAwarded = null;
  state.lastRoundWord = null;
  state.log.push(`${playerLabel(state, getDrawer(state))} is choosing a word. (Round ${state.round}/${state.totalRounds})`);
}

export function startGame(state) {
  state.scores = { [state.players[0]]: 0, [state.players[1]]: 0 };
  state.round = 1;
  state.drawerIndex = 0;
  state.usedWords = [];
  state.winner = null;
  state.log = [];
  state.started = true;
  beginChoosingPhase(state);
}

function beginDrawingPhase(state, word) {
  state.secretWord = word;
  state.usedWords.push(word);
  if (state.usedWords.length > 40) state.usedWords.shift();
  state.phase = 'drawing';
  state.strokes = [];
  state.guesses = [];
  state.roundDeadline = Date.now() + state.roundDurationMs;
  state.log.push(`${playerLabel(state, getDrawer(state))} is drawing now — go!`);
}

export function chooseWord(state, playerId, word) {
  if (state.phase !== 'choosing') {
    throw Object.assign(new Error('Not choosing a word right now.'), { code: 'wrong_phase' });
  }
  if (playerId !== getDrawer(state)) {
    throw Object.assign(new Error('Only the drawer picks the word.'), { code: 'not_drawer' });
  }
  if (!state.wordChoices.includes(word)) {
    throw Object.assign(new Error('Not one of the offered words.'), { code: 'bad_word' });
  }
  beginDrawingPhase(state, word);
}

function endRound(state, winnerId) {
  state.phase = 'roundEnd';
  state.lastRoundWord = state.secretWord;
  state.roundWinnerId = winnerId;

  if (winnerId) {
    const startedAt = state.roundDeadline - state.roundDurationMs;
    const elapsed = Math.max(0, Date.now() - startedAt);
    const remainingRatio = Math.max(0, 1 - elapsed / state.roundDurationMs);
    const guesserPoints = Math.max(20, Math.round(100 * remainingRatio));
    const drawerId = getDrawer(state);
    const drawerPoints = 30;

    state.scores[winnerId] = (state.scores[winnerId] || 0) + guesserPoints;
    state.scores[drawerId] = (state.scores[drawerId] || 0) + drawerPoints;
    state.roundPointsAwarded = { guesserId: winnerId, guesserPoints, drawerId, drawerPoints };
    state.log.push(
      `${playerLabel(state, winnerId)} guessed "${state.secretWord}"! +${guesserPoints}, ` +
      `${playerLabel(state, drawerId)} +${drawerPoints} for the drawing.`
    );
  } else {
    state.roundPointsAwarded = null;
    state.log.push(`Round over — the word was "${state.secretWord}".`);
  }
}

export function submitGuess(state, playerId, text) {
  if (state.phase !== 'drawing') {
    throw Object.assign(new Error('No round in progress.'), { code: 'wrong_phase' });
  }
  if (playerId !== getGuesser(state)) {
    throw Object.assign(new Error("The drawer can't guess their own word."), { code: 'not_guesser' });
  }
  const clean = normalize(text);
  if (!clean) throw Object.assign(new Error('Empty guess.'), { code: 'bad_guess' });

  const target = normalize(state.secretWord);
  const correct = clean === target;
  // Rough "close" heuristic — same first letter and near-identical length —
  // just a little warm/cold signal, not a hint that gives the word away.
  const close = !correct && clean[0] === target[0] && Math.abs(clean.length - target.length) <= 1;

  state.guesses.push({
    byPlayerId: playerId,
    byLabel: playerLabel(state, playerId),
    text,
    correct,
    close,
    ts: Date.now(),
  });
  if (state.guesses.length > MAX_GUESSES) state.guesses.shift();

  if (correct) {
    endRound(state, playerId);
  }
  return correct;
}

export function addStroke(state, playerId, { points, color, size, newStroke }) {
  if (state.phase !== 'drawing') {
    throw Object.assign(new Error('No round in progress.'), { code: 'wrong_phase' });
  }
  if (playerId !== getDrawer(state)) {
    throw Object.assign(new Error('Only the drawer can draw.'), { code: 'not_drawer' });
  }
  const pts = Array.isArray(points) ? points
    .filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y))
    .map((p) => ({ x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)) }))
    .slice(0, 200) : [];
  if (!pts.length) return;

  if (newStroke || state.strokes.length === 0) {
    state.strokes.push({
      color: typeof color === 'string' ? color.slice(0, 16) : '#EDEFF2',
      size: Number.isFinite(size) ? Math.max(1, Math.min(40, size)) : 4,
      points: pts,
    });
    if (state.strokes.length > MAX_STROKES) state.strokes.shift();
  } else {
    const last = state.strokes[state.strokes.length - 1];
    last.points.push(...pts);
  }
}

export function clearCanvas(state, playerId) {
  if (state.phase !== 'drawing') {
    throw Object.assign(new Error('No round in progress.'), { code: 'wrong_phase' });
  }
  if (playerId !== getDrawer(state)) {
    throw Object.assign(new Error('Only the drawer can clear the canvas.'), { code: 'not_drawer' });
  }
  state.strokes = [];
}

export function undoStroke(state, playerId) {
  if (state.phase !== 'drawing') {
    throw Object.assign(new Error('No round in progress.'), { code: 'wrong_phase' });
  }
  if (playerId !== getDrawer(state)) {
    throw Object.assign(new Error('Only the drawer can undo.'), { code: 'not_drawer' });
  }
  state.strokes.pop();
}

// Either player can end a stuck round early (drawer giving up on a hard
// word, or guesser conceding) — reveals the word with no points awarded.
export function skipRound(state, playerId) {
  if (state.phase !== 'drawing') {
    throw Object.assign(new Error('No round in progress.'), { code: 'wrong_phase' });
  }
  if (playerId !== getDrawer(state) && playerId !== getGuesser(state)) {
    throw Object.assign(new Error('Not in this game.'), { code: 'not_player' });
  }
  endRound(state, null);
}

export function timeUp(state) {
  const now = Date.now();
  if (state.phase === 'choosing') {
    if (now < state.choiceDeadline) {
      throw Object.assign(new Error('Choice time not up yet.'), { code: 'too_early' });
    }
    const word = state.wordChoices[Math.floor(Math.random() * state.wordChoices.length)];
    beginDrawingPhase(state, word);
  } else if (state.phase === 'drawing') {
    if (now < state.roundDeadline) {
      throw Object.assign(new Error('Round time not up yet.'), { code: 'too_early' });
    }
    endRound(state, null);
  } else {
    throw Object.assign(new Error('Nothing to time out.'), { code: 'not_applicable' });
  }
}

export function nextRound(state) {
  if (state.phase !== 'roundEnd') {
    throw Object.assign(new Error('Current round has not ended.'), { code: 'wrong_phase' });
  }
  if (state.round >= state.totalRounds) {
    state.phase = 'gameEnd';
    const [p1, p2] = state.players;
    if (state.scores[p1] === state.scores[p2]) state.winner = 'draw';
    else state.winner = state.scores[p1] > state.scores[p2] ? p1 : p2;
    state.log.push(
      state.winner === 'draw'
        ? "It's a tie!"
        : `${playerLabel(state, state.winner)} wins the match!`
    );
    return;
  }
  state.round += 1;
  state.drawerIndex = state.drawerIndex === 0 ? 1 : 0;
  beginChoosingPhase(state);
}

function computeHint(state) {
  if (!state.secretWord || state.phase !== 'drawing') return null;
  const startedAt = state.roundDeadline - state.roundDurationMs;
  const elapsed = Math.max(0, Date.now() - startedAt);
  const halfway = elapsed > state.roundDurationMs * 0.5;
  return state.secretWord
    .split('')
    .map((ch, i) => (ch === ' ' ? ' ' : (halfway && i === 0 ? ch : '_')))
    .join(' ');
}

export function buildClientState(state, playerId) {
  const opponent = state.players.find((p) => p !== playerId);
  const isDrawer = state.started && state.phase !== 'idle' && playerId === getDrawer(state);
  const isGuesser = state.started && state.phase !== 'idle' && playerId === getGuesser(state);

  return {
    started: state.started,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    myRole: isDrawer ? 'drawer' : isGuesser ? 'guesser' : null,
    scores: {
      mine: state.scores[playerId] || 0,
      opponent: state.scores[opponent] || 0,
    },
    wordChoices: isDrawer && state.phase === 'choosing' ? state.wordChoices : null,
    choiceDeadline: state.phase === 'choosing' ? state.choiceDeadline : null,
    choiceDurationMs: CHOICE_MS,
    wordReveal: isDrawer || state.phase === 'roundEnd' || state.phase === 'gameEnd' ? state.secretWord : null,
    wordLength: state.secretWord ? state.secretWord.replace(/ /g, '').length : null,
    hint: isGuesser ? computeHint(state) : null,
    roundDeadline: state.phase === 'drawing' ? state.roundDeadline : null,
    roundDurationMs: state.roundDurationMs,
    strokes: state.strokes,
    guesses: state.guesses.slice(-40),
    roundWinnerId: state.roundWinnerId,
    roundWinnerLabel: state.roundWinnerId ? playerLabel(state, state.roundWinnerId) : null,
    roundPointsAwarded: state.roundPointsAwarded,
    lastRoundWord: state.lastRoundWord,
    winner: state.winner,
    iWon: state.winner && state.winner !== 'draw' ? state.winner === playerId : null,
    log: state.log.slice(-8),
  };
}
