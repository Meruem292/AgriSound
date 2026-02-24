
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Aggressively searches for an environment variable across common storage locations
 * and with common framework prefixes.
 */
const getEnv = (key: string): string | undefined => {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = (typeof process !== 'undefined' ? process.env : {}) || {};

  const check = (k: string) => {
    if (metaEnv[k]) return metaEnv[k];
    if (procEnv[k]) return procEnv[k];
    return undefined;
  };

  // 1. Exact match
  let val = check(key);
  if (val) return val;

  // 2. Framework-specific prefixes
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'VITE_NEXT_PUBLIC_'];
  for (const p of prefixes) {
    val = check(`${p}${key}`);
    if (val) return val;
  }

  // 3. Scan all keys for a suffix match (case insensitive)
  const allKeys = [...Object.keys(metaEnv), ...Object.keys(procEnv)];
  const upperKey = key.toUpperCase();
  for (const k of allKeys) {
    if (k.toUpperCase().endsWith(upperKey)) {
      const found = check(k);
      if (found) return found;
    }
  }

  return undefined;
};

const getSupabase = (): { client: SupabaseClient | null; missingKeys: string[] } => {
  if (supabaseInstance) return { client: supabaseInstance, missingKeys: [] };
  
  // Try all possible URL variations based on the user's dashboard screenshot
  const url = getEnv('SUPABASE_URL') || 
              getEnv('NEXT_PUBLIC_SUPABASE_URL') ||
              getEnv('VITE_SUPABASE_URL');
  
  // Try all possible Key variations (Supabase Anon Key is the primary one)
  const key = getEnv('SUPABASE_ANON_KEY') || 
              getEnv('SUPABASE_PUBLISHABLE_KEY') || 
              getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  
  const missingKeys = [];
  if (!url) missingKeys.push('SUPABASE_URL');
  if (!key) missingKeys.push('SUPABASE_ANON_KEY / PUBLISHABLE_KEY');

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key);
      return { client: supabaseInstance, missingKeys: [] };
    } catch (err) {
      console.error("Supabase initialization error:", err);
      return { client: null, missingKeys: ['INITIALIZATION_ERROR'] };
    }
  }
  
  return { client: null, missingKeys };
};

const BUCKET_NAME = 'sounds';

export const supabaseService = {
  uploadSound: async (file: File | Blob, fileName: string): Promise<{ publicUrl: string; storagePath: string }> => {
    const { client, missingKeys } = getSupabase();
    
    if (!client) {
      const msg = `SUPABASE CONFIGURATION MISSING:\n\nThe app could not find your Supabase credentials.\n\nRequired: ${missingKeys.join(', ')}\n\nPlease ensure your dashboard has:\n- VITE_NEXT_PUBLIC_SUPABASE_URL\n- VITE_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY\n(Or similar prefixes)`;
      alert(msg);
      throw new Error(msg);
    }

    const path = `${Date.now()}-${fileName}`;
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, file);

    if (error) {
      const errObj = error as any;
      
      if (errObj.status === 403 || errObj.message?.includes('row-level security')) {
        const msg = `RLS POLICY VIOLATION (403):\n\nYour policies are blocking the upload.\n\nTo fix:\n1. Supabase > Storage > Policies\n2. New policy for "${BUCKET_NAME}"\n3. Select "Full access" for anon users.`;
        alert(msg);
        throw new Error(msg);
      }
      
      if (errObj.status === 404 || errObj.message?.toLowerCase().includes('not found')) {
        const msg = `Bucket "${BUCKET_NAME}" not found.\n\nPlease create a PUBLIC bucket named exactly "${BUCKET_NAME}" in Supabase Storage.`;
        alert(msg);
        throw new Error(msg);
      }
      throw error;
    }

    const { data: { publicUrl } } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return { publicUrl, storagePath: path };
  },

  listSounds: async (): Promise<{ name: string; url: string }[]> => {
    const { client } = getSupabase();
    if (!client) return [];

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .list('', { limit: 100 });

    if (error) {
      console.error("Error listing sounds:", error);
      return [];
    }

    return (data || []).map(file => {
      const { data: { publicUrl } } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(file.name);
      return {
        name: file.name,
        url: publicUrl
      };
    });
  },

  deleteSound: async (url: string): Promise<void> => {
    const { client } = getSupabase();
    if (!client) return;
    try {
      const urlParts = url.split('/');
      const path = urlParts[urlParts.length - 1];
      if (path) await client.storage.from(BUCKET_NAME).remove([path]);
    } catch (e) {}
  }
};
