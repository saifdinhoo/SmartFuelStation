export interface ServiceCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategoryInput {
  name: string;
  description?: string;
}
