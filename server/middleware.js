// Constants
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const num_top_artists = 50;
const max_artist_match_score = num_top_artists * (num_top_artists + 1) * (2 * num_top_artists + 1) / 6;
const num_mili_in_day = 86400000;

// Dependencies
const Database = require('./db');
const Recommendations = require('./recommendations');
const SpotifyAPI = require('./spotify_api');
require('dotenv').config({ path: '.env.local' });

class Middleware {
  constructor(redirect_uri) {
    this.api = new SpotifyAPI(client_id, client_secret, redirect_uri);
    this.db = new Database();
    this.recs = new Recommendations(this.db);
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
    return this.db.dismissMatch(user_id, match_id);
  }

  async dismissRecommendation(user_id, rec_id) {
    return this.recs.dismissRecommendation(user_id, rec_id);
  }

  // adds all possible matches to matched_user_to_outcome in user document
  // TODO: figure out how to batch awaits
  async generateMatches(user_id) {
    // fetch user's top artists and genres from database
    const user_obj = await this.db.getUser(user_id).catch(console.error);

    // top artists_ids is a sorted list of artists by rank
    const top_artists = user_obj.top_artist_ids;
    const genre_counts = user_obj.genre_counts;

    // get genre_counts keys and sort by descending order
    // number of genres is in the thousands, so slice to get the top num_top_artists genres
    let tmp = Array.from(genre_counts.entries()).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    const user_genres = tmp.slice(0, num_top_artists);
    let potential_matches = new Set();

    // loop through all genres and find all users who listen to the genre
    for (const genre of user_genres) {
      const genre_obj = await this.db.getGenre(genre);
      for (const listener_id of genre_obj.listener_id_to_count.keys()) {
        potential_matches.add(listener_id);
      }
    }

    // loop through all artists and find all users who listen to the artist
    for (const artist of top_artists) {
      const artist_obj = await this.db.getArtist(artist);
      for (const listener_id of artist_obj.listener_id_to_rank.keys()) {
        potential_matches.add(listener_id);
      }
    }

    for (const pot_user_id of potential_matches) {
      if (pot_user_id === user_id) {
        continue;
      }

      await this.db.addPotentialMatch(user_id, pot_user_id);
    }

    return this.getPotentialMatches(user_id);
  }

  // calculate match score between two users
  // returns -1 if either user object is null or if we don't have enough information to calculate a match score
  async calculateMatchScore(user_id, match_user_id) {
    const user_obj = await this.db.getUser(user_id);
    const match_user_obj = await this.db.getUser(match_user_id);
    // check if the user objects exist
    if (!user_obj || !match_user_obj) {
      return -1;
    }
    // check if the genre counts exist
    if (!user_obj.genre_counts || !match_user_obj.genre_counts) {
      return -1;
    }

    // check if the genre counts are empty
    if ((user_obj.genre_counts.size == 0) || (match_user_obj.genre_counts.size == 0)) {
      return -1;
    }

    // check if the top artist ids exist
    if (!user_obj.top_artist_ids || !match_user_obj.top_artist_ids) {
      return -1;
    }

    // check if the top artist ids are empty
    if ((user_obj.top_artist_ids.length == 0) || (match_user_obj.top_artist_ids.length == 0)) {
      return -1;
    }

    const user_total_genre_count = user_obj.total_genre_count;
    const user_avg_genre_count = user_total_genre_count / user_obj.genre_counts.size;
    const match_total_genre_count = match_user_obj.total_genre_count;
    const match_avg_genre_count = match_total_genre_count / match_user_obj.genre_counts.size;

    // calculate genre match score
    let genre_match_score = 0;
    let hypotenuse = 0;
    for (const genre of user_obj.genre_counts.keys()) {
      const norm_user_genre_count = user_obj.genre_counts.get(genre) / user_avg_genre_count;
      const norm_match_genre_count = (match_user_obj.genre_counts.get(genre) ?? 0) / match_avg_genre_count;
      hypotenuse += norm_user_genre_count * norm_user_genre_count;
      genre_match_score += norm_user_genre_count * norm_match_genre_count;
    }
    genre_match_score /= hypotenuse;

    // calculate artist match score
    let artist_match_score = 0;
    for (const artist of user_obj.top_artist_ids) {
      const artist_obj = await this.db.getArtist(artist);
      const user_artist_rank = artist_obj.listener_id_to_rank.get(user_obj.user_id) ?? num_top_artists;
      const match_artist_rank = artist_obj.listener_id_to_rank.get(match_user_obj.user_id) ?? num_top_artists;
      artist_match_score += (num_top_artists - user_artist_rank) * (num_top_artists - match_artist_rank);
    }
    artist_match_score /= max_artist_match_score;

    // return total match score
    return genre_match_score * 2 / 3 + artist_match_score * 1 / 3;
  }

  // matches are a pair of users that have liked each others profiles
  async getMatches(user_id) {
    // fetch cached list of matches
    let matches = this.db.getMatches(user_id);

    matches.forEach((match_user_id, match) => {
      // if match score is older than 1 day, recalculate match score
      if (Date.now() - match.updatedAt > num_mili_in_day) {
        const match_score = this.calculateMatchScore(user_id, match_user_id);
        this.db.createOrUpdateMatch(user_id, match_user_id, match_score);
      }
    });

    // return updated matches
    return this.db.getMatches(user_id);
  }

  // potential matches are a list of potential matches for the user, sorted by match score
  async getPotentialMatches(user_id, offset) {
    return this.db.getPotentialMatches(user_id);
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
    await this.db.likeMatch(user_id, match_id);
    const obj = await this.db.getPotentialMatches(match_id)
    const match_potential_matches = obj.matched_user_to_outcome;
    if (match_potential_matches.has(user_id)) {
      if (match_potential_matches.get(user_id) === 'liked') {
        const match_score = await this.calculateMatchScore(user_id, match_id);
        const user_obj = await this.db.getUser(user_id);
        const match_obj = await this.db.getUser(match_id);
        const top_shared_artist_ids = user_obj.top_artist_ids.filter(artist => match_obj.top_artist_ids.includes(artist));
        const top_shared_track_ids = user_obj.top_track_ids.filter(track => match_obj.top_track_ids.includes(track));
        const user_genres = Array.from(user_obj.genre_counts.keys());
        const match_genres = Array.from(match_obj.genre_counts.keys());
        const top_shared_genres = user_genres.filter(genre => match_genres.includes(genre));
        this.db.createOrUpdateMatch(user_id, match_id, match_score, top_shared_artist_ids,
          top_shared_genres, top_shared_track_ids);
      }
    }
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
