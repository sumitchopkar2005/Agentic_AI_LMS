import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import ToastContainer from '@/components/ToastContainer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Agentic LMS',
  description: 'AI-powered Learning Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains.variable} font-sans`}>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
