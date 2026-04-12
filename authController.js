const User            = require('../models/User');
const { generateToken } = require('../middleware/auth');

// ── Seed admin users (run once on first login) ────────
const SEED_ADMINS = [
  { phone: '9415061063', name: 'Haji Mahmood Ahmad', city: 'Bahraich', role: 'admin', status: 'approved' },
  { phone: '9839060377', name: 'Sri Md. Irfan',      city: 'Lucknow',  role: 'admin', status: 'approved' }
];

// POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });

    // Seed admin if first login
    const isAdmin = SEED_ADMINS.find(a => a.phone === phone);

    let user = await User.findOne({ phone });
    if (!user) {
      if (isAdmin) {
        user = await User.create({ ...isAdmin, phone });
      } else {
        user = await User.create({ phone, name: 'New Member', status: 'pending' });
      }
    }

    // Generate OTP
    const otp = '123456'; // For demo — in production use SMS gateway
    user.otp = {
      code:      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    };
    await user.save();

    console.log(`📱 OTP for ${phone}: ${otp}`);

    // In development — send OTP in response for testing
    res.json({
      success: true,
      message: 'OTP sent',
      otp     // Remove this line in production!
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check OTP
    if (!user.otp || user.otp.code !== otp) {
      return res.status(401).json({ success: false, message: 'Wrong OTP' });
    }
    if (user.otp.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'OTP expired' });
    }

    // Clear OTP
    user.otp = undefined;
    await user.save();

    const token         = generateToken(user._id);
    const needsSetup    = user.name === 'New Member';
    const adminUser     = user.role === 'admin' || user.status === 'approved';

    res.json({
      success: true,
      token,
      needsProfileSetup: needsSetup && !adminUser,
      user: {
        _id:        user._id,
        name:       user.name,
        phone:      user.phone,
        profilePic: user.profilePic,
        role:       user.role,
        status:     user.status,
        city:       user.city
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/auth/setup-profile
const setupProfile = async (req, res) => {
  try {
    const { name, city, bio } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), city: city || '', bio: bio || '' },
      { new: true }
    ).select('-otp');

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-otp');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendOTP, verifyOTP, setupProfile, getMe };
