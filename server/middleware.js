// Constants
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const num_top_artists = 50;

// Dependencies
const Database = require('./db');
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

class Middleware {
  constructor(redirect_uri) {
    this.api = new SpotifyAPI(client_id, client_secret, redirect_uri);
    this.db = new Database();
  }

  calcGenreCounts(fetched_artists, fetched_tracks, top_track_associated_artists) {
    const all_artists = fetched_artists.concat(top_track_associated_artists);
    const artist_id_to_genres = all_artists.reduce((map, artist) => {
      map.set(artist.id, artist.genres);
      return map;
    }, new Map());
    
    // Sum genre counts across all top tracks
    return fetched_tracks
      .flatMap(track => track.artists.map(({ id }) => id))
      .flatMap(artist_id => artist_id_to_genres.get(artist_id))
      .reduce((map, genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
        return map;
      }, new Map());
  }

  async createRecommendedTracksPlaylist(access_token, user_doc) {
    const { recommended_tracks_playlist_id, user_id } = user_doc;
    
    // Check if cached playlist id exists on Spotify, otherwise create new playlist
    if (recommended_tracks_playlist_id) {
      const playlist_exists = await SpotifyAPI.fetchPlaylist(access_token, recommended_tracks_playlist_id)
        .then(() => true)
        .catch(({ response }) => {
          if (response.status != 400 && response.data.error.message != 'Invalid base62 id') {
            console.error(response.data);
          }
          
          return false;
        });
      
      if (playlist_exists) {
        return Promise.resolve(user_doc);
      }
    }
    
    // Call Spotify API endpoint to create recommendations playlist, caching playlist id in database
    const new_playlist_id = await SpotifyAPI.createRecommendedTracksPlaylist(access_token, user_id)
      .then(({ data }) => data.id)
      .catch(({ response }) => console.error(response.data));

    if (new_playlist_id) {
      user_doc.recommended_tracks_playlist_id = new_playlist_id;
      return user_doc.save();
    }

    // Log playlist creation failure, but otherwise return unchanged user document
    return Promise.resolve(user_doc);
  }

  async dismissMatch(user_id, match_id) {
    // TODO: mark profile as dismissed in database
  }

  async dismissRecommendation(user_id, rec_id) {
    return this.db.dismissRecommendation(user_id, rec_id);
  }

  async generateMatches(user_id) {
    // fetch user's top artists and genres from database
    user = await this.db.getUser(user_id).catch(console.error);

    // top artists_ids is a sorted list of artists by rank
    const top_artists = user.topartist_ids.size < 5 ? user.top_artist_ids : user.top_artist_ids.slice(0, 5);
    const genre_counts = user.genre_counts;
    // get genre_counts keys and sort by descending order
    let tmp = Array.from(genre_counts.entries()).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    const user_genres = tmp.size < 5 ? tmp : tmp.slice(0, 5);
    let potential_matches = new Set();

    // loop through all genres and find all users who listen to the genre
    for (const genre of user_genres) {
      genre_obj = await this.db.getGenre(genre);
      potential_matches.add(genre_obj.listener_id_to_count.keys());
    }
    // loop through all artists and find all users who listen to the artist
    for (const artist of top_artists) {
      artist_obj = await this.db.getArtist(artist);
      potential_matches.add(artist_obj.listener_id_to_rank.keys());
    }

    for (const pot_user_id of potential_matches) {
      // calculate match score
      match_score = this.calculateMatchScore(user, await this.db.getUser(pot_user_id));
      // add match to database
      
    }
    
    // TODO: fetch cached artist and genre data from database
    // TODO: find users with similar top artists and genres
    // TODO: pass data through a matching algorithm to find best matches
    // TODO: cache list of matches
  }

  async calculateMatchScore(user, match_user) {
    const user_total_genre_count = user.total_genre_count;
    const user_avg_genre_count = user_total_genre_count / user.genre_counts.size;

    const match_total_genre_count = match_user.total_genre_count;
    const match_avg_genre_count = match_total_genre_count / match_user.genre_counts.size;

    // calculate genre match score
    let genre_match_score = 0;
    let hypotenuse = 0;
    for (const genre of user.genre_counts.keys()) {
      norm_user_genre_count = user.genre_counts.get(genre) / user_avg_genre_count;
      norm_match_genre_count = match_user.genre_counts.get(genre) / match_avg_genre_count;
      hypotenuse += norm_user_genre_count * norm_user_genre_count;
      genre_match_score += norm_user_genre_count * norm_match_genre_count;
    }
    genre_match_score /= hypotenuse;

    // calculate artist match score

    for (const artist of user.top_artist_ids) {
      
    }
  }

  async fetchRecommendations(access_token, batch_len, top_artists, top_tracks) {
    // At time of implementation, 50 top artists and 50 top tracks are cached
    const num_recs_fetched = top_artists.length + top_tracks.length;
    let rec_batches = [];
    
    // Generate recommendations in batches of batch_len
    for (let offset = 0; offset < num_recs_fetched; offset += 5) {
      // Select 5 seeds from top lists (max allowed by Spotify API)
      const num_artist_seeds = 2;
      const artist_offset = offset % top_artists.length;
      const selected_artists = top_artists.slice(artist_offset, artist_offset + num_artist_seeds);

      const num_track_seeds = 3;
      const track_offset = offset % top_tracks.length;
      const selected_tracks = top_tracks.slice(track_offset, track_offset + num_track_seeds);

      // Call recommendation endpoint of Spotify API to fetch recommended tracks
      const rec_batch = this.api.fetchRecommendedTracks(access_token, batch_len, selected_artists, selected_tracks);
      rec_batches.push(rec_batch);
    }

    // Return all batches of recommended tracks
    return Promise.all(rec_batches)
      .then(batches => batches.flatMap(({ data }) => data.tracks));
  }

