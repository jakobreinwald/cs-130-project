
function getToken() {
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID; // Replace with your client ID
  const authenticate = async () => {redirectToAuthCodeFlow(clientId);}

  const getRefreshToken = async () => {

    // refresh token that has been previously stored
    const refreshToken = window.localStorage.getItem('refresh_token');
    const url = "https://accounts.spotify.com/api/token";

    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      }),
    }
    const body = await fetch(url, payload);
    const response = await body.json();
    console.log(response)
    window.localStorage.setItem("access_token", response.access_token);
    window.localStorage.setItem("refresh_token", response.refresh_token);
  };

  async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    const playlist_scopes = 'playlist-read-private playlist-modify-private playlist-modify-public';
    const follow_scopes = 'user-follow-modify user-follow-read';
    const listening_scopes = 'user-top-read user-read-recently-played';
    const library_scopes = 'user-library-read';
    const user_scopes = 'user-read-private user-read-email';
    const scope = `${playlist_scopes} ${follow_scopes} ${listening_scopes} ${library_scopes} ${user_scopes}`;

    window.localStorage.setItem("verifier", verifier);
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:3000/callback");
    params.append("scope", scope);
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
  };

  
  let token = window.localStorage.getItem("access_token")
  if(token === "undefined" || token === null)
    authenticate();
  else{
    let timestamp = window.localStorage.getItem("timestamp")
    let timeElapsed = Math.floor((Date.now() - timestamp ) / 1000)
    if(timeElapsed > 1800){
      getRefreshToken();
      token = window.localStorage.getItem("access_token")
      window.localStorage.setItem("timestamp", Date.now())
    }
  }
  return token;
}

export default getToken;