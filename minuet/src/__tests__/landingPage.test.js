import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LandingPage from '../pages/LandingPage';
import getToken from '../getToken';

// Mocking the getToken module
jest.mock('../getToken', () => jest.fn());

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(<LandingPage />);
    expect(screen.getByText('Welcome to')).toBeInTheDocument();
    expect(screen.getByText('Minuet')).toBeInTheDocument();
    expect(screen.getByText('Find your sound soulmate.')).toBeInTheDocument();
    expect(screen.getByText('Log in with Spotify')).toBeInTheDocument();
  });

  it('renders the resizable SVG image', () => {
    render(<LandingPage />);
    expect(screen.getByAltText('Minuet logo')).toBeInTheDocument();
  });

  it('calls getToken when the "Log in with Spotify" button is clicked', () => {
    render(<LandingPage />);
    const loginButton = screen.getByText('Log in with Spotify');
    fireEvent.click(loginButton);
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
