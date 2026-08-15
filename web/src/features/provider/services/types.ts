// Services are real ProviderService rows now. Categories come from the
// /categories table rather than a hardcoded string union, so a service's
// category is an id that must actually exist in the database.
export interface Service {
  id: number;
  name: string;
  categoryId: number;
  category: string;
  price: number;
  durationMinutes: number;
  available: boolean;
}

export interface ServiceInput {
  name: string;
  categoryId: number;
  price: number;
  durationMinutes: number;
  available: boolean;
}
