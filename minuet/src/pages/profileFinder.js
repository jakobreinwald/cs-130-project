import React, { useState, useEffect } from 'react';
import FinderImage from '../components/finderImage'
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import xMark from '../assets/x-mark.svg';
import heart from '../assets/heart.svg';
import { getUserMatches, getUserProfile } from '../api/index.js'

function ProfileFinder(props) {
	const theme = useTheme();
	const [direction, setDirection] = useState("down");

	const [currentIndex, setCurrentIndex] = useState(0); // Track the current element to slide off
	const [slideIn, setSlideIn] = useState(true); // Used to trigger slide out animation
	const [hasMatches, setHasMatches] = useState(true);

	const [pfs, setPfs] = useState([])

	const generateMatches = async (id) => {
		const result = await getUserMatches(id)
		const matchedUsers = result.data.matched_user_to_outcome
		const getOtherProfiles = async (users) => {
			let promises = [];
			for (const [userId, value] of Object.entries(users)) {
				if (value === "none" && userId[0] !== '3') {
					promises.push(getUserProfile(userId))
				}
			}
			return Promise.all(promises)
		};
		const otherProfiles = (await getOtherProfiles(matchedUsers)).map((p) => p.data)
		setPfs(otherProfiles)
	};

	useEffect(() => {
		if (props.displayName)
			generateMatches(props.displayName);
	}, [props.displayName]);

	const [likedProfiles, setLikedProfiles] = useState([]);
	const [dislikedProfiles, setDislikedProfiles] = useState([]);

	const swipeLeft = () => {
		setDirection("right");
		setSlideIn(false); // Start the slide out animation

		setTimeout(() => {
			setDirection("down");
			setSlideIn(true);
			if (hasMatches) {
				setDislikedProfiles(prevDisliked => prevDisliked.concat(pfs[currentIndex]))
			}
			if (currentIndex < pfs.length - 1) {
				setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
			}
			else {
				// setHasMatches(false)
				setCurrentIndex((prevIndex) => 0)
			}
		}, 500); // Timeout duration should match the slide out animation duration
	};

	const swipeRight = () => {
		setDirection("left");
		setSlideIn(false); // Start the slide out animation

		setTimeout(() => {
			setDirection("down");
			setSlideIn(true);
			if (hasMatches) {
				setLikedProfiles(prevLiked => prevLiked.concat(pfs[currentIndex]))

			}
			if (currentIndex < pfs.length - 1) {
				setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
			}
			else {
				// setHasMatches(false)
				setCurrentIndex((prevIndex) => 0)
			}
		}, 500); // Timeout duration should match the slide out animation duration
	};

	// useEffect(() => {
	// 	// Send data to backend
	// 	console.log("Disliked Songs Updated:", dislikedProfiles);
	// 	if (dislikedSongs.length > 0) {
	// 		updateSongs(dislikedSongs[dislikedSongs.length - 1].id, 'dismiss');
	// 	}
	// }, [dislikedSongs]);

	// useEffect(() => {
	// 	// Send data to backend
	// 	console.log("Liked Songs Updated:", likedProfiles);
	// 	if (likedSongs.length > 0) {
	// 		updateSongs(likedSongs[likedSongs.length - 1].id, 'like');
	// 	}
	// }, [likedSongs]);

	useEffect(() => {
		// Send data to backend
		console.log("Disliked Profiles Updated:", dislikedProfiles);
		console.log("Liked Profiles Updated:", likedProfiles);
		if (dislikedProfiles.length + likedProfiles.length === pfs.length)
			if (props.displayName)
				generateMatches(props.displayName);
	}, [dislikedProfiles, likedProfiles]);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 3, }}>
			<Typography variant='h3'>
				We think you'd like...
			</Typography>
			<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, m: 3 }}>
				<IconButton variant='contained' onClick={swipeLeft} sx={{ backgroundColor: theme.palette.swipeButton.red, borderRadius: '100%', width: 75, height: 75, '&:hover': { backgroundColor: theme.palette.swipeButton.redHover, }, }}>
					<img src={xMark} alt="X Mark" style={{ maxWidth: '75%' }} />
				</IconButton>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'start', width: 500, height: 600, }}>
					{hasMatches ? pfs.map((element, index) => (
						<Slide key={index} direction={direction} in={slideIn && index === currentIndex} mountOnEnter unmountOnExit>
							<Box>
								<FinderImage
									image={element.images[1] ? element.images[1].url : null}
									mainText={element.display_name}
									subText={element.top_artists[0] ? element.top_artists[0].name : null}
									link={`/user/:${element.user_id}`}
								/>
							</Box>
						</Slide>
					)) : <Typography variant='h5'> Sorry, no more matches for now! </Typography>}
				</Box>
				<IconButton variant='contained' onClick={swipeRight} sx={{ backgroundColor: theme.palette.swipeButton.green, borderRadius: '100%', width: 75, height: 75, '&:hover': { backgroundColor: theme.palette.swipeButton.greenHover, }, }}>
					<img src={heart} alt="Heart" style={{ maxWidth: '75%' }} />
				</IconButton>
			</Box>
		</Box>
	);
}

export default ProfileFinder;