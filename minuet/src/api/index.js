
import axios from 'axios';
// Backend server URL
// @constant
const url = process.env.REACT_APP_BACKEND_URL;
// Spotify API URL
// @constant
const spotify_url = 'https://api.spotify.com/v1';

/** @module FrontendAPI **/
/**
 * Updates user profile in database
 * @member FrontendAPI
 * @function updateUserProfile
 * @param {string} token - User Token
 */
export const updateUserProfile = (token) => axios.post(`${url}/users`, {}, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
/**
 * Gets user profile in database
 * @member FrontendAPI
 * @function getUserProfile
 * @param {string} id - User id
 * @return {Object} Database user profile
 */
export const getUserProfile = (id) => axios.get(`${url}/users/${id}/profile`);
/**
 * Gets user recommendations
 * @member FrontendAPI
 * @function getUserRecs
 * @param {string} token - User token
 * @param {string} id - User id
 * @return {Object} Database user recommendations
 */
export const getUserRecs = (token, id) => axios.get(`${url}/users/${id}/recs`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
/**
 * Gets user tracks
 * @member FrontendAPI
 * @function getTracks
 * @param {string} token - User token
 * @param {string} ids - Track ids
 * @return {Object} Spotify tracks
 */
export const getTracks = (token, ids) => axios.get(`${spotify_url}/tracks?ids=${ids.join(',')}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
/**
 * Posts new song decision (like/dismiss)
 * @member FrontendAPI
 * @function postNewSongDecision
 * @param {string} token - User token
 * @param {string} id - User id
 * @param {string} rec_id - Recommendation id
 * @param {string} action - Action (like/dismiss)
 */
export const postNewSongDecision = (token, user_id, rec_id, action) => axios.post(`${url}/users/${user_id}/recs/${rec_id}?action=${action}`, {}, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
/**
 * Gets user playlist
 * @member FrontendAPI
 * @function getPlaylist
 * @param {string} token - User token
 * @param {string} id - Playlist id
 * @return {Object} Spotify Playlist
 */
export const getPlaylist = (token, id) => axios.get(`${spotify_url}/playlists/${id}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
/**
 * Gets user matches
 * @member FrontendAPI
 * @function getUserMatches
 * @param {string} id - User id
 * @return {Object} Database user matches
 */
export const getUserMatches = (id) => axios.post(`${url}/users/${id}/generate_potential_matches`, {}, {});
/**
 * Posts like match
 * @member FrontendAPI
 * @function likeMatch
 * @param {string} id - User id
 * @param {string} match_id - Matched user id
 */
export const likeMatch = (id, match_id) => axios.post(`${url}/users/${id}/likeMatch/${match_id}`, {}, {});
/**
 * Posts dismiss match
 * @member FrontendAPI
 * @function dismissMatch
 * @param {string} id - User id
 * @param {string} match_id - Matched user id 
 */
export const dismissMatch = (id, match_id) => axios.post(`${url}/users/${id}/dismissMatch/${match_id}`, {}, {});
/**
 * 
 * Gets match score
 * @member FrontendAPI
 * @function getMatchScore
 * @param {string} id - User id
 * @param {string} match_id - Matched user id
 * @return {int} Match Score
 */
export const getMatchScore = (id, match_id) => axios.get(`${url}/users/${id}/calculateMatchScore/${match_id}`, {}, {})