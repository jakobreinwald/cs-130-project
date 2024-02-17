// Constants
const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;

// Dependencies
const { Album, Artist, Genre, Track, User } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

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
    const album_model = {
      album_type: album_obj.album_type,
      artist_ids: album_obj.artists.map(artist => artist.id),
      images: album_obj.images.map(this.saveImageObj),
      name: album_obj.name,
      release_date: album_obj.release_date,
      release_date_precision: album_obj.release_date_precision
    };

    // Update existing Album document, otherwise create new document
   return Album.findOneAndUpdate(
      { album_id: album_obj.id },
      album_model,
      { upsert: true }
    ).exec();
  }

  async createArtistModel(artist_obj) {
    // Convert Spotify API object to Artist model
    return {
      genres: artist_obj.genres,
      images: artist_obj.images.map(this.saveImageObj),
      name: artist_obj.name
    };
  }

  async createOrUpdateArtist(artist_obj) {
    // Create or update genre counts for given listener
    const genres = artist_obj.genres.map(this.createOrUpdateGenre);

    // Update existing Artist document, otherwise create new document
    const artist = Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      this.createArtistModel(artist_obj),
      { upsert: true }
    ).exec();

    // Return promise for all artist and genre updates
    return Promise.all([artist, ...genres]);
  }

  async createOrUpdateArtist(artist_obj, listener_id, rank_for_listener) {
    // Create or update genre counts for given listener
    const genres = artist_obj.genres.map(genre => this.createOrUpdateGenre(genre, listener_id));

    // Update existing Artist document, otherwise create new document
    const artist = Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      {
        ...this.createArtistModel(artist_obj),
        [`listener_id_to_rank.${listener_id}`]: rank_for_listener
      },
      { upsert: true }
    ).exec();

    // Return promise for all artist and genre updates
    return Promise.all([artist, ...genres]);
  }

  async createOrUpdateGenre(name) {
    // Update existing Genre document, otherwise create new document
    return Genre.findOneAndUpdate(
      { name: name },
      {},
      { upsert: true }
    ).exec();
  }

  async createOrUpdateGenre(name, listener_id) {
    // Update existing Genre document, otherwise create new document
    return Genre.findOneAndUpdate(
      { name: name },
      { $inc: { [`listener_id_to_count.${listener_id}`]: 1 } },
      { upsert: true }
    ).exec();
  }

  async createTrackModel(track_obj) {
    // Convert Spotify API object to Track model
    return {
      album_id: track_obj.album.id,
      artist_ids: track_obj.artists.map(artist => artist.id),
      name: track_obj.name,
      preview_url: track_obj.preview_url,
    };
  }

  async createOrUpdateTrack(track_obj, listener_id) {
    // Create or update Album, Artist, and Genre documents
    const album = this.createOrUpdateAlbum(track_obj.album);
    const artists = track_obj.artists.map(this.createOrUpdateArtist);
    const genres = track_obj.artists.genres.map(genre => this.createOrUpdateGenre(genre, listener_id));

    // Update existing Track document, otherwise create new document
    const track = Track.findOneAndUpdate(
      { track_id: track_obj.id },
      this.createTrackModel(track_obj),
      { upsert: true }
    ).exec();

    // Return promise for all album, artist, genre, and track updates
    return Promise.all([album, ...artists, ...genres, track]);
  }

  async createOrUpdateUser(top_artists, top_tracks, user_obj) {
    // Create or update Artist and Track documents
    const listener_id = user_obj.id;
    const artists = top_artists.map((artist, rank) => this.createOrUpdateArtist(artist, listener_id, rank));
    const tracks = top_tracks.map(track => this.createOrUpdateTrack(track, listener_id));

    // Update existing User document, otherwise create new document
    const user = User.findOneAndUpdate(
      { user_id: user_obj.id },
      {
        display_name: user_obj.display_name,
        images: user_obj.images.map(this.saveImageObj),
      },
      { upsert: true }
    ).exec();

    // Return promise for all artist, track, and user updates
    return Promise.all([...artists, ...tracks, user]);
  }

  async getAlbum(album_id) {
    return Album.findOne({ album_id: album_id }).exec();
  }

  async getArtist(artist_id) {
    return Artist.findOne({ artist_id: artist_id }).exec();
  }

  async getGenre(name) {
    return Genre.findOne({ name: name }).exec();
  }

  async getTrack(track_id) {
    return Track.findOne({ track_id: track_id }).exec();
  }
  
  async getUser(user_id) {
    return User.findOne({ user_id: user_id }).exec();
  }
}

module.exports = Database;
