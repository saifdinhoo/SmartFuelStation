import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NotificationsDropdown } from './NotificationsDropdown';
import type { Notification } from '@/features/notifications/types';

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    userId: 1,
    type: 'BOOKING_CREATED',
    title: 'New booking',
    message: 'A customer requested Oil Change for 3:00 PM.',
    isRead: false,
    relatedBookingId: null,
    relatedProviderId: null,
    relatedReviewId: null,
    relatedQueueEntryId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderDropdown(props: Partial<React.ComponentProps<typeof NotificationsDropdown>> = {}) {
  const onMarkRead = vi.fn();
  const onMarkAllRead = vi.fn();
  render(
    <MemoryRouter>
      <NotificationsDropdown
        notifications={[]}
        unreadCount={0}
        role="CUSTOMER"
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onMarkRead, onMarkAllRead };
}

describe('NotificationsDropdown', () => {
  it('shows the unread badge only when there are unread notifications', () => {
    const { rerender } = render(
      <MemoryRouter>
        <NotificationsDropdown
          notifications={[]}
          unreadCount={0}
          role="CUSTOMER"
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <NotificationsDropdown
          notifications={[notification()]}
          unreadCount={2}
          role="CUSTOMER"
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('Notifications (2 unread)')).toBeInTheDocument();
  });

  it('marks a notification as read when clicked', async () => {
    const user = userEvent.setup();
    const { onMarkRead } = renderDropdown({ notifications: [notification()], unreadCount: 1 });

    await user.click(screen.getByLabelText('Notifications (1 unread)'));
    await user.click(screen.getByText('New booking'));

    expect(onMarkRead).toHaveBeenCalledWith(1);
  });

  it('calls onMarkAllRead when "Mark all read" is clicked', async () => {
    const user = userEvent.setup();
    const { onMarkAllRead } = renderDropdown({ notifications: [notification()], unreadCount: 1 });

    await user.click(screen.getByLabelText('Notifications (1 unread)'));
    await user.click(screen.getByText('Mark all read'));

    expect(onMarkAllRead).toHaveBeenCalled();
  });

  it('does not navigate for a booking notification when the role has no booking-detail route (ADMIN)', async () => {
    const user = userEvent.setup();
    const { onMarkRead } = renderDropdown({
      notifications: [notification({ relatedBookingId: 9 })],
      unreadCount: 1,
      role: 'ADMIN',
    });

    await user.click(screen.getByLabelText('Notifications (1 unread)'));
    await user.click(screen.getByText('New booking'));

    // Still marks read — just doesn't attempt a dead navigation.
    expect(onMarkRead).toHaveBeenCalledWith(1);
  });

  it.each([
    ['CUSTOMER', '/customer/bookings/9'],
    ['PROVIDER', '/provider/bookings/9'],
  ])('navigates a %s to the real booking-detail route for their role', async (role, expectedPath) => {
    function LocationProbe() {
      return <p data-testid="location">{useLocation().pathname}</p>;
    }

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/start']}>
        <NotificationsDropdown
          notifications={[notification({ relatedBookingId: 9 })]}
          unreadCount={1}
          role={role}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Notifications (1 unread)'));
    await user.click(screen.getByText('New booking'));

    expect(screen.getByTestId('location')).toHaveTextContent(expectedPath);
  });
});
