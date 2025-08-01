import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { AppProvider } from "@/contexts/app-context";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { TranslationProvider } from "@/contexts/translation-context";

export const metadata: Metadata = {
  title: "FiscalFlow",
  description: "Your personal financial planning and expense management app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AppProvider>
          <TranslationProvider>
            {children}
            <Toaster />
            <CookieConsentBanner />
          </TranslationProvider>
        </AppProvider>
      </body>
    </html>
  );
}
