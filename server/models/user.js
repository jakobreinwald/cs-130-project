// Dependencies
const Image = require('./image');
const mongoose = require('mongoose');

// User schema
const User = new mongoose.Schema({
  display_name: {
    type: String
  },
  images: {
    type: [Image]
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
  timestamps: true
});

// Export User model
module.exports = mongoose.model('User', User);
