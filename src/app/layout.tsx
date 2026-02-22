import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC Trading Dashboard",
  description: "Paper & Live Polymarket Trading Dashboard",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
