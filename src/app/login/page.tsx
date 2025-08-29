"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Login from "@/components/Login"; // Adjust path as needed
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      const redirect = searchParams.get("redirect");
      router.push(redirect || "/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <Login />;
}
