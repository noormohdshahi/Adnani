const Post = require('../models/Post');

// GET /api/posts
const getPosts = async (req, res) => {
  try {
    const page  = parseInt(req.query.page) || 1;
    const limit = 15;
    const posts = await Post.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'name profilePic city');

    const myId  = req.user._id.toString();
    const result = posts.map(p => ({
      ...p.toObject(),
      hasLiked:  p.likes.some(id => id.toString() === myId),
      likeCount: p.likes.length
    }));
    res.json({ success: true, posts: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/posts
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const images = (req.files || []).map(f => `/uploads/${f.filename}`);
    if (!content && !images.length) {
      return res.status(400).json({ success: false, message: 'Content required' });
    }
    const post = await Post.create({ userId: req.user._id, content: content || '', images });
    await post.populate('userId', 'name profilePic city');

    const io = req.app.get('io');
    if (io) io.emit('newPost', { post });

    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/posts/:id/like
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });

    const myId   = req.user._id;
    const liked  = post.likes.some(id => id.toString() === myId.toString());

    if (liked) post.likes.pull(myId);
    else       post.likes.addToSet(myId);
    await post.save();

    const io = req.app.get('io');
    if (io) io.emit('postLiked', { postId: post._id, likeCount: post.likes.length });

    res.json({ success: true, liked: !liked, likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/posts/:id/comment
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Text required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });

    const comment = {
      userId:   req.user._id,
      userName: req.user.name,
      userPic:  req.user.profilePic,
      text
    };
    post.comments.push(comment);
    await post.save();

    const newComment = post.comments[post.comments.length - 1];
    const io = req.app.get('io');
    if (io) io.emit('newComment', { postId: post._id, comment: newComment });

    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/posts/:id
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Not found' });
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    post.isDeleted = true;
    await post.save();

    const io = req.app.get('io');
    if (io) io.emit('postDeleted', { postId: post._id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPosts, createPost, likePost, addComment, deletePost };
