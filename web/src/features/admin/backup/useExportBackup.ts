import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { downloadBackup } from './backupApi';

export function useExportBackup() {
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: downloadBackup,
    onSuccess: () => {
      showToast({ title: 'Backup downloaded', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not export a backup'),
        variant: 'destructive',
      });
    },
  });

  return {
    exportBackup: () => mutation.mutateAsync(),
    isExporting: mutation.isPending,
  };
}
