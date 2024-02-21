import React from 'react';
import { Box, Typography, Card, CardContent, Avatar} from '@mui/material';
import { Link } from 'react-router-dom';

function ProfileCard({ cardTitle, profileInfo }) {
    return (
        <Card sx={{ bgcolor: 'background.secondary', flexGrow: 1, minWidth: '90%', borderRadius: 5}}>
            <CardContent>
                <Typography gutterBottom variant="h5" component="div" align='center'>
                    <b>{cardTitle}</b>
                </Typography>
                {profileInfo.map(function(profile, i) {
                    return (
                        <Link to={`/user/${profile.id}`} style={{ color:'white', textDecoration: 'none' }}>
                            <Box key={i} sx={{display:'flex', flexDirection: 'row', gap: 1, mt: 2, p: 1, '&:hover': { bgcolor: 'primary.main'}, borderRadius: 2}}>
                                <Avatar sx={{ bgcolor: 'text.primary'}} variant="rounded"/>
                                <Box sx={{display: 'flex', flexDirection: 'column', justifyContent: 'center',}}>
                                    <Typography variant="body1">{profile.name}</Typography>
                                </Box>
                            </Box>
                        </Link>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export default ProfileCard;