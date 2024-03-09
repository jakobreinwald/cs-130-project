import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../api';


function ProfileFinder({ displayName }) {
	const [data, setData] = useState('');
	const fetchData = async (displayName) => {
		const result = await getUserProfile(displayName);
		setData(result.data);
		console.log(result.data);
	};

	useEffect(() => { fetchData(displayName); }, [displayName]);

	return (
		<div className="Profile">
			<p>this is the ProfileFinder page</p>
			{data && data.map(user => (
				<div key={user.user_id}>
					<p>User ID: {user.user_id}, Display Name: {user.display_name}</p>
				</div>
			))}
		</div>
	);
}

export default ProfileFinder;