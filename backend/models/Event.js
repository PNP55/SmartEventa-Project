const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: String, // Store as string to support various formats; use for display
      default: null,
    },
    time: {
      type: String,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    image: {
      type: String,
      default: null,
    },
    sourceUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Parsed date for sorting and status calculation
    parsedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual: compute dynamic status based on date/time
eventSchema.virtual('status').get(function () {
  if (!this.parsedDate) return 'upcoming';

  const now = new Date();
  const eventDate = new Date(this.parsedDate);

  // If no time, treat whole day as the event duration
  const eventEnd = new Date(eventDate);
  eventEnd.setHours(23, 59, 59, 999);

  if (now < eventDate) return 'upcoming';
  if (now >= eventDate && now <= eventEnd) return 'ongoing';
  return 'past';
});

// Ensure virtuals are included in JSON output
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
