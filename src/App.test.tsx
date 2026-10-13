import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the landing experience with a call to action', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /lendswift/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start your application/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveAttribute('href', '#main-content');
  });
});
