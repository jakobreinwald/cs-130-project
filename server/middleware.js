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

  calcGenreCounts(artist_id_to_genres, fetched_artists, fetched_tracks, sum_by_tracks) {
    if (sum_by_tracks) {
      return this.calcGenreCountsByTracks(artist_id_to_genres, fetched_tracks);
    } else {
      return this.calcGenreCountsByArtists(artist_id_to_genres, fetched_artists);
    }
  }

  calcGenreCountsByArtists(artist_id_to_genres, fetched_artists) {
    return fetched_artists
      .map(({ id }) => id)
      .flatMap(artist_id => artist_id_to_genres.get(artist_id))
      .reduce((map, genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
        return map;
      }, new Map());
  }

  calcGenreCountsByTracks(artist_id_to_genres, fetched_tracks) {
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
    // At time of implementation, max of 50 top artists and 50 top tracks cached respectively
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
    const { recommended_track_to_outcome, top_artist_ids, top_track_ids } = user;

    // Fetch recommendations from Spotify API
    const recs = await this.fetchRecommendations(access_token, batch_len, top_artist_ids, top_track_ids)
      .catch(console.error);

    if (!recs) {
      return Promise.reject('Failed to fetch recommendations');
    }

    // Filter old recs and extract first num_req track ids, immediately returned in response
    const rec_ids = recs.filter(({ id }) => !recommended_track_to_outcome.has(id))
      .map(({ id }) => id);
    const req_rec_ids = rec_ids.slice(0, num_req);

    // Cache recommendation track ids and track objects in database
    const cached_rec_ids = this.db.addRecommendations(rec_ids, user);
    const cached_tracks = this.db.createOrUpdateTracksWithAlbumAndArtists(recs);

    return Promise.all([cached_rec_ids, cached_tracks]).then(() => req_rec_ids);
  }

  async getMatches(user_id, offset) {
    // TODO: fetch cached list of matches, from offset index onwards
  }

  async getRecommendations(access_token, user_id, num_req) {
    // Isolate first num_req recommendations that user has not yet interacted with
    const user = await this.db.getUserDocument(user_id).catch(console.error);
    const fresh_recs = user.recommended_and_fresh_tracks.keys();
    let rec_ids = [];

    for (const rec_id of fresh_recs) {
      rec_ids.push(rec_id);

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

    // Fetch track objects with associated album and artist objects from database
    return this.db.getFullTracks(rec_ids);
  }

  async getCachedArtistsAndUncachedIds(top_artists, top_tracks) {
    // Extract artist ids from top tracks and filter out top artists previously fetched
    const top_artist_ids = new Set(top_artists.map(({ id }) => id));
    const top_track_artist_ids = top_tracks
      .flatMap(({ artists }) => artists)
      .map(({ id }) => id)
      .filter(artist_id => !top_artist_ids.has(artist_id));
    
    // Return artists cached in database and uncached artist ids
    return this.db.getArtists(top_track_artist_ids).then(cached_artists => {
      const cached_artist_ids = new Set(cached_artists.map(({ id }) => id));
      const uncached_artist_ids = top_track_artist_ids.filter(artist_id => !cached_artist_ids.has(artist_id));
      return { cached_artists, uncached_artist_ids };
    });
  }

  async getUserProfile(num_top_artists, num_top_tracks, user_id) {
    // Fetch user profile from database and extract top artist and track ids
    const user = await this.db.getUserProfile(user_id).catch(console.error);

    if (!user) {
      return Promise.reject('Failed to fetch user profile');
    }
    
    // Fetch full top artist and track info from database
    const top_artist_ids = user.top_artist_ids.slice(0, num_top_artists);
    const top_track_ids = user.top_track_ids.slice(0, num_top_tracks);
    const artists_req = this.db.getArtists(top_artist_ids);
    const tracks_req = this.db.getFullTracks(top_track_ids);
    const [top_artists, top_tracks] = await Promise.all([artists_req, tracks_req])
      .catch(console.error);

    if (!top_artists || !top_tracks) {
      return Promise.reject('Failed to fetch top artists and tracks for user');
    }
    
    // Return user profile with full top artist and track info
    delete user.top_artist_ids;
    delete user.top_track_ids;
    return { ...user, top_artists, top_tracks };
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
    
  async processTopArtistsAndTracks(access_token, top_artists, top_tracks) {
    // Extract artist ids not cached in database or already fetched in top artists
    const { cached_artists, uncached_artist_ids } = await this.getCachedArtistsAndUncachedIds(top_artists, top_tracks)
      .catch(error => {
        console.error(error);
        return { cached_artists: [], uncached_artist_ids: [] };
      });
    const rem_artists_req = SpotifyAPI.fetchArtists(access_token, uncached_artist_ids);
    
    // Map top artists and cached artists to their respective genres
    const top_artists_to_genres = top_artists.reduce((map, { id, genres }) => {
      map.set(id, genres);
      return map;
    }, new Map());
    const top_and_cached_artists_with_genres = cached_artists.reduce((map, { artist_id, genres }) => {
      map.set(artist_id, genres);
      return map;
    }, top_artists_to_genres);
    
    // Return artists in formats for calculating genre counts and caching in database, respectively
    return rem_artists_req
      .then(rem_artist_res => {
        const uncached_artists = rem_artist_res.map(({ data }) => data.artists);
        const artist_id_to_genres = uncached_artists.reduce((map, { id, genres }) => {
          map.set(id, genres);
          return map;
        }, top_and_cached_artists_with_genres);
        return { artist_id_to_genres, uncached_artists };
      })
      .catch(error => {
        console.error(error);
        return { artist_id_to_genres: top_artists_to_genres, uncached_artists: [] };
      });
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
    
    // Fetch all artists associated with top tracks that are not cached or in top artists, then cache
    const artist_data = await this.processTopArtistsAndTracks(access_token, fetched_artists, fetched_tracks);
    const { artist_id_to_genres, uncached_artists } = artist_data;
    const cached_artists = this.db.createOrUpdateArtists(fetched_artists, uncached_artists, listener_id);
    
    // Sum genre counts across top artists or tracks, then update genre documents in database
    // non-empty uncached_artists implies track genres were fetched, so sum by top tracks
    const sum_by_tracks = uncached_artists.length > 0;
    const genre_counts = this.calcGenreCounts(artist_id_to_genres, fetched_artists, fetched_tracks, sum_by_tracks);
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
