import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OperatingHoursList } from './OperatingHoursList';

describe('OperatingHoursList', () => {
  it('shows a not-configured message when no hours have been set at all', () => {
    render(<OperatingHoursList hours={[]} />);
    expect(screen.getByText(/hasn't set their operating hours yet/i)).toBeInTheDocument();
  });

  it('shows the open interval for a configured day', () => {
    render(
      <OperatingHoursList
        hours={[{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }]}
      />,
    );
    expect(screen.getByText('Monday')).toBeInTheDocument();
    expect(screen.getByText('09:00 – 18:00')).toBeInTheDocument();
  });

  it('shows "Closed" for an explicitly closed day', () => {
    render(
      <OperatingHoursList
        hours={[{ dayOfWeek: 'FRIDAY', isClosed: true, openTime: null, closeTime: null }]}
      />,
    );
    expect(screen.getByText('Friday')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('shows "Hours not set" for a weekday with no entry at all — never fabricated', () => {
    render(
      <OperatingHoursList
        hours={[{ dayOfWeek: 'MONDAY', isClosed: false, openTime: '09:00', closeTime: '18:00' }]}
      />,
    );
    // Tuesday has no entry in the fixture above.
    const row = screen.getByText('Tuesday').closest('li');
    expect(row).toHaveTextContent('Hours not set');
  });
});
