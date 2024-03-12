// import './App.css';
import TokenCall from './TokenCall'
import NavBar from './components/navbar';
import { Routes, Route } from 'react-router-dom';
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';
import OtherUserProfile from './pages/otherUserProfile';
import LandingPage from './pages/landingPage';
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { getUserProfile, getRecommendedTracks, getPlaylist, updateUserProfile } from './api/index'

const theme = createTheme({
	palette: {
		mode: 'dark',
		primary: {
			main: '#21A4B6',
			complementary: '#FFBD80'
		},
		background: {
			primary: '#000000',
			secondary: '#282828',
		},
		text: {
			primary: '#ffffff',
			secondary: '#21A4B6',
		},
		swipeButton: {
			red: '#F66D6D',
			redHover: '#B44B4B',
			green: '#7AD17D',
			greenHover: '#4F8851',
		}
	},
	typography: {
		fontFamily: 'Poppins, Open Sans, sans-serif',
		h1: {
			fontFamily: 'Poppins, sans-serif',
			fontWeight: 300,
			fontSize: '128px',
		},
		h3: {
			fontFamily: 'Open Sans, sans-serif',
		},
		h4: {
			fontFamily: 'Open Sans, sans-serif',
		},
		h5: {
			fontFamily: 'Open Sans, sans-serif',
		},
		h6: {
			fontFamily: 'Open Sans, sans-serif',
		},
		p: {
			fontFamily: 'Open Sans, sans-serif',
		},
	},
});

function App() {
	const [token, setToken] = useState("");
	const [profile, setProfile] = useState(null);
	const [displayName, setDisplayName] = useState(null);
	const [userId, setUserId] = useState(null);

	async function getProfile() {
		const result = await fetch("https://api.spotify.com/v1/me", {
			method: "GET",
			headers: { "Authorization": "Bearer " + token },
		});
		const pairedProfile = await result.json();
		if (!("error" in pairedProfile)) {
			setDisplayName(pairedProfile.display_name);
			console.log("Paired Profile: ", pairedProfile.display_name)
			setProfile(pairedProfile);
			setUserId(pairedProfile.id);
			const dbProfile = await getUserProfile(pairedProfile.id);
			console.log("DB Profile: ", dbProfile.data);
			const userPlaylist = (await getPlaylist(token, dbProfile.data.recommended_tracks_playlist_id));
			const likedTracks = Object.entries(dbProfile.data.recommended_track_to_outcome)
				.filter(([key, value]) => value === 'liked')
				.map(([key]) => key)
			const recommendedTracks = likedTracks.length > 0
				? await getRecommendedTracks(token, likedTracks)
				: { data: { tracks: [] } };
			const matchedUsersLinks = dbProfile.data.matched_users
				.map(({ user_id }) => `/user/${user_id}`);

			const frontEndUser = { ...dbProfile.data, userPlaylist: userPlaylist.data, recommendedTracks: recommendedTracks.data.tracks, matchedUsersLinks };
			setProfile(frontEndUser);
			console.log("Profile: ", frontEndUser);
			return frontEndUser;
		}
		return pairedProfile;
	};

	if (!token) {
		let testToken = window.localStorage.getItem("access_token")
		if (testToken)
			setToken(testToken)
	}
	useEffect(() => {
		// console.log("hello", token)
		if (token) {
			const handler = async (token) => {
				await updateUserProfile(token);
			}
			handler(token);
			const dummyProfile = getProfile();
		}
	}, [token])

	return (
		<ThemeProvider theme={theme}>
			{token ? <NavBar removeToken={setToken} /> : null}
			<Routes>
				<Route path='/' element={token ? <UserProfile token={token} profile={profile} /> : <LandingPage />} />
				<Route path='/callback' element={token ? null : <TokenCall passToken={setToken} />} />
				<Route path='/song-finder' element={token ? <SongFinder token={token} userId={userId} displayName={displayName} /> : <LandingPage />} />
				<Route path='/profile-finder' element={token ? <ProfileFinder token={token} userId={userId}/> : <LandingPage />} />
				<Route path="/user/:userId" element={token ? <OtherUserProfile loggedInUserId={profile ? profile.user_id : null}/> : <LandingPage />} />
			</Routes>
		</ThemeProvider>
	);
}

export default App;