import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/src/shared/lib/providers";
import { ThemeInitScript } from "@/src/shared/components/ThemeInitScript";
import { MaintenanceBanner } from "@/src/shared/components/MaintenanceBanner";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/src/shared/components/seo/JsonLd";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const APP_NAME = "Vero";
const APP_DESCRIPTION =
  "Maritime Database and Management System – connect, collaborate, and grow your maritime business.";
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://system-db.example.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9faff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} | Home`,
    template: `${APP_NAME} | %s`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "maritime",
    "management system",
    "SaaS",
    "database",
    "technical services",
    "import export",
    "visa travel",
  ],
  authors: [{ name: APP_NAME }],
  robots: { index: true, follow: true },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: APP_URL,
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen overflow-y-auto bg-background text-foreground antialiased`}
      >
        <ThemeInitScript />
        <JsonLd
          data={organizationJsonLd({ name: APP_NAME, url: APP_URL, logo: `${APP_URL}/logo.png` })}
        />
        <JsonLd data={websiteJsonLd({ name: APP_NAME, url: APP_URL })} />
        <MaintenanceBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
