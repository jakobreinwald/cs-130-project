import React from 'react';
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

function FinderImage({ image, mainText, subText, link }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column',  alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2}}>
        <Link to={link} target="_blank" rel="noopener noreferrer">
          <img src={image} alt='song or profile pic' style={{ width: '450px', height: '450px'}} />
        </Link>
        <Typography variant='h4' sx={{ fontWeight: 500 }}> { mainText } </Typography>
        <Typography variant='h5'> { subText } </Typography>
    </Box>
  );
}

export default FinderImage;