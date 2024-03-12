// Constants
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

// Dependencies
const Database = require('./db');
const Recommendations = require('./recommendations');
const Matching = require('./matching');
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

class Middleware {
  constructor(redirect_uri) {
    this.api = new SpotifyAPI(client_id, client_secret, redirect_uri);
    this.db = new Database();
    this.recs = new Recommendations(this.db);
    this.matching = new Matching(this.db);
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

  async dismissMatch(user_id, match_id) {
    return this.matching.dismissMatch(user_id, match_id);
  }

  async dismissRecommendation(user_id, rec_id) {
    return this.recs.dismissRecommendation(user_id, rec_id);
  }

  async generateMatches(user_id) {
    return this.matching.generateMatches(user_id);
  }

  async getMatches(user_id) {
    return this.matching.getMatches(user_id);
  }

  async getPotentialMatches(user_id) {
    return this.matching.getPotentialMatches(user_id);
  }

  async getRecommendations(access_token, user_id, num_req) {
    return this.recs.getRecommendations(access_token, user_id, num_req);
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
      const cached_artist_ids = new Set(cached_artists.map(({ artist_id }) => artist_id));
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
    return this.matching.likeMatch(user_id, match_id);
  }

  async likeRecommendation(access_token, user_id, rec_id) {
    return this.recs.likeRecommendation(access_token, user_id, rec_id);
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
