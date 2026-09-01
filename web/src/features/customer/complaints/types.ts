export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface MyComplaint {
  id: number;
  subject: string;
  details: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  provider: { id: number; businessName: string };
}

export interface CreateComplaintInput {
  providerId: number;
  subject: string;
  details?: string;
  severity: ComplaintSeverity;
}
