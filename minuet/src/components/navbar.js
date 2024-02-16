import React from 'react';
import MinuetLogo from '../assets/logo.svg';
import './navbar.css'

function NavBar () {
    return (
        <div>
            <img src={MinuetLogo} alt='logo' height={80} className="navBarBrand"/>
            <p>Minuet</p>
            <p>Song Finder</p>
            <p> Profile Finder</p>
        </div>
    );
}

export default NavBar;