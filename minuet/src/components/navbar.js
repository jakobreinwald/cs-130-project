import React from 'react';
import MinuetLogo from '../assets/logo.svg';
import Button from '@mui/material/Button';
import {Link} from 'react-router-dom';
import './navbar.css'
import { Typography } from '@mui/material';

function LogOutButton () {
    // todo: onClick to log out
    return <Button variant="contained" sx={{ backgroundColor: 'theme.palatte.primary.main', borderRadius: '30px', paddingLeft: 3.5, paddingRight: 3.5 }}>
            <Typography variant='p' sx={{color: 'text.primary', fontSize: '20px', fontWeight: 500 }}>
                Log out
            </Typography>
        </Button>
}

function NavBar () {
    return (
        <div className='navbar'>
            <div className='navbarContent'>
                <div className='navbarAppLogoName'>
                    <Link to='/'>
                        <img src={MinuetLogo} alt='logo' className='navbarLogo'/> 
                    </Link>
                    <Link to='/' className='navbarAppName'> Minuet </Link>
                </div>
                <div className='navbarPagesButton'>
                    <p><Link to='/song-finder' data-replace="Song Finder" className="navbarLink"><span>Song Finder</span></Link></p>
                    <p><Link to='/profile-finder' data-replace="Profile Finder" className="navbarLink"><span>Profile Finder</span></Link></p>
                    <LogOutButton />
                </div>
            </div>
        </div>
    );
}

export default NavBar;