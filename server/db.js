// Dependencies
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' }); 

// Connect to database
const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;

class Database {
  constructor() {
    mongoose.connect(connection, { useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => console.log('Connected to Minuet database'))
      .catch(console.error);
  }

  async createOrUpdateAlbum(album_obj) {
  }

  async createOrUpdateArtist(artist_obj) {
  }

  async createOrUpdateGenre(genre_id, name, listener_id, rank_for_listener) {
  }

  async createOrUpdateTrack(track_obj) {
  }

  async createOrUpdateUser(top_artists, top_tracks, user_obj) {
  }

  async getAlbum(album_id) {
  }

  async getArtist(artist_id) {
  }

  async getGenre(genre_id) {
  }

  async getTrack(track_id) {
  }
  
  async getUser(user_id) {
  }
}

module.exports = Database;
