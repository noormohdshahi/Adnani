const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  phone:      { type: String, required: true, unique: true, trim: true },
  username:   { type: String, default: '' },
  profilePic: { type: String, default: '' },
  bio:        { type: String, default: '' },
  city:       { type: String, default: '' },
  role:       { type: String, enum: ['member', 'admin'], default: 'member' },
  status:     { type: String, enum: ['approved', 'pending', 'blocked'], default: 'pending' },
  online:     { type: Boolean, default: false },
  lastSeen:   { type: Date, default: Date.now },
  socketId:   { type: String, default: '' },
  otp:        { code: String, expiresAt: Date }
}, { timestamps: true });

UserSchema.index({ phone: 1 });
UserSchema.index({ status: 1 });

module.exports = mongoose.model('User', UserSchema);
