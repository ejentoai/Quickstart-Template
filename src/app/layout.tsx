import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { ConfigProvider } from './context/ConfigContext';
import { PublicAgentSessionProvider } from './context/PublicAgentSessionContext';
import { TokenRefreshProvider } from '@/components/token-refresh-provider';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'Ejento AI | IT is the new HR',
  description: 'Ejento AI | IT is the new HR',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConfigProvider>
          <PublicAgentSessionProvider>
            <TokenRefreshProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                forcedTheme="light"
              >
                <AuthProvider>
                  <Toaster position="top-center" richColors />
                  {children}
                </AuthProvider>
              </ThemeProvider>
            </TokenRefreshProvider>
          </PublicAgentSessionProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
