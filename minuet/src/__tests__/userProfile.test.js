import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '../pages/userProfile';

describe('UserProfile', () => {
    it('renders user profile information', () => {
        const mockProfile = {
        display_name: 'John Doe',
        images: [{}, { url: 'http://example.com/john-doe.jpg' }],
        user_id: 'john_doe_123',
        recommendedTracks: [],
        matched_users: [],
        matchedUsersLinks: [],
        userPlaylist: {
            external_urls: {
            spotify: 'https://open.spotify.com/user/john_doe_123'
            },
            name: 'John\'s Playlist'
        }
        };

        render(<UserProfile token="dummyToken" profile={mockProfile} />);

        // Check if the profile name is rendered
        expect(screen.getByText('Hi, John Doe')).toBeInTheDocument();

        // Check if the Spotify link is correct
        const spotifyProfileLink = screen.getByRole('link', {name: mockProfile.userPlaylist.name }); // Use the actual text or aria-label that applies
        expect(spotifyProfileLink).toHaveAttribute('href', 'https://open.spotify.com/user/john_doe_123');

        // Check if the playlist name is rendered
        expect(screen.getByText("John's Playlist")).toBeInTheDocument();

        // Since there are no songs or matched users, check for the placeholder text
        const placeholders = screen.getAllByText('Nothing to see here yet!');
        expect(placeholders.length).toBe(2);
    });

    // You can add more test cases to simulate different states of the profile, like when there are matched songs or users.
});
