import React, {useState, useEffect} from 'react';
import SongCard from '../components/songCard'
import ProfileCard from '../components/profileCard'
import { Box, Typography, Divider, Avatar, Button, LinearProgress } from '@mui/material';
import { useParams } from 'react-router-dom';

function OtherUserProfile() {
    const { userId } = useParams();
/*     // TODO fetch user data
    const [userProfile, setUserProfile] = useState(null);
  
    useEffect(() => {
      // Fetch user profile from an API or select from global state
      fetchUserProfile(userId).then(data => {
        setUserProfile(data);
      });
    }, [userId]);
  
    if (!userProfile) {
      return <div>Loading...</div>;
    } */
  // TODO replace placeholders with actual data
    const userProfile = {
        id: userId
    }
    const matchedSongInfo = [
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"},
        {name: "Song Name", artist: "Artist Name"}
    ]
    const topArtistsInfo = [
        {name: "Taylor Swift", id: 13},
    ]
    const matchPercentage = 75;
    const tags = ["pop", "alternative", "r&b", "rap", "indie"]

    return (
        <Box sx={{bgcolor: 'background.primary', minHeight: '100vh', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center',}}>
            <Box sx={{display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%', justifyContent: 'center'}}>
                <Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5,}} />
                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '100%', gap: 1}}>
                    <Box sx={{display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center'}}>
                        <Typography variant="h2" sx={{ color: 'text.primary', mb: 3}}>
                            {userProfile.id}
                        </Typography>
                        <Button sx={{bgcolor: 'primary.main', color:'text.primary'}}> Spotify Profile </Button>
                    </Box>
                    <AnimatedMatchPercentage targetValue={matchPercentage}/>
                    <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center'}}>
                        <Typography variant="h5" sx={{ color: 'text.primary'}}>
                            Tags
                        </Typography>
                        {tags.map((tag, i) => <ProfileTag key={i} tagName={tag}/>)}
                    </Box>
                </Box>
            </Box>
            <Box sx={{display: 'flex', flexDirection:'row', gap: 5, justifyContent: 'center',}}>
                <SongCard cardTitle="Top Songs" songInfo={matchedSongInfo}/>
                <Divider orientation="vertical" flexItem />
                <ProfileCard cardTitle="Top Artists" profileInfo={topArtistsInfo}/>
            </Box>
        </Box>
    );
}

export default OtherUserProfile;

function ProfileTag({ tagName }) {
    return (
        <Box sx={{bgcolor: 'background.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, p: 1}}>
            <Typography variant="body1">
                {tagName}
            </Typography>
        </Box>
    );
}

function AnimatedMatchPercentage({ targetValue }) {
    const [progress, setProgress] = useState(0);
  
    useEffect(() => {
      const calculateIncrement = (value) => {
        if (value < targetValue) {
          const diff = targetValue - value;
          return Math.min(diff / 10, targetValue); // adjust for quickness
        }
        return 0;
      };
  
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          const increment = calculateIncrement(prevProgress);
          const nextProgress = prevProgress + increment;
          if (nextProgress >= targetValue) {
            clearInterval(timer);
            return targetValue;
          }
          return nextProgress;
        });
      }, 50); // adjust for faster or slower progress
  
      return () => {
        clearInterval(timer);
      };
    }, [targetValue]);
  
    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', width: '100%' }}>
            <LinearProgress value={progress} variant="determinate" sx={{ width: '75%', height: 15, borderRadius: 1, '& .MuiLinearProgress-bar': { backgroundImage: theme => `linear-gradient(to right, ${theme.palette.primary.complementary}, 70%, ${theme.palette.primary.main})` }}} />
            <Typography variant="h5" sx={{ color: 'text.primary'}}> {Math.round(progress)}% Match</Typography>
        </Box>
    );
  }