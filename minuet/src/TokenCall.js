import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TokenCall(props) {
	const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID; // Replace with your client ID
	const params = new URLSearchParams(window.location.search);
	const code = params.get("code");

	async function getAccessToken(clientId, code) {
		const verifier = window.localStorage.getItem("verifier");
		const url = process.env.PUBLIC_URL || "http://localhost:3000";

		const params = new URLSearchParams();
		params.append("client_id", clientId);
		params.append("grant_type", "authorization_code");
		params.append("code", code);
		params.append("redirect_uri", `https://jakobreinwald.github.io/cs-130-project/callback`);
		params.append("code_verifier", verifier);

		const result = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params
		});
		const access_token = await result.json();
		return access_token;
	};
	const handler = (data) => { props.passToken(data) }

	async function setToken(clientId, code) {
		const accessToken = await getAccessToken(clientId, code);
		if (!("error" in accessToken)) {
			window.localStorage.setItem("access_token", accessToken.access_token);
			window.localStorage.setItem("refresh_token", accessToken.refresh_token);
			window.localStorage.setItem("timestamp", Date.now())
			handler(accessToken.access_token)
		}
	};
	const navigate = useNavigate();
	let navigated = false
	useEffect(() => {
		if (!navigated) {
			setToken(clientId, code);
			navigated = true
			navigate("/");
		}
	}, []);
	return null;
}
export default TokenCall