import React from 'react';
import { Box, Typography, Card, CardContent, Divider, Avatar } from '@mui/material';

function UserProfile({ temp }) {
	// TODO replace placeholders with actual data
	const username = temp;
	const newSongs = 5;
	const newProfiles = 3;

	return (
		<Box sx={{ bgcolor: 'background.primary', minHeight: '100vh', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', }}>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, maxWidth: '75%', }}>
				<Avatar sx={{ bgcolor: 'grey.900', width: 250, height: 250, m: 5, }} />
				<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
					<Typography variant="h2" sx={{ color: 'text.primary', mb: 3 }}>
						Hi, {username}
					</Typography>
					<Typography variant="h4" sx={{ color: 'text.primary' }}>
						You've discovered <b>{newSongs}</b> new songs and <b>{newProfiles}</b> new profiles! Keep on exploring :)
					</Typography>
				</Box>
			</Box>
			<Box sx={{ display: 'flex', flexDirection: 'row', gap: 5, justifyContent: 'center', }}>
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
					<CardContent>
						<Typography gutterBottom variant="h5" component="div" align='center'>
							<b>Matched Songs</b>
						</Typography>
						{/* TODO: Replace with actual song data */}
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Song Name</Typography>
								<Typography variant="body2">Artist Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Song Name</Typography>
								<Typography variant="body2">Artist Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Song Name</Typography>
								<Typography variant="body2">Artist Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Song Name</Typography>
								<Typography variant="body2">Artist Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Song Name</Typography>
								<Typography variant="body2">Artist Name</Typography>
							</Box>
						</Box>
					</CardContent>
				</Card>
				<Divider orientation="vertical" flexItem />
				<Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%' }}>
					<CardContent>
						<Typography gutterBottom variant="h5" component="div" align='center'>
							<b>Matched Profiles</b>
						</Typography>
						{/* TODO: Replace with actual profile data */}
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Profile Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Profile Name</Typography>
							</Box>
						</Box>
						<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 2 }}>
							<Avatar sx={{ bgcolor: 'text.primary' }} variant="rounded" />
							<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', }}>
								<Typography variant="body1">Profile Name</Typography>
							</Box>
						</Box>
					</CardContent>
				</Card>
			</Box>
		</Box>
	);
}

export default UserProfile;