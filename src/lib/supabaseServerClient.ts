import { createClient } from "@supabase/supabase-js";

const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
  }
  return url;
};

const getServiceRoleKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  return key;
};

let adminClient: ReturnType<typeof createClient> | null = null;

export const getServerAdminClient = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Server admin client can only be used on the server side');
  }

  if (adminClient) return adminClient;

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
};
