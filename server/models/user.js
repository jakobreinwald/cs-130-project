// Dependencies
const Image = require('./image');
const mongoose = require('mongoose');
const Match = require('./match');

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
    },
    // we use this to lookup match data
    matches: {
      // maps matched_user_id to match object
      type: Map,
      of:  String
    },
    // we use this to look for the first match with no outcome
    matched_user_to_outcome: {
      type: Map,
      of: {
        type: String,
        enum: ['liked', 'dismissed', 'matched', 'none'],
        default: 'none',
      }
    },
    recommended_track_to_outcome: {
      type: Map,
      of: {
        type: String,
        enum: ['liked', 'dismissed', 'none'],
        default: 'none',
      }
    },
    top_artist_ids: {
      type: [String]
    },
    top_track_ids: {
      type: [String]
    },
    total_genre_count: {
      type: Number
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
