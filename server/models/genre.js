// Dependencies
const mongoose = require('mongoose');

// Genre schema
const Genre = new mongoose.Schema(
  {
    listener_id_to_count: {
      type: Map,
      of: Number,
    },
    name: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

// Export Genre model
module.exports = mongoose.model('Genre', Genre);
