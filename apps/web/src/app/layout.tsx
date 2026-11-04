import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WTAgent",
  description: "Local coding workspace powered by web AI providers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
