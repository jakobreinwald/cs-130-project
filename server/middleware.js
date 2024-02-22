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

	async getUser(user_id) {
		return this.db.getUser(user_id);
	}

	async updateLoggedInUser(access_token) {
		const artists = this.api.fetchUserTopArtists(access_token, 'medium_term', 50);
		const tracks = this.api.fetchUserTopTracks(access_token, 'medium_term', 50);
		const user = this.api.fetchUserProfile(access_token);

		return Promise.all([artists, tracks, user])
			.then(([artists, tracks, user]) => {
				const top_artists = artists.data.items;
				const top_tracks = tracks.data.items;
				const user_obj = user.data;
				return this.db.createOrUpdateUser(top_artists, top_tracks, user_obj);
			});
	}

	async getAllUsers() {
		return this.db.getAllUsers();
	}
}

module.exports = Middleware;
