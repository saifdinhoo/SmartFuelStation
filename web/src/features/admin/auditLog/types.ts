export const AUDIT_ACTIONS = [
  'PROVIDER_APPROVED',
  'PROVIDER_REJECTED',
  'CATEGORY_CREATED',
  'CATEGORY_UPDATED',
  'CATEGORY_DELETED',
  'FUEL_INVENTORY_UPDATED',
  'FINANCE_SETTLED',
  'COMMISSION_RATE_UPDATED',
  'BOOKING_STATUS_CHANGED',
  'BOOKING_POLICY_UPDATED',
  'SYSTEM_BACKUP_EXPORTED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  entityType: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: { id: number; name: string; email: string };
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  action?: AuditAction | 'ALL';
  entityType?: string | 'ALL';
}
