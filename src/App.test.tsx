import { render, screen, act } from '@testing-library/react';
import App from './App';

describe('<App>', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('renders the Rouen game on the default route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /GéoGuess Rouen/i })).toBeInTheDocument();
    // The grid renders category axis labels (at least one criterion is visible).
    expect(screen.getAllByTitle(/./).length).toBeGreaterThan(0);
  });

  it('renders the Astuce game on #/astuce', async () => {
    window.location.hash = '#/astuce';
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Astuce Doku/i })).toBeInTheDocument();
  });

  it('switches game when the hash changes', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /GéoGuess Rouen/i })).toBeInTheDocument();
    await act(async () => {
      window.location.hash = '#/astuce';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await screen.findByRole('heading', { name: /Astuce Doku/i })).toBeInTheDocument();
  });

  it('renders the editor on #/editeur', async () => {
    window.location.hash = '#/editeur';
    render(<App />);
    expect(await screen.findByRole('heading', { name: /Éditeur de grilles/i })).toBeInTheDocument();
  });
});
