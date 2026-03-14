import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { CartProvider } from "../context/CartContext"; // <-- 1. Import the Cart Brain
import GlobalAuraBackground from "../components/GlobalAuraBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZIP-IT 'N SHIP-IT",
  description: "For all your music and production needs. Keep your creative process smooth, and let us zip it and ship it.",
  openGraph: {
    images: ['/social-preview.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* 2. Wrap the entire app (children) in the CartProvider */}
        <CartProvider>
          <GlobalAuraBackground />
          {children}
          <Analytics />
        </CartProvider>
      </body>
    </html>
  );
}
