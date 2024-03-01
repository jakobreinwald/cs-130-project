import React, {useState, useEffect} from 'react';
import SongCard from '../components/songCard'
import ProfileCard from '../components/profileCard'
import { Box, Typography, Divider, Avatar } from '@mui/material';

function UserProfile() {
  // TODO replace placeholders with actual data
    const username = "{username}";
    const newSongs = 5;
    const newProfiles = 3;
    const matchedSongInfo = [
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"}
    ]
    const matchedProfileInfo = [
        {name: "Katelyn", id: 0},
        {name: "Ryan", id: 1},
        {name: "Matt", id: 2},
    ]

    return (
        <Box sx={{bgcolor: 'background.primary', minHeight: '100vh', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center',}}>
            <Box sx={{display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%',}}>
                <Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5,}} />
                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center',}}>
                    <AnimatedGradientText text={`Hi, ${username}`}/>
                    <Typography variant="h4" sx={{ color: 'text.primary'}}>
                        You've discovered <b>{newSongs}</b> new songs and <b>{newProfiles}</b> new profiles! Keep on exploring :)
                    </Typography>
                </Box>
            </Box>
        <Box sx={{display: 'flex', flexDirection:'row', gap: 5, m: 5, justifyContent: 'center',}}>
            <SongCard cardTitle="Matched Songs" songInfo={matchedSongInfo}/>
            <Divider orientation="vertical" flexItem />
            <ProfileCard cardTitle="Matched Profiles" profileInfo={matchedProfileInfo}/>
        </Box>
        </Box>
    );
}

export default UserProfile;

function AnimatedGradientText( {text} ) {
    const [gradientPosition, setGradientPosition] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setGradientPosition((prev) => (prev + 0.5) % 200);
        }, 25); // adjust speed of movement
    
        return () => clearInterval(intervalId);
    }, []);
  
    return (
        <Typography variant="h2" sx={{
            mb: 3,
            background: (theme) => `linear-gradient(to right, ${theme.palette.primary.complementary}, ${theme.palette.primary.main}, ${theme.palette.primary.complementary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '200% 100%',
            backgroundPosition: `${gradientPosition}% center`,
            animation: 'none',
        }}>
            {text}
        </Typography>
    );
};