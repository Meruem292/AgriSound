
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Universal environment variable accessor for Vite/Node.
 */
const getEnv = (key: string): string | undefined => {
  const searchKeys = [`VITE_${key}`, key, `NEXT_PUBLIC_${key}`];

  for (const k of searchKeys) {
    try {
      const meta = (import.meta as any);
      if (typeof meta !== 'undefined' && meta.env && meta.env[k]) {
        return meta.env[k];
      }
    } catch (e) {}

    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env[k]) {
        return process.env[k];
      }
    } catch (e) {}
  }
  return undefined;
};

const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

  if (!url || !key) {
    console.error(`AgriSound Error: Supabase configuration missing. Ensure keys like VITE_SUPABASE_URL exist.`);
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
  uploadSound: async (file: File | Blob, fileName: string): Promise<string> => {
    const client = getSupabase();
    if (!client) throw new Error("Supabase is not configured.");

    const path = `${Date.now()}-${fileName}`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, file);

    if (error) {
      // Handle the 404 Bucket Not Found error specifically
      if ((error as any).status === 404 || (error as any).message?.includes('not found')) {
        const msg = `Bucket "${BUCKET_NAME}" not found. Please go to your Supabase dashboard -> Storage, create a bucket named "${BUCKET_NAME}", and set it to "Public".`;
        alert(msg);
        throw new Error(msg);
      }
      throw error;
    }

    const { data: { publicUrl } } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return publicUrl;
  },

  deleteSound: async (url: string): Promise<void> => {
    const client = getSupabase();
    if (!client) return;

    try {
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
