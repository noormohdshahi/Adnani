const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const { protect } = require('../middleware/auth');
const { sendMessage, getMessages, getConversations, deleteMessage, editMessage } = require('../controllers/messageController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/conversations', protect, getConversations);
router.post('/send',         protect, upload.single('media'), sendMessage);
router.get('/:userId',       protect, getMessages);
router.delete('/:id',        protect, deleteMessage);
router.put('/:id',           protect, editMessage);

module.exports = router;
