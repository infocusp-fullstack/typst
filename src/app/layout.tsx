import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DialogProvider } from "@/hooks/useDialog";

export const metadata = {
  title: "Infocusp Resumes",
  description: "A modern document editor with real-time preview",
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
