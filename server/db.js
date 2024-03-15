// Dependencies
const { Album, Artist, Genre, Match, Track, User } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

/**
 * MongoDB database client
 */
class Database {
	/**
	 * Constructs MongoDB connection string and connects to Minuet database
	 */
	constructor() {
		const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;
		mongoose.connect(connection)
			.then(() => console.log('Connected to Minuet database'))
			.catch(console.error);
	}

	/**
	 * Returns Mongo updateOne operation for given Album object
	 * @param {Object} album_obj - Album object from Spotify API
	 * @returns {Object} - Mongo updateOne operation for Album collection
	 */
	constructAlbumUpdateOperation(album_obj) {
		// Generate update command for Album document
		return {
			updateOne: {
				filter: { album_id: album_obj.id },
				update: { $set: this.createAlbumModel(album_obj) },
				upsert: true
			}
		};
	}

	/**
	 * Returns Mongo updateOne operation for given Artist object
	 * @param {Object} artist_obj - Artist object from Spotify API
	 * @param {?string} listener_id - Spotify user ID, if called on user update
	 * @param {?number} rank - Rank of artist in user's top artists, if called on user update
	 * @returns {Object} - Mongo updateOne operation for Artist collection
	 */
	constructArtistUpdateOperation(artist_obj, listener_id = null, rank = null) {
		// Convert Spotify API object to Artist model
		const update_command = { $set: this.createArtistModel(artist_obj) };


		if (listener_id && rank !== null) {
			update_command.$set[`listener_id_to_rank.${listener_id}`] = rank;
		}

		// Generate update command for Artist document
		const update_op = {
			updateOne: {
				filter: { artist_id: artist_obj.id },
				update: update_command,
				upsert: true
			}
		};

		return update_op;
	}

	/**
	 * Returns Mongo updateOne operation for given Track object
	 * @param {Object} track_obj - Track object from Spotify API
	 * @returns {Object} - Mongo updateOne operation for Track collection
	 */
	constructTrackUpdateOperation(track_obj) {
		// Generate update command for Track document
		return {
			updateOne: {
				filter: { track_id: track_obj.id },
				update: { $set: this.createTrackModel(track_obj) },
				upsert: true
			}
		};
	}
	
	/**
	 * Converts Spotify API object to Album model
	 * @param {Object} album_obj - Album object from Spotify API
	 * @param {string} album_obj.album_type - Album type as defined by Spotify API
	 * @param {Object[]} album_obj.artists - Array of Artist objects from Spotify API
	 * @param {Object[]} album_obj.images - Array of Image objects from Spotify API
	 * @param {string} album_obj.name - Album name
	 * @param {string} album_obj.release_date - Album release date
	 * @param {string} album_obj.release_date_precision - Album release date precision as defined by Spotify API
	 * @returns {Object} - Album model for Mongo database
	 */
  createAlbumModel({ album_type, artists, images, name, release_date, release_date_precision }) {
    // 
    return {
      album_type,
      images,
      name,
      release_date,
      release_date_precision,
      artist_ids: artists.map(({ id }) => id)
    };
  }

	/**
	 * Converts Spotify API object to Artist model
	 * @param {Object} artist_obj - Artist object from Spotify API
	 * @param {string[]} artist_obj.genres - Array of genre names
	 * @param {Object[]} artist_obj.images - Array of Image objects from Spotify API
	 * @param {string} artist_obj.name - Artist name
	 * @returns {Object} - Artist model for Mongo database
	 */
  createArtistModel({ genres, images, name }) {
    return {
      genres,
      images,
      name
    };
  }

	/**
	 * Ensures Spotify API object conforms to database Image model
	 * @param {Object} image_obj - Image object from Spotify API
	 * @param {string} image_obj.url - Image URL
	 * @param {number} image_obj.height - Image height in pixels
	 * @param {number} image_obj.width - Image width in pixels
	 * @returns {Object} - Image model for Mongo database
	 */
	createImageModel({ url, height, width }) {
		return { url, height, width };
	}

