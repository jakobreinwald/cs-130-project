// Constants
const port = 3001;
const redirect_uri = `http://localhost:${port}/callback`;

// Dependencies
const db = require('./db');
const express = require('express');
const spotify_api = require('./api');
const app = express();
require('dotenv').config({ path: '.env.local' });

// Setup API client
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const api = new spotify_api(client_id, client_secret, redirect_uri);

// Endpoints
app.get('/login', (req, res) => {
  res.redirect(api.getLoginRedirectURL());
});

app.get('/callback', (req, res) => {
  api.getAccessToken(req.query.code)
    .then(() => res.send('Logged in!'));
});

app.get('/user/profile', (req, res) => {
  api.getUserProfile()
    .then(response => {
      console.log(response.data);
      res.send(response.data);
    })
    .catch(console.error);
});

app.get('/user/top/artists', (req, res) => {
  api.getUserTopArtists('medium_term', 10)
    .then(response => {
      console.log(response.data);
      res.send(response.data.items);
    })
    .catch(console.error);
});

app.get('/user/top/tracks', (req, res) => {
  api.getUserTopTracks('medium_term', 10)
    .then(response => {
      console.log(response.data);
      res.send(response.data.items);
    })
    .catch(console.error);
});

// Start Express server
app.listen(port, () => {
  console.log(`Minuet server listening on port ${port}`)
});
