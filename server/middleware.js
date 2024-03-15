// Dependencies
const Database = require('./db');
const Recommendations = require('./recommendations');
const Matching = require('./matching');
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

/**
 * Middleware helper class
 */
class Middleware {
  /**
   * Constructs Middleware helper with database client, recommendations and matching helpers
   */
  constructor() {
    this.db = new Database();
    this.recs = new Recommendations(this.db);
    this.matching = new Matching(this.db);
  }

  /**
   * Constructs map of genre names to summed counts by either top artists or top tracks
   * @param {Map<string, string[]>} artist_id_to_genres - Map of artist ids to genre names
   * @param {Object[]} fetched_artists - Array of Spotify artist objects
   * @param {Object[]} fetched_tracks - Array of Spotify track objects
   * @param {boolean} sum_by_tracks - Flag to sum genre counts by top tracks instead of artists
   * @returns {Map<string, number>} - Map of genre names to summed counts
   */
  calcGenreCounts(artist_id_to_genres, fetched_artists, fetched_tracks, sum_by_tracks) {
    if (sum_by_tracks) {
      return this.calcGenreCountsByTracks(artist_id_to_genres, fetched_tracks);
    } else {
      return this.calcGenreCountsByArtists(artist_id_to_genres, fetched_artists);
    }
  }

  /**
   * Constructs map of genre names to summed counts by top artists
   * @param {Map<string, string[]>} artist_id_to_genres - Map of artist ids to genre names
   * @param {Object[]} fetched_artists - Array of Spotify artist objects
   * @returns {Map<string, number>} - Map of genre names to summed counts
   */
  calcGenreCountsByArtists(artist_id_to_genres, fetched_artists) {
    return fetched_artists
      .map(({ id }) => id)
      .flatMap(artist_id => artist_id_to_genres.get(artist_id))
      .reduce((map, genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
        return map;
      }, new Map());
  }

  /**
   * Constructs map of genre names to summed counts by top tracks
   * @param {Map<string, string[]>} artist_id_to_genres - Map of artist ids to genre names
   * @param {Object[]} fetched_tracks - Array of Spotify track objects
   * @returns {Map<string, number>} - Map of genre names to summed counts
   */
  calcGenreCountsByTracks(artist_id_to_genres, fetched_tracks) {
    return fetched_tracks
      .flatMap(track => track.artists.map(({ id }) => id))
      .flatMap(artist_id => artist_id_to_genres.get(artist_id))
      .reduce((map, genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
        return map;
      }, new Map());
  }

  /**
   * Returns match score for given user and potential match
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} match_id - Spotify user id of potential match
   * @returns {Promise<number>} - Promise for match score
   */
  async calculateMatchScore(user_id, match_id) {
    return this.matching.calculateMatchScore(user_id, match_id);
  }

  /**
   * Marks potential match as dismissed for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} match_id - Spotify user id of potential match to dismiss
   * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
   */
  async dismissMatch(user_id, match_id) {
    return this.matching.dismissMatch(user_id, match_id);
  }

  /**
   * Marks recommended track as dismissed for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} rec_id - Spotify track id of recommendation to dismiss
   * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
   */
  async dismissRecommendation(user_id, rec_id) {
    return this.recs.dismissRecommendation(user_id, rec_id);
  }

  /**
   * Determines which profiles are potential matches for logged in user and caches in database
   * @param {string} user_id - Spotify user id of logged in user
   * @returns {Promise<Object[]>} - Promise for map of potential match ids to outcome (none by default)
   */
  async generateMatches(user_id) {
    return this.matching.generateMatches(user_id);
  }

  /**
   * 
   * @param {string} user_id - Spotify user id of logged in user
   * @returns 
   */
  async getMatches(user_id) {
    return this.matching.getMatches(user_id);
  }

  /**
   * 
   * @param {string} user_id - Spotify user id of logged in user
   * @returns 
   */
  async getPotentialMatches(user_id) {
    return this.matching.getPotentialMatches(user_id);
  }

  /**
   * Gets requested number of track recommendations for user
   * @param {string} access_token - Spotify access token for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {number} num_req - Number of recommendations requested
   * @returns {Promise<Object[]>} - Promise for array of full track objects cached in database
   */
  async getRecommendations(access_token, user_id, num_req) {
    return this.recs.getRecommendations(access_token, user_id, num_req);
  }

