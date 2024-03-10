// Dependencies
const { Album, Artist, Genre, Track, User } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

class Database {
  constructor() {
    const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;
    mongoose.connect(connection)
      .then(() => console.log('Connected to Minuet database'))
      .catch(console.error);
  }

  constructAlbumUpdateOperation(album_obj) {
    // Generate update command for Album document
    return {
      updateOne: {
        filter: { album_id: album_obj.id },
        update: { $set: this.createAlbumModel(album_obj) },
        upsert: true
      }
    };
  }

  constructArtistUpdateOperation(artist_obj, listener_id = null, rank = null) {
    // Convert Spotify API object to Artist model
    const update_command = { $set: this.createArtistModel(artist_obj) };

    if (listener_id && rank) {
      update_command.$set[`listener_id_to_rank.${listener_id}`] = rank;
    }

    // Generate update command for Artist document
    const update_op = {
      updateOne: {
        filter: { artist_id: artist_obj.id },
        update: update_command,
        upsert: true
      }
    };

    return update_op;
  }

  constructTrackUpdateOperation(track_obj) {
    // Generate update command for Track document
    return {
      updateOne: {
        filter: { track_id: track_obj.id },
        update: { $set: this.createTrackModel(track_obj) },
        upsert: true
      }
    };
  }

  createAlbumModel(album_obj) {
    // Convert Spotify API object to Album model
    return {
      album_type: album_obj.album_type,
      artist_ids: album_obj.artists.map(artist => artist.id),
      images: album_obj.images.map(this.createImageModel),
      name: album_obj.name,
      release_date: album_obj.release_date,
      release_date_precision: album_obj.release_date_precision
    };
  }

  createArtistModel(artist_obj) {
    // Convert Spotify API object to Artist model
    return {
      genres: artist_obj.genres,
      // TODO: this line is called every time the model is updated
      images: artist_obj.images ? artist_obj.images.map(this.createImageModel) : [],
      name: artist_obj.name
    };
  }

  createImageModel({ url, height, width }) {
    // Ensure API response conforms to underlying database model
    return { url, height, width };
  }

  createTrackModel(track_obj) {
    // Convert Spotify API object to Track model
    return {
      album: track_obj.album.id,
      artist_ids: track_obj.artists.map(({ id }) => id),
      name: track_obj.name,
      preview_url: track_obj.preview_url,
    };
  }

  getAlbumQuery(album_id) {
    return Album.findOne({ album_id: album_id });
  }

  getArtistQuery(artist_id) {
    return Artist.findOne({ artist_id: artist_id });
  }

  getGenreQuery(name) {
    return Genre.findOne({ name: name });
  }

  getUserQuery(user_id) {
    return User.findOne({ user_id: user_id });
  }

  getTrackQuery(track_id) {
    return Track.findOne({ track_id: track_id });
  }

  async addRecommendations(rec_ids, user_doc) {
    // Add new recommended tracks that user has not yet acted upon
    user_doc.recommended_and_fresh_tracks = rec_ids.reduce((map, rec_id) => {
        map.set(rec_id, '');
        return map;
      }, user_doc.recommended_and_fresh_tracks);

    return user_doc.save();
  }

  async createOrUpdateAlbum(album_obj) {
    // Update existing Album document, otherwise create new document
   return Album.findOneAndUpdate(
      { album_id: album_obj.id },
      this.createAlbumModel(album_obj),
      { new: true, upsert: true }
    ).exec();
  }

  async createOrUpdateAlbums(albums) {
    // Update existing Album documents, otherwise create new documents
    return Album.bulkWrite(albums.map(album => this.constructAlbumUpdateOperation(album)));
  }

