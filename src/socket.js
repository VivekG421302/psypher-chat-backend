import { nanoid } from 'nanoid';
import {
  getRoom,
  addMember,
  markConnected,
  markDisconnected,
  removeMember,
  pushMessage,
  findMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  roomSummary,
  listMembers,
} from './roomManager.js';
import { gameRegistry } from './games/registry.js';

function roomChannel(roomId) {
  return `room:${roomId}`;
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.roomId = null;
    socket.data.userId = null;

    // ---------- Room presence ----------
    socket.on('room:join', ({ roomId, userId, name, color } = {}) => {
      const room = getRoom(roomId);
      if (!room) return socket.emit('room:error', { code: 'not_found', message: 'Room not found or expired.' });

      const existing = room.members.get(userId);
      if (!existing) {
        if (room.members.size >= 2) {
          return socket.emit('room:error', { code: 'full', message: 'Room already has 2 members.' });
        }
        addMember(room, { userId, name, color, socketId: socket.id });
      } else {
        markConnected(room, userId, socket.id);
        if (name) existing.name = name;
        if (color) existing.color = color;
      }

      socket.data.roomId = room.id;
      socket.data.userId = userId;
      socket.join(roomChannel(room.id));

      socket.emit('room:joined', {
        room: roomSummary(room),
        messages: room.messages,
      });

      socket.to(roomChannel(room.id)).emit('room:member_update', {
        members: listMembers(room),
      });
      socket.to(roomChannel(room.id)).emit('room:system', {
        id: nanoid(8),
        text: `${existing ? existing.name : name} joined the room`,
        ts: Date.now(),
      });
    });

    socket.on('room:leave', () => {
      handleLeave(socket, { explicit: true });
    });

    // ---------- Chat ----------
    socket.on('chat:message', ({ roomId, ciphertext, iv } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null) return;
      const sender = room.members.get(socket.data.userId);
      if (!sender) return;

      const message = {
        id: nanoid(12),
        ciphertext,
        iv,
        senderId: sender.userId,
        senderName: sender.name,
        senderColor: sender.color,
        ts: Date.now(),
        reactions: {},
      };
      pushMessage(room, message);
      io.to(roomChannel(room.id)).emit('chat:message', message);
    });

    socket.on('chat:edit', ({ roomId, messageId, ciphertext } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null) return;
      const msg = findMessage(room, messageId);
      // Only the original sender may edit their own message.
      if (!msg || msg.senderId !== socket.data.userId) return;
      editMessage(room, messageId, ciphertext);
      io.to(roomChannel(room.id)).emit('chat:message_edited', {
        messageId,
        ciphertext,
        editedAt: msg.editedAt,
      });
    });

    socket.on('chat:delete', ({ roomId, messageId } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null) return;
      const msg = findMessage(room, messageId);
      // Only the original sender may delete their own message.
      if (!msg || msg.senderId !== socket.data.userId) return;
      deleteMessage(room, messageId);
      io.to(roomChannel(room.id)).emit('chat:message_deleted', { messageId });
    });

    socket.on('chat:react', ({ roomId, messageId, emoji } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null || !emoji) return;
      if (!findMessage(room, messageId)) return;
      const reactions = toggleReaction(room, messageId, socket.data.userId, emoji);
      if (reactions) {
        io.to(roomChannel(room.id)).emit('chat:reaction', { messageId, reactions });
      }
    });

    socket.on('chat:typing', ({ roomId, isTyping } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null) return;
      const sender = room.members.get(socket.data.userId);
      if (!sender) return;
      socket.to(roomChannel(room.id)).emit('chat:typing', {
        userId: sender.userId,
        name: sender.name,
        isTyping: !!isTyping,
      });
    });

    // Ephemeral, room-wide emoji burst — not tied to a specific message,
    // used for quick reactions during a minigame (or anywhere else in the
    // room). Not persisted anywhere; purely a live relay for an animation.
    socket.on('room:react', ({ roomId, emoji } = {}) => {
      const room = getRoom(roomId);
      if (!room || socket.data.userId == null || !emoji) return;
      const sender = room.members.get(socket.data.userId);
      if (!sender) return;
      io.to(roomChannel(room.id)).emit('room:reaction', {
        id: nanoid(8),
        emoji,
        byUserId: sender.userId,
        byName: sender.name,
        ts: Date.now(),
      });
    });

    // ---------- Games (generic, plugin-based) ----------
    socket.on('game:join', ({ roomId, gameId } = {}) => {
      const room = getRoom(roomId);
      const game = gameRegistry.get(gameId);
      if (!room || !game || socket.data.userId == null) return;
      if (!room.members.has(socket.data.userId)) return;

      let entry = room.games.get(gameId);
      if (!entry) {
        entry = { state: null, playerIds: [] };
        room.games.set(gameId, entry);
      }

      if (!entry.playerIds.includes(socket.data.userId)) {
        if (entry.playerIds.length >= game.maxPlayers) {
          return socket.emit('game:error', { gameId, message: 'This game is full.' });
        }
        entry.playerIds.push(socket.data.userId);
      }

      if (!entry.state && entry.playerIds.length >= game.minPlayers) {
        entry.state = game.createState(entry.playerIds);
      }

      if (entry.state && entry.playerIds.length === game.minPlayers && !entry.state.started) {
        game.start(entry.state);
      }

      if (entry.state) {
        broadcastGameState(io, room, game, entry);
      } else {
        socket.emit('game:waiting', { gameId: game.id });
      }
    });

    socket.on('game:action', ({ roomId, gameId, action, payload } = {}) => {
      const room = getRoom(roomId);
      const game = gameRegistry.get(gameId);
      if (!room || !game || socket.data.userId == null) return;
      const entry = room.games.get(gameId);
      if (!entry || !entry.state) return;
      const handler = game.actions[action];
      if (!handler) return;

      try {
        handler(entry.state, socket.data.userId, payload || {});
        broadcastGameState(io, room, game, entry);
      } catch (err) {
        socket.emit('game:error', { gameId, message: err.message || 'Invalid move.' });
      }
    });

    socket.on('game:leave', ({ roomId, gameId } = {}) => {
      const room = getRoom(roomId);
      if (!room) return;
      room.games.delete(gameId);
      io.to(roomChannel(room.id)).emit('game:reset', { gameId });
    });

    // ---------- Disconnect ----------
    socket.on('disconnect', () => {
      handleLeave(socket, { explicit: false });
    });
  });
}

function handleLeave(socket, { explicit }) {
  const { roomId, userId } = socket.data;
  if (!roomId || userId == null) return;
  const room = getRoom(roomId);
  if (!room) return;

  socket.leave(roomChannel(roomId));

  if (explicit) {
    const member = room.members.get(userId);
    removeMember(room, userId);
    room.games.clear();
    socket.to(roomChannel(roomId)).emit('room:member_update', { members: listMembers(room) });
    socket.to(roomChannel(roomId)).emit('room:system', {
      id: nanoid(8),
      text: `${member ? member.name : 'A user'} left the room`,
      ts: Date.now(),
    });
  } else {
    markDisconnected(room, userId);
    socket.to(roomChannel(roomId)).emit('room:member_update', { members: listMembers(room) });
  }

  socket.data.roomId = null;
  socket.data.userId = null;
}

function broadcastGameState(io, room, game, entry) {
  for (const pid of entry.playerIds) {
    const member = room.members.get(pid);
    if (!member || !member.socketId) continue;
    io.to(member.socketId).emit('game:state', {
      gameId: game.id,
      state: game.buildClientState(entry.state, pid),
    });
  }
}
