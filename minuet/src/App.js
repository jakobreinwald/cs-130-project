import './App.css';
import NavBar from './components/navbar';
import { Routes, Route } from 'react-router-dom';
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';

function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path='/' element={<UserProfile />} />
        <Route path='/song-finder' element={<SongFinder />} />
        <Route path='/profile-finder' element={<ProfileFinder />} />
      </Routes>
    </div>
  );
}

export default App;
