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
		return { 'Authorization': `Bearer ${access_token}` };
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

	static async addRecommendedTrack(access_token, playlist_id, track_id) {
		return axios.post(`${base_url}/playlists/${playlist_id}/tracks`,
			{ uris: [`spotify:track:${track_id}`] },
			{ headers: SpotifyAPI.getHeaders(access_token) }
		);
	}

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

	async fetchArtist(access_token, artist_id) {
		return axios.get(`${base_url}/artists/${artist_id}`, {
			headers: SpotifyAPI.getHeaders(access_token)
		});
	}

	static async fetchPlaylist(access_token, playlist_id) {
		return axios.get(`${base_url}/playlists/${playlist_id}`, {
			headers: SpotifyAPI.getHeaders(access_token)
		});
	}

	async fetchRecommendedTracks(access_token, limit, top_artist_ids, top_track_ids) {
		const seed_artists = top_artist_ids.join(',');
		const seed_tracks = top_track_ids.join(',');

		// return axios.get(`${base_url}/recommendations`, {
		// 	headers: SpotifyAPI.getHeaders(access_token),
		// 	params: { limit, seed_artists, seed_tracks }
		// });
	}

	static async fetchUserProfile(access_token) {
		return axios.get(`${base_url}/me`, {
			headers: SpotifyAPI.getHeaders(access_token)
		});
	}

	static async fetchUserTopItems(access_token, item_type, time_range, limit) {
		return axios.get(`${base_url}/me/top/${item_type}`, {
			headers: SpotifyAPI.getHeaders(access_token),
			params: { time_range, limit }
		});
	}

	static async fetchUserTopArtists(access_token, time_range, limit) {
		return SpotifyAPI.fetchUserTopItems(access_token, 'artists', time_range, limit);
	}

	static async fetchUserTopTracks(access_token, time_range, limit) {
		return SpotifyAPI.fetchUserTopItems(access_token, 'tracks', time_range, limit);
	}

	static async fetchTracks(access_token, trackList) {
		const ids = trackList.join(',');

		console.log(ids);
		return axios.get(`${base_url}/tracks`, {
			headers: SpotifyAPI.getHeaders(access_token),
			params: { ids }
		});
	}
}

module.exports = SpotifyAPI;
