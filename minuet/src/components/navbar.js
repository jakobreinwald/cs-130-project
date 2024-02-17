import React from 'react';
import MinuetLogo from '../assets/logo.svg';
import Button from '@mui/material/Button';
import {Link} from 'react-router-dom';
import './navbar.css'

const isLoggedIn = false; //todo based on whether logged in or not

function LogInOutButton () {
    const buttonText = isLoggedIn ? "Log Out" : "Log In";
    // todo: onClick send to spotify API log in
    return <Button variant="contained" className='logInOutButton'>{buttonText}</Button>
}

function NavBar () {
    return (
        <div className='navbar'>
            <div className='navbarContent'>
                <img src={MinuetLogo} alt='logo' className='navbarLogo' height={80}/> 
                <Link to='/' className="navbarButton">Minuet</Link>
                <Link to='/song-finder' className="navbarButton">Song Finder</Link>
                <Link to='/profile-finder' className="navbarButton">Profile Finder</Link>
                <LogInOutButton />
            </div>
           
        </div>
    );
}

export default NavBar;