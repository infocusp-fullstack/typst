"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { Mail, Loader2, ArrowRight, Moon, Sun } from "lucide-react";

type MessageType = "idle" | "success" | "error" | "info";
type LoadingState = "idle" | "busy" | "success" | "error";

export default function Login() {
  const { signInWithMagicLink, signInWithGoogle } = useAuth();
  const { theme, setTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<LoadingState>("idle");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("idle");
  const [googleLoading, setGoogleLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "busy") return;

    const emailValue = email.trim().toLowerCase();

    if (!emailValue || !emailValue.includes("@")) {
      showMessage("Please enter a valid email address", "error");
      return;
    }

    if (!emailValue.endsWith("@infocusp.com")) {
      showMessage(
        "Access restricted to Infocusp employees only. Please use your @infocusp.com email address.",
        "error",
      );
      return;
    }

    setStatus("busy");
    setMessage("");
    setMessageType("idle");

    try {
      const { error } = await signInWithMagicLink(emailValue);

      if (error) {
        setStatus("error");
        showMessage(
          error.message || "Failed to send magic link. Please try again.",
          "error",
        );
      } else {
        setStatus("success");
        showMessage(
          "Magic link sent! Check your email and click the link to sign in.",
          "success",
        );
      }
    } catch {
      setStatus("error");
      showMessage("An unexpected error occurred. Please try again.", "error");
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
          "error",
        );
      }
    } catch {
      showMessage("An unexpected error occurred. Please try again.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (messageType === "error") {
      setMessage("");
      setMessageType("idle");
    }
  };

  const handleInputFocus = () => {
    if (messageType === "error") {
      setMessage("");
      setMessageType("idle");
    }
  };

  const handleInputBlur = () => {
    // Handle blur if needed
  };

  const getMessageClasses = () => {
    const baseClasses = "text-sm font-medium p-3 rounded-md";
    switch (messageType) {
      case "success":
        return `${baseClasses} bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`;
      case "error":
        return `${baseClasses} bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`;
      case "info":
        return `${baseClasses} bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`;
      default:
        return "";
    }
  };

  const getButtonText = () => {
    switch (status) {
      case "busy":
        return "Sending...";
      case "success":
        return "Check your email";
      case "error":
        return "Try again";
      default:
        return "Send Magic Link";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Top Bar */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="flex h-14 items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                T
              </span>
            </div>
            <span className="font-semibold text-lg">Typst Resume</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Login Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Typst Resume
            </h1>
          </div>

          {/* Login Card */}
          <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-semibold text-center">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-center">
                Sign in to access your documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full h-12 text-base font-medium"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      ref={inputRef}
                      id="email"
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder="your.name@infocusp.com"
                      className="pl-10 h-12 text-base"
                      disabled={status === "busy"}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={status === "busy" || status === "success"}
                >
                  {status === "busy" ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {getButtonText()}
                    </>
                  ) : (
                    <>
                      {getButtonText()}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>

              {/* Message Display */}
              {message && <div className={getMessageClasses()}>{message}</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
