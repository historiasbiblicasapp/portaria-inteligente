import { supabase } from '@/lib/supabase';

export async function uploadFile(
  bucket: 'fotos' | 'documentos',
  file: File,
  path?: string
): Promise<string | null> {
  try {
    const ext = file.name.split('.').pop();
    const fileName = `${path || ''}${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro no upload:', error);
    return null;
  }
}

export async function deleteFile(bucket: 'fotos' | 'documentos', url: string): Promise<void> {
  try {
    const fileName = url.split('/').pop();
    if (fileName) {
      await supabase.storage
        .from(bucket)
        .remove([fileName]);
    }
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
  }
}
