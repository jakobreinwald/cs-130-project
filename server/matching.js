// Constants
const num_top_artists = 50;
const max_artist_match_score = num_top_artists * (num_top_artists + 1) * (2 * num_top_artists + 1) / 6;
const num_mili_in_day = 86400000;

/**
 * Middleware helper class for matching
 */

class Matching {
  /**
   * Constructor for Matching
   * @param {Object} database - Database object
   */
  constructor(database) {
    this.db = database;
  }

  /**
   * Dismisses a potential match for a given user
   * @param {String} user_id - Spotify user ID of logged in user
   * @param {String} match_id - Spotify user ID of potential match
   * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise of the MongoDB update result
   */

  async dismissMatch(user_id, match_id) {
    return this.db.dismissMatch(user_id, match_id);
  }

  /**
   * Generates a list of potential matches for a user
   * @param {String} user_id - Spotify user ID of logged in user
   * @returns {Promise<mongoose.Document>} - Promise for matched_user_to_outcome map in User document
   */
  async generateMatches(user_id) {
    // fetch user's top artists and genres from database
    const user_doc = await this.db.getUserDocument(user_id).catch(console.error);

    // top artists_ids is a sorted list of artists by rank
    const top_artists = user_doc.top_artist_ids;
    const genre_counts = user_doc.genre_counts;

    // get genre_counts keys and sort by descending order
    // number of genres is in the thousands, so slice to get the top num_top_artists genres
    let tmp = Array.from(Object.entries(genre_counts)).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
    const user_genres = tmp.slice(0, num_top_artists);

    const all_user_objs = await this.db.getAllUsers();
    const potential_matches = new Set(all_user_objs
      .filter(pot_user_obj => pot_user_obj.user_id !== user_id)
      .map(({ user_id }) => user_id));

    const potential_match_ids = Array.from(potential_matches);

    return this.db.addPotentialMatches(potential_match_ids, user_doc)
      .then(() => user_doc.matched_user_to_outcome);
  }

  /**
   * Calculates the match score between two users
   * @param {String} user_id - Spotify user ID of logged in user
   * @param {String} match_user_id - Spotify user ID of potential match
   * @returns {Promise<Array>} - Promise of the match score, user object, and match user object
   */

  async calculateMatchScore(user_id, match_user_id) {
    const [user_obj, match_user_obj] = await this.db.getUsers([user_id, match_user_id]).catch(console.error);

    // check if the user objects exist
    if (!user_obj || !match_user_obj) {
      return [-1, user_obj, null];
    }
    // check if the genre counts exist
    if (!user_obj.genre_counts || !match_user_obj.genre_counts) {
      return [-1, user_obj, match_user_obj];
    }

    // check if the genre counts are empty
    if ((user_obj.genre_counts.size == 0) || (match_user_obj.genre_counts.size == 0)) {
      return [-1, user_obj, match_user_obj];
    }

    // check if the top artist ids exist
    if (!user_obj.top_artist_ids || !match_user_obj.top_artist_ids) {
      return [-1, user_obj, match_user_obj];
    }

    // check if the top artist ids are empty
    if ((user_obj.top_artist_ids.length == 0) || (match_user_obj.top_artist_ids.length == 0)) {
      return [-1, user_obj, match_user_obj];
    }

    const user_genre_counts_keys = Object.keys(user_obj.genre_counts);
    const user_total_genre_count = user_obj.total_genre_count;
    const user_avg_genre_count = user_total_genre_count / user_genre_counts_keys.length;
    const match_total_genre_count = match_user_obj.total_genre_count;
    const match_avg_genre_count = match_total_genre_count / Object.keys(match_user_obj.genre_counts).length;

    // calculate genre match score
    let genre_match_score = 0;
    let hypotenuse = 0;
    // for all genres of a user, calculate the normalized genre count and the normalized match genre count
    for (const genre of Object.keys(user_obj.genre_counts)) {
      const norm_user_genre_count = user_obj.genre_counts[genre] / user_avg_genre_count;
      const norm_match_genre_count = (match_user_obj.genre_counts[genre] ?? 0) / match_avg_genre_count;
      hypotenuse += norm_user_genre_count * norm_user_genre_count;
      genre_match_score += norm_user_genre_count * norm_match_genre_count;
    }
    genre_match_score /= hypotenuse;

    // calculate artist match score
    let artist_match_score = 0;
    // for all artists of a user, calculate the match artist rank
    for (const [user_artist_rank, artist] of user_obj.top_artist_ids.entries()) {
      const match_artist_index = match_user_obj.top_artist_ids.indexOf(artist);
      const match_artist_rank = match_artist_index === -1 ? num_top_artists : match_artist_index;
      artist_match_score += (num_top_artists - user_artist_rank) * (num_top_artists - match_artist_rank);
    }
    artist_match_score /= max_artist_match_score;

    // return total match score, user and match user objects
    const total_match_score = genre_match_score * 2 / 3 + artist_match_score * 1 / 3 + .5;
    const adjusted_match_score = total_match_score >= 1 ? 1 : total_match_score;
    return [adjusted_match_score, user_obj, match_user_obj];
  }

