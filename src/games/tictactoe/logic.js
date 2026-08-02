const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],           // diagonals
];

function checkResult(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { symbol: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { symbol: 'draw', line: null };
  }
  return null;
}

export function freshState(playerIds) {
  return {
    players: [...playerIds],
    symbols: { [playerIds[0]]: 'X', [playerIds[1]]: 'O' },
    board: Array(9).fill(null),
    turn: 0,
    winner: null, // playerId | 'draw' | null
    winningLine: null,
    started: false,
    rounds: 0,
    scores: { [playerIds[0]]: 0, [playerIds[1]]: 0 },
    log: [],
  };
}

export function startGame(state) {
  state.board = Array(9).fill(null);
  state.winner = null;
  state.winningLine = null;
  // Alternate who goes first each round so a rematch is fair.
  state.turn = state.rounds % 2;
  state.rounds += 1;
  state.started = true;
  state.log = [`${playerLabel(state, state.players[state.turn])} goes first.`];
}

export function playerLabel(state, playerId) {
  return `Player ${state.players.indexOf(playerId) + 1}`;
}

export function makeMove(state, playerId, index) {
  if (!state.started || state.winner) {
    throw Object.assign(new Error('Game not active.'), { code: 'not_active' });
  }
  if (state.players[state.turn] !== playerId) {
    throw Object.assign(new Error('Not your turn.'), { code: 'not_turn' });
  }
  if (index < 0 || index > 8 || !Number.isInteger(index)) {
    throw Object.assign(new Error('Invalid cell.'), { code: 'bad_cell' });
  }
  if (state.board[index] !== null) {
    throw Object.assign(new Error('That cell is already taken.'), { code: 'occupied' });
  }

  const symbol = state.symbols[playerId];
  state.board[index] = symbol;
  state.log.push(`${playerLabel(state, playerId)} played ${symbol} at cell ${index + 1}.`);

  const result = checkResult(state.board);
  if (result) {
    state.winningLine = result.line;
    if (result.symbol === 'draw') {
      state.winner = 'draw';
      state.log.push("It's a draw!");
    } else {
      state.winner = playerId;
      state.scores[playerId] = (state.scores[playerId] || 0) + 1;
      state.log.push(`${playerLabel(state, playerId)} wins!`);
    }
    return;
  }

  state.turn = state.turn === 0 ? 1 : 0;
}

export function buildClientState(state, playerId) {
  const opponent = state.players.find((p) => p !== playerId);
  return {
    board: state.board,
    mySymbol: state.symbols[playerId],
    opponentSymbol: state.symbols[opponent],
    myTurn: state.started && !state.winner && state.players[state.turn] === playerId,
    winner: state.winner,
    winningLine: state.winningLine,
    started: state.started,
    scores: {
      mine: state.scores[playerId] || 0,
      opponent: state.scores[opponent] || 0,
    },
    log: state.log.slice(-6),
  };
}
