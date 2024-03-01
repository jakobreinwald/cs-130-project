import React from 'react';
import FinderImage from '../components/finderImage'

function SongFinder() {
  
  return (
    <div className="songFinder">
      <div className='songFinderContent'>
        <FinderImage 
          image='https://static.independent.co.uk/2021/11/11/12/newFile.jpg' 
          mainText='All Too Well (10 Minute Version)' 
          subText='Taylor Swift' />
      </div>
    </div>
  );
}

export default SongFinder;