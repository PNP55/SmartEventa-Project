const express = require('express');
const router = express.Router();
const { extractEvent } = require('../controllers/ai');
const { protect, adminOnly } = require('../middleware/auth');

// AI extraction is admin-only to prevent abuse
router.post('/extract', protect, adminOnly, extractEvent);

module.exports = router;
