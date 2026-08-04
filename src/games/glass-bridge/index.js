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
    state.bridge       = G.generateBridge();
    state.grid         = G.buildPanelGrid();
    state.positions    = Object.fromEntries(state.players.map(id => [id, 0]));
    state.turn         = 0;
    state.winner       = null;
    state.log          = ['Bridge ready. Cross all 10 levels to win! Panels reset after each step — remember the path.'];
    state.lastMove     = null;
    state.revealedStep = null;
    state.started      = true;
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

      const currentLevel = state.positions[playerId]; // 0 = start, needs to reach LEVELS
      if (currentLevel >= G.LEVELS) {
        throw Object.assign(new Error('Already finished.'), { code: 'already_done' });
      }

      // Clear previous step reveal before recording the new one
      state.revealedStep = null;

      const safePanel = state.bridge[currentLevel];
      const isSafe    = panel === safePanel;
      const label     = G.playerLabel(state, playerId);

      // Reveal ONLY the panel just stepped on — and only until next action
      state.revealedStep = { level: currentLevel, panel, result: isSafe ? 'safe' : 'broken' };

      state.lastMove = {
        playerId,
        playerLabel: label,
        level:  currentLevel + 1,
        panel,
        result: isSafe ? 'safe' : 'fall',
      };

      if (isSafe) {
        state.positions[playerId] = currentLevel + 1;

        if (state.positions[playerId] >= G.LEVELS) {
          // Won — keep the safe panel visible on win
          state.winner = playerId;
          state.log.push(`🏆 ${label} crossed the bridge and WINS!`);
        } else {
          state.log.push(`✅ ${label} stepped safely — Level ${currentLevel + 1} cleared. Panel resets — remember it!`);
          // Panel reveal stays until they step again (which will clear it first)
          // Turn stays with current player — they advance to next level
        }
      } else {
        state.log.push(`💥 ${label} fell on Level ${currentLevel + 1} panel ${panel} — back to start!`);
        // Reset position but DO NOT fast-forward through known levels.
        // Player must re-walk the path from scratch — that's the memory challenge.
        state.positions[playerId] = 0;
        // Clear reveal immediately on fall so opponent doesn't see the broken panel linger
        // Actually keep it briefly — the broadcast will show it, then on next step it clears.
        G.nextTurn(state);
      }
    },

    restart(state) {
      GlassBridge.start(state);
    },
  },
};

export default GlassBridge;
