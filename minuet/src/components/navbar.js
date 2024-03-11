import React from 'react';
import MinuetLogo from '../assets/logo.svg';
import Button from '@mui/material/Button';
import {Link, useNavigate} from 'react-router-dom';
import './navbar.css'
import { Typography } from '@mui/material';

function LogOutButton ({removeToken}) {
    const navigate = useNavigate();
    const logOut = () => {
        window.localStorage.clear();
        removeToken(null);
        navigate("/");
    }
    return <Button onClick={logOut} variant="contained" sx={{ backgroundColor: 'theme.palette.primary.main', borderRadius: '30px', paddingLeft: 3.5, paddingRight: 3.5 }}>
            <Typography variant='p' sx={{color: 'text.primary', fontSize: '20px', fontWeight: 500 }}>
                Log out
            </Typography>
        </Button>
}

function NavBar ({removeToken}) {
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
                    <LogOutButton removeToken = {removeToken}/>
                </div>
            </div>
        </div>
    );
}

export default NavBar;