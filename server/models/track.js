// Dependencies
const mongoose = require('mongoose');

// Track schema
const Track = new mongoose.Schema(
  {
    album_id: {
      type: String,
    },
    artist_ids: {
      type: [String]
    },
    duration_ms: {
      type: Number
    },
    name: {
      type: String
    },
    popularity: {
      type: Number
    },
    preview_url: {
      type: String
    },
    track_id: {
      type: String,
      required: true,
      index: true
    },
  },
  {
    timestamps: true
  }
);

// Export Track model
module.exports = mongoose.model('Track', Track);
