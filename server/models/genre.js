// Dependencies
const mongoose = require('mongoose');

// Genre schema
const Genre = new mongoose.Schema({
  listener_id_to_count: {
    type: Map,
    of: Number,
    required: true,
    default: {}
  },
  name: {
    type: String,
    required: true
  }
});

// Export Genre model
module.exports = mongoose.model('Genre', Genre);