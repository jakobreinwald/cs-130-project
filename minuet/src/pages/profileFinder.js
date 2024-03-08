import React, {useState, useEffect} from 'react';
import FinderImage from '../components/finderImage'
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import xMark from '../assets/x-mark.svg';
import heart from '../assets/heart.svg';

function ProfileFinder() {
  const theme = useTheme();
    const [direction, setDirection] = useState("down");

    const [currentIndex, setCurrentIndex] = useState(0); // Track the current element to slide off
    const [slideIn, setSlideIn] = useState(true); // Used to trigger slide out animation
    const [hasMatches, setHasMatches] = useState(true);

    const songs = [
      {
        image: 'https://hackspirit.com/wp-content/uploads/2021/06/Copy-of-Rustic-Female-Teen-Magazine-Cover.jpg', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '0'
      },
      {
        image: 'https://i.scdn.co/image/ab67616d0000b273904445d70d04eb24d6bb79ac', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '1'
      },
      {
        image: 'https://i.scdn.co/image/ab67616d0000b27395f754318336a07e85ec59bc', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '2'
      },
      {
        image: 'https://i.scdn.co/image/ab67616d0000b27333b8541201f1ef38941024be', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '0'
      },
      {
        image: 'https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '1'
      },
    ]
    const [likedSongs, setLikedSongs] = useState([]);
    const [dislikedSongs, setDislikedSongs] = useState([]);
  
    const swipeLeft = () => {
        setDirection("right");
        setSlideIn(false); // Start the slide out animation
  
        setTimeout(() => {
            setDirection("down");
            setSlideIn(true);
            if (hasMatches) {
                setDislikedSongs(prevDisliked => prevDisliked.concat(songs[currentIndex]))
            }
            if (currentIndex < songs.length-1) {
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
                setLikedSongs(prevLiked => prevLiked.concat(songs[currentIndex]))

            }
            if (currentIndex < songs.length-1) {
                setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
            }
            else {
                setHasMatches(false)
            }
        }, 500); // Timeout duration should match the slide out animation duration
    };

    useEffect(() => {
        // Send data to backend
        console.log("Disliked Songs Updated:", dislikedSongs);
        console.log("Liked Songs Updated:", likedSongs);
    }, [dislikedSongs, likedSongs]);   

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 3,}}>
            <Typography variant='h3'>
                We think you'd like...
            </Typography>
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, m: 3}}>
                <IconButton variant='contained' onClick={swipeLeft} sx={{backgroundColor: theme.palette.swipeButton.red, borderRadius: '100%', width: 75, height: 75, '&:hover': {backgroundColor: theme.palette.swipeButton.redHover,}, }}>
                    <img src={xMark} alt="X Mark" style={{maxWidth: '75%'}}/>
                </IconButton>
                <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 500, height: 600,}}>
                    {hasMatches ? songs.map((element, index) => (
                        <Slide key={index} direction={direction} in={slideIn && index === currentIndex} mountOnEnter unmountOnExit>
                            <Box>
                                <FinderImage 
                                    image={element.image} 
                                    mainText={element.mainText} 
                                    subText={element.subText}
									link={`/user/:${element.id}`}
                                />
                            </Box>
                        </Slide>
                    )) : <Typography variant='h5'> Sorry, no more matches for now! </Typography>}
                </Box>
                <IconButton variant='contained' onClick={swipeRight} sx={{backgroundColor: theme.palette.swipeButton.green, borderRadius: '100%', width: 75, height: 75, '&:hover': {backgroundColor: theme.palette.swipeButton.greenHover,}, }}>
                    <img src={heart} alt="Heart" style={{maxWidth: '75%'}}/>
                </IconButton>
            </Box>
        </Box>
    );
}

export default ProfileFinder;