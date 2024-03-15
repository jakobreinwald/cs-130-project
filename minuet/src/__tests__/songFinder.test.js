import React from 'react';
import { render, screen } from '@testing-library/react';
import SongFinder from '../pages/songFinder';

describe('SongFinder', () => {
    it('renders without crashing', () => {
        render(<SongFinder />);
        const headingElement = screen.getByText(/We think you'd like.../i);
        expect(headingElement).toBeInTheDocument();
    });
});
