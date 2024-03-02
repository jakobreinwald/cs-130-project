// Dependencies
const { Album, Artist, Genre, Image, Track, User } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

class Database {
  constructor() {
    const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;
    mongoose.connect(connection)
      .then(() => console.log('Connected to Minuet database'))
      .catch(console.error);
  }

  createArtistModel(artist_obj) {
    // Convert Spotify API object to Artist model
    return {
      genres: artist_obj.genres,
      images: artist_obj.images ? artist_obj.images.map(this.saveImageObj) : [],
      name: artist_obj.name
    };
  }

  createTrackModel(track_obj) {
    // Convert Spotify API object to Track model
    return {
      album_id: track_obj.album.id,
      artist_ids: track_obj.artists.map(artist => artist.id),
      name: track_obj.name,
      preview_url: track_obj.preview_url,
    };
  }

  saveImageObj(image_obj) {
    return {
      url: image_obj.url,
      height: image_obj.height,
      width: image_obj.width
    };
  }

  async addRecommendation(user_id, track_id) {
    // Add new recommended track that user has not yet acted upon
    return User.findOneAndUpdate(
      { user_id: user_id },
      { $set: { [`recommended_track_to_outcome.${track_id}`]: 'none' } }
    ).exec();
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

  async createOrUpdateArtist(artist_obj) {
    // Create or update genre counts for given listener
    const genres = this.createOrUpdateGenreList(artist_obj.genres);

    // Update existing Artist document, otherwise create new document
    const artist = Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      this.createArtistModel(artist_obj),
      { upsert: true }
    ).exec();

    // Return promise for all artist and genre updates
    return Promise.all([artist, genres]);
  }

  async createOrUpdateArtist(artist_obj, listener_id, rank_for_listener) {
    // Create or update genre counts for given listener
    const genres = this.createOrUpdateGenreList(artist_obj.genres);
    
    // Update existing Artist document, otherwise create new document
    const artist = Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      {
        ...(this.createArtistModel(artist_obj)),
        [`listener_id_to_rank.${listener_id}`]: rank_for_listener
      },
      { upsert: true }
    ).exec();

    // Return promise for all artist and genre updates
    return Promise.all([artist, genres]);
  }

  async createOrUpdateGenre(name) {
    // Update existing Genre document, otherwise create new document
    return Genre.findOneAndUpdate(
      { name: name },
      {},
      { upsert: true }
    ).exec();
  }

  async createOrUpdateGenre(name, listener_id, count) {
    // Update existing Genre document, otherwise create new document
    return Genre.findOneAndUpdate(
      { name: name },
      { [`listener_id_to_count.${listener_id}`]: count },
      { upsert: true }
    ).exec();
  }

  async createOrUpdateGenreList(genres) {
    // Ignore if no genres provided
    if (!genres) {
      return Promise.resolve();
    }
    
    // Create or update genre counts for given listener
    return Promise.all(genres.map(genre => this.createOrUpdateGenre(genre)));
  }

  async createOrUpdateGenreList(genres, listener_id) {
    // Ignore if no genres provided
    if (!genres) {
      return Promise.resolve();
    }
    
    // Create or update genre counts for given listener
    return Promise.all(genres.map(genre => this.createOrUpdateGenre(genre, listener_id)));
  }

  async createOrUpdateTrack(track_obj, listener_id) {
    // Create or update Album, Artist, and Genre documents
    const album = this.createOrUpdateAlbum(track_obj.album);
    const artists = track_obj.artists.map(artist => this.createOrUpdateArtist(artist));

    // Update existing Track document, otherwise create new document
    const track = Track.findOneAndUpdate(
      { track_id: track_obj.id },
      this.createTrackModel(track_obj),
      { upsert: true }
    ).exec();

    // Return promise for all album, artist, genre, and track updates
    return Promise.all([album, ...artists, track]);
  }

  async createOrUpdateUser(genre_counts, top_artist_ids, top_track_ids, user_obj) {
    // Update existing User document, otherwise create new document
    // sum the values of the genre_counts map
    const total_genre_count = Array.from(genre_counts.values()).reduce((a, b) => a + b, 0);
    return User.findOneAndUpdate(
      { user_id: user_obj.id },
      {
        display_name: user_obj.display_name,
        genre_counts: genre_counts,
        images: user_obj.images.map(this.saveImageObj),
        top_artist_ids: top_artist_ids,
        top_track_ids: top_track_ids,
        total_genre_count: total_genre_count
      },
      { upsert: true }
    ).exec();
  }

  async dismissMatch(user_id, match_id) {
    // TODO: increment match offset in user document
    // TODO: adds match_id to matched_and_dismissed_user_ids in user document
  }

  async dismissRecommendation(user_id, rec_id) {
    return User.updateOne(
      { user_id: user_id },
      { $set: { [`recommended_track_to_outcome.${rec_id}`]: 'dismissed' } }
    ).exec();
  }

  async likeMatch(user_id, match_id) {
    // TODO: adds match_id to matched_and_liked_user_ids in user document
  }

  async likeRecommendation(user_id, rec_id) {
    return User.updateOne(
      { user_id: user_id },
      { $set: { [`recommended_track_to_outcome.${rec_id}`]: 'liked' } }
    ).exec();
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
