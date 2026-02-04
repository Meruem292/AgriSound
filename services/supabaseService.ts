
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const getEnv = (key: string): string | undefined => {
  const findInObject = (obj: any) => {
    if (!obj) return undefined;
    if (obj[key]) return obj[key];
    if (!key.startsWith('VITE_') && obj[`VITE_${key}`]) return obj[`VITE_${key}`];
    if (!key.startsWith('NEXT_PUBLIC_') && obj[`NEXT_PUBLIC_${key}`]) return obj[`NEXT_PUBLIC_${key}`];
    return undefined;
  };

  const fromProcess = findInObject(process.env);
  if (fromProcess) return fromProcess;

  try {
    // @ts-ignore
    const viteEnv = import.meta.env;
    const fromVite = findInObject(viteEnv);
    if (fromVite) return fromVite;
  } catch (e) {}

  return undefined;
};

const getSupabase = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

  if (!url || !key) {
    console.error(`AgriSound Error: Supabase configuration missing. URL Found: ${!!url}, Key Found: ${!!key}`);
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
    if (!client) {
      throw new Error("Supabase is not configured. Please check your deployment secrets.");
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
