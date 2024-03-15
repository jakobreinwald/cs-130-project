// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('@mui/material/styles', () => {
    const originalModule = jest.requireActual('@mui/material/styles');
    return {
        ...originalModule,
        useTheme: () => ({
            palette: {
            swipeButton: {
                red: '#ff0000',
                redHover: '#cc0000',
                green: '#00ff00',
                greenHover: '#00cc00',
            },
            },
        }),
    };
});