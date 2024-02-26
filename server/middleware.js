// Constants
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Dependencies
const Database = require('./db');
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

class Middleware {
  constructor(redirect_uri) {
    this.api = new SpotifyAPI(client_id, client_secret, redirect_uri);
    this.db = new Database();
  }

  async dismissMatch(user_id, match_id) {
    // TODO: mark profile as dismissed in database
  }

  async dismissRecommendation(user_id, rec_id) {
    return this.db.dismissRecommendation(user_id, rec_id);
  }

  async generateMatches(user_id) {
    // TODO: fetch user's top artists and genres from database
    // TODO: fetch cached artist and genre data from database
    // TODO: find users with similar top artists and genres
    // TODO: pass data through a matching algorithm to find best matches
    // TODO: cache list of matches
  }

  async generateRecommendations(access_token, user_id, num_recs) {
    // Fetch user document from database and extract top artists
    const user = await this.db.getUser(user_id).catch(console.error);
    const top_artists = user.top_artist_ids;

    // Extract top genres, sorted descending by count
    const top_genres = user.genre_counts
      .sort((a, b) => b[1] - a[1])
      .map(genre => genre[0]);

    let first_rec_id = null;
    let processed_recs = [];

    // Generate recommendations in batches
    for (let artist_offset = 0; artist_offset < top_artists.length; artist_offset += 5) {
      // Select 5 (max allowed by Spotify API) artists and genres from top lists
      const selected_artists = top_artists.slice(artist_offset, artist_offset + 5);
      const genre_offset = artist_offset % top_genres.length;
      const selected_genres = top_genres.slice(genre_offset, genre_offset + 5);

      // Call recommendation endpoint of Spotify API to fetch recommended tracks
      const recs = this.api.fetchRecommendedTracks(access_token, num_recs, selected_artists, selected_genres)
        .then(response => response.data.tracks)
        .catch(console.error);

      // If first batch, isolate first recommended track id
      if (artist_offset === 0) {
        first_rec_id = recs[0].id;
      }

      // Cache recommendation track ids and track objects in database
      const cached_rec_ids = recs.map(track => this.db.addRecommendation(user_id, track.id));
      const cached_tracks = recs.map(track => this.db.createOrUpdateTrack(track));
      processed_recs.push(...cached_rec_ids, ...cached_tracks);
    }

    return Promise.all(processed_recs)
      .then(() => first_rec_id);
  }

  async getMatches(user_id, offset) {
    // TODO: fetch cached list of matches, from offset index onwards
  }

  async getRecommendation(access_token, user_id) {
    // Fetch user document from database
    const user = await this.db.getUser(user_id).catch(console.error);
    
    // Isolate first recommended track id that user has not yet interacted with
    let rec_id = null;

    for (const [track_id, outcome] of user.recommended_track_to_outcome) {
      if (outcome === 'none') {
        rec_id = track_id;
        break;
      }
    }

    // If no cached recommendations available, generate new recommendations
    if (!rec_id) {
      rec_id = await this.generateRecommendations(access_token, user_id, 10).catch(console.error);
    }

    // Fetch track object from database
    return this.db.getTrack(rec_id);
  }

  async getUser(user_id) {
    return this.db.getUser(user_id);
  }

  async likeMatch(user_id, match_id) {
    // TODO: mark profile as liked in databased
  }

  async likeRecommendation(user_id, rec_id) {
    // Mark recommendation as liked in database and add to user's Spotify account
    const update_db = this.db.likeRecommendation(user_id, rec_id);
    const add_to_spotify = this.api.addRecommendedTrack(user_id, rec_id);
    return Promise.all([update_db, add_to_spotify]);
  }

  async updateLoggedInUser(access_token) {
    // Fetch user profile, top artists, and top tracks from Spotify API
    const artists = this.api.fetchUserTopArtists(access_token, 'medium_term', 50);
    const tracks = this.api.fetchUserTopTracks(access_token, 'medium_term', 50);
    const user = this.api.fetchUserProfile(access_token);

    const fetched_artists = artists.then(response => response.data.items).catch(console.error);
    const fetched_tracks = tracks.then(response => response.data.items).catch(console.error);
    const fetched_user = user.then(response => response.data).catch(console.error);

    // Cache each top artist and track in database
    const listener_id = fetched_user.id;
    const cached_artists = fetched_artists.map((artist, rank) => this.createOrUpdateArtist(artist, listener_id, rank));
    const cached_tracks = fetched_tracks.map(track => this.createOrUpdateTrack(track, listener_id));
    
    const top_artist_ids = fetched_artists.map(artist => artist.id);
    const top_track_ids = fetched_tracks.map(track => track.id);
    
    // Cache each artist associated with top tracks that is not already in top artists
    const top_artist_set = new Set(top_artist_ids);
    const top_track_associated_artists = fetched_tracks
      .flatMap(track => track.artists.map(artist => artist.id))
      .filter(artist_id => !top_artist_set.has(artist_id))
      .map(artist_id => this.api.fetchArtist(access_token, artist_id))
      .map(artist => artist.then(response => response.data).catch(console.error))
      .map(artist => this.db.createOrUpdateArtist(artist));
    
    cached_artists.push(...top_track_associated_artists);

    // Create or update user document in database
    const cached_user = this.db.createOrUpdateUser(top_artist_ids, top_track_ids, fetched_user);
    return Promise.all([...cached_artists, ...cached_tracks, cached_user]);
  }
}

module.exports = Middleware;
