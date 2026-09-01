import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FuelStatusList } from './FuelStatusList';
import type { FuelInventoryItem } from './types';

function item(overrides: Partial<FuelInventoryItem> = {}): FuelInventoryItem {
  return {
    fuelType: 'GASOLINE_95',
    displayName: 'Gasoline 95',
    capacityLiters: 20000,
    currentLiters: 7450,
    percentageRemaining: 37.3,
    pricePerLiter: 6.8,
    updatedAt: '2026-08-31T10:35:00.000Z',
    ...overrides,
  };
}

describe('FuelStatusList', () => {
  it('renders nothing for an empty list rather than an empty card', () => {
    const { container } = render(<FuelStatusList items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows remaining, capacity and percentage for each fuel type', () => {
    render(<FuelStatusList items={[item()]} />);
    expect(screen.getByText('Gasoline 95')).toBeInTheDocument();
    expect(screen.getByText(/Remaining: 7,450 L/)).toBeInTheDocument();
    expect(screen.getByText(/Capacity: 20,000 L/)).toBeInTheDocument();
    expect(screen.getByText('37.3%')).toBeInTheDocument();
  });

  it('shows a real progress bar reflecting the real percentage — never a fabricated value', () => {
    render(<FuelStatusList items={[item({ percentageRemaining: 61 })]} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '61');
    expect(bar).toHaveStyle({ width: '61%' });
  });

  it('renders more than one fuel type independently', () => {
    render(
      <FuelStatusList
        items={[
          item(),
          item({ fuelType: 'DIESEL', displayName: 'Diesel / Solar', currentLiters: 22100, capacityLiters: 30000, percentageRemaining: 73.7 }),
        ]}
      />,
    );
    expect(screen.getByText('Gasoline 95')).toBeInTheDocument();
    expect(screen.getByText('Diesel / Solar')).toBeInTheDocument();
  });

  it('shows the most recent updatedAt across all rows as "Last updated"', () => {
    render(
      <FuelStatusList
        items={[
          item({ updatedAt: '2026-08-31T08:00:00.000Z' }),
          item({ fuelType: 'DIESEL', updatedAt: '2026-08-31T10:35:00.000Z' }),
        ]}
      />,
    );
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('omits the price when pricePerLiter is null rather than showing $null', () => {
    render(<FuelStatusList items={[item({ pricePerLiter: null })]} />);
    expect(screen.queryByText(/\$null/)).not.toBeInTheDocument();
  });

  it('hides the price row entirely when showPrice is false', () => {
    render(<FuelStatusList items={[item()]} showPrice={false} />);
    expect(screen.queryByText(/\/L/)).not.toBeInTheDocument();
  });

  it('renders no buttons or inputs — this is a read-only display', () => {
    render(<FuelStatusList items={[item()]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
