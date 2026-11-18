import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comparar textos",
  description: "Comparação de textos local, sem enviar dados para fora.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