  /**
   * Gets all the mutual matches of a user
   * @param {String} user_id - Spotify user ID of logged in user
   * @returns {Promise<Object[]>} - Promise of mutual match objects for user
   */
  async getMatches(user_id) {
    // fetch cached list of matches
    const matches = await this.db.getMatches(user_id).catch(console.error);
    const match_updates = [];

    // for all matches, update if current match score is older than a day
    matches.forEach((match_user_id, match) => {
      // if match score is older than 1 day, recalculate match score
      if (Date.now() - match.updatedAt > num_mili_in_day) {
        const [match_score, ...users] = this.calculateMatchScore(user_id, match_user_id);
        const match_update = this.db.createOrUpdateMatch(user_id, match_user_id, match_score);
        match_updates.push(match_update);
      }
    });

    return Promise.all(match_updates).then(() => matches);
  }

  /**
   * Gets all the potential matches of a user
   * @param {String} user_id - Spotify user ID of logged in user
   * @returns {Promise<Object[]>} - Promise for matched_user_to_outcome map in User document
   */
  async getPotentialMatches(user_id) {
    return this.db.getPotentialMatches(user_id);
  }


  /**
   * Likes a match
   * @param {String} user_id - Spotify user ID of logged in user
   * @param {String} match_id - Spotify user ID of potential match
   * @returns {Promise<mongoose.UpdateWriteOpResult[]>} - Promise of the MongoDB update results for User and Match documents
   */
  async likeMatch(user_id, match_id) {
    const updated_likes = this.db.likeMatch(user_id, match_id);
    const db_updates = [updated_likes];
    const obj = await this.db.getPotentialMatches(match_id).catch(console.error);
    const match_potential_matches = obj.matched_user_to_outcome;

    // if the match is mutual, calculate match score and update match
    if (match_potential_matches.has(user_id) && match_potential_matches.get(user_id) === 'liked') {
      const [match_score, user_obj, match_obj] = await this.calculateMatchScore(user_id, match_id).catch(console.error);
      // const user_obj = await this.db.getUser(user_id);
      // const match_obj = await this.db.getUser(match_id);
      const top_shared_artist_ids = user_obj.top_artist_ids.filter(artist => match_obj.top_artist_ids.includes(artist));
      const top_shared_track_ids = user_obj.top_track_ids.filter(track => match_obj.top_track_ids.includes(track));
      const user_genres = Array.from(Object.keys(user_obj.genre_counts));
      const match_genres = Array.from(Object.keys(match_obj.genre_counts));
      const top_shared_genres = user_genres.filter(genre => match_genres.includes(genre));
      const updated_match = this.db.createOrUpdateMatch(user_id, match_id, match_score, top_shared_artist_ids,
        top_shared_genres, top_shared_track_ids);
      db_updates.push(updated_match);
    }

    return Promise.all(db_updates);
  }
}

module.exports = Matching;
