import UnoGame from './uno/index.js';
import GuessWhoGame from './guesswho/index.js';
import TicTacToeGame from './tictactoe/index.js';
import GlassBridge from './glass-bridge/index.js';
import ChessGame from './chess/index.js';

const GAMES = [UnoGame, GuessWhoGame, TicTacToeGame, GlassBridge, ChessGame];

export const gameRegistry = new Map(GAMES.map((g) => [g.id, g]));

export function listGames() {
  return GAMES.map(({ id, name, emoji, tagline, minPlayers, maxPlayers }) => ({
    id, name, emoji, tagline, minPlayers, maxPlayers,
  }));
}
