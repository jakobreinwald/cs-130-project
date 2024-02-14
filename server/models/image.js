// Dependencies
const mongoose = require('mongoose');

// Image schema
const Image = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  width: {
    type: Number,
    required: true
  }
});

// Export Image schema
module.exports = Image;
