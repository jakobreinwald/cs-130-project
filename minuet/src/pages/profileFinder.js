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

    const pfs = [
      {
        image: 'https://hackspirit.com/wp-content/uploads/2021/06/Copy-of-Rustic-Female-Teen-Magazine-Cover.jpg', 
        mainText: 'Kate Spade', 
        subText: 'Their top artist: Taylor Swift',
		id: '0' //user id from backend
      },
      {
        image: 'https://ichef.bbci.co.uk/news/976/cpsprodpb/C597/production/_131938505_ind3bc40c5f1c10d4248e6bf848ae7033c8814005e9-1.jpg', 
        mainText: 'Tay Tay', 
        subText: 'Their top artist: Taylor Swift',
		id: '1'
      },
      {
        image: 'https://www.verywellmind.com/thmb/pwEmuUJ6KO9OF8jeiQCDyKnaVQI=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/GettyImages-1187609003-73c8baf32a6a46a6b84fe931e0c51e7e.jpg', 
        mainText: 'En Pea Sea', 
        subText: 'Their top artist: Taylor Swift',
		id: '2'
      },
      {
        image: 'https://www.dmarge.com/wp-content/uploads/2021/01/dwayne-the-rock-.jpg', 
        mainText: 'Pebble', 
        subText: 'Their top artist: Taylor Swift',
		id: '0'
      },
      {
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSqW5lCXxflY_ZOsSs11cRIOoOwTTYHjy0_8A&usqp=CAU', 
        mainText: 'Me', 
        subText: 'Their top artist: Taylor Swift',
		id: '1'
      },
    ]
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
            if (currentIndex < pfs.length-1) {
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
                setLikedProfiles(prevLiked => prevLiked.concat(pfs[currentIndex]))

            }
            if (currentIndex < pfs.length-1) {
                setCurrentIndex((prevIndex) => (prevIndex + 1)); // Update index to next element
            }
            else {
                setHasMatches(false)
            }
        }, 500); // Timeout duration should match the slide out animation duration
    };

    useEffect(() => {
        // Send data to backend
        console.log("Disliked Profiles Updated:", dislikedProfiles);
        console.log("Liked Profiles Updated:", likedProfiles);
    }, [dislikedProfiles, likedProfiles]);   

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 3,}}>
            <Typography variant='h3'>
                We think you'd like...
            </Typography>
            <Box sx={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, m: 3}}>
                <IconButton variant='contained' onClick={swipeLeft} sx={{backgroundColor: theme.palette.swipeButton.red, borderRadius: '100%', width: 75, height: 75, '&:hover': {backgroundColor: theme.palette.swipeButton.redHover,}, }}>
                    <img src={xMark} alt="X Mark" style={{maxWidth: '75%'}}/>
                </IconButton>
                <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'start', width: 500, height: 600,}}>
                    {hasMatches ? pfs.map((element, index) => (
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