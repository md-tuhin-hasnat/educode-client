import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusPill from '../StatusPill';

describe('StatusPill Component', () => {
  it('renders success status pill with default label', () => {
    render(<StatusPill status="success" />);
    expect(screen.getByTestId('status-pill-success')).toHaveTextContent('Passed');
  });

  it('renders error status pill with custom label', () => {
    render(<StatusPill status="error" label="Compilation Error" />);
    expect(screen.getByTestId('status-pill-error')).toHaveTextContent('Compilation Error');
  });

  it('renders running status pill', () => {
    render(<StatusPill status="running" />);
    expect(screen.getByTestId('status-pill-running')).toHaveTextContent('Executing');
  });
});
