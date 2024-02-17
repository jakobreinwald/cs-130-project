import './App.css';
import NavBar from './components/navbar';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProfileFinder from './pages/profileFinder';
import SongFinder from './pages/songFinder';
import UserProfile from './pages/userProfile';

function App() {
  return (
    // <div className="App">
    //   <NavBar />
    // </div>
    <div>
      {/* <div id='navigation'>
        <h1 id='headerTitle'>Joe Bruin</h1>
        <div>
          <Link to='/'>Minuet</Link>
          <Link to='/song-finder'>Song Finder</Link>
          <Link to='/profile-finder'>Experience</Link>
        </div>
      </div> */}
      <div id='content'>
        <Routes>
          <Route path='/' element={<UserProfile />} />
          <Route path='/song-finder' element={<SongFinder />} />
          <Route path='/profile-finder' element={<ProfileFinder />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
