import React from 'react';
import { Box, Typography, Card, CardContent, Avatar } from '@mui/material';

function SongCard({ cardTitle, songInfo }) {
    return (
        <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%', borderRadius: 5}}>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div" align='center'>
                    <b>{cardTitle}</b>
                </Typography>
                {songInfo.map(function(song, i) {
                    return (
                        <Box key={i} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, borderRadius: 2}}>
                            <Avatar sx={{ bgcolor: 'text.primary'}} variant="rounded"/>
                            <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center',}}>
                                <Typography variant="body1">{song.name}</Typography>
                                <Typography variant="body2">{song.artist}</Typography>
                            </Box>
                        </Box>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export default SongCard;