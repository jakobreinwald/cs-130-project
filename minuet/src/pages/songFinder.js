import React from 'react';
import FinderImage from '../components/finderImage'

function SongFinder() {
  const songData = [
    {
      image: 'https://static.independent.co.uk/2021/11/11/12/newFile.jpg', 
      mainText: 'All Too Well (10 Minute Version)', 
      subText: 'Taylor Swift'
    },
    {
      image: 'https://static.independent.co.uk/2021/11/11/12/newFile.jpg', 
      mainText: 'Welcome to New York', 
      subText: 'Taylor Swift'
    },
  ]
  
  return (
    <div className="songFinder">
      <div className='songFinderContent'>
        <FinderImage 
          image={songData[0].image} 
          mainText={songData[0].mainText} 
          subText={songData[0].subText} />
      </div>
    </div>
  );
}

export default SongFinder;