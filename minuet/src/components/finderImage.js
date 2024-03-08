import React from 'react';
import { Box, Typography } from '@mui/material';

function FinderImage({ image, mainText, subText }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column',  alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 2}}>
        <img src={image} alt='song or profile pic' style={{ maxWidth: '100%', maxHeight: '100%'}} />
        <Typography variant='h4' sx={{ fontWeight: 500 }}> { mainText } </Typography>
        <Typography variant='h5'> { subText } </Typography>
    </Box>
  );
}

export default FinderImage;