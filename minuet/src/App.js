import logo from './logo.svg';
import './App.css';
import React, { useState, useEffect } from 'react';

function App() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState(null);
  const clientId = "77f115f4019c42de927ebab0d2ddd231"; // Replace with your client ID
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const authenticate = async () => {
    if (!code) {
      redirectToAuthCodeFlow(clientId);
    } else {
        const accessToken = await getAccessToken(clientId, code);
        if(!("error" in accessToken)){
          window.localStorage.setItem("access_token", accessToken.access_token);
          window.localStorage.setItem("refresh_token", accessToken.refresh_token);
          window.localStorage.setItem("timestamp", Date.now())
          setToken(accessToken.access_token);
        }
    }
  }

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
    setToken(response.access_token);
  };

  async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    window.localStorage.setItem("verifier", verifier);
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:3000/callback");
    params.append("scope", "user-read-private user-read-email");
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


  async function getAccessToken(clientId, code) {
    const verifier = window.localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:3000/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    const access_token = await result.json();
    return access_token;
  };

  useEffect(() => {
    let token = window.localStorage.getItem("access_token")
    if(token == "undefined")
      authenticate();
    else{
      let timestamp = window.localStorage.getItem("timestamp")
      let timeElapsed = Math.floor((Date.now() - timestamp ) / 1000)
      if(timeElapsed > 50){
        getRefreshToken();
        token = window.localStorage.getItem("access_token")
        window.localStorage.setItem("timestamp", Date.now())
      }
      setToken(token);
    }
  });
  return (
    <html lang="en">
    <head>
        <title>My Spotify Profile</title>
    </head>
      <body>
        <h1>Display your Spotify profile data</h1>

        <section id="profile">
        <h2>Logged in as <span id="displayName"></span></h2>
        <span id="avatar"></span>
        <ul>
            <li>Token: {token}</li>
        </ul>
        </section>
      </body>
    </html>
  );
}

export default App;
