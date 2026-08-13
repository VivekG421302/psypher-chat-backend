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
//
// An optional `roomId` lets a client "revive" a room code it already has
// saved locally (e.g. from its past-rooms history) after the original room
// expired server-side. This is purely a courtesy for reconnecting with the
// same person — the code must still match the standard room-id shape, and
// if it's already active the request is rejected (code: 'exists') since
// that means the room never actually died.
router.post('/rooms', (req, res) => {
  const name = sanitizeName(req.body.name);
  const color = req.body.color || null;
  const requestedId = req.body.roomId ? String(req.body.roomId).trim() : null;
  if (!name) return res.status(400).json({ error: 'Name is required.', code: 'bad_name' });

  let room;
  try {
    room = createRoom({ id: requestedId || undefined });
  } catch (err) {
    const code = err.code || 'error';
    const status = code === 'exists' ? 409 : 400;
    return res.status(status).json({ error: err.message, code });
  }

  const userId = nanoid(12);
  addMember(room, { userId, name, color });

  res.status(201).json({
    roomId: room.id,
    userId,
    room: roomSummary(room),
    inactivityTimeoutMs: config.INACTIVITY_TIMEOUT_MS,
    revived: !!requestedId,
  });
});

// Look up a room (used to validate a code before showing the join form).
router.get('/rooms/:roomId', (req, res) => {
  const room = getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found or expired.', code: 'not_found' });
  res.json({ room: roomSummary(room) });
});

// Join an existing room as member #2 (or reconnect as an existing member).
router.post('/rooms/:roomId/join', (req, res) => {
  const name = sanitizeName(req.body.name);
  const color = req.body.color || null;
  const existingUserId = req.body.userId || null;

  if (!name && !existingUserId) {
    return res.status(400).json({ error: 'Name is required.', code: 'bad_name' });
  }

  const room = getRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found or expired.', code: 'not_found' });

  if (existingUserId && room.members.has(existingUserId)) {
    return res.json({ roomId: room.id, userId: existingUserId, room: roomSummary(room) });
  }

  const check = canJoin(req.params.roomId);
  if (!check.ok) {
    if (check.reason === 'full') {
      return res.status(409).json({ error: 'This room already has 2 members.', code: 'full' });
    }
    return res.status(404).json({ error: 'Room not found or expired.', code: 'not_found' });
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
