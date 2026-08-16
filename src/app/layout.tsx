import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ClientWrapper } from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: "EduCode — Desktop Institutional Platform",
  description: "Secure Coding Examination & Assessment Client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className="antialiased bg-slate-900 text-slate-100 select-none text-left" dir="ltr">
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
