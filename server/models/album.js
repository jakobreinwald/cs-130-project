// Dependencies
const Image = require('./image');
const mongoose = require('mongoose');

// Album schema
const Album = new mongoose.Schema({
  album_id: {
    type: String,
    required: true 
  },
  album_type: {
    type: String,
    required: true
  },
  artist_ids: {
    type: [String],
    required: true
  },
  images: {
    type: [Image],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  release_date: {
    type: String,
    required: true
  },
  release_date_precision: {
    type: String,
    enum: ['year', 'month', 'day'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Export Album model
module.exports = mongoose.model('Album', Album);
