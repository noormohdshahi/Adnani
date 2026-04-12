const Message = require('../models/Message');
const User    = require('../models/User');

const makeChatKey = (a, b) => [a, b].sort().join('_');

// POST /api/messages/send
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, type = 'text' } = req.body;
    if (!receiverId) return res.status(400).json({ success: false, message: 'receiverId required' });
    if (!text && !req.file) return res.status(400).json({ success: false, message: 'Content required' });

    const chatKey = makeChatKey(req.user._id.toString(), receiverId);
    const msgData = {
      senderId:   req.user._id,
      receiverId,
      chatKey,
      text:       text || '',
      type,
      status:     'sent'
    };
    if (req.file) {
      msgData.mediaUrl = `/uploads/${req.file.filename}`;
      msgData.type     = req.body.type || 'image';
    }

    const message = await Message.create(msgData);
    await message.populate('senderId', 'name profilePic');

    // Real-time delivery
    const io = req.app.get('io');
    if (io) {
      const receiver = await User.findById(receiverId).select('socketId online');
      io.to(`user_${receiverId}`).emit('newMessage', { message });
      if (receiver && receiver.online) {
        await Message.findByIdAndUpdate(message._id, { status: 'delivered' });
        message.status = 'delivered';
        io.to(`user_${req.user._id}`).emit('msgDelivered', { messageId: message._id });
      }
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/messages/:userId
const getMessages = async (req, res) => {
  try {
    const chatKey  = makeChatKey(req.user._id.toString(), req.params.userId);
    const page     = parseInt(req.query.page) || 1;
    const limit    = 30;
    const messages = await Message.find({ chatKey, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('senderId', 'name profilePic');

    // Mark received messages as seen
    const io = req.app.get('io');
    const unread = messages.filter(
      m => m.receiverId.toString() === req.user._id.toString() && m.status !== 'seen'
    );
    if (unread.length) {
      const ids = unread.map(m => m._id);
      await Message.updateMany({ _id: { $in: ids } }, { status: 'seen' });
      if (io) {
        io.to(`user_${req.params.userId}`).emit('msgsSeen', {
          messageIds: ids,
          chatKey,
          seenBy: req.user._id
        });
      }
    }

    res.json({ success: true, chatKey, messages: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/messages/conversations
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Get distinct chat partners
    const sent     = await Message.distinct('receiverId', { senderId:   req.user._id });
    const received = await Message.distinct('senderId',   { receiverId: req.user._id });
    const allIds   = [...new Set([...sent.map(String), ...received.map(String)])];

    // Get last message with each user
    const convos = await Promise.all(allIds.map(async (otherId) => {
      const chatKey = makeChatKey(userId, otherId);
      const last    = await Message.findOne({ chatKey })
        .sort({ createdAt: -1 })
        .select('text type status createdAt senderId isDeleted');
      const other   = await User.findById(otherId)
        .select('name profilePic online lastSeen');
      const unread  = await Message.countDocuments({
        chatKey, receiverId: req.user._id, status: { $ne: 'seen' }
      });
      return { chatKey, other, lastMessage: last, unreadCount: unread };
    }));

    // Sort by last message time
    convos.sort((a, b) => {
      const at = a.lastMessage?.createdAt || 0;
      const bt = b.lastMessage?.createdAt || 0;
      return new Date(bt) - new Date(at);
    });

    res.json({ success: true, conversations: convos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findOne({ _id: req.params.id, senderId: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    msg.isDeleted = true;
    msg.text = '';
    await msg.save();
    const io = req.app.get('io');
    if (io) io.to(`user_${msg.receiverId}`).emit('msgDeleted', { messageId: msg._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/messages/:id
const editMessage = async (req, res) => {
  try {
    const msg = await Message.findOne({ _id: req.params.id, senderId: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' });
    msg.text     = req.body.text;
    msg.isEdited = true;
    await msg.save();
    const io = req.app.get('io');
    if (io) io.to(`user_${msg.receiverId}`).emit('msgEdited', { message: msg });
    res.json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendMessage, getMessages, getConversations, deleteMessage, editMessage };
