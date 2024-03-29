import { React, useState, useEffect } from 'react';
import FinderImage from '../components/finderImage';
import AudioPlayer from '../components/audioPlayer';
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import xMark from '../assets/x-mark.svg';
import heart from '../assets/heart.svg';
import { getUserRecs, postNewSongDecision } from '../api';
import { getTracks } from '../api/index';

function SongFinder({ token, userId, displayName, profile, setProfile }) {
	const [data, setData] = useState([]);
	const fetchData = async (token, userId) => {
		const result = await getUserRecs(token, userId);
		console.log(result.data);
		setData(result.data.recs);
		console.log("RESULT: ", result.data.recs);
	};

	useEffect(() => {
		if (token !== null && userId !== null) {
			fetchData(token, userId);
		}
	}, [token, userId]);

	const theme = useTheme();
	const [direction, setDirection] = useState("down");

	const [currentIndex, setCurrentIndex] = useState(0); // Track the current element to slide off
	const [slideIn, setSlideIn] = useState(true); // Used to trigger slide out animation
	const [hasMatches, setHasMatches] = useState(true);

	const [likedSongs, setLikedSongs] = useState([]);
	const [dislikedSongs, setDislikedSongs] = useState([]);

	const swipeLeft = () => {
		setDirection("right");
		setSlideIn(false); // Start the slide out animation

		setTimeout(() => {
			setDirection("down");
			setSlideIn(true);
			if (hasMatches) {
				setDislikedSongs(prevDisliked => prevDisliked.concat(data[currentIndex]))
			}
			if (currentIndex < data.length - 1) {
				setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
			}
			else {
				setHasMatches(false)
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
				setLikedSongs(prevLiked => prevLiked.concat(data[currentIndex]))
				getTracks(token, [data[currentIndex].track_id]).then(song => setProfile({ ...profile, recommendedTracks: [...profile.recommendedTracks, song.data.tracks[0]] }))
			}
			if (currentIndex < data.length - 1) {
				setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
			}
			else {
				setHasMatches(false)
			}
		}, 500); // Timeout duration should match the slide out animation duration
	};

	const updateSongs = (songId, action) => {
		postNewSongDecision(token, userId, songId, action);
	}

	useEffect(() => {
		// Send data to backend
		console.log("Disliked Songs Updated:", dislikedSongs);
		if (dislikedSongs.length > 0) {
			updateSongs(dislikedSongs[dislikedSongs.length - 1].track_id, 'dismiss');
		}
	}, [dislikedSongs]);

	useEffect(() => {
		// Send data to backend
		console.log("Liked Songs Updated:", likedSongs);
		if (likedSongs.length > 0) {
			updateSongs(likedSongs[likedSongs.length - 1].track_id, 'like');
		}
	}, [likedSongs]);

	function millisecondsToMinutesAndSeconds(milliseconds) {
		if (!milliseconds) {
			return '';
		}

		const totalSeconds = Math.floor(milliseconds / 1000);

		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}:${seconds}`;
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 3, }}>
			<Typography variant='h3'>
				We think you'd like...
			</Typography>
			<Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, m: 3 }}>
				<IconButton variant='contained' onClick={swipeLeft} sx={{ backgroundColor: theme.palette.swipeButton.red, borderRadius: '100%', width: 75, height: 75, '&:hover': { backgroundColor: theme.palette.swipeButton.redHover, }, }}>
					<img src={xMark} alt="X Mark" style={{ maxWidth: '75%' }} />
				</IconButton>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 500, height: 600, }}>
					{hasMatches ? data.map(({ album, artists, name, preview_url, track_id }, index) => (
						<Slide key={index} direction={direction} in={slideIn && index === currentIndex} mountOnEnter unmountOnExit>
							<Box>
								<FinderImage
									image={album && album.hasOwnProperty('images') ? album.images[0].url : `https://open.spotify.com/track/${track_id}`}
									mainText={name}
									subText={artists !== null ? artists[0].name : null}
									link={`https://open.spotify.com/track/${track_id}`}
								/>
								<AudioPlayer previewUrl={preview_url} />
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

export default SongFinder;