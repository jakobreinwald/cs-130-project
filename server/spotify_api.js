// Constants
const base_url = 'https://api.spotify.com/v1';

// Dependencies
const axios = require('axios');
const querystring = require('querystring');

/**
 * Spotify API helper class
 */
class SpotifyAPI {
	/**
	 * Constructs Spotify API helper with client credentials and redirect URI (for server-side testing)
	 * @param {string} client_id - client ID for Spotify developer app
	 * @param {string} client_secret - client secret for Spotify developer app
	 * @param {string} redirect_uri - redirect URI for Spotify developer app
	 */
	constructor(client_id, client_secret, redirect_uri) {
		this.client_id = client_id;
		this.client_secret = client_secret;
		this.redirect_uri = redirect_uri;
	}

	/**
	 * Returns authorization header for Spotify API requests
	 * @param {string} access_token - Spotify access token for logged in user
	 * @returns {Object} - Header object with Authorization field
	 */
	static getHeaders(access_token) {
		return { 'Authorization': `Bearer ${access_token}` };
	}

	/**
	 * Exchanges authorization code for access token (for server-side testing)
	 * @param {string} code - authorization code from Spotify API redirect
	 * @returns {Promise<AxiosResponse>} - Promise with access token response from Spotify API
	 */
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

	/**
	 * Returns URL for Spotify API authorization redirect (for server-side testing)
	 * @returns {string} - URL for Spotify API authorization redirect
	 */	
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

	/**
	 * Makes Spotify API request to add track to given playlist
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} playlist_id - Spotify playlist ID
	 * @param {string} track_id - Spotify track ID
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async addRecommendedTrack(access_token, playlist_id, track_id) {
		return axios.post(`${base_url}/playlists/${playlist_id}/tracks`,
			{ uris: [`spotify:track:${track_id}`] },
			{ headers: SpotifyAPI.getHeaders(access_token) }
		);
	}

	/**
	 * Makes Spotify API request to create new playlist for recommended tracks
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} user_id - Spotify user ID
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async createRecommendedTracksPlaylist(access_token, user_id) {
		return axios.post(`${base_url}/users/${user_id}/playlists`,
			{
				name: 'Minuet Recommendations',
				public: false,
				description: 'Recommended tracks from Minuet'
			},
			{ headers: SpotifyAPI.getHeaders(access_token) }
		);
	}

	/**
	 * Makes Spotify API request to fetch artist data for given artist ids
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string[]} artist_ids - Array of Spotify artist IDs
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async fetchArtists(access_token, artist_ids) {
		const ids = artist_ids.join(',');

    if (ids === '') {
      return Promise.resolve({ data: { artists: [] } });
    }

    return axios.get(`${base_url}/artists`, {
      headers: SpotifyAPI.getHeaders(access_token),
      params: { ids }
    });
  }

	/**
	 * Makes Spotify API request to fetch playlist data for given playlist id
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} playlist_id - Spotify playlist ID
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async fetchPlaylist(access_token, playlist_id) {
		return axios.get(`${base_url}/playlists/${playlist_id}`, {
			headers: SpotifyAPI.getHeaders(access_token)
		});
	}

	/**
	 * Makes Spotify API request to generate recommended tracks for logged in user
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {number} limit - Number of recommended tracks to fetch
	 * @param {string[]} top_artist_ids - Array of Spotify artist IDs
	 * @param {string[]} top_track_ids - Array of Spotify track IDs
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
  static async fetchRecommendedTracks(access_token, limit, top_artist_ids, top_track_ids) {
    const seed_artists = top_artist_ids.join(',');
    const seed_tracks = top_track_ids.join(',');

		return axios.get(`${base_url}/recommendations`, {
			headers: SpotifyAPI.getHeaders(access_token),
			params: { limit, seed_artists, seed_tracks }
		});
	}

		/**
	 * Makes Spotify API request to fetch track data for given track ids
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string[]} track_ids - Array of Spotify track IDs
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
		static async fetchTracks(access_token, track_ids) {
			const ids = track_ids.join(',');
	
			if (ids === '') {
				return Promise.resolve({ data: { tracks: [] } });
			}
	
			return axios.get(`${base_url}/tracks`, {
				headers: SpotifyAPI.getHeaders(access_token),
				params: { ids }
			});
		}

	/**
	 * Makes Spotify API request to fetch user profile for logged in user
	 * @param {string} access_token - Spotify access token for logged in user
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async fetchUserProfile(access_token) {
		return axios.get(`${base_url}/me`, {
			headers: SpotifyAPI.getHeaders(access_token)
		});
	}

	/**
	 * Makes Spotify API request to fetch top artists or tracks for logged in user
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} item_type - 'artists' or 'tracks'
	 * @param {string} time_range - 'short_term', 'medium_term', or 'long_term'
	 * @param {number} limit - Number of items to fetch, max 50
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async fetchUserTopItems(access_token, item_type, time_range, limit) {
		return axios.get(`${base_url}/me/top/${item_type}`, {
			headers: SpotifyAPI.getHeaders(access_token),
			params: { time_range, limit }
		});
	}

	/**
	 * Makes Spotify API request to fetch user's top artists
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} time_range - 'short_term', 'medium_term', or 'long_term'
	 * @param {number} limit - Number of artists to fetch, max 50
	 * @returns {Promise<AxiosResponse>} - Promise with response from Spotify API
	 */
	static async fetchUserTopArtists(access_token, time_range, limit) {
		return SpotifyAPI.fetchUserTopItems(access_token, 'artists', time_range, limit);
	}

	/**
	 * Makes Spotify API request to fetch user's top tracks
	 * @param {string} access_token - Spotify access token for logged in user
	 * @param {string} time_range - 'short_term', 'medium_term', or 'long_term'
	 * @param {number} limit - Number of tracks to fetch, max 50
	 */
	static async fetchUserTopTracks(access_token, time_range, limit) {
		return SpotifyAPI.fetchUserTopItems(access_token, 'tracks', time_range, limit);
	}
}

module.exports = SpotifyAPI;
