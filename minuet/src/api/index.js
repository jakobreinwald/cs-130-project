import axios from 'axios';

const url = 'http://localhost:3001';
const spotify_url = 'https://api.spotify.com/v1';

export const updateUserProfile = (token) => axios.post(`${url}/users`, {}, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
export const getUserProfile = (id) => axios.get(`${url}/users/${id}/profile`);
export const getUserRecs = (token, id) => axios.get(`${url}/users/${id}/recs`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
export const getRecommendedTracks = (token, ids) => axios.get(`${spotify_url}/tracks?ids=${ids.join(',')}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
export const postNewSongDecision = (token, user_id, id, action) => axios.post(`${url}/users/${user_id}/recs/${id}?action=${action}`, {}, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
export const getPlaylist = (token, id) => axios.get(`${spotify_url}/playlists/${id}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});

export const getUserMatches = (id) => axios.post(`${url}/users/${id}/generate_potential_matches`, {}, {});
export const likeMatch = (id, match_id) => axios.post(`${url}/users/${id}/likeMatch/${match_id}`, {}, {});
export const dismissMatch = (id, match_id) => axios.post(`${url}/users/${id}/dismissMatch/${match_id}`, {}, {});
export const getMatchScore = (id, match_id) => axios.get(`${url}/users/${id}/calculateMatchScore/${match_id}`, {}, {})