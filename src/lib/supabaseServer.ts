'use server'

import { createClient } from '@supabase/supabase-js';

// Get Supabase URL
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.warn('NEXT_PUBLIC_SUPABASE_URL is not defined');
    return 'https://example.supabase.co'; // Fallback for development
  }
  return url;
};

// Get service role key for admin operations
const getServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is not defined');
    return null;
  }
  return key;
};

// Create single admin client for all operations
let adminClient: ReturnType<typeof createClient> | null = null;

export const getAdminClient = async () => {
  if (adminClient) return adminClient;

  try {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = getServiceRoleKey();

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is required for admin operations",
      );
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return adminClient;
  } catch (error) {
    console.error("Error creating Supabase admin client:", error);
    throw error;
  }
};