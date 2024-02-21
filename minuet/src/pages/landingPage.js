import React from 'react';
import MinuetLogo from '../assets/logo.svg'
import { Button } from '@mui/material';

import './landingPage.css'

function LandingPage() {
  return (
    <div className="landingPage">
      <div className="landingPageTwoColContent">
        <div className="landingPageText">
          <div>
            <h3 className="landingPageWelcome">Welcome to</h3>
            <div>
              <h1 className="landingPageHeading">Minuet</h1>
              <h2 className="landingPageSubheading">Find your sound soulmate.</h2>
            </div>
          </div>
          <div className="landingPageButton">
            <Button variant="contained" className='logInButton'>Log in with Spotify</Button>
          </div>
        </div>
        <div className="langingPageLogo">
          <img src={MinuetLogo} alt="Minuet logo" height={500} />
        </div>
      </div>
    </div>
  );
}

export default LandingPage;