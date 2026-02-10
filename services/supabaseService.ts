
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const getEnv = (key: string): string | undefined => {
  // 1. Try exact matches first
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  try {
    const meta = (import.meta as any);
    if (meta.env && meta.env[key]) return meta.env[key];
  } catch (e) {}

  // 2. Try common prefixes
  const prefixes = ['VITE_', 'NEXT_PUBLIC_', 'VITE_NEXT_PUBLIC_'];
  for (const pref of prefixes) {
    const fullKey = `${pref}${key}`;
    
    if (typeof process !== 'undefined' && process.env && process.env[fullKey]) {
      return process.env[fullKey];
    }
    
    try {
      const meta = (import.meta as any);
      if (meta.env && meta.env[fullKey]) {
        return meta.env[fullKey];
      }
    } catch (e) {}
  }

  // 3. Fallback to process.env.API_KEY logic if it was used for other things
  return undefined;
};

const getSupabase = (): { client: SupabaseClient | null; missingKeys: string[] } => {
  if (supabaseInstance) return { client: supabaseInstance, missingKeys: [] };
  
  // Aggressively search for URL
  const url = getEnv('SUPABASE_URL') || 
              getEnv('NEXT_PUBLIC_SUPABASE_URL');
  
  // Aggressively search for Key (covering all common variants seen in dashboards)
  const key = getEnv('SUPABASE_ANON_KEY') || 
              getEnv('SUPABASE_PUBLISHABLE_KEY') || 
              getEnv('SUPABASE_PUBLISHABLE_DEFAULT_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
              getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  
  const missingKeys = [];
  if (!url) missingKeys.push('SUPABASE_URL');
  if (!key) missingKeys.push('SUPABASE_ANON_KEY/PUBLISHABLE_KEY');

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
  uploadSound: async (file: File | Blob, fileName: string): Promise<string> => {
    const { client, missingKeys } = getSupabase();
    
    if (!client) {
      const msg = `SUPABASE CONFIGURATION MISSING:\n\nEnvironment variables not detected.\nFound keys: ${missingKeys.join(', ')}\n\nPlease ensure your platform dashboard has:\n- SUPABASE_URL\n- SUPABASE_ANON_KEY\n(Optionally with VITE_ or NEXT_PUBLIC_ prefixes)`;
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
        const msg = `RLS POLICY VIOLATION (403):\n\nYour policies might be too restrictive.\n\nTo fix this:\n1. Go to Supabase > Storage > Policies.\n2. Create a NEW policy for the "${BUCKET_NAME}" bucket.\n3. Select "Full access to all users" (SELECT, INSERT, UPDATE, DELETE).\n4. Role: anon.\n5. Condition: true (or empty).`;
        alert(msg);
        throw new Error(msg);
      }
      
      if (errObj.status === 404 || errObj.message?.toLowerCase().includes('not found')) {
        const msg = `Bucket "${BUCKET_NAME}" not found.\n\nPlease go to Supabase > Storage and create a PUBLIC bucket named exactly "${BUCKET_NAME}".`;
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
    const { client } = getSupabase();
    if (!client) return;
    try {
      const urlParts = url.split('/');
      const path = urlParts[urlParts.length - 1];
      if (path) await client.storage.from(BUCKET_NAME).remove([path]);
    } catch (e) {}
  }
};
