// import './App.css';
import NavBar from './components/navbar';
import { Routes, Route } from 'react-router-dom';
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';
import OtherUserProfile from './pages/otherUserProfile';
import LandingPage from './pages/landingPage';
import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

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
    },
    typography: {
      fontFamily: 'Poppins, Open Sans, sans-serif',
      h4: {
        fontFamily: 'Open Sans, sans-serif',
      },
      h5: {
        fontFamily: 'Open Sans, sans-serif',
      },
      h6: {
        fontFamily: 'Open Sans, sans-serif',
      },
    },
  });

const isLoggedIn = true; //todo based on whether logged in or not

function App() {
  return (
    <ThemeProvider theme={theme}>
        { isLoggedIn ? <NavBar /> : null }
        <Routes>
            <Route path='/' element={isLoggedIn ? <UserProfile /> : <LandingPage />} />
            <Route path='/song-finder' element={isLoggedIn ? <SongFinder /> : <LandingPage />} />
            <Route path='/profile-finder' element={isLoggedIn ? <ProfileFinder /> : <LandingPage />} />
            <Route path="/user/:userId" element={isLoggedIn ? <OtherUserProfile /> : <LandingPage />} />
        </Routes>
    </ThemeProvider>
  );
}

export default App;
