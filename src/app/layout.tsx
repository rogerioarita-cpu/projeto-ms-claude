import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Projeto MS — Auditoria Fiscal SPED",
  description: "Gestão de créditos tributários, auditoria SPED e workflow jurídico-comercial.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
