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
		// TODO: mark song recommendation as dismissed in database
	}

	async generateMatches(user_id) {
		// TODO: fetch user's top artists and genres from database
		// TODO: fetch cached artist and genre data from database
		// TODO: find users with similar top artists and genres
		// TODO: pass data through a matching algorithm to find best matches
		// TODO: cache list of matches
	}

	async generateRecommendations(user_id) {
		// TODO: DO WE ALSO TAKE INTO ACCOUNT DATA FROM LIKED PROFILES?
		// TODO: fetch user's top artists and genres from database
		// TODO: call recommendation endpoint of Spotify API to get recommended tracks
		// TODO: cache list of recommendations
	}

	async getMatches(user_id, offset) {
		// TODO: fetch cached list of matches, from offset index onwards
	}

	async getRecommendations(user_id, offset) {
		// TODO: fetch cached list of recommendations, from offset index onwards
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
