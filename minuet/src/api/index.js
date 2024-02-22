import axios from 'axios';

const url = 'http://localhost:3001';

export const fetchUsers = () => axios.get(`${url}/users`);
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