import { Router } from 'express';
import { nanoid } from 'nanoid';
import {
  createRoom,
  getRoom,
  canJoin,
  addMember,
  roomSummary,
  stats,
  config,
} from './roomManager.js';
import { listGames } from './games/registry.js';

const router = Router();

function sanitizeName(name) {
  return String(name || '').trim().slice(0, 32);
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), ...stats() });
});

router.get('/games', (req, res) => {
  res.json({ games: listGames() });
});

// Create a new room. The creator becomes member #1 (not yet "connected"
// until their socket joins the room).
router.post('/rooms', (req, res) => {
  const name = sanitizeName(req.body.name);
  const color = req.body.color || null;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  const room = createRoom({});
  const userId = nanoid(12);
  addMember(room, { userId, name, color });

  res.status(201).json({
    roomId: room.id,
    userId,
    room: roomSummary(room),
    inactivityTimeoutMs: config.INACTIVITY_TIMEOUT_MS,
  });
});

// Look up a room (used to validate a code before showing the join form).
router.get('/rooms/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found or expired.' });
  res.json({ room: roomSummary(room) });
});

// Join an existing room as member #2 (or reconnect as an existing member).
router.post('/rooms/:roomId/join', (req, res) => {
  const name = sanitizeName(req.body.name);
  const color = req.body.color || null;
  const existingUserId = req.body.userId || null;

  if (!name && !existingUserId) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  const room = getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found or expired.' });

  if (existingUserId && room.members.has(existingUserId)) {
    return res.json({ roomId: room.id, userId: existingUserId, room: roomSummary(room) });
  }

  const check = canJoin(req.params.roomId);
  if (!check.ok) {
    if (check.reason === 'full') {
      return res.status(409).json({ error: 'This room already has 2 members.' });
    }
    return res.status(404).json({ error: 'Room not found or expired.' });
  }

  const userId = nanoid(12);
  addMember(room, { userId, name, color });

  res.status(200).json({
    roomId: room.id,
    userId,
    room: roomSummary(room),
    inactivityTimeoutMs: config.INACTIVITY_TIMEOUT_MS,
  });
});

export default router;
