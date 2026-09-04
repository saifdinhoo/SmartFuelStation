export interface BookingPolicy {
  id: number;
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  allowSameDayBooking: boolean;
  updatedAt: string;
  updatedByAdminId: number | null;
}

export interface BookingPolicyInput {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
  allowSameDayBooking: boolean;
}
