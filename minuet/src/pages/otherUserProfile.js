import React, {useState, useEffect} from 'react';
import { Box, Typography, Divider, Avatar, Button, LinearProgress } from '@mui/material';
import { useParams} from 'react-router-dom';
import {getUserProfile, getMatchScore} from '../api/index'
import { Card, CardContent, Link } from '@mui/material';

const artist_url = 'https://open.spotify.com/artist/';
const track_url = 'https://open.spotify.com/track/';

function OtherUserProfile({ loggedInUserId }) {

    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [topArtists, setArtists] = useState([]);
    const [topTracks, setTracks] = useState([]);
    const [tags, setTags] = useState([]);
    const [matchScore, setMatchScore] = useState(0);
    
    const getProfile = async (id) => {
      const userProfile = await getUserProfile(id);
      if(userProfile){
        setProfile(userProfile.data);
        setArtists(userProfile.data.top_artists)
        setTracks(userProfile.data.top_tracks)
        let sortable = []
        for (let genre in userProfile.data.genre_counts){
          sortable.push([genre, userProfile.data.genre_counts[genre]]);
        }
        const topGenres = sortable.sort((a, b) => a[1] - b[1]).reverse().slice(0, 5);
        setTags(topGenres.map((a) => a[0]));
      }
    };

    const getScore = async (myId, id) => {
      const score = await getMatchScore(myId, id);
      setMatchScore(score.data.score);
    };

    useEffect(() => {
      if(userId && loggedInUserId){
        console.log(loggedInUserId);
        console.log(userId.replace(':', ''));
        getScore(loggedInUserId, userId.replace(':', ''))
      }
    }, [userId, loggedInUserId])

    useEffect(() => {
      getProfile(userId.replace(':', ''));
    }, [userId]);

    return (
        <Box sx={{p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center',}}>
            <Box sx={{display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%', justifyContent: 'center'}}>
                <Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5,}} src={profile ? profile.images[1].url : null} />
                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '100%', gap: 1}}>
                    <Box sx={{display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center'}}>
                        <Typography variant="h2" sx={{ color: 'text.primary', mb: 3}}>
                            {profile ? profile.display_name : null}
                        </Typography>
                        <Button sx={{bgcolor: 'primary.main', color:'text.primary', borderRadius: 5, padding: 1}} onClick={profile ? () => window.open(`https://open.spotify.com/user/${profile.user_id}`, '_blank') : null}> Spotify Profile</Button>
                    </Box>
                    <AnimatedMatchPercentage targetValue={matchScore*100}/>
                    <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center'}}>
                        <Typography variant="h5" sx={{ color: 'text.primary'}}>
                            Tags
                        </Typography>
                        {tags.map((tag, i) => <ProfileTag key={i} tagName={tag}/>)}
                    </Box>
                </Box>
            </Box>
            <Box sx={{display: 'flex', flexDirection:'row', gap: 5, justifyContent: 'center',}}>
                <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%', borderRadius: 5}}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align='center' fontWeight='bold'>
                        Top Songs
                    </Typography>
                    {profile ? topTracks.map((match, index) =>
                    <Link href={track_url.concat(match.track_id)} target="_blank" rel="noopener noreferrer" style={{ color:'white', textDecoration: 'none'}}>
                        <Box key={index} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, '&:hover': { bgcolor: 'primary.main'}, borderRadius: 2}}>
                            <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={match.album.images[1].url} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                                <Typography variant="body1">{match.name}</Typography>
                                <Typography variant="body2">{match.artists.map(obj => obj.name).join(', ')}</Typography>
                            </Box>
                        </Box>
                      </Link>) :
                    <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center'}}>
                        <Typography variant="body2">Nothing to see here yet!</Typography>
                    </Box>
                    }
                  </CardContent>
                </Card>
                <Divider orientation="vertical" flexItem />
                <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%', borderRadius: 5}}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align='center' fontWeight='bold'>
                        Top Artists
                    </Typography>
                    {topArtists.length !== 0 ? topArtists.map((match, index) =>
                        <Link href={artist_url.concat(match.artist_id)} target="_blank" rel="noopener noreferrer" style={{ color:'white', textDecoration: 'none'}}>
                            <Box key={index} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, '&:hover': { bgcolor: 'primary.main'}, borderRadius: 2}}>
                                <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={match.images[0].url} />
                                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                                    <Typography variant="body1">{match.name}</Typography>
                                </Box>
                            </Box>
                        </Link>
                    ) : 
                    <Box sx={{ display: 'flex', flexDirection: 'column', textAlign: 'center'}}>
                            <Typography variant="body2">Nothing to see here yet!</Typography>
                    </Box>
                    }
                  </CardContent>
                </Card>
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