import React, { useState, useEffect } from 'react';
import SongCard from '../components/songCard'
import ProfileCard from '../components/profileCard'
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
					<Typography variant="h2" sx={{ color: 'text.primary', mb: 3 }}>
						Hi, {profile !== null ? profile.display_name : null}
					</Typography>
					<Typography variant="h4" sx={{ color: 'text.primary' }}>
						You've discovered <b>{newSongs}</b> new song(s) and <b>{newUsers}</b> new profile(s)! Keep on exploring :)
					</Typography>
				</Box>
			</Box>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 5, justifyContent: 'center', }}>
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
					<CardContent>
						<Link href={(profile !== null && profile.hasOwnProperty('userPlaylist')) ? profile.userPlaylist.external_urls.spotify : null} target="_blank" rel="noopener noreferrer">
							<Typography gutterBottom variant="h5" component="div" align='center'>
								<b>{(profile !== null && profile.hasOwnProperty('userPlaylist')) ? profile.userPlaylist.name : "Matched Songs"}</b>
							</Typography>
						</Link>
						{matchedSongs.map(({ album, artists, name }, index) =>
							<Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
								<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={album.images[1].url} />
								<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
									<Link href={album.external_urls.spotify} target="_blank" rel="noopener noreferrer">
										<Typography variant="body1">{name}</Typography>
									</Link>
									<Link href={artists[0].external_urls.spotify} target="_blank" rel="noopener noreferrer">
										<Typography variant="body2">{artists.map(obj => obj.name).join(', ')}</Typography>
									</Link>
								</Box>
							</Box>)}
					</CardContent>
				</Card>
				<Divider orientation="vertical" flexItem />
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
					<CardContent>
						<Typography gutterBottom variant="h5" component="div" align='center'>
							<b>Matched Profiles</b>
						</Typography>
						{matchedUsers.map(({ display_name, images, link }, index) =>
							<Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
								<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={images[1].url} />
								<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
									<Link href={link} target="_blank" rel="noopener noreferrer">
										<Typography variant="body1">{display_name}</Typography>
									</Link>
								</Box>
							</Box>
						)}
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