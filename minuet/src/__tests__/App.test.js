import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import App from '../App';

jest.mock('../pages/landingPage', () => () => <div>LandingPage Page</div>);
jest.mock('../pages/userProfile', () => () => <div>UserProfile Page</div>);

const theme = createTheme();

describe('App Component', () => {
    const renderWithProviders = (ui, { route = '/' } = {}) => {
        window.history.pushState({}, 'Test page', route);
        return render(ui, { wrapper: ({ children }) => <ThemeProvider theme={theme}><Router>{children}</Router></ThemeProvider> });
    };

    it('renders LandingPage component when there is no token', () => {
        renderWithProviders(<App />);
        expect(screen.getByText('LandingPage Page')).toBeInTheDocument();
    });

    it('renders UserProfile component when there is a token', () => {
        // Mock local storage to have a token
        Storage.prototype.getItem = jest.fn(() => 'mockToken');
        renderWithProviders(<App />, { route: '/' });
        expect(screen.getByText('UserProfile Page')).toBeInTheDocument();
    });
});