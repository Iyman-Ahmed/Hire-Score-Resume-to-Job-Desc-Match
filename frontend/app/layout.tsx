import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecruitAI — Resume Ranking System",
  description: "AI-powered resume ranking and candidate matching",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}
