const User = require('../models/User');

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: 'approved', _id: { $ne: req.user._id } };
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: search }
      ];
    }
    const users = await User.find(query)
      .select('name phone profilePic online lastSeen city bio')
      .sort({ name: 1 })
      .limit(50);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/:id
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name phone profilePic online lastSeen city bio');
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { name, bio, city } = req.body;
    const update = {};
    if (name) update.name = name;
    if (bio  !== undefined) update.bio  = bio;
    if (city !== undefined) update.city = city;
    if (req.file) update.profilePic = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-otp');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/pending  (admin)
const getPending = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' })
      .select('name phone city createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/users/:id/approve  (admin)
const approveUser = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const status = action === 'reject' ? 'blocked' : 'approved';
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });

    // Notify user via socket
    const io = req.app.get('io');
    if (io && user.socketId) {
      io.to(user.socketId).emit('accountStatus', { status });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/users/status?ids=id1,id2
const getStatus = async (req, res) => {
  try {
    const ids   = (req.query.ids || '').split(',').filter(Boolean);
    const users = await User.find({ _id: { $in: ids } }).select('online lastSeen');
    const map   = {};
    users.forEach(u => { map[u._id] = { online: u.online, lastSeen: u.lastSeen }; });
    res.json({ success: true, status: map });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getUsers, getUser, updateProfile, getPending, approveUser, getStatus };
