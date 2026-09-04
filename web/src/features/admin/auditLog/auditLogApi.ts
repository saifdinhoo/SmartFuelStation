import { apiClient } from '@/services/apiClient';
import type { AuditLogPage, AuditLogQuery } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchAuditLog(query: AuditLogQuery): Promise<AuditLogPage> {
  const { data } = await apiClient.get<ApiEnvelope<AuditLogPage>>('/admin/audit-log', {
    params: {
      page: query.page,
      pageSize: query.pageSize,
      action: query.action && query.action !== 'ALL' ? query.action : undefined,
      entityType: query.entityType && query.entityType !== 'ALL' ? query.entityType : undefined,
    },
  });
  return data.data;
}