	/**
	 * Converts Spotify API object to Track model
	 * @param {Object} track_obj - Track object from Spotify API
	 * @param {Object} track_obj.album - Album object from Spotify API
	 * @param {Object[]} track_obj.artists - Array of Artist objects from Spotify API
	 * @param {number} track_obj.duration_ms - Track duration in milliseconds
	 * @param {string} track_obj.name - Track name
	 * @param {number} track_obj.popularity - Track popularity as defined by Spotify API
	 * @param {string} track_obj.preview_url - Track audio preview URL
	 * @returns {Object} - Track model for Mongo database
	 */
  createTrackModel({ album, artists, duration_ms, name, popularity, preview_url }) {
    // Convert Spotify API object to Track model
    return {
			duration_ms,
      name,
			popularity,
      preview_url,
      album_id: album.id,
      artist_ids: artists.map(({ id }) => id)
    };
  }

	/**
	 * Returns Mongo findOne query for given user
	 * @param {string} user_id - Spotify user ID
	 * @returns {mongoose.Query<mongoose.Document>} - Mongo findOne query for User collection
	 */
	getUserQuery(user_id) {
		return User.findOne({ user_id: user_id });
	}

	/**
	 * Adds new recommended tracks to User document
	 * @param {number} artist_offset - Updated offset of user's top artists array used in recommendation seeds
	 * @param {number} track_offset - Updated offset of user's top tracks array used in recommendation seeds
	 * @param {string[]} rec_ids - Array of recommended Spotify track IDs for user
	 * @param {mongoose.Document} user_doc - User document from Mongo database
	 * @returns {Promise<mongoose.Document>} - Promise for updated User document
	 */
  async addRecommendations(artist_offset, track_offset, rec_ids, user_doc) {
    // Update seed-determining offsets
    user_doc.rec_seed_artist_offset = artist_offset;
    user_doc.rec_seed_track_offset = track_offset;

    // Add new recommended tracks that user has not yet acted upon
    user_doc.recommended_and_fresh_tracks = rec_ids.reduce((map, rec_id) => {
        map.set(rec_id, '');
        return map;
      }, user_doc.recommended_and_fresh_tracks);

		return user_doc.save();
	}

	/**
	 * Creates or updates Album documents in database
	 * @param {Object[]} albums - Array of Album objects from Spotify API
	 * @return {Promise<BulkWriteOpResult>} - Promise for Mongo bulk write operation result
	 */
	async createOrUpdateAlbums(albums) {
		return Album.bulkWrite(albums.map(album => this.constructAlbumUpdateOperation(album)));
	}

	/**
	 * Creates or updates Artist documents in database
	 * @param {Object[]} ranked_artists - Array of Artist objects from Spotify API, sorted by user top artist rank
	 * @param {Object[]} unranked_artists - Array of Artist objects from Spotify API, not in user's top artists
	 * @param {string} listener_id - Spotify user ID
	 * @return {Promise<BulkWriteOpResult>} - Promise for Mongo bulk write operation result
	 */
	async createOrUpdateArtists(ranked_artists, unranked_artists, listener_id) {
		// Update existing Artist documents, otherwise create new documents
		const ranked_ops = ranked_artists.map((artist, rank) => this.constructArtistUpdateOperation(artist, listener_id, rank));
		const unranked_ops = unranked_artists.map(artist => this.constructArtistUpdateOperation(artist));
		const update_ops = ranked_ops.concat(unranked_ops);
		return Artist.bulkWrite(update_ops);
	}

	/**
	 * Creates or updates Genre documents associated with a user's top genres
	 * @param {Map<string, number>} genre_counts - Map of genre names to counts summed across user's top artists or tracks
	 * @param {string} listener_id - Spotify user ID
	 * @return {Promise<BulkWriteOpResult>} - Promise for Mongo bulk write operation result
	 */
	async createOrUpdateGenreCounts(genre_counts, listener_id) {
		// Find all genre documents with listener_id
		const genres = await Genre
			.find({ [`listener_id_to_count.${listener_id}`]: { $exists: true } })
			.exec();

		// Determine genres in genre_counts that are not in database
		const db_genres = new Set(genres.map(genre => genre.name));
		const all_genres = [...db_genres, ...genre_counts.keys()];

		// Update listener_id_to_count for each genre
		const update_command = (genre) => {
			if (genre_counts.has(genre)) {
				return { $set: { [`listener_id_to_count.${listener_id}`]: genre_counts.get(genre) } };
			} else {
				return { $unset: { [`listener_id_to_count.${listener_id}`]: '' } };
			}
		}

		// Return promise for all genre document updates
		return Genre.bulkWrite(all_genres.map(genre => ({
			updateOne: {
				filter: { name: genre },
				update: update_command(genre),
				upsert: true
			}
		})));
	}

