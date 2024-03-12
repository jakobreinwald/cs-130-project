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

	async function getProfile() {
		const result = await fetch("https://api.spotify.com/v1/me", {
			method: "GET",
			headers: { "Authorization": "Bearer " + token },
		});
		const pairedProfile = await result.json();
		if (!("error" in pairedProfile)) {
			setDisplayName(pairedProfile.display_name);
			setProfile(pairedProfile);
			const dbProfile = await getUserProfile(pairedProfile.display_name);
			const userPlaylist = (await getPlaylist(token, dbProfile.data.recommended_tracks_playlist_id));
			const recommendedTracks = await getRecommendedTracks(
				token,
				Object.entries(dbProfile.data.recommended_track_to_outcome)
					.filter(([key, value]) => value === 'liked')
					.map(([key]) => key)
			);
			const matchedUsersLinks = await Promise.all(
				Object.entries(dbProfile.data.matched_users)
					.filter(([key, value]) => value !== 'liked')
					.map(async ([key, value]) => {
						if (value.hasOwnProperty('recommended_tracks_playlist_id')) {
							const playlistData = await getPlaylist(token, value.recommended_tracks_playlist_id);
							return playlistData.data.external_urls.spotify;
						}
						return `https://open.spotify.com/user/${pairedProfile.display_name}`;
					})
			);
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
		console.log("hello", token)
		if (token) {
			const dummyProfile = getProfile();
			// updateUserProfile(token);

		}
	}, [token])

	return (
		<ThemeProvider theme={theme}>
			{token ? <NavBar removeToken={setToken} /> : null}
			<Routes>
				<Route path='/' element={token ? <UserProfile token={token} displayName={displayName} profile={profile} /> : <LandingPage />} />
				<Route path='/callback' element={token ? null : <TokenCall passToken={setToken} />} />
				<Route path='/song-finder' element={token ? <SongFinder token={token} displayName={displayName} /> : <LandingPage />} />
				<Route path='/profile-finder' element={token ? <ProfileFinder token={token} displayName={displayName} userId={profile ? profile.user_id : null}/> : <LandingPage />} />
				<Route path="/user/:userId" element={token ? <OtherUserProfile /> : <LandingPage />} />
			</Routes>
		</ThemeProvider>
	);
}

export default App;