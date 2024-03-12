import React from 'react';
import ReactPlayer from 'react-player';

const AudioPlayer = ({ previewUrl }) => {
	return (
		<div className="audio-player-container">
			<ReactPlayer
				url={previewUrl}
				controls
				width="100%"
				height="80px"
				playing
				volume={0.8}
				loop
				playbackRate={1.2}
				pip
				config={{
					file: {
						forceAudio: true
					}
				}}
				style={{
					boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
					borderRadius: '8px',
				}}
			/>
		</div>
	);
};

export default AudioPlayer;
