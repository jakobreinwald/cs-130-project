// Constants
const num_artist_seeds = 2;
const num_track_seeds = 3;
const rec_batch_len = 5;

// Dependencies
const SpotifyAPI = require('./spotify_api');

/**
 * Song recommendations helper class
 */
class Recommendations {
  /**
   * Constructs Recommendations helper with database client instance
   * @param {Database} database - Database client instance
   */
  constructor(database) {
    this.db = database;
  }

  /**
   * Creates a new playlist on user's Spotify account for recommended tracks, if not already created
   * @param {string} access_token - Spotify access token for logged in user
   * @param {mongoose.Document} user_doc - User document from database
   * @returns {Promise<mongoose.Document>} - Updated user document with cached playlist id
   */
  static async createRecommendedTracksPlaylist(access_token, user_doc) {
    const { recommended_tracks_playlist_id, user_id } = user_doc;
    
    // Check if cached playlist id exists on Spotify, otherwise create new playlist
    if (recommended_tracks_playlist_id) {
      const playlist_exists = await SpotifyAPI.fetchPlaylist(access_token, recommended_tracks_playlist_id)
        .then(() => true)
        .catch(({ response }) => {
          if (response.status != 400 && response.data.error.message != 'Invalid base62 id') {
            console.error(response.data);
          }
          
          return false;
        });
      
      if (playlist_exists) {
        return Promise.resolve(user_doc);
      }
    }
    
    // Call Spotify API endpoint to create recommendations playlist, caching playlist id in database
    const new_playlist_id = await SpotifyAPI.createRecommendedTracksPlaylist(access_token, user_id)
      .then(({ data }) => data.id)
      .catch(({ response }) => console.error(response.data));

    if (new_playlist_id) {
      user_doc.recommended_tracks_playlist_id = new_playlist_id;
      return user_doc.save();
    }

    // Log playlist creation failure, but otherwise return unchanged user document
    return Promise.resolve(user_doc);
  }
  
  /**
   * Updates offsets of top artist and tracks arrays used to determine recommendation seeds
   * @param {number} artist_offset - Current offset of user's top artists array
   * @param {number} track_offset - Current offset of user's top tracks array
   * @param {number} num_top_artists - Size of user's top artists array
   * @param {number} num_top_tracks - Size of user's top tracks array
   * @returns {number[]} - Updated artist and track offsets
   */
  static updateRecommendationSeedOffsets(artist_offset, track_offset, num_top_artists, num_top_tracks) {
    artist_offset += num_artist_seeds;
    track_offset += num_track_seeds;

    if (artist_offset >= num_top_artists) {
      artist_offset = 0;
    }

    if (track_offset >= num_top_tracks) {
      track_offset = 0;
    }

    return [artist_offset, track_offset];
  }

  /**
   * Marks a recommended track as dismissed
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} rec_id - Spotify track id of recommended track
   * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result 
   */
  async dismissRecommendation(user_id, rec_id) {
    return this.db.dismissRecommendation(user_id, rec_id);
  }

  /**
   * Requests track recommendations from Spotify API using selection of user's top artists and tracks as seeds
   * @param {string} access_token - Spotify access token for logged in user
   * @param {mongoose.Document} user - User document from database
   * @param {number} artist_offset - Seed-determining offset for top artists array
   * @param {number} track_offset - Seed-determining offset for top tracks array
   * @param {number} batch_len - Number of recommendations to request from the Spotify API in each batch
   * @returns {Promise<Object[]>} - Promise for array of Spotify track objects
   */
  async fetchRecommendations(access_token, user, artist_offset, track_offset, batch_len) {
    // Extract top artists, tracks, and seed-determining offsets from user document
    const { top_artist_ids, top_track_ids } = user;

    // Select 5 seeds from top lists (max allowed by Spotify API)
    const selected_artists = top_artist_ids.slice(artist_offset, artist_offset + num_artist_seeds);
    const selected_tracks = top_track_ids.slice(track_offset, track_offset + num_track_seeds);

    // Call recommendation endpoint of Spotify API and update seed-determining offsets
    return SpotifyAPI.fetchRecommendedTracks(access_token, batch_len, selected_artists, selected_tracks)
      .then(({ data }) => data.tracks)
      .catch(console.error);
  }

