import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import MainLayout from "@/components/layout/main-layout";

export const metadata: Metadata = {
  title: "LLMOps",
  description: "FastAPI + LangGraph LLMOps Prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">
        <Providers>
          <MainLayout>{children}</MainLayout>
        </Providers>
      </body>
    </html>
  );
}

