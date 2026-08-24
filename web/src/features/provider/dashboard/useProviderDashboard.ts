import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchBookings } from '@/features/customer/bookings/bookingsApi';
import { fetchOwnAnalytics, fetchOwnReviews } from '@/features/provider/profile/providerProfileApi';
import { useOwnProviderProfile } from '@/features/provider/profile/useOwnProviderProfile';

export type DashboardViewState = 'loading' | 'error' | 'ready';

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Composed entirely from real sources: /providers/me (business + rating),
// /bookings (provider-scoped by the server) and /providers/me/analytics.
// Queue figures are deliberately absent — ProviderOverview reads those from
// useProviderQueue so there is one queue implementation, not two.
export function useProviderDashboard() {
  const { profile, isPending: profilePending, isError: profileError } = useOwnProviderProfile();

  const bookingsQuery = useQuery({ queryKey: ['bookings'], queryFn: fetchBookings });
  const analyticsQuery = useQuery({
    queryKey: ['provider', 'me', 'analytics', '7d'],
    queryFn: () => fetchOwnAnalytics('7d'),
  });
  const reviewsQuery = useQuery({
    queryKey: ['provider', 'me', 'reviews', profile?.id],
    queryFn: () => fetchOwnReviews(profile!.id),
    enabled: profile !== undefined,
  });

  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);

  const todayBookings = useMemo(
    () => bookings.filter((b) => isToday(b.scheduledAt)).length,
    [bookings],
  );

  // "Upcoming" is relative to when the bookings were actually fetched, not
  // to render time — reading the clock during render is impure and would
  // make this recompute unpredictably on unrelated re-renders.
  const fetchedAt = bookingsQuery.dataUpdatedAt;

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            new Date(b.scheduledAt).getTime() >= fetchedAt &&
            !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status),
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
        .slice(0, 5)
        .map((b) => ({
          id: String(b.id),
          customerName: b.customer.name,
          service: b.providerService.name,
          time: new Date(b.scheduledAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
        })),
    [bookings, fetchedAt],
  );

  // Last 7 days of real bookings, bucketed by weekday name.
  const weeklyBookings = useMemo(() => {
    const points: { day: string; bookings: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const match = analyticsQuery.data?.trend.find((t) => t.label === key);
      points.push({ day: DAY_LABELS[d.getDay()], bookings: match?.bookings ?? 0 });
    }
    return points;
  }, [analyticsQuery.data]);

  const reviews = useMemo(
    () =>
      (reviewsQuery.data ?? []).slice(0, 5).map((r) => ({
        id: String(r.id),
        customerName: r.customer.name,
        rating: r.rating,
        comment: r.comment ?? '',
        date: new Date(r.createdAt).toLocaleDateString(),
      })),
    [reviewsQuery.data],
  );

  const isPending = profilePending || bookingsQuery.isPending || analyticsQuery.isPending;
  const isError = profileError || bookingsQuery.isError || analyticsQuery.isError;

  const data = profile
    ? {
        businessName: profile.businessName,
        isOpen: profile.isOpen,
        todayBookings,
        completedServices: analyticsQuery.data?.summary.completedBookings ?? 0,
        averageRating: profile.rating.averageRating,
        reviewCount: profile.rating.reviewCount,
        upcomingBookings,
        services: profile.services.map((s) => ({
          id: String(s.id),
          name: s.name,
          available: s.isAvailable,
        })),
        weeklyBookings,
        reviews,
      }
    : null;

  const viewState: DashboardViewState = isPending ? 'loading' : isError ? 'error' : 'ready';

  return {
    data,
    viewState,
    errorMessage: bookingsQuery.isError
      ? getErrorMessage(bookingsQuery.error, 'Could not load your dashboard')
      : null,
    reload: () => {
      bookingsQuery.refetch();
      analyticsQuery.refetch();
      reviewsQuery.refetch();
    },
  };
}
