import React from 'react';
import MinuetLogo from '../assets/logo.svg';
import Button from '@mui/material/Button';
import {Link} from 'react-router-dom';
import './navbar.css'

const isLoggedIn = true; //todo based on whether logged in or not

function LogInOutButton () {
    const buttonText = isLoggedIn ? "Log Out" : "Log In";
    // todo: onClick send to spotify API log in
    return <Button variant="contained" className='logInOutButton'>{buttonText}</Button>
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
                
                { isLoggedIn ? 
                    <p><Link to='/song-finder' data-replace="Song Finder" className="navbarLink"><span>Song Finder</span></Link></p> : 
                    null}
                { isLoggedIn ? 
                    <p><Link to='/profile-finder' data-replace="Profile Finder" className="navbarLink"><span>Profile Finder</span></Link></p> : 
                    null}                
                <LogInOutButton />
            </div>
            
        </div>
    );
}

export default NavBar;