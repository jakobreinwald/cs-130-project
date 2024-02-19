import './App.css';
import NavBar from './components/navbar';
import { Routes, Route } from 'react-router-dom';
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';
import LandingPage from './pages/landingPage';

const isLoggedIn = true; //todo based on whether logged in or not

function App() {
  return (
    <div>
      { isLoggedIn ? <NavBar /> : null }
      <Routes>
        <Route path='/' element={isLoggedIn ? <UserProfile /> : <LandingPage />} />
        <Route path='/song-finder' element={<SongFinder />} />
        <Route path='/profile-finder' element={<ProfileFinder />} />
      </Routes>
    </div>
  );
}

export default App;
