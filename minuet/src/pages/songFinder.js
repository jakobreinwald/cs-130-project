import React, { useState, useEffect } from 'react';
import { fetchUsers } from '../api';

function SongFinder() {
	const [data, setData] = useState('');
	const fetchData = async () => {
		const result = await fetchUsers();
		setData(result.data);
		console.log(result.data);
	};

	useEffect(() => { fetchData(); }, []);

	return (
		<div className="SongFinder">
			<p>this is the SongFinder page</p>
			{data && data.map(user => (
				<div key={user.user_id}>
					<p>User ID: {user.user_id}, Display Name: {user.display_name}</p>
				</div>
			))}
		</div>
	);
}

export default SongFinder;