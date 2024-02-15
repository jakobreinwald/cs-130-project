// Dependencies
const Album = require('./album');
const Artist = require('./artist');
const mongoose = require('mongoose');

// Track schema
const Track = new mongoose.Schema({
  album: {
    type: Album
  },
  artists: {
    type: [String]
  },
  name: {
    type: String
  },
  preview_url: {
    type: String
  },
  track_id: {
    type: String,
    required: true,
    index: true
  },
  timestamps: true
});

// Export Track model
module.exports = mongoose.model('Track', Track);
