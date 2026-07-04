import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from './store';
import Sidebar from '../components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Odoo HRMS — Enterprise Human Resource Portal',
  description: 'Next-generation Human Resource Management System built for the Odoo Hackathon.',
};

// Root layout — Server Component (no 'use client' here)
// AppProvider wraps children to supply global client-side state
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-black text-zinc-100 antialiased`}>
        <AppProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Left Sidebar Navigation */}
            <Sidebar />

            {/* Main scrollable content area */}
            <main className="flex-1 overflow-y-auto bg-zinc-950">
              {children}
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
