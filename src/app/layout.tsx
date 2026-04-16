import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Settla | Enterprise Payment Dashboard",
  description: "Send and receive stablecoin payments with invoicing, payment links, and full transaction tracking Powered by Settla Protocol.",
  openGraph: {
    title: "Settla | Enterprise Payment Dashboard",
    description: "Enterprise-grade stablecoin payment solution with invoicing, payment links, and transaction tracking.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </AuthProvider>
        <Toaster 
          theme="dark" 
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
