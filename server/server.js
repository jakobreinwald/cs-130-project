// Constants
const port = 3001;
const redirect_uri = `http://localhost:${port}/callback`;

// Dependencies
const express = require('express');
const Middleware = require('./middleware');
const SpotifyAPI = require('./spotify_api');
const app = express();
require('dotenv').config({ path: '.env.local' });

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

app.get('/users/:id/matches', (req, res) => {});

app.get('/users/:id/profile', (req, res) => {
  middleware.getUser(req.params.id)
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

  // Use access token to fetch user profile and top items from Spotify API
  middleware.updateLoggedInUser(access_token)
    .then(updates => res.json(updates.at(-1)))
    .catch(console.error);
});

// Start Express server
app.listen(port, () => {
  console.log(`Minuet server listening on port ${port}`)
});