  async generateRecommendations(access_token, user, batch_len, num_req) {
    // Fetch user document from database and extract top artists
    const { recommended_track_to_outcome, top_artist_ids, top_track_ids, user_id } = user;

    // Fetch recommendations from Spotify API
    const recs = await this.fetchRecommendations(access_token, batch_len, top_artist_ids, top_track_ids)
      .catch(console.error);

    if (!recs) {
      return Promise.reject('Failed to fetch recommendations');
    }

    // Keep track of first num_req recommended track ids, immediately returned in response
    const rec_ids = recs.map(({ id }) => id);
    let req_rec_ids = [];
    
    // Ensure old recommendations are not included in response
    for (const rec_id of rec_ids) {
      if (!recommended_track_to_outcome.has(rec_id) || recommended_track_to_outcome.get(rec_id) === 'none') {
        req_rec_ids.push(rec_id);
      }

      if (req_rec_ids.length === num_req) {
        break;
      }
    }

    // Cache recommendation track ids and track objects in database
    const cached_rec_ids = this.db.addRecommendations(user, rec_ids);
    const cached_tracks = this.db.createOrUpdateTracks(recs);

    return Promise.all([cached_rec_ids, cached_tracks, req_rec_ids])
      .then(() => req_rec_ids);
  }

  async getMatches(user_id, offset) {
    // TODO: fetch cached list of matches, from offset index onwards
  }

  async getRecommendations(access_token, user_id, num_req) {
    // Isolate first num_req recommendations that user has not yet interacted with
    const user = await this.db.getUserDocument(user_id).catch(console.error);
    let rec_ids = [];

    for (const [track_id, outcome] of user.recommended_track_to_outcome) {
      if (outcome === 'none') {
        rec_ids.push(track_id);
      }
      
      if (rec_ids.length === num_req) {
        break;
      }
    }

    // If no cached recommendations available, generate new recommendations
    const rem_req = num_req - rec_ids.length;

    if (rem_req > 0) {
      const rem_rec_ids = await this.generateRecommendations(access_token, user, 10, rem_req)
        .catch(console.error);
      rec_ids = rec_ids.concat(rem_rec_ids);
    }

    // Fetch track objects from database
    return this.db.getTracks(rec_ids);
  }

  async getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids) {
    const top_artist_set = new Set(top_artist_ids);
    const fetched_artists = fetched_tracks
      .flatMap(track => track.artists.map(({ id }) => id))
      .filter(artist_id => !top_artist_set.has(artist_id))
      .map(artist_id => this.api.fetchArtist(access_token, artist_id))
    
    return Promise.all(fetched_artists)
      .then(artists => artists.map(({ data }) => data));
  }

  async getUserProfile(user_id) {
    return this.db.getUser(user_id);
  }

  async likeMatch(user_id, match_id) {
    // TODO: mark profile as liked in databased
  }

  async likeRecommendation(access_token, user_id, rec_id) {
    // Mark recommendation as liked in database and add to user's Spotify account
    const playlist_id = await this.db.likeRecommendation(user_id, rec_id)
      .then(({ recommended_tracks_playlist_id }) => recommended_tracks_playlist_id)
      .catch(console.error);

    if (!playlist_id) {
      return Promise.reject('Could not fetch recommended tracks playlist id');
    }

    return SpotifyAPI.addRecommendedTrack(access_token, playlist_id, rec_id);
  }

  async updateLoggedInUser(access_token) {
    // Fetch user profile, top artists, and top tracks from Spotify API
    const artists = SpotifyAPI.fetchUserTopArtists(access_token, 'medium_term', 50);
    const tracks = SpotifyAPI.fetchUserTopTracks(access_token, 'medium_term', 50);
    const user = SpotifyAPI.fetchUserProfile(access_token);
    const fetched_data = Promise.all([artists, tracks, user]);

    const [fetched_artists, fetched_tracks, fetched_user] = await fetched_data
      .then(([artists, tracks, user]) => [artists.data.items, tracks.data.items, user.data])
      .catch(console.error);

    if (!fetched_user) {
      return Promise.reject('Failed to fetch user data');
    }

    // Extract user id, top artist ids, and top track ids
    const listener_id = fetched_user.id;
    const top_artist_ids = fetched_artists.map(({ id }) => id);
    const top_track_ids = fetched_tracks.map(({ id }) => id);
    
    // Cache top artists, top tracks, and associated albums in database
    const fetched_albums = fetched_tracks.map(({ album }) => album);
    const cached_albums = this.db.createOrUpdateAlbums(fetched_albums);
    const cached_tracks = this.db.createOrUpdateTracks(fetched_tracks);
    
    // Determine all artists associated with top tracks that are not already in top artists
    const top_track_associated_artists = await this.getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids)
      .catch(console.error);
    const cached_artists = this.db.createOrUpdateArtists(fetched_artists, top_track_associated_artists, listener_id);
    
    // Sum genre counts across top tracks and update genre documents in database
    const genre_counts = this.calcGenreCounts(fetched_artists, fetched_tracks, top_track_associated_artists);
    const cached_genres = this.db.createOrUpdateGenreCounts(genre_counts, listener_id);

    // Create or update existing User document
    const cached_user = await this.db.createOrUpdateUser(genre_counts, top_artist_ids, top_track_ids, fetched_user)
      .catch(console.error);
    const updates = [cached_albums, cached_artists, cached_genres, cached_tracks];

    // Create Minuet Recommendations playlist if not already created, and store playlist id in User document
    const updated_user = this.createRecommendedTracksPlaylist(access_token, cached_user)
    updates.push(updated_user);
    return Promise.all(updates).then(updates => updates.at(-1));
  }
}

module.exports = Middleware;