  async createOrUpdateArtist(artist_obj) {
    // Update existing Artist document, otherwise create new document
    return Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      this.createArtistModel(artist_obj),
      { new: true, upsert: true }
    ).exec();
  }

  async createOrUpdateArtist(artist_obj, listener_id, rank_for_listener) {
    // Update existing Artist document, otherwise create new document
    return Artist.findOneAndUpdate(
      { artist_id: artist_obj.id },
      {
        ...(this.createArtistModel(artist_obj)),
        [`listener_id_to_rank.${listener_id}`]: rank_for_listener
      },
      { new: true, upsert: true }
    ).exec();
  }

  async createOrUpdateArtists(ranked_artists, unranked_artists, listener_id) {
    // Update existing Artist documents, otherwise create new documents
    const ranked_ops = ranked_artists.map((artist, rank) => this.constructArtistUpdateOperation(artist, listener_id, rank));
    const unranked_ops = unranked_artists.map(artist => this.constructArtistUpdateOperation(artist));
    const update_ops = ranked_ops.concat(unranked_ops);
    return Artist.bulkWrite(update_ops);
  }

  async createOrUpdateGenreCounts(genre_counts, listener_id) {
    // Find all genre documents with listener_id
    const genres = await Genre
      .find({ [`listener_id_to_count.${listener_id}`]: { $exists: true } })
      .exec();

    // Determine genres in genre_counts that are not in database
    const db_genres = new Set(genres.map(genre => genre.name));
    const all_genres = [...db_genres, ...genre_counts.keys()];
    
    // Update listener_id_to_count for each genre
    const update_command = (genre) => {
      if (genre_counts.has(genre)) {
        return { $set: { [`listener_id_to_count.${listener_id}`]: genre_counts.get(genre) } };
      } else {
        return { $unset: { [`listener_id_to_count.${listener_id}`]: '' } };
      }
    }

    // Return promise for all genre document updates
    return Genre.bulkWrite(all_genres.map(genre => ({
      updateOne: {
        filter: { name: genre },
        update: update_command(genre),
        upsert: true
      }
    })));
  }

  async createOrUpdateTrack(track_obj) {
    // Update existing Track document, otherwise create new document
    return Track.findOneAndUpdate(
      { track_id: track_obj.id },
      this.createTrackModel(track_obj),
      { new: true, upsert: true }
    ).exec();
  }

  async createOrUpdateTracks(tracks) {
    // Update existing Track documents, otherwise create new documents
    return Track.bulkWrite(tracks.map(track => this.constructTrackUpdateOperation(track)));
  }

  async createOrUpdateUser(genre_counts, top_artist_ids, top_track_ids, user_obj) {
    // Update existing User document, otherwise create new document
    // sum the values of the genre_counts map
    // const total_genre_count = Array.from(genre_counts.values()).reduce((a, b) => a + b, 0);
    const { id, display_name } = user_obj;
    const images = user_obj.images.map(this.createImageModel);

    return User.findOneAndUpdate(
      { user_id: id },
      {
        display_name,
        // genre_counts,
        images,
        top_artist_ids,
        top_track_ids,
        // total_genre_count
      },
      { new: true, upsert: true }
    ).exec();
  }

  async dismissMatch(user_id, match_id) {
    // TODO: increment match offset in user document
    // TODO: adds match_id to matched_and_dismissed_user_ids in user document
  }

  async dismissRecommendation(user_id, rec_id) {
    return User.updateOne(
      { user_id: user_id },
      {
        $set: {[`recommended_track_to_outcome.${rec_id}`]: 'dismissed' },
        $unset: {[`recommended_and_fresh_tracks.${rec_id}`]: '' }
      }
    ).exec();
  }

  async likeMatch(user_id, match_id) {
    // TODO: adds match_id to matched_and_liked_user_ids in user document
  }

  async likeRecommendation(user_id, rec_id) {
    return User.findOneAndUpdate(
      { user_id: user_id },
      {
        $set: { [`recommended_track_to_outcome.${rec_id}`]: 'liked' },
        $unset: { [`recommended_and_fresh_tracks.${rec_id}`]: '' }
      },
      { fields: { _id: 0, recommended_tracks_playlist_id: 1 } }
    ).lean().exec();
  }

  async getAlbum(album_id) {
    return Album.findOne({ album_id: album_id }).exec();
  }

  async getAlbums(album_ids) {
    return Album.find({ album_id: { $in: album_ids } }).lean().exec();
  }

  async getArtist(artist_id) {
    return Artist.findOne({ artist_id: artist_id }).exec();
  }

  async getArtists(artist_ids) {
    return Artist.find({ artist_id: { $in: artist_ids } }).lean().exec();
  }

  async getGenre(name) {
    return Genre.findOne({ name: name }).exec();
  }

  async getTrack(track_id) {
    return Track.findOne({ track_id: track_id }).exec();
  }

  async getTracks(track_ids) {
    return Track.find({ track_id: { $in: track_ids } }).lean().exec();
  }

  async getTracksWithAlbumAndArtists(track_ids) {
    const cached_tracks = await this.getTracks(track_ids).catch(console.error);

    if (!cached_tracks) {
      return Promise.reject('Failed to fetch tracks from database');
    }

    const album_ids = cached_tracks.map(({ album_id }) => album_id);
    const artist_ids = cached_tracks.flatMap(({ artist_ids }) => artist_ids);

    const cached_albums = this.getAlbums(album_ids);
    const cached_artists = this.getArtists(artist_ids);
    const albums_and_artists = await Promise.all([cached_albums, cached_artists]).catch(console.error);

    if (!albums_and_artists) {
      return Promise.reject('Failed to fetch albums and artists from database');
    }

    const [albums, artists] = albums_and_artists;
  }

  async getUser(user_id) {
    return this.getUserQuery(user_id).lean().exec();
  }
  
  async getUserDocument(user_id) {
    return this.getUserQuery(user_id).exec();
  }
}

module.exports = Database;
