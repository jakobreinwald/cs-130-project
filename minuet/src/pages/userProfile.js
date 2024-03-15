import React, { useState, useEffect } from 'react';
import { Card, CardContent, Link } from '@mui/material';
import { Box, Typography, Divider, Avatar } from '@mui/material';

function UserProfile({ token, profile }) {
	const [matchedUsers, setMatchedUsers] = useState([]);
	const [newUsers, setNewUsers] = useState(0);
	const [matchedSongs, setMatchedSongs] = useState([]);
	const [newSongs, setNewSongs] = useState(0);

	useEffect(() => {
		if (profile !== null && profile.hasOwnProperty('recommendedTracks')) {
			console.log(profile.recommendedTracks);
			setMatchedSongs(profile.recommendedTracks);
			setNewSongs(profile.recommendedTracks.length);
		}
	}, [profile])

	useEffect(() => {
		if (profile !== null && profile.hasOwnProperty('matched_users') && profile.hasOwnProperty('matchedUsersLinks')) {
			setMatchedUsers(profile.matched_users.map((object, index) => ({ ...object, link: profile.matchedUsersLinks[index] })));
			setNewUsers(profile.matched_users.length);
		}
	}, [profile])

	return (
		<Box sx={{ bgcolor: 'background.primary', minHeight: '100vh', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', }}>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%', }}>
				<Link href={profile !== null ? `https://open.spotify.com/user/${profile.user_id}` : null} target="_blank" rel="noopener noreferrer">
					<Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5, }} src={profile !== null ? profile.images[1].url : null} />
				</Link>
				<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
					<AnimatedGradientText text={`Hi, ${profile !== null ? profile.display_name : null}`}/>
					<Typography variant="h4" sx={{ color: 'text.primary' }}>
						You've discovered <b>{newSongs}</b> new song(s) and <b>{newUsers}</b> new profile(s)! Keep on exploring :)
					</Typography>
				</Box>
			</Box>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 5, justifyContent: 'center', }}>
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%', borderRadius: 5}}>
					<CardContent>
                        {(profile !== null && profile.hasOwnProperty('userPlaylist')) ? 
                            <Link href={profile.userPlaylist.external_urls.spotify} target="_blank" rel="noopener noreferrer" sx={{color: 'white', textDecoration: 'none', '&:hover': {color: 'primary.main',},}}>
                                <Typography gutterBottom variant="h5" component="div" align='center' fontWeight='bold'>
                                    {profile.userPlaylist.name}
                                </Typography>
                            </Link> :
                            <Typography gutterBottom variant="h5" component="div" align='center' fontWeight='bold'>
                                Matched Songs
                            </Typography>
                        }
						{matchedSongs.length !== 0 ? matchedSongs.map(({ album, artists, name, external_urls }, index) =>
                            <Link href={external_urls.spotify} target="_blank" rel="noopener noreferrer" style={{ color:'white', textDecoration: 'none'}}>
                                <Box key={index} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, '&:hover': { bgcolor: 'primary.main'}, borderRadius: 2}}>
                                    <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={album.images[1].url} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                                        <Typography variant="body1">{name}</Typography>
                                        <Typography variant="body2">{artists.map(obj => obj.name).join(', ')}</Typography>
                                    </Box>
                                </Box>
                            </Link>
                            )
                            :
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
							Matched Profiles
						</Typography>
						{matchedUsers.length !== 0 ? matchedUsers.map(({ display_name, images, link }, index) =>
                            <Link href={link} target="_blank" rel="noopener noreferrer" style={{ color:'white', textDecoration: 'none'}}>
                                <Box key={index} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, '&:hover': { bgcolor: 'primary.main'}, borderRadius: 2}}>
                                    <Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={images[1].url} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
                                            <Typography variant="body1">{display_name}</Typography>
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
		</Box >
	);
}

export default UserProfile;

function AnimatedGradientText({ text }) {
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