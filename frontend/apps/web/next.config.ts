import type { NextConfig } from "next";
import path from "path";

const adminAppUrl = (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001").replace(
  /\/$/,
  ""
);

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy.
 * `unsafe-inline` is required by Next's inline runtime scripts (no nonce
 * setup) and Tailwind's inline styles; `unsafe-eval` only in development
 * for React Fast Refresh. Connect/img sources stay broad until the final
 * list of production origins is known.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data:",
  "connect-src 'self' https: http: ws: wss:",
  "frame-ancestors 'self'",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace dependencies from the monorepo root so standalone includes shared modules
  outputFileTracingRoot: path.join(process.cwd(), "../.."),

  // Remove the "X-Powered-By: Next.js" header to reduce fingerprinting surface
  devIndicators: false,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io", port: "" },
      { protocol: "https", hostname: "res.cloudinary.com", port: "" },
      { protocol: "https", hostname: "api.darkak.com.bd", pathname: "/uploads/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", port: "" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", port: "" },
      { protocol: "https", hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev", port: "" },
      { protocol: "https", hostname: "img.youtube.com", port: "" },
      { protocol: "https", hostname: "cdn.pixabay.com", port: "" },
      { protocol: "https", hostname: "ae01.alicdn.com", port: "" },
      { protocol: "https", hostname: "ae02.alicdn.com", port: "" },
      { protocol: "https", hostname: "ae03.alicdn.com", port: "" },
      { protocol: "https", hostname: "ae04.alicdn.com", port: "" },
      { protocol: "https", hostname: "example.com", port: "" },
      { protocol: "http", hostname: "api.marineleads.net", port: "" },
      { protocol: "https", hostname: "thumbs.dreamstime.com", port: "" },
      { protocol: "https", hostname: "images.unsplash.com", port: "" },
      { protocol: "https", hostname: "i.pravatar.cc", port: "" },
      { protocol: "https", hostname: "ui-avatars.com", port: "" },
      { protocol: "https", hostname: "flagcdn.com", port: "" },
      { protocol: "https", hostname: "api.qrserver.com", port: "" },
    ],
  },

  reactStrictMode: true,
  compress: true,

  // Pin Turbopack's workspace root to the monorepo (avoids slow/ambiguous FS roots).
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Production-only: keeps `next dev` free of the "Experiments (use with caution)" banner.
  ...(isDev
    ? {}
    : {
        experimental: {
          optimizeCss: true,
          optimizePackageImports: ["lucide-react", "recharts", "framer-motion", "date-fns"],
        },
      }),

  /**
   * Security headers applied to every response.
   * These are a baseline – tighten the CSP once you know all external origins.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Basic permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Strict-Transport-Security (HTTPS only)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content-Security-Policy – blocks injected external scripts (XSS hardening)
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/dashboard/affiliate",
        destination: "/affiliate/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/affiliate/:path*",
        destination: "/affiliate/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/user",
        destination: "/user/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/user/:path*",
        destination: "/user/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/business",
        destination: "/business/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/business/:path*",
        destination: "/business/:path*",
        permanent: true,
      },
      {
        source: "/admin",
        destination: `${adminAppUrl}/admin/dashboard`,
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: `${adminAppUrl}/admin/:path*`,
        permanent: false,
      },
      {
        source: "/account/admin/login",
        destination: `${adminAppUrl}/account/admin/login`,
        permanent: false,
      },
      {
        source: "/account/admin/login/:path*",
        destination: `${adminAppUrl}/account/admin/login/:path*`,
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/affiliate",
        destination: "/dashboard/affiliate/dashboard",
      },
      {
        source: "/affiliate/:path*",
        destination: "/dashboard/affiliate/:path*",
      },
      {
        source: "/user",
        destination: "/dashboard/user/dashboard",
      },
      {
        source: "/user/:path*",
        destination: "/dashboard/user/:path*",
      },
      {
        source: "/business",
        destination: "/dashboard/business/dashboard",
      },
      {
        source: "/business/:path*",
        destination: "/dashboard/business/:path*",
      },
    ];
  },
};

export default nextConfig;
