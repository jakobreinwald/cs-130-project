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
      .flatMap(track => track.artists.map(artist => artist.id))
      .flatMap(artist_id => artist_id_to_genres.get(artist_id))
      .reduce((map, genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
        return map;
      }, new Map());
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

  async generateRecommendations(access_token, user_id, batch_len, num_req) {
    // Fetch user document from database and extract top artists
    const user = await this.db.getUser(user_id).catch(console.error);
    const top_artists = user.top_artist_ids;

    // Extract top genres, sorted descending by count
    const top_genres = user.genre_counts
      .sort((a, b) => b[1] - a[1])
      .map(genre => genre[0]);

    let processed_recs = [];
    let rec_ids = [];

    // Generate recommendations in batches
    for (let artist_offset = 0; artist_offset < top_artists.length; artist_offset += 5) {
      // Select 5 (max allowed by Spotify API) artists and genres from top lists
      const selected_artists = top_artists.slice(artist_offset, artist_offset + 5);
      const genre_offset = artist_offset % top_genres.length;
      const selected_genres = top_genres.slice(genre_offset, genre_offset + 5);

      // Call recommendation endpoint of Spotify API to fetch recommended tracks
      const recs = this.api.fetchRecommendedTracks(access_token, batch_len, selected_artists, selected_genres)
        .then(response => response.data.tracks)
        .catch(console.error);

      // Keep track of first num_req recommended track ids, immediately returned in response
      const rem_req = num_req - rec_ids.length;
      rec_ids.push(...recs.slice(0, rem_req).map(track => track.id));

      // Cache recommendation track ids and track objects in database
      const cached_rec_ids = recs.map(track => this.db.addRecommendation(user_id, track.id));
      const cached_tracks = recs.map(track => this.db.createOrUpdateTrack(track));
      processed_recs.push(...cached_rec_ids, ...cached_tracks);
    }

    return Promise.all(processed_recs)
      .then(() => rec_ids);
  }

  async getMatches(user_id, offset) {
    // TODO: fetch cached list of matches, from offset index onwards
  }

  async getRecommendations(access_token, user_id, num_req) {
    // Fetch user document from database
    const user = await this.db.getUser(user_id).catch(console.error);
    
    // Isolate first recommended track id that user has not yet interacted with
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
    if (rec_ids.length < num_req) {
      const rem_req = num_req - rec_ids.length;
      rec_ids = await this.generateRecommendations(access_token, user_id, 10, rem_req).catch(console.error);
    }

    // Fetch track objects from database
    const recs = rec_ids.map(track_id => this.db.getTrack(track_id))
    return Promise.all(recs);
  }

  async getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids) {
    const top_artist_set = new Set(top_artist_ids);
    const fetched_artists = fetched_tracks
      .flatMap(track => track.artists.map(artist => artist.id))
      .filter(artist_id => !top_artist_set.has(artist_id))
      .map(artist_id => this.api.fetchArtist(access_token, artist_id))
    
    return Promise.all(fetched_artists)
      .then(res => res.map(artist => artist.data));
  }

  async getUser(user_id) {
    return this.db.getUser(user_id);
  }

  async likeMatch(user_id, match_id) {
    // TODO: mark profile as liked in databased
  }

  async likeRecommendation(user_id, rec_id) {
    // Mark recommendation as liked in database and add to user's Spotify account
    const update_db = this.db.likeRecommendation(user_id, rec_id);
    const add_to_spotify = this.api.addRecommendedTrack(user_id, rec_id);
    return Promise.all([update_db, add_to_spotify]);
  }

  async updateLoggedInUser(access_token) {
    // Fetch user profile, top artists, and top tracks from Spotify API
    const artists = this.api.fetchUserTopArtists(access_token, 'medium_term', 50);
    const tracks = this.api.fetchUserTopTracks(access_token, 'medium_term', 50);
    const user = this.api.fetchUserProfile(access_token);
    const fetched_data = Promise.all([artists, tracks, user]);

    const [fetched_artists, fetched_tracks, fetched_user] = await fetched_data
      .then(([artists, tracks, user]) => [artists.data.items, tracks.data.items, user.data])
      .catch(console.error);

    if (!fetched_user) {
      return Promise.reject('Failed to fetch user data');
    }

    // Extract user id, top artist ids, and top track ids
    const listener_id = fetched_user.id;
    const top_artist_ids = fetched_artists.map(artist => artist.id);
    const top_track_ids = fetched_tracks.map(track => track.id);
    const fetched_albums = fetched_tracks.map(track => track.album);

    // Cache top artists, top tracks, and associated albums in database
    const cached_albums = this.db.createOrUpdateAlbums(fetched_albums);
    const cached_tracks = this.db.createOrUpdateTracks(fetched_tracks);
    
    // Determine all artists associated with top tracks that are not already in top artists
    const top_track_associated_artists = await this.getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids)
      .catch(console.error);
    const cached_artists = this.db.createOrUpdateArtists(fetched_artists, top_track_associated_artists, listener_id);
    
    // Sum genre counts across top tracks and update genre documents in database
    const genre_counts = this.calcGenreCounts(fetched_artists, fetched_tracks, top_track_associated_artists);
    const cached_genres = this.db.createOrUpdateGenreCounts(genre_counts, listener_id);
    
    // Create or update user document in database
    const cached_user = this.db.createOrUpdateUser(genre_counts, top_artist_ids, top_track_ids, fetched_user);
    return Promise.all([cached_albums, cached_artists, cached_genres, cached_tracks, cached_user]);
  }
}

module.exports = Middleware;