  /**
   * Generates and caches requested number of recommendations for user
   * @param {string} access_token - Spotify access token for logged in user
   * @param {mongoose.Document} user - User document from database
   * @param {number} batch_len - Number of recommendations to request from the Spotify API in each batch
   * @param {number} num_req - Number of recommendations to generate in total
   * @returns {Promise<string[]>} - Promise for array of Spotify recommended track ids
   */
  async generateRecommendations(access_token, user, batch_len, num_req) {
    // Extract previous recommendations, seed-determining offsets, top artist and track ids from user document
    const {
      rec_seed_artist_offset,
      rec_seed_track_offset,
      recommended_track_to_outcome,
      top_artist_ids,
      top_track_ids
    } = user;
    
    const num_top_artists = top_artist_ids.length;
    const num_top_tracks = top_track_ids.length;
    const recs = [];
    const rec_ids = [];
    let artist_offset = rec_seed_artist_offset;
    let track_offset = rec_seed_track_offset;
    
    // Fetch recommendations from Spotify API, ensuring at least num_req recommendations fetched
    while (rec_ids.length < num_req) {
      // Filter out previously recommended and liked/dismissed tracks in fetched batch
      const batch = await this.fetchRecommendations(access_token, user, artist_offset, track_offset, batch_len)
        .then(recs => recs.filter(({ id }) => !recommended_track_to_outcome.has(id)))
        .catch(console.error);

      if (!batch) {
        break;
      }

      const batch_ids = batch.map(({ id }) => id);
      rec_ids.push(...batch_ids);
      recs.push(...batch);
      [artist_offset, track_offset] = Recommendations.updateRecommendationSeedOffsets(artist_offset, track_offset, num_top_artists, num_top_tracks);
    }

    if (!rec_ids) {
      return Promise.reject('Failed to fetch recommendations from Spotify API');
    }

    // Cache recommendation track ids and track objects in database, then return first num_req track ids
    const cached_rec_ids = this.db.addRecommendations(artist_offset, track_offset, rec_ids, user);
    const cached_tracks = this.db.createOrUpdateTracksWithAlbumAndArtists(recs);
    const req_rec_ids = rec_ids.slice(0, num_req);
    return Promise.all([cached_rec_ids, cached_tracks]).then(() => req_rec_ids);
  }

  /**
   * Gets requested number of track recommendations for user, either from cache or by generating new recommendations
   * @param {string} access_token - Spotify access token for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {number} num_req - Number of recommendations requested
   * @returns {Promise<Object[]>} - Promise for array of full track objects cached in database
   */
  async getRecommendations(access_token, user_id, num_req) {
    // Isolate first num_req recommendations that user has not yet interacted with
    const user = await this.db.getUserDocument(user_id).catch(console.error);
    const fresh_recs = user.recommended_and_fresh_tracks.keys();
    const rec_ids = [];

    for (const rec_id of fresh_recs) {
      rec_ids.push(rec_id);

      if (rec_ids.length === num_req) {
        break;
      }
    }

    // If insufficient cached recommendations available, generate new recommendations
    const rem_req = num_req - rec_ids.length;

    if (rem_req > 0) {
      const rem_rec_ids = await this.generateRecommendations(access_token, user, rec_batch_len, rem_req)
        .catch(console.error);

      if (!rem_rec_ids) {
        return Promise.reject('Returning cached recommendations only');
      }

      rec_ids.push(...rem_rec_ids);
    }

    // Fetch track objects with associated album and artist objects from database
    return this.db.getFullTracks(rec_ids);
  }

  /**
   * Marks a recommended track as liked in database and adds to designated Spotify playlist
   * @param {string} access_token - Spotify access token for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} rec_id - Spotify track id of recommended track
   * @returns {Promise<AxiosResponse>} - Promise for Axios response object
   */
  async likeRecommendation(access_token, user_id, rec_id) {
    // Mark recommendation as liked in database and add to user's Spotify account
    const playlist_id = await this.db.likeRecommendation(user_id, rec_id)
      .then(({ recommended_tracks_playlist_id }) => recommended_tracks_playlist_id)
      .catch(console.error);

    if (!playlist_id) {
      return Promise.reject('Could not fetch recommended tracks playlist id');
    }

    return SpotifyAPI.addRecommendedTrack(access_token, playlist_id, rec_id);
  }
}

module.exports = Recommendations;
