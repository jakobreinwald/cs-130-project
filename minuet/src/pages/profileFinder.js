import React, { useState, useEffect } from 'react';
import { fetchUsers } from '../api';


function ProfileFinder() {
	const [data, setData] = useState('');
	const fetchData = async () => {
		const result = await fetchUsers();
		setData(result.data);
		console.log(result.data);
	};

	useEffect(() => { fetchData(); }, []);

	return (
		<div className="Profile">
			<p>this is the ProfileFinder page</p>
			<h1>USER LIST FOR NOW</h1>
			{data && data.map(user => (
				<div key={user.user_id}>
					<p>User ID: {user.user_id}, Display Name: {user.display_name}</p>
				</div>
			))}
		</div>
	);
}

export default ProfileFinder;