const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const { CoupRoom } = require('./public/js/gameEngine');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Active rooms indexed by 6-char roomCode
const rooms = new Map();
// Map socket.id -> { roomCode, playerId }
const socketMeta = new Map();
// Bot timers per roomCode
const botTimers = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

function broadcastRoomState(room) {
  if (!room) return;
  const socketsInRoom = io.sockets.adapter.rooms.get(room.roomCode);
  if (socketsInRoom) {
    for (const sockId of socketsInRoom) {
      const meta = socketMeta.get(sockId);
      const viewerId = meta ? meta.playerId : null;
      io.to(sockId).emit('room_state', room.getStateForPlayer(viewerId));
    }
  }
  scheduleBotStep(room);
}

function scheduleBotStep(room) {
  if (!room) return;
  if (botTimers.has(room.roomCode)) {
    clearTimeout(botTimers.get(room.roomCode));
    botTimers.delete(room.roomCode);
  }
  if (room.state === 'LOBBY' || room.state === 'GAME_OVER') return;

  const timer = setTimeout(() => {
    botTimers.delete(room.roomCode);
    const acted = room.StepBot();
    if (acted) {
      broadcastRoomState(room);
    }
  }, 1050);

  botTimers.set(room.roomCode, timer);
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName, playerId }, callback) => {
    const pid = playerId || 'p_' + Math.random().toString(36).slice(2, 10);
    const roomCode = generateRoomCode();
    const room = new CoupRoom(roomCode, pid, playerName || 'Player 1');
    rooms.set(roomCode, room);

    socket.join(roomCode);
    socketMeta.set(socket.id, { roomCode, playerId: pid });

    if (typeof callback === 'function') {
      callback({ ok: true, roomCode, playerId: pid });
    }
    broadcastRoomState(room);
  });

  socket.on('join_room', ({ roomCode, playerName, playerId }, callback) => {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) {
      if (typeof callback === 'function') callback({ error: 'ROOM_NOT_FOUND' });
      return;
    }

    const pid = playerId || 'p_' + Math.random().toString(36).slice(2, 10);
    const existing = room.getPlayer(pid);

    if (!existing && room.state !== 'LOBBY') {
      if (typeof callback === 'function') callback({ error: 'GAME_ALREADY_IN_PROGRESS' });
      return;
    }

    const res = room.addPlayer(pid, playerName || 'Player', false);
    if (res.error) {
      if (typeof callback === 'function') callback({ error: res.error });
      return;
    }

    socket.join(cleanCode);
    socketMeta.set(socket.id, { roomCode: cleanCode, playerId: pid });

    if (typeof callback === 'function') {
      callback({ ok: true, roomCode: cleanCode, playerId: pid });
    }
    broadcastRoomState(room);
  });

  socket.on('add_bot', (_, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.hostId !== meta.playerId) return;
    const res = room.addBot();
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('remove_bot', ({ botId }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.hostId !== meta.playerId) return;
    const res = room.removeBot(botId);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('reorder_players', ({ orderIds }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.hostId !== meta.playerId) return;
    const res = room.reorderPlayers(orderIds);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('start_game', (_, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.hostId !== meta.playerId) return;
    const res = room.startGame();
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('back_to_lobby', (_, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.hostId !== meta.playerId) return;
    room.state = 'LOBBY';
    room.pendingAction = null;
    room.pendingBlock = null;
    room.pendingLoss = null;
    room.exchangePool = null;
    if (typeof callback === 'function') callback({ ok: true });
    broadcastRoomState(room);
  });

  socket.on('declare_action', ({ actionId, targetId }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.declareAction(meta.playerId, actionId, targetId);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('pass_reaction', (_, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.passReaction(meta.playerId);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('declare_block', ({ claimedRole }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.declareBlock(meta.playerId, claimedRole);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('declare_challenge', (_, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.declareChallenge(meta.playerId);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('choose_loss', ({ cardIndex }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.chooseInfluenceToLose(meta.playerId, cardIndex);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('complete_exchange', ({ selectedIndices }, callback) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const res = room.completeExchange(meta.playerId, selectedIndices);
    if (typeof callback === 'function') callback(res);
    broadcastRoomState(room);
  });

  socket.on('send_reaction', ({ emoji, text }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    const player = room.getPlayer(meta.playerId);
    if (!player) return;
    io.to(room.roomCode).emit('player_reaction', {
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      emoji: (emoji || '').slice(0, 8),
      text: (text || '').slice(0, 60),
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    socketMeta.delete(socket.id);
    const room = rooms.get(meta.roomCode);
    if (!room) return;
    room.removePlayer(meta.playerId);
    if (room.players.filter((p) => !p.isBot && p.connected).length === 0) {
      // Keep room in memory for 15 minutes in case players reconnect
      setTimeout(() => {
        const r = rooms.get(meta.roomCode);
        if (r && r.players.filter((p) => !p.isBot && p.connected).length === 0) {
          rooms.delete(meta.roomCode);
        }
      }, 15 * 60 * 1000);
    } else {
      broadcastRoomState(room);
    }
  });
});

// Support SPA routes like /join, /create, /room/:code
app.get(['/join', '/create', '/room/:code'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Coup Online Server running at http://localhost:${PORT}`);
});
