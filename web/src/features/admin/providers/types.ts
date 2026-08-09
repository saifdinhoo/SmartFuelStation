export interface AdminProviderService {
  id: number;
  name: string;
  price: string;
  durationMinutes: number;
  isAvailable: boolean;
  category: { id: number; name: string };
}

export interface AdminProvider {
  id: number;
  businessName: string;
  address: string;
  description: string | null;
  isApproved: boolean;
  isOpen: boolean;
  latitude: string | null;
  longitude: string | null;
  estimatedWaitMinutes: number;
  approvedAt: string | null;
  approvedById: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; email: string; phone: string | null };
  services: AdminProviderService[];
  _count: { reviews: number; queueEntries: number };
}
