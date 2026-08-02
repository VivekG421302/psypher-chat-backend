// ─── Chess logic — pure JS, no external deps ─────────────────────
// Positions: { row: 0-7, col: 0-7 }  row 0 = rank 8 (Black's back rank)
// Piece:  { type, color }   color: 'w'|'b'   type: P R N B Q K

export const INIT_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

export function freshState(playerIds) {
  return {
    players: [...playerIds],           // [whiteId, blackId]
    board: INIT_BOARD.map(r => [...r]),
    turn: 'w',
    started: false,
    winner: null,                      // playerId | 'draw' | null
    winReason: null,
    log: [],
    lastMove: null,                    // { from, to, piece, san }
    // Castling rights
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    // En-passant target square (row,col) after a double pawn push
    enPassant: null,
    scores: {},
    // Promotion pending: { row, col, color } — client must pick piece
    promotionPending: null,
  };
}

export function startGame(state) {
  state.board = INIT_BOARD.map(r => [...r]);
  state.turn = 'w';
  state.winner = null;
  state.winReason = null;
  state.log = ['White moves first.'];
  state.lastMove = null;
  state.castling = { wK: true, wQ: true, bK: true, bQ: true };
  state.enPassant = null;
  state.promotionPending = null;
  state.started = true;
  if (!state.scores[state.players[0]]) state.scores[state.players[0]] = 0;
  if (!state.scores[state.players[1]]) state.scores[state.players[1]] = 0;
}

export function colorForPlayer(state, playerId) {
  return state.players[0] === playerId ? 'w' : 'b';
}

export function playerLabel(state, playerId) {
  return state.players[0] === playerId ? 'White' : 'Black';
}

function opp(color) { return color === 'w' ? 'b' : 'w'; }

function piece(board, r, c) { return (r >= 0 && r < 8 && c >= 0 && c < 8) ? board[r][c] : null; }
function pieceColor(p) { return p ? p[0] : null; }
function pieceType(p) { return p ? p[1] : null; }

// Generate pseudo-legal moves for a piece (ignores check)
function pseudoMoves(board, r, c, castling, enPassant) {
  const p = board[r][c];
  if (!p) return [];
  const color = pieceColor(p);
  const type  = pieceType(p);
  const moves = [];

  function push(tr, tc) {
    if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) return false;
    const target = piece(board, tr, tc);
    if (pieceColor(target) === color) return false; // blocked by own
    moves.push([tr, tc]);
    return !target; // can continue sliding only if empty
  }

  function slide(dirs) {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = piece(board, nr, nc);
        if (pieceColor(target) === color) break;
        moves.push([nr, nc]);
        if (target) break; // capture stops slide
        nr += dr; nc += dc;
      }
    }
  }

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Forward
      if (!piece(board, r + dir, c)) {
        moves.push([r + dir, c]);
        if (r === startRow && !piece(board, r + 2 * dir, c))
          moves.push([r + 2 * dir, c]);
      }
      // Captures
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (tr < 0 || tr >= 8 || tc < 0 || tc >= 8) continue;
        const target = piece(board, tr, tc);
        if (pieceColor(target) === opp(color)) moves.push([tr, tc]);
        // En-passant
        if (enPassant && enPassant[0] === tr && enPassant[1] === tc)
          moves.push([tr, tc]);
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        push(r + dr, c + dc);
      break;
    case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        push(r + dr, c + dc);
      // Castling
      const row = color === 'w' ? 7 : 0;
      if (r === row && c === 4) {
        if (castling[`${color}K`] &&
            !piece(board, row, 5) && !piece(board, row, 6) &&
            !isSquareAttacked(board, row, 4, opp(color)) &&
            !isSquareAttacked(board, row, 5, opp(color)) &&
            !isSquareAttacked(board, row, 6, opp(color)))
          moves.push([row, 6]);
        if (castling[`${color}Q`] &&
            !piece(board, row, 3) && !piece(board, row, 2) && !piece(board, row, 1) &&
            !isSquareAttacked(board, row, 4, opp(color)) &&
            !isSquareAttacked(board, row, 3, opp(color)) &&
            !isSquareAttacked(board, row, 2, opp(color)))
          moves.push([row, 2]);
      }
      break;
    }
  }
  return moves;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let fr = 0; fr < 8; fr++)
    for (let fc = 0; fc < 8; fc++) {
      const p = board[fr][fc];
      if (!p || pieceColor(p) !== byColor) continue;
      const moves = pseudoMoves(board, fr, fc, { wK:false,wQ:false,bK:false,bQ:false }, null);
      if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
    }
  return false;
}

function applyMove(board, fr, fc, tr, tc, enPassant, promote) {
  const b = board.map(r => [...r]);
  const p = b[fr][fc];
  const color = pieceColor(p);
  const type  = pieceType(p);

  // En-passant capture
  if (type === 'P' && enPassant && tr === enPassant[0] && tc === enPassant[1]) {
    const capturedRow = color === 'w' ? tr + 1 : tr - 1;
    b[capturedRow][tc] = null;
  }

  // Castling — move rook
  if (type === 'K' && Math.abs(tc - fc) === 2) {
    const row = fr;
    if (tc === 6) { b[row][5] = b[row][7]; b[row][7] = null; } // king-side
    else          { b[row][3] = b[row][0]; b[row][0] = null; } // queen-side
  }

  b[tr][tc] = promote ? `${color}${promote}` : p;
  b[fr][fc] = null;
  return b;
}

