
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET_NAME = 'sounds';

export const supabaseService = {
  /**
   * Uploads an audio file to Supabase Storage.
   */
  uploadSound: async (file: File | Blob, fileName: string): Promise<string> => {
    const path = `${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return publicUrl;
  },

  /**
   * Deletes a sound from Supabase Storage.
   */
  deleteSound: async (url: string): Promise<void> => {
    try {
      const path = url.split('/').pop();
      if (path) {
        await supabase.storage.from(BUCKET_NAME).remove([path]);
      }
    } catch (e) {
      console.error("Failed to delete from Supabase storage", e);
    }
  }
};
