import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NEURALFORGE | OMNI-NEXUS",
  description: "Local-first agentic AI gateway foundry. Omni-Nexus swarm orchestrator. Fuse every web AI subscription into one unified mesh. No API keys. No cloud. No telemetry.",
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
