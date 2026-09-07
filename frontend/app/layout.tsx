import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Space_Grotesk, Space_Mono } from "next/font/google";
import PwaInstaller from "@/components/PwaInstaller";
import SearchSpotlight from "@/components/SearchSpotlight";
import { ThemeProvider } from "@/hooks/useTheme";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  themeColor: "#ffe600",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Streamix",
  description: "Private Encrypted Workspace",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Streamix",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bricolage.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-background text-foreground transition-colors duration-150">
        <ThemeProvider>
          {children}
          <SearchSpotlight />
          <PwaInstaller />
        </ThemeProvider>
      </body>
    </html>
  );
}
