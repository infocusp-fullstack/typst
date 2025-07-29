import { createClient } from "@supabase/supabase-js";

// Update the getSupabaseUrl and getSupabaseAnonKey functions to handle environment variables better

// Replace the getSupabaseUrl function with:
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not defined");
    return "https://example.supabase.co"; // Fallback for development
  }
  return url;
};

// Replace the getSupabaseAnonKey function with:
const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
    return "public-anon-key"; // Fallback for development
  }
  return key;
};

// Create a single supabase client for the browser
let browserClient: ReturnType<typeof createClient> | null = null;

export const getBrowserClient = () => {
  if (browserClient) return browserClient;

  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseAnonKey = getSupabaseAnonKey();

    browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return browserClient;
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    throw error;
  }
};

// Update the getServerClient function to handle environment variables better:
export const getServerClient = () => {
  try {
    // Server-side variables should not have NEXT_PUBLIC_ prefix
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.warn("SUPABASE_URL is not defined");
      throw new Error("SUPABASE_URL is required");
    }

    if (!supabaseAnonKey) {
      console.warn("SUPABASE_ANON_KEY is not defined");
      throw new Error("SUPABASE_ANON_KEY is required");
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error("Error creating Supabase server client:", error);
    throw error;
  }
};
