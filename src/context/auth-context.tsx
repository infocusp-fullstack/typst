"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabaseClient";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialSessionCheck, setHasInitialSessionCheck] = useState(false);
  const router = useRouter();

  const getSupabase = () => {
    try {
      return getBrowserClient();
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setIsLoading(false);
          return;
        }

        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setUser(data.session?.user ?? null);
        setHasInitialSessionCheck(true);
      } catch {
        setIsLoading(false);
      }
    };

    getSession();

    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        setSession(session);
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
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      setIsLoading(false);
    }
  }, [router, hasInitialSessionCheck, user]);

  const signInWithMagicLink = async (email: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        return { error: new Error("Supabase client initialization failed") };
      }

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
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
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
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch {
      // Handle sign out error silently
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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
