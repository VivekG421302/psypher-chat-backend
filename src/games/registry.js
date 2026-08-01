import UnoGame from './uno/index.js';

/**
 * Add future games here. Each entry must implement:
 *   id, name, emoji, tagline, minPlayers, maxPlayers,
 *   createState(playerIds), start(state), buildClientState(state, playerId),
 *   actions: { [actionName]: (state, playerId, payload) => void }
 */
const GAMES = [UnoGame];

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
