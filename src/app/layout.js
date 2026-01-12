import AuthSessionProvider from "@/app/components/providers/SessionProvider";
import { AuthProvider } from "@/app/context/AuthContext";
import { LanguageProvider } from "@/app/context/LanguageContext";
import SocketProvider from "@/app/components/providers/SocketProvider";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Suplient - Mental Coach Platform",
  description: "Your personal mental coaching companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Suplient",
  },
  icons: {
    icon: "/assets/Suplient-logo.png",
    apple: "/assets/Suplient-logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
  viewportFit: "cover", // Enable safe area insets for iPhone notch/Dynamic Island
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="application-name" content="Suplient" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Suplient" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

        {/* iOS PWA Support */}
        <link rel="apple-touch-icon" href="/assets/Suplient-logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/assets/Suplient-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/Suplient-logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/assets/Suplient-logo.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/assets/Suplient-logo.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/assets/Suplient-logo.png" />

        {/* Android PWA Support */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Suplient" />

        {/* Windows PWA Support */}
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-TileImage" content="/assets/Suplient-logo.png" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Standard Icons */}
        <link rel="icon" type="image/png" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="48x48" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="144x144" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="384x384" href="/assets/Suplient-logo.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/assets/Suplient-logo.png" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/assets/Suplient-logo.png" />

        {/* Additional PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Suplient" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Open Graph / Social Media */}
        <meta property="og:title" content="Suplient - Mental Coach" />
        <meta property="og:description" content="Your personal mental coaching companion" />
        <meta property="og:image" content="/assets/icons/icon-512x512.svg" />
        <meta property="og:url" content="https://suplient.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Suplient - Mental Coach" />
        <meta name="twitter:description" content="Your personal mental coaching companion" />
        <meta name="twitter:image" content="/assets/icons/icon-512x512.svg" />
      </head>
      <body className={inter.className}>
        <AuthSessionProvider>
          <AuthProvider>
            <LanguageProvider>
              <SocketProvider>
                {children}
                <Toaster
                  position="top-right"
                  richColors
                  closeButton
                  classes={{
                    closeButton: 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'
                  }}
                />
              </SocketProvider>
            </LanguageProvider>
          </AuthProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
