// import './App.css';
import TokenCall from './TokenCall'
import NavBar from './components/navbar';
import { Routes, Route } from 'react-router-dom';
import TokenCall from './TokenCall'
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';
import OtherUserProfile from './pages/otherUserProfile';
import LandingPage from './pages/landingPage';
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { updateUserProfile } from './api/index'

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

const isLoggedIn = true; //todo based on whether logged in or not

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
		console.log("PAIRED PROFILE: ", pairedProfile);
		if (!("error" in pairedProfile)) {
			setDisplayName(pairedProfile.display_name);
			setProfile(pairedProfile);
		}
		return pairedProfile;
	};

	if (!token) {
		let testToken = window.localStorage.getItem("access_token")
		if (testToken)
			setToken(testToken)
	}
	useEffect(() => {
		if (token) {
			getProfile();
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
				<Route path='/profile-finder' element={token ? <ProfileFinder token={token} displayName={displayName} /> : <LandingPage />} />
				<Route path="/user/:userId" element={token ? <OtherUserProfile /> : <LandingPage />} />
			</Routes>
		</ThemeProvider>
	);
}

export default App;