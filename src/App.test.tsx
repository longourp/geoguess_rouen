import { render, screen } from '@testing-library/react';
import App from './App';

describe('<App>', () => {
  it('renders the title and the daily grid criteria', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /GéoGuess Rouen/i })).toBeInTheDocument();
    // The grid renders category axis labels (at least one criterion is visible).
    expect(screen.getAllByTitle(/./).length).toBeGreaterThan(0);
  });
});
