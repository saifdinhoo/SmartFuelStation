import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { fetchAuditLog } from './auditLogApi';
import type { AuditLogQuery } from './types';

export function useAuditLog(query: AuditLogQuery) {
  const result = useQuery({
    queryKey: ['adminAuditLog', query.page ?? 1, query.pageSize ?? 20, query.action ?? 'ALL', query.entityType ?? 'ALL'],
    queryFn: () => fetchAuditLog(query),
  });

  return {
    page: result.data,
    isPending: result.isPending,
    isError: result.isError,
    errorMessage: result.isError ? getErrorMessage(result.error, 'Could not load the audit log') : null,
    reload: () => result.refetch(),
  };
}
