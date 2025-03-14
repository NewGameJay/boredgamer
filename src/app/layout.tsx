import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "BoredGamer SDK - Game Developer Dashboard",
  description: "Powerful social features for your game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) { 
  return (
    <html lang="en" className="h-full bg-black">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.className} antialiased bg-black text-gray-100 h-full`}
      >
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <main className="flex-1 mt-16">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
