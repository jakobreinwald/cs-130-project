// Dependencies
const { Album, Artist, Genre, Track, User, Match } = require('./models');
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
      images: artist_obj.images ? artist_obj.images.map(this.createImageModel) : [],
      name: artist_obj.name
    };
  }

  createImageModel(image_obj) {
    return {
      url: image_obj.url,
      height: image_obj.height,
      width: image_obj.width
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

  async addRecommendation(user_id, track_id) {
    // Add new recommended track that user has not yet acted upon
    return User.findOneAndUpdate(
      { user_id: user_id },
      { $set: { [`recommended_track_to_outcome.${track_id}`]: 'none' } }
    ).exec();
  }

  async createOrUpdateAlbum(album_obj) {
    // Update existing Album document, otherwise create new document
   return Album.findOneAndUpdate(
      { album_id: album_obj.id },
      this.createAlbumModel(album_obj),
      { upsert: true }
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
      { upsert: true }
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
      { upsert: true }
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
    // Create or update Album document
    const album = this.createOrUpdateAlbum(track_obj.album);

    // Update existing Track document, otherwise create new document
    const track = Track.findOneAndUpdate(
      { track_id: track_obj.id },
      this.createTrackModel(track_obj),
      { upsert: true }
    ).exec();

    // Return promise for all album, artist, genre, and track updates
    return Promise.all([album, track]);
  }

  async createOrUpdateTracks(tracks) {
    // Update existing Track documents, otherwise create new documents
    return Track.bulkWrite(tracks.map(track => this.constructTrackUpdateOperation(track)));
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
        images: user_obj.images.map(this.createImageModel),
        top_artist_ids: top_artist_ids,
        top_track_ids: top_track_ids,
        total_genre_count: total_genre_count
      },
      { upsert: true }
    ).exec();
  }

  async dismissMatch(user_id, match_id) {
    // TODO: increment match offset in user document
    return User.updateOne(
      { user_id: user_id },
      { $set: { [`matched_user_to_outcome.${match_id}`]: 'dismissed' } }
    ).exec();
  }

  async dismissRecommendation(user_id, rec_id) {
    return User.updateOne(
      { user_id: user_id },
      { $set: { [`recommended_track_to_outcome.${rec_id}`]: 'dismissed' } }
    ).exec();
  }

  async likeMatch(user_id, match_id) {
    // adds match_id to matched_and_liked_user_ids in user document
    await User.updateOne(
      { user_id: user_id },
      { $set: { [`matched_user_to_outcome.${match_id}`]: 'liked' } }
    ).exec();
  }

  async createOrUpdateMatch(user_id, match_id, match_score, top_shared_artist_ids, top_shared_genres, top_shared_track_ids) {
    // check if match exists
    return Match.findOneAndUpdate(
      { $or: [{ user_a_id: user_id, user_b_id: match_id }, { user_a_id: match_id, user_b_id: user_id }] },
      {
        match_score: match_score,
        top_shared_artist_ids: top_shared_artist_ids,
        top_shared_genres: top_shared_genres,
        top_shared_track_ids: top_shared_track_ids
      },
      { upsert: true }
    ).exec();
  }

  async addPotentialMatch(user_id, match_id) {

    return User.updateOne(
      { user_id: user_id },
      { $set: { [`matched_user_to_outcome.${match_id}`]: 'none' } }
    ).exec();
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

  async getPotentialMatches(user_id) {
    return User.findOne({ user_id: user_id }, 'matched_user_to_outcome -_id').exec();
  }

  async getMatch(user_id, match_id) {
    return Match.findOne({ $or: [{ user_a_id: user_id, user_b_id: match_id }, { user_a_id: match_id, user_b_id: user_id }] }).exec();
  }

  async getMatches(user_id) {
    return User.findOne({ user_id: user_id }, 'matches -_id').exec();
  }
}

module.exports = Database;
