import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Дорожная карта — финансовая отчётность",
  description: "Контроль внедрения финансовой отчётности у клиента",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
