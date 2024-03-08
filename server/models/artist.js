// Dependencies
const Image = require('./image');
const mongoose = require('mongoose');

// Artist schema
const Artist = new mongoose.Schema(
  {
    artist_id: {
      type: String,
      required: true,
      index: true
    },
    listener_id_to_rank: {
      type: Map,
      of: Number,
    },
    genres: {
      type: [String],
      default: []
    },
    images: {
      type: [Image],
      default: []
    },
    name: {
      type: String
    },
  },
  {
    timestamps: true
  }
);

// Export Artist model
module.exports = mongoose.model('Artist', Artist);
