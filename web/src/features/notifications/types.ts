export type NotificationType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_CANCELLED'
  | 'QUEUE_JOINED'
  | 'QUEUE_ALMOST_TURN'
  | 'SERVICE_STARTED'
  | 'SERVICE_COMPLETED'
  | 'NEW_REVIEW'
  | 'PROVIDER_REGISTERED'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedBookingId: number | null;
  relatedProviderId: number | null;
  relatedReviewId: number | null;
  relatedQueueEntryId: number | null;
  createdAt: string;
}
