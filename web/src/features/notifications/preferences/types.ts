export interface NotificationPreferences {
  id: number;
  userId: number;
  bookingUpdates: boolean;
  queueUpdates: boolean;
  reviewUpdates: boolean;
  providerUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationPreferenceField =
  | 'bookingUpdates'
  | 'queueUpdates'
  | 'reviewUpdates'
  | 'providerUpdates';

export type NotificationPreferencesInput = Partial<
  Pick<NotificationPreferences, NotificationPreferenceField>
>;
