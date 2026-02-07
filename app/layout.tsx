import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BTC Scalper 🤖 | Live Trading Dashboard",
  description: "Real-time Bitcoin scalping performance dashboard powered by Polymarket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
