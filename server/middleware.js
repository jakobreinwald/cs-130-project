// Constants
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const num_top_artists = 50;
const max_artist_match_score = num_top_artists * (num_top_artists + 1) * (2 * num_top_artists + 1) / 6;
const num_mili_in_day = 86400000;

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
    return this.db.dismissMatch(user_id, match_id);
  }

  async dismissRecommendation(user_id, rec_id) {
    return this.db.dismissRecommendation(user_id, rec_id);
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
    let tmp = Array.from(Object.entries(genre_counts)).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    const user_genres = tmp.slice(0, num_top_artists);
    let potential_matches = new Set();

    // TODO: delete temporary fix?
    const all_user_objs = await this.db.getAllUsers();
    for(const pot_user_obj of all_user_objs) {
      if (pot_user_obj.user_id === user_id) {
        continue;
      }
      potential_matches.add(pot_user_obj.user_id);
    }

    // // loop through all genres and find all users who listen to the genre
    // for (const genre of user_genres) {
    //   const genre_obj = await this.db.getGenre(genre);
    //   for (const listener_id of genre_obj.listener_id_to_count.keys()) {
    //     potential_matches.add(listener_id);
    //   }
    // }

    // // loop through all artists and find all users who listen to the artist
    // for (const artist of top_artists) {
    //   const artist_obj = await this.db.getArtist(artist);
    //   for (const listener_id of artist_obj.listener_id_to_rank.keys()) {
    //     potential_matches.add(listener_id);
    //   }
    // }

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

  // potential matches are a list of potential matches for the user, sorted by match score
  async getPotentialMatches(user_id, offset) {
    return this.db.getPotentialMatches(user_id);
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

  async getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids) {
    const top_artist_set = new Set(top_artist_ids);
    const fetched_artists = fetched_tracks
      .flatMap(track => track.artists.map(({ id }) => id))
      .filter(artist_id => !top_artist_set.has(artist_id))
      .map(artist_id => this.api.fetchArtist(access_token, artist_id))

    return Promise.all(fetched_artists)
      .then(artists => artists.map(({ data }) => data));
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
    // const top_track_associated_artists = await this.getTopTrackAssociatedArtists(access_token, fetched_tracks, top_artist_ids)
      // .catch(console.error);
    const cached_artists = this.db.createOrUpdateArtists(fetched_artists, [], listener_id);
    
    // Sum genre counts across top tracks and update genre documents in database
    // const genre_counts = this.calcGenreCounts(fetched_artists, fetched_tracks, top_track_associated_artists);
    // const cached_genres = this.db.createOrUpdateGenreCounts(genre_counts, listener_id);

    // Create or update existing User document
    const cached_user = await this.db.createOrUpdateUser(null, top_artist_ids, top_track_ids, fetched_user)
      .catch(console.error);
    const updates = [cached_albums, cached_artists, cached_tracks];

    // Create Minuet Recommendations playlist if not already created, and store playlist id in User document
    const updated_user = this.createRecommendedTracksPlaylist(access_token, cached_user)
    updates.push(updated_user);
    return Promise.all(updates).then(updates => updates.at(-1));
  }
}

module.exports = Middleware;