	/**
	 * Creates or updates Match document in database
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} match_id - Spotify user ID of potential match
	 * @param {number} match_score - Match score between logged in user and potential match
	 * @param {string[]} top_shared_artist_ids - Array of Spotify artist IDs shared between user and match
	 * @param {string[]} top_shared_genres - Array of genre names shared between user and match
	 * @param {string[]} top_shared_track_ids - Array of Spotify track IDs shared between user and match
	 * @returns {Promise<mongoose.Document>} - Promise for updated Match document
	 */
	async createOrUpdateMatch(user_id, match_id, match_score, top_shared_artist_ids, top_shared_genres, top_shared_track_ids) {
		// check if match exists
		return Match.findOneAndUpdate(
			{ $or: [{ user_a_id: user_id, user_b_id: match_id }, { user_a_id: match_id, user_b_id: user_id }] },
			{
        user_a_id: user_id,
        user_b_id: match_id,
				match_score: match_score,
				top_shared_artist_ids: top_shared_artist_ids,
				top_shared_genres: top_shared_genres,
				top_shared_track_ids: top_shared_track_ids
			},
			{ new: true, upsert: true }
		).exec();
	}

	/**
	 * Creates or updates Track documents in database
	 * @param {Object[]} tracks - Array of Track objects from Spotify API
	 * @return {Promise<BulkWriteOpResult>} - Promise for Mongo bulk write operation result
	 */
	async createOrUpdateTracks(tracks) {
		// Update existing Track documents, otherwise create new documents
		return Track.bulkWrite(tracks.map(track => this.constructTrackUpdateOperation(track)));
	}

	/**
	 * Creates or updates Track documents and associated Album and Artist documents in database
	 * @param {Object[]} tracks - Array of Track objects from Spotify API
	 * @returns {Promise<BulkWriteOpResult[]>} - Promise for Mongo bulk write operation results
	 */
	async createOrUpdateTracksWithAlbumAndArtists(tracks) {
		// Update existing Track documents, otherwise create new documents
		const updated_tracks = this.createOrUpdateTracks(tracks);

    // Extract albums and artists from tracks, then create/update respective documents
    const albums = tracks.map(({ album }) => album);
    const updated_albums = this.createOrUpdateAlbums(albums);
    const artists = tracks.flatMap(({ artists }) => artists);
    const updated_artists = this.createOrUpdateArtists([], artists, null);

    return Promise.all([updated_albums, updated_artists, updated_tracks]);
  }

	/**
	 * Creates or updates User document in database with genre counts, top artists, and top tracks
	 * @param {Map<string, number>} genre_counts - Map of genre names to counts summed across user's top artists or tracks
	 * @param {string[]} top_artist_ids - Array of Spotify artist IDs for user's top artists
	 * @param {string[]} top_track_ids - Array of Spotify track IDs for user's top tracks
	 * @param {Object} user_obj - User object from Spotify API
	 * @returns {Promise<mongoose.Document>} - Promise for updated User document
	 */
  async createOrUpdateUser(genre_counts, top_artist_ids, top_track_ids, user_obj) {
    // Update existing User document, otherwise create new document
    // sum the values of the genre_counts map
    const total_genre_count = Array.from(genre_counts.values()).reduce((a, b) => a + b, 0);
    const { id, display_name } = user_obj;
    const images = user_obj.images ? user_obj.images.map(this.createImageModel) : [];

    return User.findOneAndUpdate(
      { user_id: id },
      {
        display_name,
        genre_counts,
        images,
        top_artist_ids,
        top_track_ids,
        total_genre_count
      },
      { new: true, upsert: true }
    ).exec();
  }

	/**
	 * Marks a potential profile match as dismissed in User document
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} match_id - Spotify user ID of potential match
	 * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
	 */
	async dismissMatch(user_id, match_id) {
		return User.updateOne(
			{ user_id: user_id },
			{ $set: { [`matched_user_to_outcome.${match_id}`]: 'dismissed' } }
		).exec();
	}

