"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabaseClient";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialSessionCheck, setHasInitialSessionCheck] = useState(false);
  const router = useRouter();

  // Initialize Supabase client only when needed
  const getSupabase = useCallback(() => {
    try {
      return getBrowserClient();
    } catch (error) {
      console.error("Failed to initialize Supabase client:", error);
      return null;
    }
  }, []);

  const handleAuthStateChange = useCallback(
    (event: string, session: any) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      if (hasInitialSessionCheck) {
        if (event === "SIGNED_IN" && session?.user && !user) {
          router.push("/dashboard");
        }

        if (event === "SIGNED_OUT") {
          router.push("/login");
        }
      }
    },
    [hasInitialSessionCheck, router]
  );

  useEffect(() => {
    const getSession = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user ?? null);
        setHasInitialSessionCheck(true);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(handleAuthStateChange);

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setIsLoading(false);
    }
  }, [getSupabase, handleAuthStateChange]);

  const signInWithMagicLink = useCallback(
    async (email: string) => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          return { error: new Error("Supabase client initialization failed") };
        }

        // Validate email domain
        if (!email.endsWith("@infocusp.com")) {
          return {
            error: new Error("Access restricted to Infocusp employees only"),
          };
        }

        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        return { error };
      } catch (error) {
        console.error("Magic link sign in error:", error);
        return { error: error as Error };
      }
    },
    [getSupabase]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: new Error("Supabase client initialization failed") };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      return { error };
    } catch (error) {
      console.error("Google sign in error:", error);
      return { error: error as Error };
    }
  }, [getSupabase]);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
      // No need to manually redirect here - the auth state change listener will handle it
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [getSupabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
