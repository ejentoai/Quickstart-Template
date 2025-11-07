import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ConfigProvider } from "./context/ConfigContext";
import { PublicAgentSessionProvider } from "./context/PublicAgentSessionContext";
import { Toaster } from "sonner";
import { TokenRefreshProvider } from "@/components/token-refresh-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ejento AI | IT is the new HR",
  description: "Ejento AI | IT is the new HR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {


  return (
    <ConfigProvider>
      <PublicAgentSessionProvider>
        <TokenRefreshProvider>
          <html lang="en">
            <body
              className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
                forcedTheme="light"
              >
                <Toaster position="top-center" />
                <div style={{overflowY:'hidden',maxWidth:'100%'}}>{children}</div>

              </ThemeProvider>
            </body>
          </html>
        </TokenRefreshProvider>
      </PublicAgentSessionProvider>
    </ConfigProvider>
  );
}
