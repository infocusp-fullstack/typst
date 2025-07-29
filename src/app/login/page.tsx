"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "@/components/Login"; // Adjust path as needed
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
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
