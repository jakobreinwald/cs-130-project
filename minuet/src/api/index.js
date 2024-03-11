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
export const getUserMatches = (id) => axios.post(`${url}/users/${id}/generate_potential_matches`, {}, {});
export const getRecommendedTracks = (token, ids) => axios.get(`${spotify_url}/tracks/${'ids=' + ids.join(',')}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});
export const getPlaylist = (token, id) => axios.get(`${spotify_url}/playlists/${id}`, {
	headers: {
		"Authorization": 'Bearer ' + token,
	}
});

// export const fetchProfile = ()

// export const fetchUsers = () => axios.get(`${url}`);
// export const createPost = (newPost) => axios.post(url, newPost);
// export const updatePost = (id, updatedPost) => axios.patch(`${url}/${id}`, updatedPost);
// export const deletePost = (id) => axios.delete(`${url}/${id}`);
// export const likePost = (id) => axios.patch(`${url}/${id}/likePost`);

// export const getSubjects = () => axios.get(`${url}/subjects`);
// export const getClasses = (subjectId) => axios.get(`${url}/${subjectId}/classes`);
// export const getQuarters = (subjectId, classId) => axios.get(`${url}/${subjectId}/${classId}/quarters`);
// export const getSpecificPosts = (subjectId, classId, quarterId) => axios.get(`${url}/${subjectId}/${classId}/${quarterId}`);