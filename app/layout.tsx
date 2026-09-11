import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrecifiqueJá V2 — Gestão, margem e preço com clareza",
  description: "Precificação, CMV, estoque, caixa e inteligência em uma visão única do negócio.",
};

export const viewport: Viewport = {
  themeColor: "#064e3b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
