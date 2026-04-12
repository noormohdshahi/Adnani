const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:  String,
  userPic:   String,
  text:      String,
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content:   { type: String, default: '' },
  images:    [String],
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:  [CommentSchema],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

PostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
