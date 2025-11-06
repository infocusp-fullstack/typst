import { createClient } from "@supabase/supabase-js";

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.warn("NEXT_PUBLIC_SUPABASE_URL is not defined");
    return "https://example.supabase.co";
  }
  return url;
};

const getSupabaseAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined");
    return "public-anon-key";
  }
  return key;
};

let browserClient: ReturnType<typeof createClient> | null = null;

export const getAdminClient = () => {
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
