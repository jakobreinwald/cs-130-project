import React, { useState, useEffect } from 'react';
import MinuetLogo from '../assets/logo.svg'
import { Box, Button, Typography } from '@mui/material';
import getToken from '../getToken.js'

const ResizableSVG = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth * 0.4);
  useEffect(() => {
    // Update window width in state when the window is resized
    const handleResize = () => {
      setWindowWidth(window.innerWidth * 0.4);
    };

    // Attach the event listener for window resize
    window.addEventListener('resize', handleResize);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (<img src={MinuetLogo} alt="Minuet logo" height={windowWidth} />);
}

function LandingPage() {
  

  return (
    <Box sx={{ bgcolor: 'background.primary', minHeight: '100vh', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '50px', width: '80%', margin: 'auto', flexWrap: 'wrap-reverse' }}>
        <Box>
          <Typography variant='h3' sx={{ color: 'text.primary', marginBottom: '30px', fontWeight: 300 }}>
            Welcome to 
          </Typography>
          <Box>
            <Typography variant='h1' sx={{ color: 'text.primary' }}> Minuet </Typography>
            <Typography variant='h4' sx={{ color: 'text.primary', marginBottom: '60px', fontWeight: 200 }}>
              Find your sound soulmate.
              </Typography>
          </Box>
          <Button 
            onClick = {() => {getToken();}}
            variant="contained" 
            sx={{ backgroundColor: 'theme.palette.primary.main', borderRadius: '30px', width: '100%'}}>
              <Typography variant="p" sx={{ color: 'text.primary', fontSize: '28px', fontWeight: 500 }}>
                Log in with Spotify
              </Typography>
          </Button>
        </Box>
        <ResizableSVG />
      </Box>
    </Box>
  );
}

export default LandingPage;