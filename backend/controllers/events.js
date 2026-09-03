const Event = require('../models/Event');
const { parseDate } = require('../utils/dateParser');
const mongoose = require('mongoose');

/**
 * GET /api/events
 * Get all approved events (public). Supports search and filter query params.
 */
const getEvents = async (req, res) => {
  try {
    const { search, category, status, limit = 50, page = 1 } = req.query;

    const query = {};

    // Search by title, description, location
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
        { category: searchRegex },
      ];
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = new RegExp(category, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await Event.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Add dynamic status and filter if needed
    let result = events.map((e) => e.toJSON());

    if (status && status !== 'all') {
      result = result.filter((e) => e.status === status.toLowerCase());
    }

    const total = await Event.countDocuments(query);

    res.status(200).json({
      success: true,
      count: result.length,
      total,
      page: parseInt(page),
      events: result,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve events.' });
  }
};

/**
 * GET /api/events/:id
 * Get a single event by ID.
 */
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format.',
      });
    }

    const event = await Event.findById(id)
      .populate('createdBy', 'name email')
      .populate('participants', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found.',
      });
    }

    res.status(200).json({ success: true, event: event.toJSON() });
  } catch (error) {
    console.error('Get event by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve event.' });
  }
};

/**
 * POST /api/events/create
 * Create a new event (admin only).
 */
const createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, category, image, sourceUrl } =
      req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Event title is required.',
      });
    }

    // Parse date for sorting and status calculation
    const parsedDate = date ? parseDate(date) : null;

    const event = await Event.create({
      title,
      description: description || '',
      date: date || null,
      time: time || null,
      location: location || null,
      category: category || 'General',
      image: image || null,
      sourceUrl: sourceUrl || null,
      createdBy: req.user._id,
      parsedDate,
    });

    const populated = await event.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully.',
      event: populated.toJSON(),
    });
  } catch (error) {
    console.error('Create event error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
};

/**
 * GET /api/events/my
 * Get events created by the current user (admin).
 */
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.user._id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events: events.map((e) => e.toJSON()),
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve your events.' });
  }
};

/**
 * POST /api/events/:id/participate
 * Register current user as a participant (protected).
 */
const participateInEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Prevent duplicate registration
    const alreadyJoined = event.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );
    if (alreadyJoined) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered for this event.',
      });
    }

    // Check event is not past
    if (event.toJSON().status === 'past') {
      return res.status(400).json({
        success: false,
        message: 'Registration is closed for past events.',
      });
    }

    event.participants.push(req.user._id);
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered for the event!',
      participantCount: event.participants.length,
    });
  } catch (error) {
    console.error('Participate error:', error);
    res.status(500).json({ success: false, message: 'Failed to register for event.' });
  }
};

/**
 * DELETE /api/events/:id
 * Delete an event (admin only).
 */
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }

    const event = await Event.findByIdAndDelete(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    // Clean up dependent favorites and reviews.
    const User = require('../models/User');
    const Review = require('../models/Review');
    await Promise.all([
      User.updateMany({ favorites: event._id }, { $pull: { favorites: event._id } }),
      Review.deleteMany({ event: event._id }),
    ]);

    res.status(200).json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

/**
 * GET /api/events/memories
 * Get recently completed events (ended within the last 7 days).
 * Calculated dynamically from event date — events older than 7 days post-completion automatically lapse.
 */
const getMemories = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name email')
      .sort({ parsedDate: -1, createdAt: -1 });

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Filter dynamically for events that ended in the past 7 days
    const memories = events
      .map((e) => e.toJSON())
      .filter((event) => {
        if (!event.parsedDate) return false;
        const eventDate = new Date(event.parsedDate);
        
        // Must be in the past (completed) AND within 7 days
        const isPast = event.status === 'past' || eventDate < now;
        const isWithin7Days = eventDate >= sevenDaysAgo && eventDate <= now;

        return isPast && isWithin7Days;
      });

    res.status(200).json({
      success: true,
      count: memories.length,
      memories,
    });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve memories.' });
  }
};

/**
 * GET /api/events/favorites
 * Get the current user's favorite events.
 */
const getFavorites = async (req, res) => {
  try {
    const user = await require('../models/User')
      .findById(req.user._id)
      .populate({
        path: 'favorites',
        populate: { path: 'createdBy', select: 'name email' },
      });

    const favorites = (user?.favorites || []).filter(Boolean).map((e) => e.toJSON());
    res.status(200).json({ success: true, count: favorites.length, events: favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve favorites.' });
  }
};

/**
 * POST /api/events/:id/favorite
 * Add an event to the current user's favorites.
 */
const addFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { favorites: event._id } });

    res.status(200).json({ success: true, message: 'Event added to favorites.', favorite: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to add favorite.' });
  }
};

/**
 * DELETE /api/events/:id/favorite
 * Remove an event from the current user's favorites.
 */
const removeFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }

    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, { $pull: { favorites: id } });

    res.status(200).json({ success: true, message: 'Event removed from favorites.', favorite: false });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove favorite.' });
  }
};

/**
 * GET /api/events/:id/reviews
 * Get reviews and rating summary for an event.
 */
const getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }

    const Review = require('../models/Review');
    const reviews = await Review.find({ event: id })
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    res.status(200).json({
      success: true,
      count,
      average,
      reviews,
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve reviews.' });
  }
};

/**
 * POST /api/events/:id/reviews
 * Create one review per user per event.
 */
const createReview = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ success: false, message: 'Review cannot exceed 1000 characters.' });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

    const Review = require('../models/Review');
    const existing = await Review.findOne({ event: id, user: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this event.' });
    }

    const review = await Review.create({ event: id, user: req.user._id, rating, comment });
    const populated = await review.populate('user', 'name');

    res.status(201).json({ success: true, message: 'Review submitted successfully.', review: populated });
  } catch (error) {
    console.error('Create review error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this event.' });
    }
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

/**
 * PUT /api/events/:id/reviews/me
 * Update the current user's review.
 */
const updateMyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID.' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a whole number from 1 to 5.' });
    }

    const Review = require('../models/Review');
    const review = await Review.findOneAndUpdate(
      { event: id, user: req.user._id },
      { rating, comment },
      { new: true, runValidators: true }
    ).populate('user', 'name');

    if (!review) return res.status(404).json({ success: false, message: 'Your review was not found.' });
    res.status(200).json({ success: true, message: 'Review updated successfully.', review });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ success: false, message: 'Failed to update review.' });
  }
};

/**
 * DELETE /api/events/:id/reviews/me
 * Delete the current user's review.
 */
const deleteMyReview = async (req, res) => {
  try {
    const { id } = req.params;
    const Review = require('../models/Review');
    const result = await Review.deleteOne({ event: id, user: req.user._id });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: 'Your review was not found.' });
    }
    res.status(200).json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
};

module.exports = {
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
};