	/**
	 * Marks a recommended track as dismissed in User document
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} rec_id - Spotify track ID of recommended track
	 * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
	 */
	async dismissRecommendation(user_id, rec_id) {
		return User.updateOne(
			{ user_id: user_id },
			{
				$set: { [`recommended_track_to_outcome.${rec_id}`]: 'dismissed' },
				$unset: { [`recommended_and_fresh_tracks.${rec_id}`]: '' }
			}
		).exec();
	}

	/**
	 * Marks a potential profile match as liked in User document
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} match_id - Spotify user ID of potential match
	 * @returns {Promise<mongoose.UpdateWriteOpResult>} - Promise for Mongo update operation result
	 */
	async likeMatch(user_id, match_id) {
		// adds match_id to matched_and_liked_user_ids in user document
		await User.updateOne(
			{ user_id: user_id },
			{ $set: { [`matched_user_to_outcome.${match_id}`]: 'liked' } }
		).exec();
	}

	/**
	 * Adds potential profile matches to User document
	 * @param {string[]} match_ids - Array of Spotify user IDs for potential matches
	 * @param {mongoose.Document} user_doc - User document from Mongo database
	 * @returns {Promise<mongoose.Document>} - Promise for updated User document
	 */
	async addPotentialMatches(match_ids, user_doc) {
		// Add new potential matches that user has not yet acted upon
		user_doc.matched_user_to_outcome = match_ids.reduce((map, match_id) => {
			map.set(match_id, 'none');
			return map;
		}, user_doc.matched_user_to_outcome);

		return user_doc.save();
	}

	/**
	 * Marks a recommended track as liked in User document
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} rec_id - Spotify track ID of recommended track
	 * @returns {Promise<mongoose.Document>} - Promise for updated User document
	 */
	async likeRecommendation(user_id, rec_id) {
		return User.findOneAndUpdate(
			{ user_id: user_id },
			{
				$set: { [`recommended_track_to_outcome.${rec_id}`]: 'liked' },
				$unset: { [`recommended_and_fresh_tracks.${rec_id}`]: '' }
			},
			{ fields: { _id: 0, recommended_tracks_playlist_id: 1 } }
		).lean().exec();
	}

	async getAlbum(album_id) {
		return Album.findOne({ album_id: album_id }).exec();
	}

