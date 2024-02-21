// Constants
const base_url = 'https://api.spotify.com/v1';

// Dependencies
const axios = require('axios');
const querystring = require('querystring');

class SpotifyAPI {
  constructor(client_id, client_secret, redirect_uri) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
  }

  static getHeaders(access_token) {
    return {'Authorization': `Bearer ${access_token}`};
  }

  async getAccessToken(code) {
    const data = querystring.stringify({
      code: code,
      redirect_uri: this.redirect_uri,
      grant_type: 'authorization_code'
    });

    const authOptions = {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(this.client_id + ':' + this.client_secret).toString('base64'))
      }
    };

    return axios.post('https://accounts.spotify.com/api/token', data, authOptions);
  }

  getLoginRedirectURL() {
    const playlist_scopes = 'playlist-read-private playlist-modify-private playlist-modify-public';
    const follow_scopes = 'user-follow-modify user-follow-read';
    const listening_scopes = 'user-top-read user-read-recently-played';
    const library_scopes = 'user-library-read';
    const user_scopes = 'user-read-private user-read-email';
    const scope = `${playlist_scopes} ${follow_scopes} ${listening_scopes} ${library_scopes} ${user_scopes}`;

    return `https://accounts.spotify.com/authorize?${querystring.stringify({
      response_type: 'code',
      client_id: this.client_id,
      scope: scope,
      redirect_uri: this.redirect_uri
    })}`;
  }

  async fetchUserProfile(access_token) {
    return axios.get(`${base_url}/me`, {
      headers: SpotifyAPI.getHeaders(access_token)
    });
  }

  async fetchUserTopItems(access_token, item_type, time_range, limit) {
    return axios.get(`${base_url}/me/top/${item_type}`, {
        headers: SpotifyAPI.getHeaders(access_token),
        params: {
          time_range: time_range,
          limit: limit
        }
      });
  }

  async fetchUserTopArtists(access_token, time_range, limit) {
    return this.fetchUserTopItems(access_token, 'artists', time_range, limit);
  }

  async fetchUserTopTracks(access_token, time_range, limit) {
    return this.fetchUserTopItems(access_token, 'tracks', time_range, limit);
  }
}

module.exports = SpotifyAPI;
