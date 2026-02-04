
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Lazy initializer for the Supabase client.
 * This prevents the app from crashing on load if environment variables are missing.
 */
const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || url === 'YOUR_SUPABASE_URL' || !key || key.startsWith('sb_publishable_')) {
    // Note: Checking for the placeholder prefix to see if the user hasn't replaced it yet
    if (!url || url === 'YOUR_SUPABASE_URL') {
      console.error("AgriSound Error: NEXT_PUBLIC_SUPABASE_URL is missing or invalid in .env");
    }
    return null;
  }

  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (err) {
    console.error("AgriSound Error: Failed to initialize Supabase client:", err);
    return null;
  }
};

const BUCKET_NAME = 'sounds';

export const supabaseService = {
  /**
   * Uploads an audio file to Supabase Storage.
   */
  uploadSound: async (file: File | Blob, fileName: string): Promise<string> => {
    const client = getSupabase();
    if (!client) {
      throw new Error("Supabase is not configured. Please check your .env file.");
    }

    const path = `${Date.now()}-${fileName}`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return publicUrl;
  },

  /**
   * Deletes a sound from Supabase Storage.
   */
  deleteSound: async (url: string): Promise<void> => {
    const client = getSupabase();
    if (!client) return;

    try {
      // Extract the filename/path from the public URL
      const urlParts = url.split('/');
      const path = urlParts[urlParts.length - 1];
      
      if (path) {
        await client.storage.from(BUCKET_NAME).remove([path]);
      }
    } catch (e) {
      console.error("AgriSound Error: Failed to delete from Supabase storage", e);
    }
  }
};
