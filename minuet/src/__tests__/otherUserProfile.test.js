import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as api from '../api/index';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import OtherUserProfile from '../pages/otherUserProfile'

// Mock the API calls and useParams
jest.mock('../api/index', () => ({
    getUserProfile: jest.fn(),
    getMatchScore: jest.fn()
}));
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: jest.fn()
}));
jest.mock('../components/animatedMatchPercentage', () => ({ targetValue }) => (
    <div>{`${targetValue}% Match`}</div>
));

describe('OtherUserProfile', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    it('renders profile information', async () => {
        const mockedUserProfile = {
        data: {
            display_name: 'Test User',
            images: [{}, {url: 'test-image-url'}],
            top_artists: [],
            top_tracks: [],
            genre_counts: {},
        }
        };
        const mockedMatchScore = {
        data: {
            score: 0.8 // 80%
        }
        };
        
        // Mock the API response and useParams return value
        api.getUserProfile.mockResolvedValue(mockedUserProfile);
        api.getMatchScore.mockResolvedValue(mockedMatchScore);
        require('react-router-dom').useParams.mockReturnValue({ userId: 'testUserId' });

        render(
            <MemoryRouter initialEntries={['/user/testUserId']}>
              <Routes>
                <Route path="/user/:userId" element={<OtherUserProfile loggedInUserId="loggedInUserId" />} />
              </Routes>
            </MemoryRouter>
        );

        const displayName = await screen.findByText('Test User');
        expect(displayName).toBeInTheDocument();

        // Check for the Spotify profile button
        const spotifyButton = screen.getByText('Spotify Profile');
        expect(spotifyButton).toBeInTheDocument();

        // Check for the match percentage
        const matchPercentage = await screen.findByText('80% Match');
        expect(matchPercentage).toBeInTheDocument();
    });
});