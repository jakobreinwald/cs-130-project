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

function validateAuth(auth) {
  if (!auth) {
    return null;
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

app.get('/users/:id/matches', (req, res) => {});

app.get('/users/:id/profile', (req, res) => {
  middleware.getUser(req.params.id)
    .then(user => res.json(user))
    .catch(console.error);
});

// GET /users/{{user_id}}/recs?num_recs={{num_recs}}
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
