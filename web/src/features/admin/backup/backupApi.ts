import { apiClient } from '@/services/apiClient';

// The one deliberate exception to this app's usual {success,data} envelope
// convention: the backend sends the raw JSON snapshot as the entire body,
// with real download headers (see admin.controller.js's exportBackup), so
// what the browser saves is exactly the backup file — not an API response
// wrapper around it.
function filenameFromContentDisposition(header: string | undefined): string {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? 'smart-automotive-backup.json';
}

export async function downloadBackup(): Promise<void> {
  const response = await apiClient.post('/admin/backups/export', undefined, {
    responseType: 'blob',
  });

  const filename = filenameFromContentDisposition(response.headers['content-disposition']);
  const blob = new Blob([response.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
