// Constants
const port = process.env.PORT || 3001;
const redirect_uri = process.env.REDIRECT_URI || `http://localhost:${port}/callback`;

// Dependencies
const express = require('express');
const Middleware = require('./middleware');
const SpotifyAPI = require('./spotify_api');
const cors = require('cors');
const app = express();
require('dotenv').config({ path: '.env.local' });
const corsOptions = {
	origin: ["http://localhost:3000", "https://jakobreinwald.github.io", "https://www.minuet.lol"]
};
app.use(cors(corsOptions));

// Setup API client
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const api = new SpotifyAPI(client_id, client_secret, redirect_uri);
const middleware = new Middleware(redirect_uri);


// Middleware helpers

 /**
  * Validates the Authorization header and returns the access token if valid
  * @param {string} auth - The Authorization header value
  * @result {string} - Access token if valid, null otherwise
  */
function validateAuth(auth) {
	if (!auth) {
		return null;
	}

	// Extract access token ('Bearer ...') from auth header
	return auth.split(' ')[1];
}

/**
 * Validates the num_recs query parameter and returns the number of recommendations if valid
 * @param {string} num_recs - The num_recs query parameter value
 * @returns {number} casted_num_recs - The number of recommendations if valid, null otherwise
 */
function validateNumRecs(num_recs) {
	if (num_recs === undefined) { // default to 5 if num_recs not provided
		return 5;
	}

	const casted_num_recs = Number(num_recs);

	if (!Number.isInteger(casted_num_recs) || casted_num_recs < 1) {
		return null;
	}

	return casted_num_recs;
}


// GET endpoints
/**
 * Redirects to Spotify login page
 */
app.get('/login', (req, res) => {
	res.redirect(api.getLoginRedirectURL());
});

/**
 * Callback endpoint for Spotify login
 * @result {Object} response - The access token and refresh token
 */
app.get('/callback', (req, res) => {
	api.getAccessToken(req.query.code)
		.then(response => {
			res.send(response.data);
		})
		.catch(console.error);
});

/**
 * Get mutual matches
 * @param {string} id - Spotify user ID
 * @result {Object[]} res - The mutual matches
 */
app.get('/users/:id/mutual_matches', (req, res) => {
	middleware.getMatches(req.params.id)
		.then(matches => res.json(matches))
		.catch(console.error);
});

/**
 * Used to retrieve potential matches for a user
 * @param {string} id - Spotify user ID
 * @result {Object[]} - The potential matches
 */
app.get('/users/:id/potential_matches', (req, res) => {
	middleware.getPotentialMatches(req.params.id)
		.then(matches => res.json(matches))
		.catch(console.error);
});

/**
 * Used to retrieve a user's profile
 * @param {string} id - Spotify user ID
 * @result {Object} - The user's profile
 */
app.get('/users/:id/profile', (req, res) => {
	return middleware.getUserProfile(5, 5, req.params.id)
		.then(user => res.json(user))
		.catch(console.error);
});

/**
 * Used to retrieve a user's top artists
 * @param {string} id - Spotify user ID
 * @parem {number} num_recs - The number artists to retrieve
 * @result {Object[]} res - The user's top artists
 */
app.get('/users/:id/recs', (req, res) => {
	const access_token = validateAuth(req.header('Authorization'));
	const num_recs = validateNumRecs(req.query.num_recs);

	if (!access_token) {
		return res.status(401).send('Unauthorized');
	} else if (!num_recs) {
		return res.status(400).send('num_recs parameter must be a positive integer');
	}

	const user_id = req.params.id;

	middleware.getRecommendations(access_token, user_id, num_recs)
		.then(recs => res.json({ recs: recs }))
		.catch(console.error);
});

/**
 * Used to retrieve a user's potential matches
 * @param {string} id - Spotify user ID of logged in user
 * @param {string} match_id - Spotify user ID of potential match
 * @result {Object []} - The potential matches
 */
app.get('/users/:id/potential_matches/:match_id', (req, res) => {
	const pot_user_obj = middleware.getUser(req.params.match_id);
	// display_name different from user_id
	const profile_name = pot_user_obj.display_name;
	const top_artist = pot_user_obj.top_artist_ids[0];
	res.json({ profile_name: profile_name, top_artist: top_artist });
});

app.get('/users/:id/calculateMatchScore/:match_id', (req, res) => {
	middleware.calculateMatchScore(req.params.id, req.params.match_id)
		.then(([score, ...rest]) => res.json({ score: score }))
		.catch(console.error);
});

// POST endpoints

/**
 * Used to get and update a users profile
 * @result {Object} user - The updated user profile
 */
app.post('/users', (req, res) => {
	// Validate request authorization and extract access token
	const access_token = validateAuth(req.header('Authorization'), res);
	//   console.log(access_token);
	// Use access token to fetch user profile and top items from Spotify API
	middleware.updateLoggedInUser(access_token)
		.then(user => res.json(user))
		.catch(console.error);
});

/**
 * Used to either like or dismiss a song recommendation
 * @param {string} user_id - Spotify user ID
 * @param {string} rec_id - Spotify track ID
 * @result {Object} recs - The song recommendations
 */
app.post('/users/:user_id/recs/:rec_id', (req, res) => {
	// Extract access token from request auth and get action from query string
	const access_token = validateAuth(req.header('Authorization'));
	const action = req.query.action; // 'like' or 'dismiss'
	const rec_id = req.params.rec_id;
	const user_id = req.params.user_id;

	// Execute requested action for the given recommendation
	if (action === 'dismiss') {
		middleware.dismissRecommendation(user_id, rec_id)
			.then(() => res.json({ 'dismissed': rec_id }))
			.catch(console.error);
	} else if (action === 'like') {
		middleware.likeRecommendation(access_token, user_id, rec_id)
			.then(() => res.json({ 'liked': rec_id }))
			.catch(console.error);
	} else {
		res.status(400).json({ 'error': 'Action in query must be \'like\' or \'dismiss\'' });
	}
});

/**
 * Use to generate potential matches for a user
 * @param {string} id - Spotify user ID of logged in user
 * @result {Object[]} - The potential matches
 */
app.post('/users/:id/generate_potential_matches', (req, res) => {
	middleware.generateMatches(req.params.id)
		.then(matches => res.json(matches))
		.catch(console.error);
});

/**
 * Used to like a match
 * @param {string} id - Spotify user ID of logged in user
 * @param {string} match_id - Spotify user ID of potential match
 * @result {Object} - Either returns the match id or an error
 */
app.post('/users/:id/likeMatch/:match_id', (req, res) => {
	middleware.likeMatch(req.params.id, req.params.match_id)
		.then(() => res.json({ 'liked': req.params.match_id }))
		.catch(console.error);
});

/**
 * Used to dismiss a match
 * @param {string} id - Spotify user ID of logged in user
 * @param {string} match_id - Spotify user ID of potential match
 * @result {Object} - Either returns the match id or an error
 */
app.post('/users/:id/dismissMatch/:match_id', (req, res) => {
	middleware.dismissMatch(req.params.id, req.params.match_id)
		.then(() => res.json({ 'dismissed': req.params.match_id }))
		.catch(console.error);
});

/**
 * Used to start the express server
 */
app.listen(port, () => {
	console.log(`Minuet server listening on port ${port}`)
});
