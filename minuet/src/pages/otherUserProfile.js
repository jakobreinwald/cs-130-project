import React, {useState, useEffect} from 'react';
import SongCard from '../components/songCard'
import ProfileCard from '../components/profileCard'
import { Box, Typography, Divider, Avatar, Button, LinearProgress } from '@mui/material';
import { useParams} from 'react-router-dom';
import {getUserProfile, getMatchScore} from '../api/index'
import { Card, CardContent, Link } from '@mui/material';

const artist_url = 'https://open.spotify.com/artist/';
const track_url = 'https://open.spotify.com/track/';

function OtherUserProfile() {

    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [topArtists, setArtists] = useState([]);
    const [topTracks, setTracks] = useState([]);
    const [tags, setTags] = useState([]);
    const [matchScore, setMatchScore] = useState(0);
    const [myId, setMyId] = useState(null);
    const [token, setToken] = useState(null);

    async function getYourProfile(token) {
      const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token },
      });
      const pairedProfile = await result.json();
      if (!("error" in pairedProfile)) {
        setMyId(pairedProfile.id);
      }
    }
    
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
      const score = await getMatchScore(myId, id)
      setMatchScore(score.data.score);
    };

    useEffect(() => {
      let test_token = window.localStorage.getItem('access_token');
      if(test_token)
        setToken(test_token);
    }, [])

    useEffect(() => {
      if(token)
        getYourProfile(token);
    }, [token])

    useEffect(() => {
      getProfile(userId.replace(':', ''));
    }, [userId]);

    useEffect(() => {
      console.log(myId)
      if(userId && myId){
        getScore(myId, userId.replace(':', ''))
      }
    }, [userId, myId]);

    return (
        <Box sx={{p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center',}}>
            <Box sx={{display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%', justifyContent: 'center'}}>
                <Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5,}} src={profile ? profile.images[1].url : null} />
                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: '100%', gap: 1}}>
                    <Box sx={{display: 'flex', flexDirection: 'row', gap: 5, alignItems: 'center'}}>
                        <Typography variant="h2" sx={{ color: 'text.primary', mb: 3}}>
                            {profile ? profile.display_name : null}
                        </Typography>
                        <Button sx={{bgcolor: 'primary.main', color:'text.primary'}} onClick={profile ? () => window.open(`https://open.spotify.com/user/${profile.user_id}`, '_blank') : null}> Spotify Profile</Button>
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
                <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align='center'>
                      <b>Top Songs</b>
                    </Typography>
                    {profile ? topTracks.map((match, index) =>
                      <Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
                        <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={match.album.images[1].url} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                          <Link href={track_url.concat(match.track_id)} target="_blank" rel="noopener noreferrer">
                            <Typography variant="body1">{match.name}</Typography>
                          </Link>
                          <Link href={artist_url.concat(match.artists[0].artist_id)} target="_blank" rel="noopener noreferrer">
                            <Typography variant="body2">{match.artists.map(obj => obj.name).join(', ')}</Typography>
                          </Link>
                        </Box>
                      </Box>) : null}
                  </CardContent>
                </Card>
                <Divider orientation="vertical" flexItem />
                <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div" align='center'>
                      <b>Top Artists</b>
                    </Typography>
                    {topArtists ? topArtists.map((match, index) =>
                      <Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
                        <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={match.images[0].url} />
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                          <Link href={artist_url.concat(match.artist_id)} target="_blank" rel="noopener noreferrer">
                            <Typography variant="body1">{match.name}</Typography>
                          </Link>
                        </Box>
                      </Box>
                    ) : null}
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