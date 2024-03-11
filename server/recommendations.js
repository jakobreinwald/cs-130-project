// Constants
const num_artist_seeds = 2;
const num_track_seeds = 3;

// Dependencies
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

class Recommendations {
  constructor(database) {
    this.db = database;
  }

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

  async dismissRecommendation(user_id, rec_id) {
    return this.db.dismissRecommendation(user_id, rec_id);
  }

  async fetchRecommendations(access_token, user, batch_len) {
    // Extract top artists, tracks, and seed-determining offsets from user document
    const { rec_seed_artist_offset, rec_seed_track_offset, top_artist_ids, top_track_ids } = user;

    // Select 5 seeds from top lists (max allowed by Spotify API)
    const artist_offset = rec_seed_artist_offset % top_artist_ids.length;
    const track_offset = rec_seed_track_offset % top_track_ids.length;
    const selected_artists = top_artist_ids.slice(artist_offset, artist_offset + num_artist_seeds);
    const selected_tracks = top_track_ids.slice(track_offset, track_offset + num_track_seeds);

    // Call recommendation endpoint of Spotify API and update seed-determining offsets
    user.rec_seed_artist_offset += num_artist_seeds;
    user.rec_seed_track_offset += num_track_seeds;
    const updated_user = user.save();
    const rec_batch = SpotifyAPI.fetchRecommendedTracks(access_token, batch_len, selected_artists, selected_tracks);
    return Promise.all([rec_batch, updated_user])
      .then(([{ data }, user]) => data.tracks);
  }

  async generateRecommendations(access_token, user, batch_len, num_req) {
    // Fetch recommendations from Spotify API, ensuring at least num_req recommendations fetched
    const { recommended_track_to_outcome, top_artist_ids, top_track_ids } = user;
    const recs = [];
    const rec_ids = [];

    while (rec_ids.length < num_req) {
      const batch = await this.fetchRecommendations(access_token, batch_len, top_artist_ids, top_track_ids)
        .catch(console.error);

      if (!batch) {
        return Promise.reject('Failed to fetch recommendations');
      }

      // Filter out previously recommended and liked/dismissed tracks in batch
      const batch_ids = batch.filter(({ id }) => !recommended_track_to_outcome.has(id))
        .map(({ id }) => id);
      rec_ids.push(...batch_ids);
      recs.push(...batch);
    }

    // Cache recommendation track ids and track objects in database, then return first num_req track ids
    const cached_rec_ids = this.db.addRecommendations(rec_ids, user);
    const cached_tracks = this.db.createOrUpdateTracksWithAlbumAndArtists(recs);
    const req_rec_ids = rec_ids.slice(0, num_req);
    return Promise.all([cached_rec_ids, cached_tracks]).then(() => req_rec_ids);
  }

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
      const rem_rec_ids = await this.generateRecommendations(access_token, user, 10, rem_req)
        .catch(console.error);
      rec_ids = rec_ids.concat(rem_rec_ids);
    }

    // Fetch track objects with associated album and artist objects from database
    return this.db.getFullTracks(rec_ids);
  }

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
