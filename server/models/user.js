// Dependencies
const Artist = require('./artist');
const Track = require('./track');
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
  top_artists: {
    type: [Artist]
  },
  top_tracks: {
    type: [Track]
  },
  user_id: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Export User model
module.exports = mongoose.model('User', User);