  /**
   * Determines which artists are cached in database and which have not been cached
   * @param {Object[]} top_artists - Array of Spotify artist objects
   * @param {Object[]} top_tracks - Array of Spotify track objects
   * @returns {Promise<Object>} - Promise for object with cached_artist and uncached_artist_ids fields
   */
  async getCachedArtistsAndUncachedIds(top_artists, top_tracks) {
    // Extract artist ids from top tracks and filter out top artists previously fetched
    const top_artist_ids = new Set(top_artists.map(({ id }) => id));
    const top_track_artist_ids = top_tracks
      .flatMap(({ artists }) => artists)
      .map(({ id }) => id)
      .filter(artist_id => !top_artist_ids.has(artist_id));
    
    // Return artists cached in database and uncached artist ids
    return this.db.getArtists(top_track_artist_ids).then(cached_artists => {
      const cached_artist_ids = new Set(cached_artists.map(({ artist_id }) => artist_id));
      const uncached_artist_ids = top_track_artist_ids.filter(artist_id => !cached_artist_ids.has(artist_id));
      return { cached_artists, uncached_artist_ids };
    });
  }

  /**
   * Fetches cached user profile and expands full top artist and track info
   * @param {number} num_top_artists - Number of top artists to fetch
   * @param {number} num_top_tracks - Number of top tracks to fetch
   * @param {string} user_id - Spotify user ID
   * @returns {Promise<Object>} - Promise for user profile object with full top artist and track info
   */
  async getUserProfile(num_top_artists, num_top_tracks, user_id) {
    // Fetch user profile from database
    const user = await this.db.getUserProfile(user_id).catch(console.error);

    if (!user) {
      return Promise.reject('Failed to fetch user profile');
    }

    // Fetch matched users from database
    const matched_user_ids = Object.entries(user.matched_user_to_outcome)
      .filter(([user_id, outcome]) => outcome === 'liked')
      .map(([user_id, outcome]) => user_id);
    const matched_users_req = this.db.getBasicUserProfiles(matched_user_ids);

    // Fetch full top artist and track info from database
    const top_artist_ids = user.top_artist_ids.slice(0, num_top_artists);
    const top_track_ids = user.top_track_ids.slice(0, num_top_tracks);
    const artists_req = this.db.getArtists(top_artist_ids);
    const tracks_req = this.db.getFullTracks(top_track_ids);

    const all_req = Promise.all([matched_users_req, artists_req, tracks_req]);
    const [matched_users, top_artists, top_tracks] = await all_req
      .catch(console.error);

    if (!matched_users || !top_artists || !top_tracks) {
      return Promise.reject('Failed to fetch matched users, top artists and/or tracks for user');
    }

    // Return user profile with full top artist and track info
    delete user.top_artist_ids;
    delete user.top_track_ids;
    return {
      ...user,
      top_artists,
      top_tracks,
      matched_users
    };
  }

  /**
   * Marks potential match as liked for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} match_id - Spotify user id of potential match to like
   * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
   */
  async likeMatch(user_id, match_id) {
    return this.matching.likeMatch(user_id, match_id);
  }

  /**
   * Marks recommended track as liked for user and adds to user's recommendations playlist
   * @param {string} access_token - Spotify access token for logged in user
   * @param {string} user_id - Spotify user id of logged in user
   * @param {string} rec_id - Spotify track id of recommendation to like
   */
  async likeRecommendation(access_token, user_id, rec_id) {
    return this.recs.likeRecommendation(access_token, user_id, rec_id);
  }
    
  /**
   * Constructs map of artist ids to genre names and isolates uncached artists
   * @param {string} access_token - Spotify access token for logged in user
   * @param {Object[]} top_artists - Array of Spotify artist objects
   * @param {Object[]} top_tracks - Array of Spotify track objects
   * @returns {Promise<Object>} - Promise for object with artist_id_to_genres map and uncached_artists array
   */
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
      .then(({ data }) => {
        const uncached_artists = data.artists;
        const artist_id_to_genres = uncached_artists.reduce((map, { id, genres }) => {
          map.set(id, genres);
          return map;
        }, top_and_cached_artists_with_genres);
        return { artist_id_to_genres, uncached_artists };
      })
      .catch(error => {
        if (error.response && error.response.status === 429) {
          console.error('/artists rate limit exceeded, calculating genre counts by top artists');
        } else {
          console.error(error);
        }

        return { artist_id_to_genres: top_artists_to_genres, uncached_artists: [] };
      });
  }

  /**
   * Fetches user profile data from Spotify API and creates/updates User document in database
   * @param {string} access_token - Spotify access token for logged in user
   * @returns {Promise<Object>} - Promise for updated User document
   */
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
    const updated_user = Recommendations.createRecommendedTracksPlaylist(access_token, cached_user);
    updates.push(updated_user);
    return Promise.all(updates).then(updates => updates.at(-1));
  }
}

module.exports = Middleware;
