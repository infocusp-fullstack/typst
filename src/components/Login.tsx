"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { Loader2, Moon, Sun } from "lucide-react";

type MessageType = "idle" | "success" | "error" | "info";

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const { theme, setTheme } = useTheme();

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("idle");
  const [googleLoading, setGoogleLoading] = useState(false);

  const showMessage = (text: string, type: MessageType = "info") => {
    setMessage(text);
    setMessageType(type);

    if (type === "error") {
      setTimeout(() => {
        setMessage("");
        setMessageType("idle");
      }, 8000);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleLoading) return;

    setGoogleLoading(true);
    setMessage("");
    setMessageType("idle");

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        showMessage(
          error.message || "Google sign-in failed. Please try again.",
          "error"
        );
      }
    } catch {
      showMessage("An unexpected error occurred. Please try again.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Navigation handlers
  const handleTermsClick = () => {
    // Redirect to Google's Terms of Service
    window.open(
      "https://policies.google.com/terms",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handlePrivacyClick = () => {
    // Redirect to Google's Privacy Policy
    window.open(
      "https://policies.google.com/privacy",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleContactSupport = () => {
    window.open("https://support.google.com/", "_blank", "noopener,noreferrer");
  };

  const getMessageClasses = () => {
    const baseClasses =
      "text-sm font-medium p-4 rounded-lg border transition-all duration-200";
    switch (messageType) {
      case "success":
        return `${baseClasses} bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30`;
      case "error":
        return `${baseClasses} bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/30`;
      case "info":
        return `${baseClasses} bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30`;
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-indigo-950/20 transition-colors duration-300">
      {/* Top Bar */}
      <header className="border-b border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/70">
        <div className="flex h-16 items-center gap-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="font-semibold text-xl text-gray-900 dark:text-white">
              Typst Resume
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-10 w-10 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 transition-all duration-200"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-500 dark:via-indigo-500 dark:to-purple-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/25 dark:shadow-blue-500/10">
              <span className="text-white font-bold text-3xl">T</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
                Typst Resume
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Create beautiful documents with ease
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="shadow-2xl shadow-blue-500/10 dark:shadow-none border-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl ring-1 ring-gray-200/50 dark:ring-gray-800/50">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400 text-base">
                Sign in to access your documents and continue creating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full h-14 text-base font-semibold border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-gray-900 dark:text-white transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin text-blue-600" />
                ) : (
                  <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              {/* Message Display */}
              {message && (
                <div className={getMessageClasses()}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {messageType === "error" && (
                        <span className="text-lg">⚠️</span>
                      )}
                      {messageType === "success" && (
                        <span className="text-lg">✅</span>
                      )}
                      {messageType === "info" && (
                        <span className="text-lg">ℹ️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By continuing, you agree to our{" "}
                  <button
                    onClick={handleTermsClick}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm px-1 py-0.5"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button
                    onClick={handlePrivacyClick}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm px-1 py-0.5"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help?{" "}
              <button
                onClick={handleContactSupport}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm px-1 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                Contact Support
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
