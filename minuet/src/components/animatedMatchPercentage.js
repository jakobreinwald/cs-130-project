import React, {useState, useEffect} from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

function AnimatedMatchPercentage({ targetValue }) {
    const [progress, setProgress] = useState(0);
  
    useEffect(() => {
      const calculateIncrement = (value) => {
        if (value < targetValue) {
          const diff = targetValue - value;
          return Math.min(diff / 10, targetValue); // adjust for quickness
        }
        return 0;
      };
  
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          const increment = calculateIncrement(prevProgress);
          const nextProgress = prevProgress + increment;
          if (nextProgress >= targetValue) {
            clearInterval(timer);
            return targetValue;
          }
          return nextProgress;
        });
      }, 50); // adjust for faster or slower progress
  
      return () => {
        clearInterval(timer);
      };
    }, [targetValue]);
  
    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', width: '100%' }}>
            <LinearProgress value={progress} variant="determinate" sx={{ width: '75%', height: 15, borderRadius: 1, '& .MuiLinearProgress-bar': { backgroundImage: theme => `linear-gradient(to right, ${theme.palette.primary.complementary}, 70%, ${theme.palette.primary.main})` }}} />
            <Typography variant="h5" sx={{ color: 'text.primary'}}> {Math.round(progress)}% Match</Typography>
        </Box>
    );
}

export default AnimatedMatchPercentage;