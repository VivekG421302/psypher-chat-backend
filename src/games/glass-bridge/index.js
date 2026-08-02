import * as G from './logic.js';

const GlassBridge = {
  id: 'glass-bridge',
  name: 'Glass Bridge Dash',
  emoji: '🪟',
  tagline: 'Cross the bridge — or fall trying',
  minPlayers: 2,
  maxPlayers: 2,

  createState(playerIds) { return G.freshState(playerIds); },
  start(state) {
    // Regenerate bridge fresh every game
    state.bridge  = G.generateBridge();
    state.grid    = G.buildPanelGrid();
    state.positions = Object.fromEntries(state.players.map(id => [id, 0]));
    state.turn    = 0;
    state.winner  = null;
    state.log     = ['Bridge ready. Cross all 10 levels to win!'];
    state.lastMove = null;
    state.started = true;
  },
  buildClientState(state, playerId) { return G.buildClientState(state, playerId); },

  actions: {
    step(state, playerId, payload) {
      if (!state.started || state.winner) {
        throw Object.assign(new Error('Game not active.'), { code: 'not_active' });
      }
      if (state.players[state.turn] !== playerId) {
        throw Object.assign(new Error('Not your turn.'), { code: 'not_turn' });
      }

      const panel = Number(payload?.panel);
      if (!panel || panel < 1 || panel > G.PANELS) {
        throw Object.assign(new Error('Choose panel 1–4.'), { code: 'bad_panel' });
      }

      const currentLevel = state.positions[playerId];     // 0-indexed: 0 = start
      const targetLevel  = currentLevel;                  // 0-indexed into grid
      const label        = G.playerLabel(state, playerId);

      if (currentLevel >= G.LEVELS) {
        throw Object.assign(new Error('Already finished.'), { code: 'already_done' });
      }

      const safePanel   = state.bridge[targetLevel];
      const isSafe      = panel === safePanel;

      // Mark the panel
      state.grid[targetLevel][panel] = isSafe ? 'safe' : 'broken';

      state.lastMove = {
        playerId,
        playerLabel: label,
        level: targetLevel + 1,
        panel,
        result: isSafe ? 'safe' : 'fall',
      };

      if (isSafe) {
        state.positions[playerId] = currentLevel + 1;
        if (state.positions[playerId] >= G.LEVELS) {
          state.winner = playerId;
          state.log.push(`🏆 ${label} crossed the bridge and WINS!`);
        } else {
          state.log.push(`✅ ${label} stepped safely on panel ${panel} (Level ${targetLevel + 1}).`);
          // Player keeps their turn — they advance to next level
        }
      } else {
        state.log.push(`💥 ${label} fell on panel ${panel} (Level ${targetLevel + 1}) — reset to start!`);
        state.positions[playerId] = 0;
        G.nextTurn(state);
      }
    },

    restart(state) {
      GlassBridge.start(state);
    },
  },
};

export default GlassBridge;
