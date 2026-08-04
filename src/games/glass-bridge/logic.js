export const LEVELS = 10;
export const PANELS = 4;

export function generateBridge() {
  const bridge = [];
  for (let lvl = 0; lvl < LEVELS; lvl++) {
    bridge.push(Math.floor(Math.random() * PANELS) + 1);
  }
  return bridge;
}

/**
 * Grid is always all-unknown — panels are never permanently marked.
 * Only the single panel stepped on RIGHT NOW is temporarily revealed.
 * It resets to unknown before the next step is made.
 * This forces players to memorise the safe path themselves.
 */
export function buildPanelGrid() {
  const grid = [];
  for (let lvl = 0; lvl < LEVELS; lvl++) {
    const row = {};
    for (let p = 1; p <= PANELS; p++) row[p] = 'unknown';
    grid.push(row);
  }
  return grid;
}

export function freshState(playerIds) {
  return {
    players:      [...playerIds],
    bridge:       generateBridge(),
    grid:         buildPanelGrid(),     // always all-unknown between steps
    positions:    Object.fromEntries(playerIds.map(id => [id, 0])),
    turn:         0,
    started:      false,
    winner:       null,
    log:          [],
    lastMove:     null,
    // The single panel revealed right now (cleared before next step)
    revealedStep: null,  // { level: 0-indexed, panel: 1-4, result: 'safe'|'broken' }
  };
}

export function playerLabel(state, playerId) {
  const idx = state.players.indexOf(playerId);
  return idx === -1 ? 'Unknown' : `Player ${idx + 1}`;
}

export function nextTurn(state) {
  state.turn = (state.turn + 1) % state.players.length;
}

export function buildClientState(state, playerId) {
  // Build a grid that only shows the current step's reveal — everything else unknown
  const grid = buildPanelGrid();
  if (state.revealedStep) {
    const { level, panel, result } = state.revealedStep;
    grid[level][panel] = result;
  }

  return {
    grid,
    positions:      state.positions,
    players:        state.players,
    myPlayerId:     playerId,
    myPosition:     state.positions[playerId] ?? 0,
    myTurn:         state.players[state.turn] === playerId,
    activePlayerId: state.players[state.turn],
    started:        state.started,
    winner:         state.winner,
    log:            state.log.slice(-10),
    lastMove:       state.lastMove,
    playerCount:    state.players.length,
  };
}
