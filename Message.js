const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatKey:    { type: String, required: true, index: true },
  text:       { type: String, default: '' },
  type:       { type: String, enum: ['text','image','audio','gif'], default: 'text' },
  mediaUrl:   { type: String, default: '' },
  status:     { type: String, enum: ['sent','delivered','seen'], default: 'sent' },
  isDeleted:  { type: Boolean, default: false },
  isEdited:   { type: Boolean, default: false }
}, { timestamps: true });

MessageSchema.index({ chatKey: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
