import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DialogProvider } from "@/hooks/useDialog";

export const metadata = {
  title: "Infocusp Resumes",
  description: "A modern document editor with real-time preview",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    apple: [{ url: "/app-icon.ico", sizes: "180x180", type: "image/x-icon" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <DialogProvider>{children}</DialogProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
