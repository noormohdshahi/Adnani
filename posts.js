const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const { protect } = require('../middleware/auth');
const { getPosts, createPost, likePost, addComment, deletePost } = require('../controllers/postController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/',              protect, getPosts);
router.post('/',             protect, upload.array('images', 4), createPost);
router.post('/:id/like',     protect, likePost);
router.post('/:id/comment',  protect, addComment);
router.delete('/:id',        protect, deletePost);

module.exports = router;
