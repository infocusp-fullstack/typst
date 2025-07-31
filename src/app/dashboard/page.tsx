"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui/loading";

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <Loading text="Loading..." fullScreen />;
  }

  // Don't render anything if user is not authenticated (redirect is happening)
  if (!user) {
    return null;
  }

  // Pass user info and signOut function to Dashboard component
  return <Dashboard user={user} signOut={signOut} />;
}
