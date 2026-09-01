export interface MyFavorite {
  id: number;
  createdAt: string;
  provider: {
    id: number;
    businessName: string;
    address: string;
    isOpen: boolean;
    estimatedWaitMinutes: number;
  };
}
