// Dependencies
const mongoose = require('mongoose');

// Genre schema
const Genre = new mongoose.Schema({
  genre_id: {
    type: String,
    required: true
  },
  listener_id_to_rank: {
    type: Map,
    of: Number,
    required: true
  },
  name: {
    type: String
  }
});

// Export Genre model
module.exports = mongoose.model('Genre', Genre);
