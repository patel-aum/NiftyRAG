import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NiftyRAG – NSE Nifty 50 RAG Chat",
  description: "Real-time NSE Nifty 50 stock analysis powered by RAG and OpenAI",
  openGraph: {
    title: "NiftyRAG – NSE Nifty 50 RAG Chat",
    description: "Real-time NSE Nifty 50 stock analysis powered by RAG and OpenAI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
