export interface MyReview {
  id: number;
  bookingId: number | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  provider: { id: number; businessName: string };
}

export interface CreateReviewInput {
  bookingId: number;
  rating: number;
  comment?: string;
}
