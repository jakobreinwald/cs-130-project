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
    type: [Artist]
  },
  name: {
    type: String
  },
  preview_url: {
    type: String
  },
  track_id: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
});

// Export Track model
module.exports = mongoose.model('Track', Track);
