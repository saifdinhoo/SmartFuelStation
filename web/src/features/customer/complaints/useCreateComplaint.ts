import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/app/providers/ToastProvider';
import { getErrorMessage } from '@/utils/getErrorMessage';
import { createComplaint } from './complaintsApi';
import { MY_COMPLAINTS_KEY } from './useMyComplaints';
import type { CreateComplaintInput } from './types';

export function useCreateComplaint() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (input: CreateComplaintInput) => createComplaint(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MY_COMPLAINTS_KEY });
      showToast({ title: 'Complaint submitted', variant: 'success' });
    },
    onError: (err) => {
      showToast({
        title: getErrorMessage(err, 'Could not submit your complaint'),
        variant: 'destructive',
      });
    },
  });

  return {
    createComplaint: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
