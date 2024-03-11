import React, { useState, useEffect } from 'react';
import SongCard from '../components/songCard'
import ProfileCard from '../components/profileCard'
import { Card, CardContent, Link } from '@mui/material';
import { Box, Typography, Divider, Avatar } from '@mui/material';

function UserProfile({ token, displayName, profile }) {
	// TODO replace placeholders with actual data
	const [matchedUsers, setMatchedUsers] = useState([]);
	const [newUsers, setNewUsers] = useState(0);
	const [matchedSongs, setMatchedSongs] = useState([]);
	const [newSongs, setNewSongs] = useState(0);

	useEffect(() => {
		if (profile !== null && profile.hasOwnProperty('recommendedTracks')) {
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
				<Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5, }} src={profile !== null ? profile.images[1].url : null} />
				<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
					<Typography variant="h2" sx={{ color: 'text.primary', mb: 3 }}>
						Hi, {displayName}
					</Typography>
					<Typography variant="h4" sx={{ color: 'text.primary' }}>
						You've discovered <b>{newSongs}</b> new song(s) and <b>{newUsers}</b> new profile(s)! Keep on exploring :)
					</Typography>
				</Box>
			</Box>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 5, justifyContent: 'center', }}>
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
					<CardContent>
						<Typography gutterBottom variant="h5" component="div" align='center'>
							<b>Matched Songs</b>
						</Typography>
						{matchedSongs.map((match, index) =>
							<Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
								<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
								<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
									<Typography variant="body1">Song Name</Typography>
									<Typography variant="body2">Artist Name</Typography>
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
						{matchedUsers.map((match, index) =>
							<Box key={index} sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
								<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" src={match.images[1].url} />
								<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
									<Link src={match.link}>
										<Typography variant="body1">{match.link}</Typography>
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