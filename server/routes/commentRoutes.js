const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getComments, addComment, deleteComment, editComment, getCommentsByUser } = require('../controllers/commentController');

// ── مفتوح للكل (قراءة فقط) ───────────────────────────
router.get('/user/:userId', getCommentsByUser);
router.get('/:productId', getComments);

// ── محمي بـ verifyToken 🔒 ───────────────────────────
router.post('/:productId', verifyToken, addComment);
router.put('/single/:commentId', verifyToken, editComment);
router.delete('/single/:commentId', verifyToken, deleteComment);

module.exports = router;