import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

const PopularityIcon = ({ value }) => {
	const getColorForValue = (value) => {
		const hue = (1 - value / 100) * 120; // Map value to a hue value (0-120 degrees)
		return `hsl(${hue}, 100%, 50%)`; // Convert hue to an HSL color
	};

	const iconStyle = {
		width: '100px',
		height: '100px',
		borderRadius: '50%',
		boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
		transition: 'transform 0.3s',
		backgroundColor: getColorForValue(value),
	};

	return (
		<SvgIcon style={iconStyle}>
			<circle cx="12" cy="12" r="10" fill="white" />
		</SvgIcon>
	);
};

export default PopularityIcon;