	/**
	 * Returns objects for matching Album documents in database
	 * @param {string[]} album_ids - Array of Spotify album IDs
	 * @returns {Promise<Object[]>} - Promise for array of Album objects
	 */
	async getAlbums(album_ids) {
		return Album.find(
			{ album_id: { $in: album_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

	async getArtist(artist_id) {
		return Artist.findOne({ artist_id: artist_id }).exec();
	}

	/**
	 * Returns objects for matching Artist documents in database
	 * @param {string[]} artist_ids - Array of Spotify artist IDs
	 * @returns {Promise<Object[]>} - Promise for array of Artist objects
	 */
	async getArtists(artist_ids) {
		return Artist.find(
			{ artist_id: { $in: artist_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, listener_id_to_rank: 0 }
		).lean().exec();
	}

	/**
	 * Returns objects for matching tracks in database, including associated albums and artists
	 * @param {string[]} track_ids - Array of Spotify track IDs
	 * @returns 
	 */
	async getFullTracks(track_ids) {
		// Fetch track objects and associated album and artist objects from database
		const [albums, artists, tracks] = await this.getTracksWithAlbumAndArtists(track_ids)
			.catch(console.error);

		if (!albums || !artists || !tracks) {
			return Promise.reject('Failed to fetch albums, artists, and/or tracks from database');
		}

		// Map each track to its associated album and artists
		const albums_by_id = albums.reduce((map, album) => {
			map.set(album.album_id, album);
			return map;
		}, new Map());

		const artists_by_id = artists.reduce((map, artist) => {
			map.set(artist.artist_id, artist);
			return map;
		}, new Map());

		tracks.forEach(track => {
			track.album = albums_by_id.get(track.album_id);
			track.artists = track.artist_ids.map(artist_id => artists_by_id.get(artist_id));
			delete track.album_id;
			delete track.artist_ids;
		});

		return tracks;
	}

	/**
	 * Returns objects for matching Track documents in database
	 * @param {string[]} track_ids - Array of Spotify track IDs
	 * @returns {Promise<Object[]>} - Promise for array of Track objects
	 */
	async getTracks(track_ids) {
		return Track.find(
			{ track_id: { $in: track_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

	/**
	 * Returns nested array of matching Track objects, along with associated Album and Artist objects in database
	 * @param {string[]} track_ids - Array of Spotify track IDs
	 * @returns {Promise<[Object[], Object[], Object[]]>} - Promise for nested array of Track, Album, and Artist objects
	 */
	async getTracksWithAlbumAndArtists(track_ids) {
		// Fetch track objects from database
		const tracks = await this.getTracks(track_ids).catch(console.error);

		if (!tracks) {
			return Promise.reject('Failed to fetch tracks from database');
		}

		// Extract album and artist ids associated with each track
		const album_ids = tracks.map(({ album_id }) => album_id);
		const artist_ids = tracks.flatMap(({ artist_ids }) => artist_ids);

		// Fetch album and artist objects from database
		const albums_req = this.getAlbums(album_ids);
		const artists_req = this.getArtists(artist_ids);
		return Promise.all([albums_req, artists_req, tracks]);
	}

	/**
	 * Returns object for matching User document
	 * @param {string} user_id - Spotify user ID
	 * @returns {Promise<Object>} - Promise for User object
	 */
	async getUser(user_id) {
		return this.getUserQuery(user_id).lean().exec();
	}

	/**
	 * Returns objects for matching User documents in database
	 * @param {string[]} user_ids - Array of Spotify user IDs
	 * @returns {Promise<Object[]>} - Promise for array of User objects
	 */
	async getUsers(user_ids) {
		return User.find(
			{ user_id: { $in: user_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

	/**
	 * Returns matching User document in database
	 * @param {string} user_id - Spotify user ID
	 * @returns {Promise<mongoose.Document>} - Promise for User document
	 */
	async getUserDocument(user_id) {
		return this.getUserQuery(user_id).exec();
	}

	/**
	 * Returns objects with display name, images, and recommended tracks for matching users in database
	 * @param {string[]} user_ids - Array of Spotify user IDs
	 * @returns {Promise<Object[]>} - Promise for array of User objects with limited profile info
	 */
	async getBasicUserProfiles(user_ids) {
		return User.find({ user_id: { $in: user_ids } })
			.select({
				_id: 0,
				display_name: 1,
				images: 1,
				recommended_tracks_playlist_id: 1,
				user_id: 1
			})
			.lean()
			.exec();
	}

	/**
	 * Returns object with fields needed for displaying a given user's profile
	 * @param {string} user_id - Spotify user ID
	 * @returns {Promise<Object>} - Promise for user profile object
	 */
	async getUserProfile(user_id) {
		return this.getUserQuery(user_id)
			.select({
				_id: 0,
				display_name: 1,
				images: 1,
				top_artist_ids: 1,
				top_track_ids: 1,
				user_id: 1,
				matched_user_to_outcome: 1,
				genre_counts: 1,
				recommended_and_fresh_tracks: 1,
				recommended_tracks_playlist_id: 1,
				recommended_track_to_outcome: 1,
			})
			.lean()
			.exec();
	}

	/**
	 * Returns matched_user_to_outcome field containing potential matches for user
	 * @param {string} user_id - Spotify user ID
	 * @returns Promise<mongoose.Document> - Promise for User document with matched_user_to_outcome field
	 */
	async getPotentialMatches(user_id) {
		return User.findOne({ user_id: user_id }, 'matched_user_to_outcome -_id').exec();
	}

	/**
	 * Returns Match document for given user and match ids, if it exists
	 * @param {string} user_id - Spotify user ID of logged in user
	 * @param {string} match_id - Spotify user ID of potential match
	 * @returns {Promise<mongoose.Document>} - Promise for Match document
	 */
	async getMatch(user_id, match_id) {
		return Match.findOne({ $or: [{ user_a_id: user_id, user_b_id: match_id }, { user_a_id: match_id, user_b_id: user_id }] }).exec();
	}
	
	/**
	 * Returns matches field containing Match documents for given user
	 * @param {string} user_id - Spotify user ID
	 * @returns {Promise<mongoose.Document>} - Promise for User document with matches field
	 */
	async getMatches(user_id) {
		return User.findOne({ user_id: user_id }, 'matches -_id').exec();
	}

	/**
	 * Returns all User documents in database
	 * @returns {Promise<mongoose.Document[]>} - Promise for array of User documents
	 */
	async getAllUsers() {
		return User.find().exec();
	}
}

module.exports = Database;
