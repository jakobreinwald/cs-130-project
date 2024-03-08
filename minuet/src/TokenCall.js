import React, { useState, useEffect } from 'react';
import {useNavigate } from 'react-router-dom';

function TokenCall() {
    const clientId = "77f115f4019c42de927ebab0d2ddd231"; // Replace with your client ID
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

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
    async function setToken(clientId, code){
        const accessToken = await getAccessToken(clientId, code);
        if(!("error" in accessToken)){
            window.localStorage.setItem("access_token", accessToken.access_token);
            window.localStorage.setItem("refresh_token", accessToken.refresh_token);
            window.localStorage.setItem("timestamp", Date.now())
        }
    };
    setToken(clientId, code)
    const navigate = useNavigate();
    useEffect(() => {navigate("/")}, []);
    return null;
}
export default TokenCall