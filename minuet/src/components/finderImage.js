import React from 'react';
import { Box, Typography } from '@mui/material';

function FinderImage({ image, mainText, subText }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <image src={image} style={{ width: '50vh', height: '50vh' }}/>
      <Typography variant='h4' sx={{ fontWeight: 500 }}> { mainText } </Typography>
      <Typography variant='h5'> { subText } </Typography>
    </Box>
  );
}

export default FinderImage;