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

  getHeadersWithAccessToken(access_token) {
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

    return axios.post('https://accounts.spotify.com/api/token', data, authOptions)
      .then(response => {
        this.access_token = response.data.access_token;
        this.refresh_token = response.data.refresh_token;
        console.log('Access token for user:', this.access_token);
      })
      .catch(console.error);
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

  async getUserProfile(user_id) {
    return axios.get(`${base_url}/me`, {
        headers: this.getHeadersWithAccessToken()
      });
  }

  async getUserTopItems(item_type, time_range, limit) {
    return axios.get(`${base_url}/me/top/${item_type}`, {
        headers: this.getHeadersWithAccessToken(),
        params: {
          time_range: time_range,
          limit: limit
        }
      });
  }

  async getUserTopArtists(time_range, limit) {
    return this.getUserTopItems('artists', time_range, limit);
  }

  async getUserTopTracks(time_range, limit) {
    return this.getUserTopItems('tracks', time_range, limit);
  }
}

module.exports = SpotifyAPI;
