const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEventById,
  createEvent,
  getMyEvents,
  participateInEvent,
  deleteEvent,
  getMemories,
  getFavorites,
  addFavorite,
  removeFavorite,
  getReviews,
  createReview,
  updateMyReview,
  deleteMyReview,
} = require('../controllers/events');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.get('/', getEvents);
router.get('/memories', getMemories);
router.get('/:id/reviews', getReviews);
router.get('/favorites', protect, getFavorites);
router.get('/:id', getEventById);

// Protected routes (logged-in users)
router.post('/:id/participate', protect, participateInEvent);
router.post('/:id/favorite', protect, addFavorite);
router.delete('/:id/favorite', protect, removeFavorite);
router.post('/:id/reviews', protect, createReview);
router.put('/:id/reviews/me', protect, updateMyReview);
router.delete('/:id/reviews/me', protect, deleteMyReview);

// Admin-only routes
router.post('/create', protect, adminOnly, createEvent);
router.get('/admin/my', protect, adminOnly, getMyEvents);
router.delete('/:id', protect, adminOnly, deleteEvent);

module.exports = router;

