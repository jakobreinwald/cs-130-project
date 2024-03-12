import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa'; // Import icons from react-icons

const PopularityIcon = ({ value }) => {
	const iconSize = 24; // Adjust the size of the icon as needed
	const gradientColors = [
		'#ff0000', // Red
		'#ff4500', // OrangeRed
		'#ffa500', // Orange
		'#ffd700', // Gold
		'#ffff00', // Yellow
		'#7fff00', // Chartreuse
		'#00ff00', // Lime
		'#00ffff', // Cyan
		'#0000ff', // Blue
		'#800080'  // Purple
	];

	// Determine which icon to display based on the value
	const renderIcon = () => {
		for (let i = 0, limit = 90; limit >= 0; i += 1, limit -= 10) {
			if (value >= limit) {
				return <FaStar size={iconSize} color={gradientColors[i]} />
			}
		}

	};

	return renderIcon();
};

export default PopularityIcon;