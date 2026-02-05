
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const getEnv = (key: string): string | undefined => {
  const searchKeys = [`VITE_${key}`, key, `NEXT_PUBLIC_${key}`];
  for (const k of searchKeys) {
    try {
      const meta = (import.meta as any);
      if (typeof meta !== 'undefined' && meta.env && meta.env[k]) return meta.env[k];
    } catch (e) {}
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env[k]) return process.env[k];
    } catch (e) {}
  }
  return undefined;
};

const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;
  const url = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  if (!url || !key) return null;
  try {
    supabaseInstance = createClient(url, key);
    return supabaseInstance;
  } catch (err) {
    return null;
  }
};

const BUCKET_NAME = 'sounds';

export const supabaseService = {
  uploadSound: async (file: File | Blob, fileName: string): Promise<string> => {
    const client = getSupabase();
    if (!client) throw new Error("Supabase not configured.");

    const path = `${Date.now()}-${fileName}`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, file);

    if (error) {
      const errObj = error as any;
      
      if (errObj.status === 403 || errObj.message?.includes('row-level security')) {
        const msg = `RLS POLICY VIOLATION (403):\n\nYour screenshot shows policies for "JPG images" in "specific folders".\n\nTo fix this:\n1. Delete those restrictive policies.\n2. Click "New Policy" on the "${BUCKET_NAME}" bucket.\n3. Choose "Full Access to all users".\n4. Ensure it applies to INSERT, SELECT, and DELETE.\n5. Ensure it is NOT restricted to JPG files or specific folders.`;
        alert(msg);
        throw new Error(msg);
      }
      
      if (errObj.status === 404 || errObj.message?.toLowerCase().includes('not found')) {
        const msg = `Bucket "${BUCKET_NAME}" not found. Create a public bucket named "${BUCKET_NAME}" (lowercase).`;
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
      if (path) await client.storage.from(BUCKET_NAME).remove([path]);
    } catch (e) {}
  }
};
