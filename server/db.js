// Dependencies
const { Album, Artist, Genre, Match, Track, User } = require('./models');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

class Database {
	constructor() {
		const connection = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.${process.env.MONGO_HOST}/?retryWrites=true&w=majority`;
		mongoose.connect(connection)
			.then(() => console.log('Connected to Minuet database'))
			.catch(console.error);
	}

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

  createAlbumModel({ album_type, artists, images, name, release_date, release_date_precision }) {
    // Convert Spotify API object to Album model
    return {
      album_type,
      images,
      name,
      release_date,
      release_date_precision,
      artist_ids: artists.map(({ id }) => id)
    };
  }

  createArtistModel({ genres, images, name }) {
    // Convert Spotify API object to Artist model
    return {
      genres,
      images,
      name
    };
  }

	createImageModel({ url, height, width }) {
		// Ensure API response conforms to underlying database model
		return { url, height, width };
	}

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

	getAlbumQuery(album_id) {
		return Album.findOne({ album_id: album_id });
	}

	getArtistQuery(artist_id) {
		return Artist.findOne({ artist_id: artist_id });
	}

	getGenreQuery(name) {
		return Genre.findOne({ name: name });
	}

	getUserQuery(user_id) {
		return User.findOne({ user_id: user_id });
	}

	getTrackQuery(track_id) {
		return Track.findOne({ track_id: track_id });
	}

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

	async createOrUpdateAlbum(album_obj) {
		// Update existing Album document, otherwise create new document
		return Album.findOneAndUpdate(
			{ album_id: album_obj.id },
			this.createAlbumModel(album_obj),
			{ new: true, upsert: true }
		).exec();
	}

	async createOrUpdateAlbums(albums) {
		// Update existing Album documents, otherwise create new documents
		return Album.bulkWrite(albums.map(album => this.constructAlbumUpdateOperation(album)));
	}

	async createOrUpdateArtist(artist_obj) {
		// Update existing Artist document, otherwise create new document
		return Artist.findOneAndUpdate(
			{ artist_id: artist_obj.id },
			this.createArtistModel(artist_obj),
			{ new: true, upsert: true }
		).exec();
	}

	async createOrUpdateArtist(artist_obj, listener_id, rank_for_listener) {
		// Update existing Artist document, otherwise create new document
		return Artist.findOneAndUpdate(
			{ artist_id: artist_obj.id },
			{
				...(this.createArtistModel(artist_obj)),
				[`listener_id_to_rank.${listener_id}`]: rank_for_listener
			},
			{ new: true, upsert: true }
		).exec();
	}

	async createOrUpdateArtists(ranked_artists, unranked_artists, listener_id) {
		// Update existing Artist documents, otherwise create new documents
		const ranked_ops = ranked_artists.map((artist, rank) => this.constructArtistUpdateOperation(artist, listener_id, rank));
		const unranked_ops = unranked_artists.map(artist => this.constructArtistUpdateOperation(artist));
		const update_ops = ranked_ops.concat(unranked_ops);
		return Artist.bulkWrite(update_ops);
	}

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

	async createOrUpdateTrack(track_obj) {
		// Update existing Track document, otherwise create new document
		return Track.findOneAndUpdate(
			{ track_id: track_obj.id },
			this.createTrackModel(track_obj),
			{ new: true, upsert: true }
		).exec();
	}

	async createOrUpdateTracks(tracks) {
		// Update existing Track documents, otherwise create new documents
		return Track.bulkWrite(tracks.map(track => this.constructTrackUpdateOperation(track)));
	}

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

	async dismissMatch(user_id, match_id) {
		// TODO: increment match offset in user document
		return User.updateOne(
			{ user_id: user_id },
			{ $set: { [`matched_user_to_outcome.${match_id}`]: 'dismissed' } }
		).exec();
	}

	async dismissRecommendation(user_id, rec_id) {
		return User.updateOne(
			{ user_id: user_id },
			{
				$set: { [`recommended_track_to_outcome.${rec_id}`]: 'dismissed' },
				$unset: { [`recommended_and_fresh_tracks.${rec_id}`]: '' }
			}
		).exec();
	}

	async likeMatch(user_id, match_id) {
		// adds match_id to matched_and_liked_user_ids in user document
		await User.updateOne(
			{ user_id: user_id },
			{ $set: { [`matched_user_to_outcome.${match_id}`]: 'liked' } }
		).exec();
	}

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

	async addPotentialMatch(user_id, match_id) {

		return User.updateOne(
			{ user_id: user_id },
			{ $set: { [`matched_user_to_outcome.${match_id}`]: 'none' } }
		).exec();
	}

	async addPotentialMatches(match_ids, user_doc) {
		// Add new potential matches that user has not yet acted upon
		user_doc.matched_user_to_outcome = match_ids.reduce((map, match_id) => {
			map.set(match_id, 'none');
			return map;
		}, user_doc.matched_user_to_outcome);

		return user_doc.save();
	}

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

	async getAlbums(album_ids) {
		return Album.find(
			{ album_id: { $in: album_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

	async getArtist(artist_id) {
		return Artist.findOne({ artist_id: artist_id }).exec();
	}

	async getArtists(artist_ids) {
		return Artist.find(
			{ artist_id: { $in: artist_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, listener_id_to_rank: 0 }
		).lean().exec();
	}

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

	async getGenre(name) {
		return Genre.findOne({ name: name }).exec();
	}

	async getTrack(track_id) {
		return Track.findOne({ track_id: track_id }).exec();
	}

	async getTracks(track_ids) {
		return Track.find(
			{ track_id: { $in: track_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

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

	async getUser(user_id) {
		return this.getUserQuery(user_id).lean().exec();
	}

	async getUsers(user_ids) {
		return User.find(
			{ user_id: { $in: user_ids } },
			{ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
		).lean().exec();
	}

	async getUserDocument(user_id) {
		return this.getUserQuery(user_id).exec();
	}

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

	async getPotentialMatches(user_id) {
		return User.findOne({ user_id: user_id }, 'matched_user_to_outcome -_id').exec();
	}

	async getMatch(user_id, match_id) {
		return Match.findOne({ $or: [{ user_a_id: user_id, user_b_id: match_id }, { user_a_id: match_id, user_b_id: user_id }] }).exec();
	}

	async getMatches(user_id) {
		return User.findOne({ user_id: user_id }, 'matches -_id').exec();
	}

	// TODO: delete temporary fix?
	async getAllUsers() {
		return User.find().exec();
	}
}

module.exports = Database;
