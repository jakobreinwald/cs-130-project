import React, { useState, useEffect } from 'react';
import FinderImage from '../components/finderImage'
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import xMark from '../assets/x-mark.svg';
import heart from '../assets/heart.svg';
import { getUserMatches, getUserProfile, likeMatch, dismissMatch } from '../api/index.js'

function ProfileFinder(props) {
	const theme = useTheme();
	const [direction, setDirection] = useState("down");

	const [currentIndex, setCurrentIndex] = useState(0); // Track the current element to slide off
	const [slideIn, setSlideIn] = useState(true); // Used to trigger slide out animation
	const [hasMatches, setHasMatches] = useState(true);

	const [pfs, setPfs] = useState([])

	const generateMatches = async (id) => {
		const result = await getUserMatches(id);
		const matchedUsers = result.data;
		console.log(matchedUsers);
		const getOtherProfiles = async (users) => {
			let promises = [];
			for (const [userId, value] of Object.entries(users)) {
				if (value === "none" && userId[0] !== '3' && userId !== 'limelego') {
					promises.push(getUserProfile(userId));
				}
			}
			return Promise.allSettled(promises);
		};
		const otherProfiles = await getOtherProfiles(matchedUsers)
			.then(res => res.filter(({ status }) => status === 'fulfilled'))
			.then(res => res.map(({ value }) => value.data));
		setPfs(otherProfiles);
	};

	useEffect(() => {
		if (props.userId)
			generateMatches(props.userId);
	}, [props.userId]);

	const [profile, setProfile] = useState(null);

	const swipeLeft = () => {
		setDirection("right");
		setSlideIn(false); // Start the slide out animation

		setTimeout(() => {
			setDirection("down");
			setSlideIn(true);
			if (hasMatches) {
				setProfile({ id: pfs[currentIndex].user_id, action: 'dismiss' })
			}
			setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
		}, 500); // Timeout duration should match the slide out animation duration
	};

	const swipeRight = () => {
		setDirection("left");
		setSlideIn(false); // Start the slide out animation

		setTimeout(() => {
			setDirection("down");
			setSlideIn(true);
			if (hasMatches) {
				setProfile({ id: pfs[currentIndex].user_id, action: 'like' })
			}
			setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
		}, 500); // Timeout duration should match the slide out animation duration
	};

	useEffect(() => {
		console.log("Updated Profile:", profile);
		if (profile) {
			if (profile.action === "like") {
				likeMatch(props.userId, profile.id);
				getUserProfile(profile.id).then(newMatch => props.setProfile({ ...props.profile, matched_users: [...props.profile.matched_users, newMatch.data], matchedUsersLinks: [...props.profile.matchedUsersLinks, `/cs-130-project/user/${profile.id}`] }))
			}
			else
				dismissMatch(props.userId, profile.id)
			if (currentIndex > pfs.length - 1) {
				// if (props.userId)
				// 	generateMatches(props.userId);
				// setCurrentIndex(0)
				setHasMatches(false);
			}
		}
	}, [profile]);

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
									subText={`Their top artist: ${element.top_artists[0] ? element.top_artists[0].name : null}`}
									link={`/user/${element.user_id}`}
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