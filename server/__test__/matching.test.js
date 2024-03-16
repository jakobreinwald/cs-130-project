const Matching = require('../matching.js');
const Match = require('../models/match.js');
const User = require('../models/user.js');
const Artist = require('../models/artist.js');
const DB = require('../db.js');

const db = new DB();
const matching = new Matching(db);

let params = {}

beforeEach(async () => {
	const user_matched_user_to_outcome = new Map();
	const match_matched_user_to_outcome = new Map();
	params = {
		user_id: Math.random().toString(36).slice(2, 7),
		match_id: Math.random().toString(36).slice(2, 7),
		user_matched_user_to_outcome: user_matched_user_to_outcome,
		match_matched_user_to_outcome: match_matched_user_to_outcome
	}
	user_matched_user_to_outcome.set(params.match_id, 'none');
	match_matched_user_to_outcome.set(params.user_id, 'liked');
	const user_obj = new User({
		user_id: params.user_id,
		matched_user_to_outcome: user_matched_user_to_outcome,
		top_shared_artist_ids: ['1', '2', '3'],
		top_artist_ids: ['1'],
		genre_counts:
		{
			'rock': 1,
			'pop': 2,
			'rap': 3,
		},
		total_genre_count: 6
	});

	params.match_user_obj = new User({
		user_id: params.match_id,
		matched_user_to_outcome: match_matched_user_to_outcome,
		top_shared_artist_ids: ['1', '2', '3'],
		top_artist_ids: ['1'],
		genre_counts:
		{
			'rock': 1,
			'pop': 2,
			'rap': 3
		},
		total_genre_count: 6
	})

	params.artist_obj = new Artist({
		artist_id: '1',
		artist_name: 'test_artist',
		artist_image: 'test_image'
	});

	await user_obj.save();
});

afterEach(async () => {
	await User.deleteMany({ $or: [{ user_id: params.user_id }, { user_id: params.match_id }] });
	await Match.deleteMany({
		$or: [
			{ user_a_id: params.user_id, user_b_id: params.match_id },
			{ user_a_id: params.match_id, user_b_id: params.user_id }
		]
	});
	await Artist.deleteMany({ artist_id: '1' });
});

// Test Dismiss match
test('Dismiss match', async () => {
	await matching.dismissMatch(params.user_id, params.match_id);
	const res = await matching.getPotentialMatches(params.user_id);
	const outcome = res.matched_user_to_outcome.get(params.match_id);
	expect(outcome).toBe('dismissed');
});

// Test Like match
test('Like match', async () => {
	await params.match_user_obj.save();
	await params.artist_obj.save();
	await matching.likeMatch(params.user_id, params.match_id);
	const res = await matching.getPotentialMatches(params.user_id);
	const outcome = res.matched_user_to_outcome.get(params.match_id);
	expect(outcome).toBe('liked');

	const match_obj = await Match.findOne({
		$or: [
			{ user_a_id: params.user_id, user_b_id: params.match_id },
			{ user_a_id: params.match_id, user_b_id: params.user_id }
		]
	});
	expect(match_obj).not.toBeNull();
});

// Test calculate match score
test('Calculate match score', async () => {
	await params.match_user_obj.save();
	await params.artist_obj.save();
	await matching.likeMatch(params.user_id, params.match_id);
	const [match_score, user_obj, match_user_obj] = await matching.calculateMatchScore(params.user_id, params.match_id);
	expect(match_score).toBe(1);

	const [match_score2, user_obj2, match_user_obj2] = await matching.calculateMatchScore(params.match_id, params.user_id);
	expect(match_score2).toBe(1);
});

db.close();