function isInCheck(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === `${color}K`)
        return isSquareAttacked(board, r, c, opp(color));
  return false;
}

// Legal moves for a piece at (r,c): pseudo-moves minus those that leave own king in check
export function legalMovesForPiece(board, r, c, castling, enPassant) {
  const p = board[r][c];
  if (!p) return [];
  return pseudoMoves(board, r, c, castling, enPassant).filter(([tr, tc]) => {
    const nb = applyMove(board, r, c, tr, tc, enPassant, null);
    return !isInCheck(nb, pieceColor(p));
  });
}

export function hasAnyLegalMove(board, color, castling, enPassant) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && pieceColor(p) === color)
        if (legalMovesForPiece(board, r, c, castling, enPassant).length > 0) return true;
    }
  return false;
}

const FILE = ['a','b','c','d','e','f','g','h'];
const RANK = ['8','7','6','5','4','3','2','1'];
const TYPE_NAME = { P:'', R:'R', N:'N', B:'B', Q:'Q', K:'K' };

function toSAN(p, fr, fc, tr, tc, capture, check) {
  return `${TYPE_NAME[pieceType(p)]}${capture ? FILE[fc] : ''}${capture ? 'x' : ''}${FILE[tc]}${RANK[tr]}${check ? '+' : ''}`;
}

export function executeMove(state, playerId, fromR, fromC, toR, toC, promote) {
  if (!state.started || state.winner || state.promotionPending)
    throw Object.assign(new Error('Not the right time to move.'), { code: 'bad_state' });

  const myColor = colorForPlayer(state, playerId);
  if (state.turn !== myColor)
    throw Object.assign(new Error('Not your turn.'), { code: 'not_turn' });

  const p = state.board[fromR][fromC];
  if (!p || pieceColor(p) !== myColor)
    throw Object.assign(new Error('No piece there.'), { code: 'bad_piece' });

  const legal = legalMovesForPiece(state.board, fromR, fromC, state.castling, state.enPassant);
  if (!legal.some(([r, c]) => r === toR && c === toC))
    throw Object.assign(new Error('Illegal move.'), { code: 'illegal' });

  // Check if promotion required
  const type = pieceType(p);
  const isPromotion = type === 'P' && (toR === 0 || toR === 7);
  if (isPromotion && !promote) {
    // Store pending and wait for client to send promote action
    state.promotionPending = { fromR, fromC, toR, toC, color: myColor };
    return;
  }

  const capture = !!state.board[toR][toC] ||
    (type === 'P' && state.enPassant && toR === state.enPassant[0] && toC === state.enPassant[1]);

  // Update castling rights
  if (type === 'K') { state.castling[`${myColor}K`] = false; state.castling[`${myColor}Q`] = false; }
  if (type === 'R') {
    if (fromC === 7) state.castling[`${myColor}K`] = false;
    if (fromC === 0) state.castling[`${myColor}Q`] = false;
  }

  // En-passant target for next move
  state.enPassant = (type === 'P' && Math.abs(toR - fromR) === 2)
    ? [(fromR + toR) / 2, toC] : null;

  state.board = applyMove(state.board, fromR, fromC, toR, toC, state.enPassant, promote || null);

  const nextColor = opp(myColor);
  const inCheck   = isInCheck(state.board, nextColor);
  const hasMoves  = hasAnyLegalMove(state.board, nextColor, state.castling, state.enPassant);
  const san       = toSAN(p, fromR, fromC, toR, toC, capture, inCheck);

  state.lastMove = { fromR, fromC, toR, toC, piece: p, san };
  state.log.push(`${playerLabel(state, playerId)}: ${san}`);

  if (!hasMoves) {
    if (inCheck) {
      // Checkmate
      state.winner = playerId;
      state.scores[playerId] = (state.scores[playerId] || 0) + 1;
      state.winReason = 'checkmate';
      state.log.push(`Checkmate! ${playerLabel(state, playerId)} wins.`);
    } else {
      // Stalemate
      state.winner = 'draw';
      state.winReason = 'stalemate';
      state.log.push("Stalemate — it's a draw.");
    }
  } else if (inCheck) {
    state.log.push(`${nextColor === 'w' ? 'White' : 'Black'} is in check!`);
  }

  state.turn = nextColor;
  state.promotionPending = null;
}

export function buildClientState(state, playerId) {
  const myColor = colorForPlayer(state, playerId);
  const opponent = state.players.find(p => p !== playerId);
  return {
    board: state.board,
    myColor,
    turn: state.turn,
    myTurn: state.started && !state.winner && !state.promotionPending && state.turn === myColor,
    winner: state.winner,
    winReason: state.winReason,
    started: state.started,
    lastMove: state.lastMove,
    log: state.log.slice(-12),
    scores: {
      mine:     state.scores[playerId] || 0,
      opponent: state.scores[opponent] || 0,
    },
    promotionPending: state.promotionPending
      ? state.promotionPending.color === myColor ? state.promotionPending : 'opponent'
      : null,
    castling: state.castling,
    enPassant: state.enPassant,
  };
}
