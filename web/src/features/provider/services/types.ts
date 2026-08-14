export const SERVICE_CATEGORIES = [
  'Oil Change',
  'Tire Repair',
  'Battery Check',
  'Brake Inspection',
  'Car Wash',
  'General Inspection',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  available: boolean;
}

export type ServiceInput = Omit<Service, 'id'>;
