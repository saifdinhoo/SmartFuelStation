import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LocationActions } from './LocationActions';

const openSpy = vi.fn();
beforeEach(() => {
  vi.stubGlobal('open', openSpy);
  openSpy.mockClear();
});

describe('LocationActions', () => {
  it('enables both actions with valid coordinates', () => {
    render(<LocationActions latitude={33.8938} longitude={35.5018} />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeEnabled();
  });

  it('opens the view-location URL, not the directions URL, from "View location"', async () => {
    const user = userEvent.setup();
    render(<LocationActions latitude={33.8938} longitude={35.5018} />);
    await user.click(screen.getByRole('button', { name: /view location/i }));
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=33.8938,35.5018',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('includes the customer origin when opening directions', async () => {
    const user = userEvent.setup();
    render(
      <LocationActions
        latitude={33.8938}
        longitude={35.5018}
        origin={{ lat: 33.89, lng: 35.5 }}
      />,
    );
    await user.click(screen.getByRole('button', { name: /get directions/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('origin=33.89,35.5'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('disables both actions when coordinates are missing and no address is given', () => {
    render(<LocationActions latitude={null} longitude={null} />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeDisabled();
  });

  it('still enables "View location" via an address fallback when coordinates are missing', () => {
    render(<LocationActions latitude={null} longitude={null} address="Hamra Street, Beirut" />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeEnabled();
    // Directions has no destination to route to even with an address string.
    expect(screen.getByRole('button', { name: /get directions/i })).toBeDisabled();
  });

  it('rejects out-of-range coordinates the same as missing ones', () => {
    render(<LocationActions latitude={999} longitude={35.5018} />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /get directions/i })).toBeDisabled();
  });

  it('can render just one action via the show* flags', () => {
    render(<LocationActions latitude={33.8938} longitude={35.5018} showDirections={false} />);
    expect(screen.getByRole('button', { name: /view location/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /get directions/i })).not.toBeInTheDocument();
  });
});
