import UnoGame from './uno/index.js';
import GuessWhoGame from './guesswho/index.js';
import TicTacToeGame from './tictactoe/index.js';
import GlassBridge from './glass-bridge/index.js';

/**
 * Add future games here. Each entry must implement:
 *   id, name, emoji, tagline, minPlayers, maxPlayers,
 *   createState(playerIds), start(state), buildClientState(state, playerId),
 *   actions: { [actionName]: (state, playerId, payload) => void }
 */
const GAMES = [UnoGame, GuessWhoGame, TicTacToeGame, GlassBridge];

export const gameRegistry = new Map(GAMES.map((g) => [g.id, g]));

export function listGames() {
  return GAMES.map(({ id, name, emoji, tagline, minPlayers, maxPlayers }) => ({
    id,
    name,
    emoji,
    tagline,
    minPlayers,
    maxPlayers,
  }));
}
