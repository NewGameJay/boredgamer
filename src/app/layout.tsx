import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/auth-context';
import "./globals.css";

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "BoredGamer SDK - Game Developer Dashboard",
  description: "Powerful social features for your game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) { 
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
