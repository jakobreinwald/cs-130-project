// Dependencies
const Image = require('./image');
const mongoose = require('mongoose');

// User schema
const User = new mongoose.Schema(
  {
    display_name: {
      type: String
    },
    images: {
      type: [Image]
    },
    genre_counts: {
      type: Map,
      of: Number,
      default: {}
    },
    matched_and_dismissed_user_ids: {
      type: [String]
    },
    matched_and_liked_user_ids: {
      type: [String]
    },
    matched_user_ids: {
      type: [String]
    },
    recommended_and_dismissed_track_ids: {
      type: [String]
    },
    recommended_and_liked_track_ids: {
      type: [String]
    },
    recommended_track_ids: {
      type: [String]
    },
    top_artist_ids: {
      type: [String]
    },
    top_track_ids: {
      type: [String]
    },
    user_id: {
      type: String,
      required: true,
      index: true
    },
  },
  {
    timestamps: true
  }
);

// Export User model
module.exports = mongoose.model('User', User);
