// Constants
const port = 3001;
const redirect_uri = `http://localhost:${port}/callback`;

// Dependencies
const express = require('express');
const Middleware = require('./middleware');
const SpotifyAPI = require('./spotify_api');
const app = express();
require('dotenv').config({ path: '.env.local' });
const cors = require("cors");
const corsOptions = {
	origin: "http://localhost:3000",
  };
app.use(cors(corsOptions));

// Setup API client
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const api = new SpotifyAPI(client_id, client_secret, redirect_uri);
const middleware = new Middleware(redirect_uri);


// Middleware helpers
function validateAuth(auth, res) {
  if (!auth) {
    res.status(401).send('Unauthorized');
  }

  // Extract access token ('Bearer ...') from auth header
  return auth.split(' ')[1];
}

function validateNumRecs(num_recs) {
  if (num_recs === undefined) { // default to 10 if num_recs not provided
    return 10;
  }

  const casted_num_recs = Number(num_recs);

  if (!Number.isInteger(casted_num_recs) || casted_num_recs < 1) {
    return null;
  }

  return casted_num_recs;
}


// GET endpoints

app.get('/login', (req, res) => {
  res.redirect(api.getLoginRedirectURL());
});

app.get('/callback', (req, res) => {
  api.getAccessToken(req.query.code)
    .then(response => {
      res.send(response.data);
    })
    .catch(console.error);
});

// TODO: test this endpoint
app.get('/users/:id/mutual_matches', (req, res) => {
  middleware.getMatches(req.params.id)
    .then(matches => res.json(matches))
    .catch(console.error);
});

// Used to retrieve potential matches for a user
app.get('/users/:id/potential_matches', (req, res) => {
  middleware.getPotentialMatches(req.params.id)
    .then(matches => res.json(matches))
    .catch(console.error);
});

app.get('/users/:id/profile', (req, res) => {
  middleware.getUserProfile(5, 5, req.params.id)
    .then(user => res.json(user))
    .catch(console.error);
});

app.get('/users/:id/recs', (req, res) => {
  const access_token = validateAuth(req.header('Authorization'), res);
  const num_recs = req.query.num_recs || 10;
  const user_id = req.params.id;

  middleware.getRecommendations(access_token, user_id, num_recs)
    .then(recs => res.json({ recs: recs }))
    .catch(console.error);
});

// TODO: test endpoint
app.get('/users/:id/potential_matches/:match_id', (req, res) => {
  const pot_user_obj = middleware.getUser(req.params.match_id);
  // display_name different from user_id
  const profile_name = pot_user_obj.display_name;
  const top_artist = pot_user_obj.top_artist_ids[0];
  res.json({ profile_name: profile_name, top_artist: top_artist });
});

// POST endpoints

app.post('/users/:user_id/recs/:rec_id', (req, res) => {
  // Get action from query string, either 'like' or 'dismiss'
  const action = req.query.action;

  // Execute requested action for the given recommendation
  if (action === 'dismiss') {
    middleware.dismissRecommendation(req.params.user_id, req.params.rec_id)
      .then(() => res.status(200).send('Dismissed recommendation'))
      .catch(console.error);
  } else if (action === 'like') {
    middleware.likeRecommendation(req.params.user_id, req.params.rec_id)
      .then(() => res.status(200).send('Liked recommendation'))
      .catch(console.error);
  } else {
    res.status(400).send('Invalid action');
  }
});

app.post('/users', (req, res) => {
  // Validate request authorization and extract access token
  const access_token = validateAuth(req.header('Authorization'), res);
	console.log(access_token);
  // Use access token to fetch user profile and top items from Spotify API
  middleware.updateLoggedInUser(access_token)
    .then(updates => res.json(updates.at(-1)))
    .catch(console.error);
});

// Use to generate potential matches for a user
app.post('/users/:id/generate_potential_matches', (req, res) => {
  middleware.generateMatches(req.params.id)
    .then(matches => res.json(matches))
    .catch(console.error);
});

// Start Express server
app.listen(port, () => {
  console.log(`Minuet server listening on port ${port}`)
});
