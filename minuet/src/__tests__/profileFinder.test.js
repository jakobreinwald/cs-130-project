import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileFinder from '../pages/profileFinder';

describe('ProfileFinder', () => {
    it('renders without crashing', () => {
        render(<ProfileFinder />);
        const headingElement = screen.getByText(/We think you'd like.../i);
        expect(headingElement).toBeInTheDocument();
    });
});
