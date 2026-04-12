const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Online users map: { userId → socketId }
const onlineUsers = new Map();

module.exports = (io) => {

  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select('_id name role status');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user   = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🟢 ${socket.user.name} connected`);

    // Join personal room
    socket.join(`user_${userId}`);
    onlineUsers.set(userId, socket.id);

    // Mark online in DB
    await User.findByIdAndUpdate(userId, { online: true, socketId: socket.id });

    // Tell everyone this user is online
    socket.broadcast.emit('userOnline', { userId });

    // Send online users list to this user
    socket.emit('onlineUsers', { users: Array.from(onlineUsers.keys()) });

    // ── TYPING ──────────────────────────────────────────
    socket.on('typing', ({ receiverId, chatKey }) => {
      io.to(`user_${receiverId}`).emit('userTyping', {
        senderId: userId,
        chatKey,
        typing: true
      });
    });

    socket.on('stopTyping', ({ receiverId, chatKey }) => {
      io.to(`user_${receiverId}`).emit('userTyping', {
        senderId: userId,
        chatKey,
        typing: false
      });
    });

    // ── MESSAGE SEEN ─────────────────────────────────────
    socket.on('markSeen', ({ messageIds, chatKey, senderId }) => {
      io.to(`user_${senderId}`).emit('msgsSeen', {
        messageIds,
        chatKey,
        seenBy: userId
      });
    });

    // ── DISCONNECT ───────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 ${socket.user.name} disconnected`);
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, {
        online:   false,
        lastSeen: new Date(),
        socketId: ''
      });
      socket.broadcast.emit('userOffline', {
        userId,
        lastSeen: new Date()
      });
    });

  });

};
