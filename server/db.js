// Dependencies
const { Album, Artist, Genre, Track, User } = require('./models');
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

  saveImageObj(image_obj) {
    return new Image({
      url: image_obj.url,
      height: image_obj.height,
      width: image_obj.width
    });
  }
  

  async createOrUpdateAlbum(album_obj) {
    // Convert album_obj to Album model
    const album = {
      album_id: album_obj.id,
      album_type: album_obj.album_type,
      artist_ids: album_obj.artists.map(artist => artist.id),
      images: album_obj.images.map(this.saveImageObj),
      name: album_obj.name,
      release_date: album_obj.release_date,
      release_date_precision: album_obj.release_date_precision
    };

    // Update existing Album document, otherwise create new document
    await Album.updateOne(
      { album_id: album_obj.id },
      album,
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async createOrUpdateArtist(artist_obj, listener_id, rank_for_listener) {
    // Convert artist_obj to Artist model
    const artist = {
      artist_id: artist_obj.id,
      genres: artist_obj.genres.map(genre => this.createOrUpdateGenre(genre, listener_id)),
      images: artist_obj.images.map(this.saveImageObj),
      name: artist_obj.name,
    };

    // TODO: add remaining Artist fields and update listener_id_to_rank
  }

  async createOrUpdateGenre(name, listener_id) {
    // Update existing Genre document, if any
    const genre = await Genre.findOneAndUpdate({ name: name }, {
      $inc: { [`listener_id_to_count.${listener_id}`]: 1 }
    });

    // If no Genre document exists, create new document
    if (!genre) {
      await Genre.create({
        name: name,
        listener_id_to_count: { [listener_id]: 1 }
      });
    }
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
