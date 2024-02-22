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

app.get('/user/:id/matches', (req, res) => {});

app.get('/user/:id/profile', (req, res) => {
  middleware.getUser(req.params.id)
    .then(user => res.json(user))
    .catch(console.error);
});

app.get('/user/:id/recommendations', (req, res) => {});

// POST endpoints
app.post('/user/update', (req, res) => {
  // Reject request if no auth header is present
  const auth = req.header('Authorization');

  if (!auth) {
    res.status(401).send('Unauthorized');
  }

  // Identify access token ('Bearer ...') from auth header
  const access_token = auth.split(' ')[1];

  // Use access token to fetch user profile and top items from Spotify API
  middleware.updateLoggedInUser(access_token)
    .then(user => res.json(user))
    .catch(console.error);
});

// Start Express server
app.listen(port, () => {
  console.log(`Minuet server listening on port ${port}`)
});
