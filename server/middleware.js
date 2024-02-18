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

  async getMatchedUser(user_id) {
    return this.db.getUser(user_id);
  }

  async updateLoggedInUser(access_token) {
    const user = this.api.fetchUserProfile(access_token);
    const top_artists = this.api.getUserTopArtists(access_token, 'medium_term', 50);
    const top_tracks = this.api.getUserTopTracks(access_token, 'medium_term', 50);

    return Promise.all([user, top_artists, top_tracks])
      .then(([user, top_artists, top_tracks]) => this.db.createOrUpdateUser(top_artists, top_tracks, user));
  }
}
