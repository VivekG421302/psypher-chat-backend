export const LEVELS = 10;
export const PANELS = 4;

/**
 * Build the hidden answer key: for each level, exactly one panel (1–4) is safe.
 */
export function generateBridge() {
  const bridge = [];
  for (let lvl = 0; lvl < LEVELS; lvl++) {
    bridge.push(Math.floor(Math.random() * PANELS) + 1); // safe panel ID 1-4
  }
  return bridge; // bridge[0] = safe panel for level 1, etc.
}

/**
 * Build the revealed state visible to clients: 10 levels × 4 panels.
 * status: 'unknown' | 'safe' | 'broken'
 */
export function buildPanelGrid() {
  const grid = [];
  for (let lvl = 0; lvl < LEVELS; lvl++) {
    const row = {};
    for (let p = 1; p <= PANELS; p++) row[p] = 'unknown';
    grid.push(row); // index 0 = level 1
  }
  return grid;
}

export function freshState(playerIds) {
  return {
    players: [...playerIds],          // ordered player list
    bridge: generateBridge(),         // secret answer key (server only)
    grid: buildPanelGrid(),           // revealed panel states
    positions: Object.fromEntries(playerIds.map(id => [id, 0])), // 0=start, 10=won
    turn: 0,                          // index into players[]
    started: false,
    winner: null,
    log: [],
    lastMove: null,                   // { playerId, playerLabel, level, panel, result }
  };
}

export function playerLabel(state, playerId) {
  const idx = state.players.indexOf(playerId);
  return idx === -1 ? 'Unknown' : `Player ${idx + 1}`;
}

export function nextTurn(state) {
  state.turn = (state.turn + 1) % state.players.length;
}

/** Build the client-safe view — hides bridge answer key */
export function buildClientState(state, playerId) {
  return {
    grid: state.grid,
    positions: state.positions,
    players: state.players,
    myPlayerId: playerId,
    myPosition: state.positions[playerId] ?? 0,
    myTurn: state.players[state.turn] === playerId,
    activePlayerId: state.players[state.turn],
    started: state.started,
    winner: state.winner,
    log: state.log.slice(-10),
    lastMove: state.lastMove,
    playerCount: state.players.length,
  };
}
