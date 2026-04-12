const router   = require('express').Router();
const multer   = require('multer');
const path     = require('path');
const { protect, adminOnly } = require('../middleware/auth');
const { getUsers, getUser, updateProfile, getPending, approveUser, getStatus } = require('../controllers/userController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/status',        protect, getStatus);
router.get('/pending',       protect, adminOnly, getPending);
router.get('/',              protect, getUsers);
router.get('/:id',           protect, getUser);
router.put('/profile',       protect, upload.single('profilePic'), updateProfile);
router.put('/:id/approve',   protect, adminOnly, approveUser);

module.exports = router;
