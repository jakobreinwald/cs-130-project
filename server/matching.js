// Constants
const num_top_artists = 50;
const max_artist_match_score = num_top_artists * (num_top_artists + 1) * (2 * num_top_artists + 1) / 6;
const num_mili_in_day = 86400000;

class Matching {
  constructor(database) {
    this.db = database;
  }

  async dismissMatch(user_id, match_id) {
    return this.db.dismissMatch(user_id, match_id);
  }

  // adds all possible matches to matched_user_to_outcome in user document
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

    // TODO: delete temporary fix?
    const all_user_objs = await this.db.getAllUsers();
    const potential_matches = new Set(all_user_objs
      .filter(pot_user_obj => pot_user_obj.user_id !== user_id)
      .map(({ user_id }) => user_id));

    // TODO: this code would need to be refactored to use db.getGenres and db.getArtists methods
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

    // for (const pot_user_id of potential_matches) {
    //   if (pot_user_id === user_id) {
    //     continue;
    //   }

    //   await this.db.addPotentialMatch(user_id, pot_user_id);
    // }

    // return this.getPotentialMatches(user_id);
    const potential_match_ids = Array.from(potential_matches);

    return this.db.addPotentialMatches(potential_match_ids, user_doc)
      .then(() => user_doc.matched_user_to_outcome);
  }

  // calculate match score between two users
  // returns -1 if either user object is null or if we don't have enough information to calculate a match score
  async calculateMatchScore(user_id, match_user_id) {
    // const user_obj = await this.db.getUser(user_id);
    // const match_user_obj = await this.db.getUser(match_user_id);
    const [user_obj, match_user_obj] = await this.db.getUsers([user_id, match_user_id]).catch(console.error);
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

    const user_genre_counts_keys = Object.keys(user_obj.genre_counts);
    const user_total_genre_count = user_obj.total_genre_count;
    const user_avg_genre_count = user_total_genre_count / user_genre_counts_keys.length;
    const match_total_genre_count = match_user_obj.total_genre_count;
    const match_avg_genre_count = match_total_genre_count / Object.keys(match_user_obj.genre_counts).length;

    // calculate genre match score
    let genre_match_score = 0;
    let hypotenuse = 0;
    for (const genre of Object.keys(user_obj.genre_counts)) {
      const norm_user_genre_count = user_obj.genre_counts[genre] / user_avg_genre_count;
      const norm_match_genre_count = (match_user_obj.genre_counts[genre] ?? 0) / match_avg_genre_count;
      hypotenuse += norm_user_genre_count * norm_user_genre_count;
      genre_match_score += norm_user_genre_count * norm_match_genre_count;
    }
    genre_match_score /= hypotenuse;

    let artist_match_score = 0;
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

  // matches are a pair of users that have liked each others profiles
  async getMatches(user_id) {
    // fetch cached list of matches
    const matches = await this.db.getMatches(user_id).catch(console.error);
    const match_updates = [];
    
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

  // potential matches are a list of potential matches for the user, sorted by match score
  async getPotentialMatches(user_id) {
    return this.db.getPotentialMatches(user_id);
  }

  async likeMatch(user_id, match_id) {
    const updated_likes = this.db.likeMatch(user_id, match_id);
    const db_updates = [updated_likes];
    const obj = await this.db.getPotentialMatches(match_id).catch(console.error);
    const match_potential_matches = obj.matched_user_to_outcome;
    
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
