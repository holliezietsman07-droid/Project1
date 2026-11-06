import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { db, errorText, type Row } from '@/lib/academy';

export function PrivateFileButton({ fileId, label = 'Open private file' }: { fileId: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function open() {
    if (busy) return;
    const preview = window.open('', '_blank');
    if (preview) preview.opener = null;
    setBusy(true); setError('');
    try {
      if (!preview) throw new Error('Allow a new tab to view this private file.');
      const { data: file, error: failure } = await db().from('hka_files').select('path').eq('id', fileId).single();
      if (failure) throw failure;
      if (!file?.path) throw new Error('This file is unavailable or outside your authorised access.');
      const { data, error: signingError } = await db().storage.from('hka-private').createSignedUrl(String(file.path), 60);
      if (signingError) throw signingError;
      if (!data?.signedUrl) throw new Error('The file could not be opened.');
      preview.location.replace(data.signedUrl);
    } catch (failure) {
      preview?.close();
      setError(errorText(failure));
    } finally { setBusy(false); }
  }
  return <div className='min-w-0'><Button type='button' variant='outline' size='sm' className='h-auto min-h-10 max-w-full whitespace-normal break-words text-left' disabled={busy} onClick={() => void open()}>{busy ? 'Opening file...' : label}</Button>{error && <p role='alert' className='mt-2 text-xs text-destructive'>{error}</p>}</div>;
}

export function LessonMaterials({ lessonId }: { lessonId: string }) {
  const materials = useQuery({
    queryKey: ['lesson-materials', lessonId],
    queryFn: async () => {
      const { data, error } = await db().from('hka_files').select('id,original_name').eq('lesson_id', lessonId).eq('purpose', 'material');
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  return <section className='mt-6 min-w-0 space-y-3' aria-label='Lesson materials'>
    <h3 className='text-sm font-semibold'>Private lesson materials</h3>
    {materials.isLoading ? <p role='status' className='text-sm'>Loading materials...</p> : materials.error ? <p role='alert' className='text-sm text-destructive'>{errorText(materials.error)}</p> : materials.data?.length ? materials.data.map(file => <PrivateFileButton key={file.id} fileId={file.id} label={String(file.original_name || 'Open lesson material')} />) : <p className='text-sm text-muted-foreground'>No materials attached.</p>}
  </section>;
}
