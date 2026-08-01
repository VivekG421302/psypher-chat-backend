import { customAlphabet } from 'nanoid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
const genRoomId = customAlphabet(ALPHABET, 8);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 min
const EMPTY_ROOM_GRACE_MS = 45 * 1000; // 45s grace for reconnects
const CLEANUP_INTERVAL_MS = 30 * 1000;
const MAX_MEMBERS_PER_ROOM = 2;
const MAX_MESSAGE_BUFFER = 200;

/**
 * In-memory only, by design: this app is meant to run on a free-tier host
 * (e.g. Render) that spins the service down after ~15 min of inactivity.
 * When that happens, all memory is wiped and every room disappears with it.
 * The interval-based cleanup below just makes sure the same thing happens
 * even if the process *doesn't* sleep (e.g. kept warm by other traffic).
 *
 * rooms: Map<roomId, Room>
 * Room = {
 *   id, createdAt, lastActivity,
 *   members: Map<userId, { userId, name, color, socketId, joinedAt, connected }>,
 *   messages: [{ id, ciphertext, senderId, senderName, senderColor, ts, system }],
 *   games: Map<gameId, gameState>  // populated lazily by game modules
 * }
 */
const rooms = new Map();

function now() {
  return Date.now();
}

function touch(room) {
  room.lastActivity = now();
}

export function createRoom({ name, color }) {
  let id;
  do {
    id = genRoomId();
  } while (rooms.has(id));

  const room = {
    id,
    createdAt: now(),
    lastActivity: now(),
    members: new Map(),
    messages: [],
    games: new Map(),
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(roomId) {
  return rooms.get(String(roomId).toUpperCase());
}

export function roomExists(roomId) {
  return rooms.has(String(roomId).toUpperCase());
}

export function canJoin(roomId) {
  const room = getRoom(roomId);
  if (!room) return { ok: false, reason: 'not_found' };
  if (room.members.size >= MAX_MEMBERS_PER_ROOM) {
    return { ok: false, reason: 'full' };
  }
  return { ok: true, room };
}

export function addMember(room, { userId, name, color, socketId }) {
  room.members.set(userId, {
    userId,
    name,
    color,
    socketId: socketId || null,
    joinedAt: now(),
    connected: !!socketId,
  });
  touch(room);
}

export function markConnected(room, userId, socketId) {
  const m = room.members.get(userId);
  if (m) {
    m.socketId = socketId;
    m.connected = true;
    touch(room);
  }
}

export function markDisconnected(room, userId) {
  const m = room.members.get(userId);
  if (m) {
    m.connected = false;
    m.socketId = null;
    touch(room);
  }
}

export function removeMember(room, userId) {
  room.members.delete(userId);
  touch(room);
}

export function pushMessage(room, message) {
  room.messages.push(message);
  if (room.messages.length > MAX_MESSAGE_BUFFER) {
    room.messages = room.messages.slice(-MAX_MESSAGE_BUFFER);
  }
  touch(room);
}

export function listMembers(room) {
  return Array.from(room.members.values()).map((m) => ({
    userId: m.userId,
    name: m.name,
    color: m.color,
    connected: m.connected,
  }));
}

export function roomSummary(room) {
  return {
    id: room.id,
    createdAt: room.createdAt,
    memberCount: room.members.size,
    members: listMembers(room),
  };
}

export function stats() {
  return {
    activeRooms: rooms.size,
    totalMembers: Array.from(rooms.values()).reduce((n, r) => n + r.members.size, 0),
  };
}

function cleanup() {
  const t = now();
  let removed = 0;
  for (const [id, room] of rooms.entries()) {
    const connectedCount = Array.from(room.members.values()).filter((m) => m.connected).length;
    const idleFor = t - room.lastActivity;

    if (room.members.size === 0 && idleFor > EMPTY_ROOM_GRACE_MS) {
      rooms.delete(id);
      removed++;
      continue;
    }
    if (connectedCount === 0 && idleFor > EMPTY_ROOM_GRACE_MS) {
      rooms.delete(id);
      removed++;
      continue;
    }
    if (idleFor > INACTIVITY_TIMEOUT_MS) {
      rooms.delete(id);
      removed++;
    }
  }
  if (removed > 0) {
    console.log(`[cleanup] removed ${removed} room(s), ${rooms.size} active`);
  }
}

export function startCleanupLoop() {
  return setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

export const config = {
  INACTIVITY_TIMEOUT_MS,
  MAX_MEMBERS_PER_ROOM,
};
